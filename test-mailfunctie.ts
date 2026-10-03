/* Testreeks v88 — bun test-mailfunctie.ts
   De Edge Function `mail` zelf, buiten Supabase om. `Deno` en `fetch`
   worden nagebootst: we kijken wat de functie zou versturen, wat ze
   vastlegt, en wat ze weigert. Draai dit met bun (node kan geen
   TypeScript):   bun test-mailfunctie.ts                                */

let fouten = 0;
function check(naam: string, ok: boolean, extra?: string) {
  console.log((ok ? '  ok   ' : '  FOUT ') + naam + (extra ? '  → ' + extra : ''));
  if (!ok) fouten++;
}

const OMGEVING: Record<string, string> = {
  RESEND_API_KEY: 're_test',
  MAIL_VAN: 'Jelier Bouw <inmeten@send.jelierbouw.test>',
  MAIL_ANTWOORD: 'julian@jelierbouw.test',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service_test',
};

let behandelaar: ((v: Request) => Promise<Response>) | null = null;
(globalThis as any).Deno = {
  env: { get: (k: string) => OMGEVING[k] },
  serve: (h: any) => { behandelaar = h; },
};

// Alles wat de functie naar buiten stuurt, komt hier langs.
type Aanroep = { url: string; methode: string; lichaam: any };
let aanroepen: Aanroep[] = [];
let resendFaalt = false;
let gebruikerBekend = true;

const echteFetch = globalThis.fetch;
(globalThis as any).fetch = async (url: any, opties: any = {}) => {
  const adres = String(url);
  let lichaam: any = null;
  try { lichaam = opties.body ? JSON.parse(opties.body) : null; } catch { lichaam = opties.body; }
  aanroepen.push({ url: adres, methode: opties.method || 'GET', lichaam });

  if (adres.indexOf('/auth/v1/user') >= 0) {
    if (!gebruikerBekend) return new Response('nee', { status: 401 });
    return new Response(JSON.stringify({ id: 'u1', email: 'julian@jelierbouw.test' }), { status: 200 });
  }
  if (adres.indexOf('api.resend.com') >= 0) {
    if (resendFaalt) {
      return new Response(JSON.stringify({ message: 'Domain is not verified' }), { status: 403 });
    }
    return new Response(JSON.stringify({ id: 'resend-1' }), { status: 200 });
  }
  return new Response('', { status: 201 });
};

await import('./supabase/functions/mail/index.ts');

function verzoek(lichaam: any, kop: Record<string, string> = { Authorization: 'Bearer t0k' }) {
  return new Request('https://test.functions/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...kop },
    body: JSON.stringify(lichaam),
  });
}

const BESTELLING = {
  soort: 'bestelling',
  projectId: '11111111-1111-4111-8111-111111111111',
  aan: ['verkoop@noordenne.test'],
  onderwerp: 'Bestelling glas — Verhoef',
  tekst: 'Beste,\n\nBijgaand de bestellijst.',
  wieNaam: 'julian',
  bijlage: { naam: 'Bestellijst_Verhoef.pdf', inhoud: 'JVBERi0xLjQK' },
};

function naar(deel: string) { return aanroepen.filter(a => a.url.indexOf(deel) >= 0); }

console.log('\n1. Een gewone bestelmail');
aanroepen = [];
let res = await behandelaar!(verzoek(BESTELLING));
let uit = await res.json();
check('de functie antwoordt met ok', res.status === 200 && uit.ok === true, JSON.stringify(uit));
const mail = naar('api.resend.com')[0];
check('er is één mail verstuurd', naar('api.resend.com').length === 1);
check('van het ingestelde afzenderadres', mail.lichaam.from === OMGEVING.MAIL_VAN, mail.lichaam.from);
check('antwoorden gaan naar het antwoordadres',
  mail.lichaam.reply_to === OMGEVING.MAIL_ANTWOORD, mail.lichaam.reply_to);
check('met de bijlage erbij',
  (mail.lichaam.attachments || []).length === 1 &&
  mail.lichaam.attachments[0].filename === 'Bestellijst_Verhoef.pdf');
