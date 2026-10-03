// ══════════════════════════════════════════════════════════════
//  Glasopname v88 – mail versturen (Supabase Edge Function)
//
//  Waarom een functie en niet rechtstreeks uit de app: de sleutel van
//  de maildienst mag niet in de browser staan. Die staat hier als
//  geheim in Supabase, en de app vraagt deze functie om te versturen.
//
//  Twee soorten mail:
//    • 'bestelling' – de bestellijst naar de leverancier. Lukt dat, dan
//      zet deze functie het project op status 'besteld', met tijdstip
//      en wie. Dat is het enige wat die status zet: zo betekent
//      'besteld' altijd "de mail is er echt uit".
//    • 'taak'       – een kort bericht aan de collega die een taak krijgt.
//
//  Instellen (eenmalig, allemaal in het Supabase-dashboard):
//    1. Edge Functions → Deploy a new function → naam: mail
//       → deze code erin → Deploy.
//    2. Project Settings → Edge Functions → Secrets:
//         RESEND_API_KEY = re_...  (van resend.com)
//         MAIL_VAN       = Jelier Bouw <inmeten@send.jelierbouw.nl>
//         MAIL_ANTWOORD  = julian@jelierbouw.nl      (optioneel)
//    3. Laat "Verify JWT" aan staan: alleen wie is ingelogd mag mailen.
// ══════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_ONTVANGERS = 10;
const MAX_BIJLAGE = 15 * 1024 * 1024;   // 15 MB aan echte bytes

function antwoord(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function geldigAdres(a: unknown): a is string {
  return typeof a === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.trim());
}

function schoon(t: unknown, max = 500): string {
  return String(t ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

// Platte tekst naar eenvoudige html: alinea's en regels, niets meer.
function naarHtml(tekst: string): string {
  const veilig = tekst
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#1d1d1b">' +
    veilig.split(/\n{2,}/).map((p) => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('') +
    '</div>';
}

Deno.serve(async (verzoek) => {
  if (verzoek.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (verzoek.method !== 'POST') return antwoord({ ok: false, fout: 'Alleen POST' }, 405);

  const sleutel = Deno.env.get('RESEND_API_KEY');
  const van = Deno.env.get('MAIL_VAN');
  if (!sleutel || !van) {
    return antwoord({ ok: false, fout: 'De maildienst is nog niet ingesteld (RESEND_API_KEY of MAIL_VAN ontbreekt).' }, 500);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const dienstSleutel = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = (verzoek.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return antwoord({ ok: false, fout: 'Niet ingelogd' }, 401);

  // Wie vraagt dit? Het token wordt bij Supabase zelf nagekeken; we
  // vertrouwen niets uit het bericht van de app.
  const wieRes = await fetch(url + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + token, apikey: dienstSleutel },
  });
  if (!wieRes.ok) return antwoord({ ok: false, fout: 'Niet ingelogd' }, 401);
  const wie = await wieRes.json();
  if (!wie?.id) return antwoord({ ok: false, fout: 'Niet ingelogd' }, 401);

  let body: any;
  try { body = await verzoek.json(); } catch { return antwoord({ ok: false, fout: 'Onleesbaar verzoek' }, 400); }

  const soort = body?.soort === 'taak' ? 'taak' : 'bestelling';
  const projectId = typeof body?.projectId === 'string' ? body.projectId : null;
  const onderwerp = schoon(body?.onderwerp, 200) || 'Glasopname';
  const tekst = String(body?.tekst ?? '').slice(0, 20000);

  const aan: string[] = Array.from(new Set(
    (Array.isArray(body?.aan) ? body.aan : []).map((a: unknown) => String(a ?? '').trim()).filter(geldigAdres),
  )).slice(0, MAX_ONTVANGERS);
  const cc: string[] = Array.from(new Set(
    (Array.isArray(body?.cc) ? body.cc : []).map((a: unknown) => String(a ?? '').trim()).filter(geldigAdres),
  )).slice(0, MAX_ONTVANGERS);

  if (!aan.length) return antwoord({ ok: false, fout: 'Geen geldig mailadres opgegeven' }, 400);
  if (!tekst.trim()) return antwoord({ ok: false, fout: 'Geen tekst om te versturen' }, 400);

  // De naam van de afzender zoals de app die kent; alleen voor het logboek.
  const wieNaam = schoon(body?.wieNaam, 80) ||
    String(wie.email || '').split('@')[0] || '';

  const bijlagen: { filename: string; content: string }[] = [];
  const b = body?.bijlage;
  if (b && typeof b.inhoud === 'string' && b.inhoud.length) {
    if (b.inhoud.length * 0.75 > MAX_BIJLAGE) {
      return antwoord({ ok: false, fout: 'De bijlage is te groot om te mailen (meer dan 15 MB).' }, 413);
    }
    bijlagen.push({
      filename: (schoon(b.naam, 120) || 'bijlage.pdf').replace(/[\\/:*?"<>|]/g, '-'),
      content: b.inhoud,
    });
  }

  // ─── versturen ────────────────────────────────────────────
  const antwoordAdres = Deno.env.get('MAIL_ANTWOORD') || wie.email || undefined;
  let gelukt = false;
  let fout: string | null = null;
  let dienstId: string | null = null;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + sleutel, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: van,
        to: aan,
        cc: cc.length ? cc : undefined,
        reply_to: antwoordAdres,
        subject: onderwerp,
        text: tekst,
        html: naarHtml(tekst),
        attachments: bijlagen.length ? bijlagen : undefined,
      }),
    });
    const uit = await res.json().catch(() => ({}));
    if (res.ok && uit?.id) {
      gelukt = true;
      dienstId = String(uit.id);
    } else {
      fout = schoon(uit?.message || uit?.error?.message || ('maildienst gaf ' + res.status), 300);
    }
  } catch (e) {
    fout = schoon((e as Error)?.message || 'onbekende fout bij versturen', 300);
  }

  // ─── vastleggen ───────────────────────────────────────────
  // Altijd, ook als het mislukt: dan is terug te zien dát het misging.
  const kop = {
    apikey: dienstSleutel,
    Authorization: 'Bearer ' + dienstSleutel,
    'Content-Type': 'application/json',
  };

  await fetch(url + '/rest/v1/mailverzonden', {
    method: 'POST',
    headers: { ...kop, Prefer: 'return=minimal' },
    body: JSON.stringify({
      project_id: projectId,
      soort,
      aan: aan.concat(cc).join(', '),
      onderwerp,
      gelukt,
      fout,
      dienst_id: dienstId,
      wie: wie.id,
      wie_naam: wieNaam,
    }),
  }).catch(() => {});

  // Gelukte bestelmail: hier — en alleen hier — gaat de status op besteld.
  if (gelukt && soort === 'bestelling' && projectId) {
    await fetch(url + '/rest/v1/projecten?id=eq.' + encodeURIComponent(projectId), {
      method: 'PATCH',
      headers: { ...kop, Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'besteld',
        besteld_op: new Date().toISOString(),
        besteld_door: wie.id,
        gewijzigd_door: wie.id,
        gewijzigd_naam: wieNaam,
        samenvatting: 'bestelmail verstuurd naar ' + aan.join(', '),
      }),
    }).catch(() => {});
  }

  if (!gelukt) return antwoord({ ok: false, fout: fout || 'Versturen mislukt' }, 502);
  return antwoord({ ok: true, id: dienstId, aan, cc });
});