check('en zowel platte tekst als html', !!mail.lichaam.text && /<p>/.test(mail.lichaam.html || ''));
const log = naar('/rest/v1/mailverzonden')[0];
check('het versturen is vastgelegd', !!log && log.lichaam.gelukt === true);
check('met wie het deed', log && log.lichaam.wie === 'u1' && log.lichaam.wie_naam === 'julian');
const zet = naar('/rest/v1/projecten')[0];
check('het project is op besteld gezet', !!zet && zet.lichaam.status === 'besteld', zet && zet.lichaam.status);
check('met het bestelmoment en de naam erbij',
  !!zet && !!zet.lichaam.besteld_op && zet.lichaam.besteld_door === 'u1' &&
  /bestelmail verstuurd/.test(zet.lichaam.samenvatting || ''));

console.log('\n2. Een taakbericht raakt de status niet');
aanroepen = [];
res = await behandelaar!(verzoek({ soort: 'taak', projectId: BESTELLING.projectId,
  aan: ['bart@jelierbouw.test'], onderwerp: 'Taak', tekst: 'Rooster nameten', wieNaam: 'julian' }));
check('verstuurd', res.status === 200);
check('geen bijlage', !(naar('api.resend.com')[0].lichaam.attachments));
check('wel vastgelegd', naar('/rest/v1/mailverzonden').length === 1);
check('maar de status blijft ongemoeid', naar('/rest/v1/projecten').length === 0);

console.log('\n3. Wat de functie weigert');
aanroepen = [];
res = await behandelaar!(verzoek({ ...BESTELLING, aan: ['geen-adres'] }));
uit = await res.json();
check('een onzinnig adres', res.status === 400 && /mailadres/.test(uit.fout), JSON.stringify(uit));
check('en er gaat niets de deur uit', naar('api.resend.com').length === 0);

aanroepen = [];
res = await behandelaar!(verzoek({ ...BESTELLING, tekst: '   ' }));
check('een leeg bericht', res.status === 400);

aanroepen = [];
res = await behandelaar!(verzoek({ ...BESTELLING,
  bijlage: { naam: 'groot.pdf', inhoud: 'A'.repeat(25 * 1024 * 1024) } }));
uit = await res.json();
check('een te grote bijlage', res.status === 413 && /te groot/.test(uit.fout), JSON.stringify(uit));

aanroepen = [];
res = await behandelaar!(verzoek(BESTELLING, {}));
check('een verzoek zonder inlog', res.status === 401);
gebruikerBekend = false;
aanroepen = [];
res = await behandelaar!(verzoek(BESTELLING));
check('een token dat Supabase niet kent', res.status === 401);
check('ook dan gaat er niets uit', naar('api.resend.com').length === 0);
gebruikerBekend = true;

aanroepen = [];
res = await behandelaar!(new Request('https://test.functions/mail', { method: 'GET' }));
check('een GET in plaats van POST', res.status === 405);

console.log('\n4. Te veel geadresseerden worden afgekapt');
aanroepen = [];
const veel = Array.from({ length: 15 }, (_, i) => 'nummer' + i + '@test.test');
res = await behandelaar!(verzoek({ ...BESTELLING, aan: veel }));
check('verstuurd', res.status === 200);
check('hoogstens tien adressen', naar('api.resend.com')[0].lichaam.to.length === 10,
  naar('api.resend.com')[0].lichaam.to.length + ' adressen');

console.log('\n5. Gaat het bij de maildienst mis');
resendFaalt = true;
aanroepen = [];
res = await behandelaar!(verzoek(BESTELLING));
uit = await res.json();
check('de app krijgt de reden te horen',
  res.status === 502 && /not verified/.test(uit.fout), JSON.stringify(uit));
check('de mislukking is vastgelegd',
  naar('/rest/v1/mailverzonden')[0].lichaam.gelukt === false);
check('met de foutmelding erbij',
  /not verified/.test(naar('/rest/v1/mailverzonden')[0].lichaam.fout || ''));
check('en het project gaat NIET op besteld', naar('/rest/v1/projecten').length === 0);
resendFaalt = false;

console.log('\n6. Zonder sleutel of afzender doet de functie niets');
delete OMGEVING.RESEND_API_KEY;
aanroepen = [];
res = await behandelaar!(verzoek(BESTELLING));
uit = await res.json();
check('duidelijke melding dat het nog niet ingesteld is',
  res.status === 500 && /niet ingesteld/.test(uit.fout), JSON.stringify(uit));
check('en geen poging tot versturen', naar('api.resend.com').length === 0);
OMGEVING.RESEND_API_KEY = 're_test';

(globalThis as any).fetch = echteFetch;
console.log('\n' + (fouten ? fouten + ' fout(en).' : 'Alles goed.'));
process.exit(fouten ? 1 : 0);
