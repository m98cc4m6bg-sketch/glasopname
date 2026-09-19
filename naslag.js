/* Glasopname — tabblad Naslag
   ------------------------------------------------------------------
   Eén bestand voor alles wat je op locatie wilt kunnen opzoeken:
   de glascatalogus met foto's, de tabellen met glastypen, maatsoorten
   en de Duco-roosters.

   De catalogus komt uit de online showroom van Van Noordenne
   (https://www.noordennegroep.nl/online-showroom), opgehaald op
   15 september 2026. Hun showroom toont 61 soorten; volgens hun eigen
   pagina over decoratief glas hebben ze "meer dan 80 soorten figuurglas
   en draadglas" uit voorraad. Wat hier staat is dus wat ze publiceren,
   niet per se alles wat ze kunnen leveren — bij twijfel navragen.

   De foto's staan lokaal in ./catalogus/ en worden opgehaald met
   fotos-ophalen.sh. Bewust lokaal en niet vanaf hun server: zonder
   bereik moet de catalogus het ook doen, en hun URL's veranderen.

   De namen in `bew: true` vormen samen de keuzelijst Glasbewerking in
   de invoertabel. Die lijst staat als DATA.glasbewerking in index.html
   omdat de bestellijst-skill hem daar leest; glasbewerkingLijst()
   hieronder maakt exact diezelfde lijst, zodat een test kan controleren
   dat de twee niet uit elkaar lopen. */

// ═══════════════ CATALOGUS ═══════════════
// dikte: de diktes die Van Noordenne bij die soort noemt, in mm.
// Bij gelaagd glas staat de opbouw (33.1 enz.) in plaats van een dikte.
// bew:   komt in de keuzelijst Glasbewerking van de invoertabel.
// foto:  bestandsnaam in ./catalogus/, zonder .jpg

const CATALOGUS = [
  {
    groep: 'Figuurglas',
    label: 'Figuurglas',
    bew: true,
    uitleg: 'Structuurglas met een patroon in het oppervlak. Standaard 4 mm; ' +
            'een enkele soort ook dikker. Het patroon zit aan één zijde.',
    items: [
      { naam: 'Byzanthijn fijn blank', foto: 'byzanthijn-fijn-blank', dikte: [4],
        syn: ['Viool fijn', 'Gehamerd fijn', 'Brokaat fijn', 'Ornament 528'] },
      { naam: 'Byzanthijn grof blank', foto: 'byzanthijn-grof-blank', dikte: [4],
        syn: ['Viool grof', 'Gehamerd grof', 'Brokaat grof', 'Ornament 523'] },
      { naam: 'Canale blank', foto: 'canale-blank', dikte: [4],
        syn: ['Flutes', 'ribbelglas'] },
      { naam: 'Canale mat blank', foto: 'canale-mat-blank', dikte: [4],
        syn: ['Flutes mat', 'ribbelglas mat', 'Canalé mat-blank'] },
      { naam: 'Carre blank 13 x 13', foto: 'carre-blank-13x13', dikte: [4, 5],
        syn: ['Square'] },
      { naam: 'Cathedraal groot gehamerd / Brute blank', foto: 'cathedraal-groot-gehamerd',
        dikte: [4, 6], syn: ['Kathedraal grof', 'Hammerglas'] },
      { naam: 'Cathedraal klein Duits blank', foto: 'cathedraal-klein-duits', dikte: [4],
        syn: ['Kathedraal fijn'] },
      { naam: 'Chinchilla blank', foto: 'chinchilla-blank', dikte: [4], syn: [] },
      { naam: 'Cotswold blank', foto: 'cotswold-blank', dikte: [4], syn: ['Kura'] },
      { naam: 'Crepi blank', foto: 'crepi-blank', dikte: [4, 6, 8, 10],
        syn: ['Figuur 33', 'Kuitglas', 'Ornament 504'] },
      { naam: 'Deltha blank', foto: 'deltha-blank', dikte: [4], syn: [] },
      { naam: 'Gothic blank', foto: 'gothic-blank', dikte: [4], syn: [] },
      { naam: 'Guss antiek blank', foto: 'guss-antiek-blank', dikte: [4], syn: [] },
      { naam: 'Ijsbloemglas', foto: 'ijsbloemglas', dikte: [4], syn: ['ijsglas'] },
      { naam: 'Jan Hagel blank', foto: 'jan-hagel-blank', dikte: [4],
        syn: ['Regendrup', 'Ornament 521'] },
      { naam: 'Master carre', foto: 'master-carre', dikte: [4, 6], syn: ['Master carré'] },
      { naam: 'Master ligne', foto: 'master-ligne', dikte: [4], syn: ['Master ligner'] },
      { naam: 'Master point', foto: 'master-point', dikte: [4, 6], syn: [] },
      { naam: 'Moire blank', foto: 'moire-blank', dikte: [4], syn: ['Moiré', 'Ornament 520'] },
      { naam: 'Niagara blank', foto: 'niagara-blank', dikte: [5], syn: [] },
      { naam: 'Nylon blank', foto: 'nylon-blank', dikte: [4], syn: ['Screen'] },
      { naam: 'Rochelino / Alt Deutch K blank', foto: 'rochelino-alt-deutch-k', dikte: [4],
        syn: ['Alt Deutsch'] },
      { naam: 'Silvit blank', foto: 'silvit-blank', dikte: [4], syn: ['boomschors'] },
    ],
  },
  {
    groep: 'Draadglas',
    label: 'Draadglas',
    bew: true,
    uitleg: 'Glas met een ingegoten draadnet. Houdt scherven bij elkaar, maar ' +
            'is géén veiligheidsglas volgens de norm.',
    items: [
      { naam: 'brute', foto: 'draadglas-brute', dikte: [6],
        syn: ['Duits draadglas', 'N-draadglas', 'glad draadglas'] },
      { naam: 'Engels blank', foto: 'draadglas-engels-blank', dikte: [6],
        syn: ['E-draadglas', 'S-draadglas', 'gefigureerd draadglas'] },
      { naam: 'spiegeldraadglas', foto: 'spiegeldraadglas', dikte: [7], syn: [] },
    ],
  },
  {
    groep: 'Gematteerd',
    label: 'Gematteerd',
    bew: true,
    uitleg: 'Egaal mat, zonder patroon. Satijnglas is gezuurd; dat voelt glad ' +
            'en houdt minder licht tegen dan figuurglas.',
    items: [
      { naam: 'Satijnglas', foto: 'satijnglas', dikte: [4, 5, 6, 8, 10, 12],
        syn: ['etsglas', 'melkglas', 'mat glas', 'gezuurd'] },
      { naam: 'Satijnglas extra helder', foto: 'satijnglas-extra-helder', dikte: [6, 8, 10],
        syn: ['satijn optiwhite'] },
    ],
  },
  {
    groep: 'Getint',
    label: 'Getint',
    bew: true,
    uitleg: 'Float in de massa gekleurd. Houdt zon en inkijk tegen zonder patroon.',
    items: [
      { naam: 'Float brons', foto: 'float-brons', dikte: [4, 6, 8, 10], syn: ['Parsol brons'] },
      { naam: 'Float dark blue', foto: 'float-dark-blue', dikte: [6, 8, 10], syn: ['donkerblauw'] },
      { naam: 'Float grijs', foto: 'float-grijs', dikte: [4, 6, 8, 10, 12], syn: ['Parsol grijs'] },
      { naam: 'Float groen', foto: 'float-groen', dikte: [4, 6, 8, 10], syn: ['Parsol groen'] },
    ],
  },
  {
    groep: 'Extra helder',
    label: 'Extra helder',
    bew: true,
    uitleg: 'Float met weinig ijzer, dus zonder de groene zweem op de snijkant. ' +
            'Zichtbaar verschil bij dik glas en bij wit achterliggend werk.',
    items: [
      { naam: 'Kristal', foto: 'kristal-extra-helder', dikte: [4, 5, 6, 8, 10, 12, 15, 19],
        syn: ['extra helder', 'UltraClear', 'Diamant', 'Optiwhite'] },
    ],
  },
  {
    groep: 'Spiegel',
    label: 'Spiegel',
    bew: true,
    uitleg: 'Verzilverd glas. Op aanvraag met beschermfolie aan de achterzijde (SAFE+).',
    items: [
      { naam: 'Verzilverd blank', foto: 'verzilverd-blank', dikte: [3, 4, 5, 6, 8],
        syn: ['spiegel blank'] },
      { naam: 'Verzilverd brons', foto: 'verzilverd-brons', dikte: [4, 6], syn: ['spiegel brons'] },
      { naam: 'Verzilverd grijs', foto: 'verzilverd-grijs', dikte: [4, 6], syn: ['spiegel grijs'] },
      { naam: 'Verzilverd Milano', foto: 'verzilverd-milano', dikte: [4], syn: [] },
    ],
  },
  {
    groep: 'Gekleurd',
    label: 'Gekleurd',
    bew: true,
    uitleg: 'Transparant starglass, 3 mm. Dun en gekleurd — meestal voor ' +
            'glas-in-lood en bovenlichten, niet voor gewone beglazing.',
    items: [
      { naam: 'Starglass donkerblauw', foto: 'starglass-donkerblauw', dikte: [3], syn: [] },
      { naam: 'Starglass groen', foto: 'starglass-groen', dikte: [3], syn: [] },
      { naam: 'Starglass oranje', foto: 'starglass-oranje', dikte: [3], syn: [] },
      { naam: 'Starglass rood', foto: 'starglass-rood', dikte: [3], syn: [] },
    ],
  },
  {
    groep: 'Gelaagd',
    label: 'Gelaagd',
    bew: false,   // opbouw, geen bewerking — hoort bij Glas Type / Opbouw
    uitleg: 'Twee of meer bladen met folie ertussen. De opbouw kies je in de ' +
            'kolom Opbouw; deze lijst laat zien welke uitvoeringen op voorraad zijn.',
    items: [
      { naam: 'Gelaagd 33.1 blank', foto: 'gelaagd-33-1-blank',
        opbouw: ['33.1', '33.2', '44.1', '44.2', '55.2', '66.2', '88.2', '1010.2', '1212.2'], syn: [] },
      { naam: 'Gelaagd 33.1 matte folie', foto: 'gelaagd-33-1-matte-folie',
        opbouw: ['33.1', '33.2', '44.2', '55.2', '66.2', '88.2', '1010.2', '1212.2'], syn: ['Opaal'] },
      { naam: 'Gelaagd 33.1 Silence / Sound Control', foto: 'gelaagd-33-1-silence',
        opbouw: ['33.1', '33.2', '44.2', '55.2', '66.2', '88.2', '1010.2'],
        syn: ['Stratophone', 'Sound Reduction', 'akoestisch'] },
      { naam: 'Gelaagd 33.1 brons', foto: 'gelaagd-33-1-brons', opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 grijs', foto: 'gelaagd-33-1-grijs', opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 groen', foto: 'gelaagd-33-1-groen', opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 2-zijde brons', foto: 'gelaagd-33-1-2z-brons', opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 2-zijde brons matte folie', foto: 'gelaagd-33-1-2z-brons-mat',
        opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 2-zijde grijs', foto: 'gelaagd-33-1-2z-grijs', opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 33.1 2-zijde grijs matte folie', foto: 'gelaagd-33-1-2z-grijs-mat',
        opbouw: ['33.1'], syn: [] },
      { naam: 'Gelaagd 44.2 1 zijde brons', foto: 'gelaagd-44-2-1z-brons', opbouw: ['44.2'], syn: [] },
      { naam: 'Gelaagd 44.2 1 zijde grijs', foto: 'gelaagd-44-2-1z-grijs', opbouw: ['44.2'], syn: [] },
      { naam: 'Gelaagd 44.2 1 zijde groen', foto: 'gelaagd-44-2-1z-groen', opbouw: ['44.2'], syn: [] },
      { naam: 'Gelaagd 44.2 2 zijde brons', foto: 'gelaagd-44-2-2z-brons', opbouw: ['44.2'], syn: [] },
      { naam: 'Gelaagd 44.2 2 zijde grijs', foto: 'gelaagd-44-2-2z-grijs', opbouw: ['44.2'], syn: [] },
      { naam: 'Gelaagd 44.2 2 zijde groen', foto: 'gelaagd-44-2-2z-groen', opbouw: ['44.2'], syn: [] },
    ],
  },
  {
    groep: 'Brandwerend en hittebestendig',
    label: 'Brandwerend',
    bew: false,   // eigen product met eigen certificering, geen bewerking
    uitleg: 'Brandwerend glas is geen bewerking maar een eigen product met ' +
            'certificering. Altijd afstemmen met de leverancier.',
    items: [
      { naam: 'Pyroguard EW30 IMPACT', foto: 'pyroguard-ew30-impact', dikte: [7], syn: [] },
      { naam: 'Pyroguard EW30 MAXI IMPACT', foto: 'pyroguard-ew30-maxi-impact', dikte: [11], syn: [] },
      { naam: 'Pyroguard EW60 (C1060)', foto: 'pyroguard-ew60-c1060', dikte: [11], syn: [] },
      { naam: 'Pyroguard SATIJN EW30 IMPACT', foto: 'pyroguard-satijn-ew30-impact', dikte: [7], syn: [] },
      { naam: 'Robax', foto: 'robax', dikte: [4], syn: ['kachelruit', 'hittebestendig'] },
    ],
  },
];

// ═══════════════ KEUZELIJST GLASBEWERKING ═══════════════
// Vaste waarden aan begin en eind. 'Helder (standaard)' is de waarde die
// nieuweRij() zet en waarop de bestellijst filtert; die tekst mag nooit
// veranderen zonder index.html mee te nemen.
const BEWERKING_STANDAARD = 'Helder (standaard)';
const BEWERKING_OVERIG = 'Overig (zie opmerking)';

// De naam, zonder maten. De diktes stonden er eerst achter — die kwamen zo
// ook op de bestellijst terecht ('Satijnglas (4/5/6/8/10/12 mm)'), terwijl
// er maar één dikte besteld wordt. Wat de leverancier moet zien is de
// soort; de diktes zijn hier voortaan alleen nog gegevens om op te
// controleren of de gekozen opbouw die soort kán bevatten.
function bewerkingLabel(groep, item) {
  return groep.label + ' — ' + item.naam;
}

// Zoals het tot en met v72 in de lijst stond: mét de maten erachter.
// Alleen nog nodig om bestaande projecten om te zetten.
function bewerkingLabelMetMaat(groep, item) {
  const maat = item.dikte ? item.dikte.join('/') + ' mm' : (item.opbouw || []).join('/');
  return groep.label + ' — ' + item.naam + (maat ? ' (' + maat + ')' : '');
}

function glasbewerkingLijst() {
  const lijst = [BEWERKING_STANDAARD];
  CATALOGUS.forEach(g => {
    if (!g.bew) return;
    g.items.forEach(i => lijst.push(bewerkingLabel(g, i)));
  });
  lijst.push(BEWERKING_OVERIG);
  return lijst;
}

// ═══════════════ LEVERBAARHEID ═══════════════
// Een bewerking bestaat in bepaalde bladdiktes. Een opbouw noemt de diktes
// van de bladen en de spouw ertussen. De combinatie kan dus alleen als één
// van de bladen een dikte heeft die de soort kent: satijnglas bestaat in
// 4 mm, dus 4-16-4 kan wel en 6-16-6 niet.
//
// Dit is een controle op de maten die Van Noordenne publiceert, geen
// bestelbevestiging. Vandaar dat een niet-kloppende combinatie nergens
// geblokkeerd wordt — hij wordt gemarkeerd, zodat iemand hem nakijkt.

// Naam → { groep, item }, zodat de diktes bij een gekozen waarde te vinden
// zijn zonder elke keer de hele catalogus te doorlopen.
const BEWERKING_INDEX = (function () {
  const kaart = {};
  CATALOGUS.forEach(g => {
    if (!g.bew) return;
    g.items.forEach(i => { kaart[bewerkingLabel(g, i)] = { groep: g, item: i }; });
  });
  return kaart;
})();

// Alle losse bladen halveren: '33.2' is twee bladen van 3 mm, '1010.2'
// twee van 10 mm. Het cijfer achter de punt is het aantal folies en zegt
// niets over de dikte.
function gelaagdeBladen(cijfers) {
  const s = String(cijfers);
  if (s.length % 2 === 0) {
    const helft = s.length / 2;
    const a = parseInt(s.slice(0, helft), 10);
    const b = parseInt(s.slice(helft), 10);
    if (a > 0 && b > 0) return [a, b];
  }
  const n = parseInt(s, 10);
  return n > 0 ? [n] : [];
}

// De diktes van de losse glasbladen in een opbouw. Spouwmaten tellen niet
// mee: die zitten op de even plekken tussen de bladen.
function bladDiktes(glasType, opbouw) {
  let code = String(opbouw || '').trim();
  if (!code) return [];

  // '6 mm' en '6 mm ESG' — enkel blad.
  const enkel = code.match(/^(\d+)\s*mm\b/i);
  if (enkel) return [parseInt(enkel[1], 10)];

  // ESG en ZW zeggen iets over de behandeling, niet over de dikte.
  code = code.replace(/\s*\b(ESG|ZW)\b/gi, '');

  const diktes = [];
  code.split('-').forEach((deel, i) => {
    deel = deel.trim();
    if (!deel) return;
    // Een gelaagd blad ('33.2', '44.2A') is één blad, ook al staat er een
    // punt in. Die herkennen we vóór de spouwregel.
    const gelaagd = deel.match(/^(\d+)\.(\d+)A?$/i);
    if (gelaagd) { gelaagdeBladen(gelaagd[1]).forEach(d => diktes.push(d)); return; }
    if (i % 2 === 1) return;             // spouw
    const n = parseInt(deel, 10);
    if (n > 0) diktes.push(n);
  });
  return diktes.filter((d, i) => diktes.indexOf(d) === i).sort((a, b) => a - b);
}

// De diktes waarin een bewerking bestaat. Leeg = onbekend, en dan wordt er
// niets gemeld.
function bewerkingDiktes(waarde) {
  const gevonden = BEWERKING_INDEX[waarde];
  return gevonden && Array.isArray(gevonden.item.dikte) ? gevonden.item.dikte : [];
}

// Kan deze bewerking in deze opbouw? Bij twijfel: ja. Een onbekende waarde
// (uit een ouder project), een lege keuze of een opbouw die nog niet gekozen
// is levert geen melding op — anders staat het scherm vol rood voordat er
// iets ingevuld is.
function bewerkingKan(waarde, glasType, opbouw) {
  if (!waarde || waarde === BEWERKING_STANDAARD || waarde === BEWERKING_OVERIG) return true;
  const diktes = bewerkingDiktes(waarde);
  if (!diktes.length) return true;
  if (!glasType || !opbouw) return true;
  const bladen = bladDiktes(glasType, opbouw);
  if (!bladen.length) return true;
  return diktes.some(d => bladen.indexOf(d) >= 0);
}

// Welke opbouwen van een glastype kunnen deze bewerking dragen.
function opbouwVoorBewerking(glasType, waarde) {
  const alle = (typeof DATA !== 'undefined' && DATA.opbouw_per_type &&
                DATA.opbouw_per_type[glasType]) ? DATA.opbouw_per_type[glasType] : [];
  if (!waarde || !bewerkingDiktes(waarde).length) return alle.slice();
  return alle.filter(o => bewerkingKan(waarde, glasType, o));
}

// Welke glastypen nog overblijven: die met minstens één werkbare opbouw.
function glasTypesVoorBewerking(waarde) {
  const alle = (typeof DATA !== 'undefined' && DATA.opbouw_per_type)
    ? Object.keys(DATA.opbouw_per_type) : [];
  if (!waarde || !bewerkingDiktes(waarde).length) return alle.slice();
  return alle.filter(t => opbouwVoorBewerking(t, waarde).length > 0);
}

// Eén regel uit de invoertabel: klopt de combinatie?
function regelStrijdig(rij) {
  if (!rij) return false;
  return !bewerkingKan(rij.glasbewerking, rij.glasType, rij.opbouw);
}

// De tekst die bij een strijdige regel hoort, op het scherm en in de pdf.
const STRIJDIG_NOOT = 'check beschikbaarheid combinatie dikte-glastype!';
// Een const komt niet vanzelf op window terecht, en pdf.js en de
// bestellijst hebben deze tekst nodig. Eén plek, drie gebruikers.
if (typeof window !== 'undefined') {
  window.STRIJDIG_NOOT = STRIJDIG_NOOT;
  window.BEWERKING_STANDAARD = BEWERKING_STANDAARD;
  window.BEWERKING_OVERIG = BEWERKING_OVERIG;
}

// Alleen het waarom; de kop van het venster zegt al dát het niet kan.
function strijdigUitleg(rij) {
  const diktes = bewerkingDiktes(rij && rij.glasbewerking);
  const bladen = bladDiktes(rij && rij.glasType, rij && rij.opbouw);
  const naam = String((rij && rij.glasbewerking) || 'Deze soort').split(' — ').pop();
  if (!diktes.length || !bladen.length) {
    return naam + ' bestaat niet in de dikte die bij de gekozen opbouw hoort.';
  }
  return naam + ' bestaat in ' + diktes.join(', ') + ' mm; de opbouw ' +
    rij.opbouw + ' heeft ' + (bladen.length === 1 ? 'een blad van ' : 'bladen van ') +
    bladen.join(' en ') + ' mm.';
}

// Oude waarden uit de lijst van vóór v63. Alleen omgezet waar het zeker is
// welke soort bedoeld werd. Waar dat niet zeker is gebeurt er niets: de oude
// waarde blijft staan en komt onderaan de keuzelijst terug met een ⚠, zodat
// je hem zelf kunt nakijken in plaats van dat de app een ruit stilletjes
// anders bestelt.
const BEWERKING_OUD = {
  'Mat / Satijn (gezuurd)': 'Gematteerd — Satijnglas (4/5/6/8/10/12 mm)',
  'Figuurglas - Silvit (Boomschors)': 'Figuurglas — Silvit blank (4 mm)',
  'Figuurglas - Master Carré': 'Figuurglas — Master carre (4/6 mm)',
  'Figuurglas - Master Ligner': 'Figuurglas — Master ligne (4 mm)',
  'Figuurglas - Master Point': 'Figuurglas — Master point (4/6 mm)',
  'Figuurglas - Moiré': 'Figuurglas — Moire blank (4 mm)',
  'Figuurglas - Ribbelglas': 'Figuurglas — Canale blank (4 mm)',
  'Getint glas - Brons': 'Getint — Float brons (4/6/8/10 mm)',
  'Getint glas - Grijs': 'Getint — Float grijs (4/6/8/10/12 mm)',
  'Getint glas - Groen': 'Getint — Float groen (4/6/8/10 mm)',
  'Getint glas - Blauw': 'Getint — Float dark blue (6/8/10 mm)',
  'Spiegelglas': 'Spiegel — Verzilverd blank (3/4/5/6/8 mm)',
  'Gekleurd glas (opgeven bij bestelling)': BEWERKING_OVERIG,
};

// Van v63 tot en met v72 stonden de maten in de naam. Die waarden staan in
// bestaande projecten en moeten stil omgezet worden naar de naam zonder
// maten. De kaart wordt uit de catalogus zelf opgebouwd, zodat hij niet uit
// de pas kan lopen als er ooit een soort bij komt.
// De regels hierboven wezen ook naar die oude namen; die worden in dezelfde
// beweging doorgezet naar de nieuwe.
(function () {
  const metMaat = {};
  CATALOGUS.forEach(g => {
    if (!g.bew) return;
    g.items.forEach(i => {
      const oud = bewerkingLabelMetMaat(g, i);
      const nieuw = bewerkingLabel(g, i);
      if (oud !== nieuw) metMaat[oud] = nieuw;
    });
  });
  Object.keys(BEWERKING_OUD).forEach(k => {
    const doel = BEWERKING_OUD[k];
    if (metMaat[doel]) BEWERKING_OUD[k] = metMaat[doel];
  });
  Object.keys(metMaat).forEach(k => { BEWERKING_OUD[k] = metMaat[k]; });
})();

// Wordt aangeroepen vanuit laadOpgeslagen() en na het inlezen van een
// project uit de cloud: oude waarden omzetten zodra de rijen binnen zijn.
function bewerkingBijwerken(lijst) {
  if (!Array.isArray(lijst)) return 0;
  let aantal = 0;
  lijst.forEach(r => {
    const nieuw = BEWERKING_OUD[r.glasbewerking];
    if (nieuw) { r.glasbewerking = nieuw; aantal++; }
  });
  return aantal;
}

// Tweeënveertig regels in één keuzelijst is op een telefoon niet te
// overzien. Met optgroups zet de browser er kopjes boven — ook in het
// keuzewiel van iOS — en hoeft de groepsnaam niet meer in elke regel.
// De wáárde blijft wel de volledige tekst ('Figuurglas — Crepi blank
// (4/6/8/10 mm)'): die staat zo in bestaande projecten en zo leest de
// glasleverancier hem op de bestellijst.
// Soorten die niet in de gekozen opbouw passen blijven kiesbaar — soms
// wijzig je bewust eerst de bewerking en daarna de opbouw. Ze worden wel
// als zodanig getoond: lichtgrijs (op een telefoon negeert Safari de kleur
// van een optie, vandaar dat ze daarnaast onder een eigen kopje staan,
// direct achter de leverbare soorten van dezelfde groep).
function bewerkingKeuzeHTML(huidig, glasType, opbouw) {
  // Eerst alles indelen. Binnen een groep komen de soorten die kunnen
  // vooraan en die niet kunnen erachter, zodat elke groep hooguit twee
  // kopjes oplevert in plaats van dat ze elkaar afwisselen.
  var volgorde = [];
  var groepen = {};
  bewerkingOpties(huidig).forEach(function (waarde) {
    var groep = '';
    var tekst = waarde;
    var streep = waarde.indexOf(' — ');
    if (streep > 0) {
      groep = waarde.slice(0, streep);
      tekst = waarde.slice(streep + 3);
    } else if (waarde !== BEWERKING_STANDAARD && waarde !== BEWERKING_OVERIG) {
      // Een waarde uit een ouder project die niet meer in de lijst staat.
      groep = 'Oude waarde';
    }
    // 'Helder (standaard)' en 'Overig (zie opmerking)' horen bij geen enkele
    // groep en staan boven- en onderaan. Die krijgen elk een eigen sleutel,
    // anders schuiven ze bij elkaar.
    var sleutel = groep || (' ' + waarde);
    if (!groepen[sleutel]) {
      groepen[sleutel] = { label: groep, wel: [], niet: [] };
      volgorde.push(sleutel);
    }
    var regel = { waarde: waarde, tekst: tekst };
    groepen[sleutel][bewerkingKan(waarde, glasType, opbouw) ? 'wel' : 'niet'].push(regel);
  });

  function optie(r, kan) {
    return '<option value="' + naslagEsc(r.waarde) + '"' +
           (r.waarde === huidig ? ' selected' : '') +
           (kan ? '' : ' class="niet-lever"') + '>' + naslagEsc(r.tekst) + '</option>';
  }

  var html = '';
  volgorde.forEach(function (sleutel) {
    var g = groepen[sleutel];
    if (!g.label) {
      g.wel.concat(g.niet).forEach(function (r) { html += optie(r, true); });
      return;
    }
    if (g.wel.length) {
      html += '<optgroup label="' + naslagEsc(g.label) + '">';
      g.wel.forEach(function (r) { html += optie(r, true); });
      html += '</optgroup>';
    }
    if (g.niet.length) {
      html += '<optgroup label="' + naslagEsc(g.label + ' · niet in deze opbouw') + '">';
      g.niet.forEach(function (r) { html += optie(r, false); });
      html += '</optgroup>';
    }
  });
  return html;
}

// ─── Glas Type en Opbouw ───
// Zodra er een bewerking gekozen is, tonen deze twee lijsten alleen nog wat
// die bewerking kan dragen. De waarde die er nú staat blijft altijd staan,
// ook als hij niet meer past: anders zie je iets anders dan er in de regel
// zit. Zo'n waarde krijgt een eigen kopje, zodat duidelijk is waar het
// conflict zit.
function glasTypeKeuzeHTML(rij) {
  var huidig = (rij && rij.glasType) || '';
  var bew = (rij && rij.glasbewerking) || '';
  var mag = glasTypesVoorBewerking(bew);
  var html = '<option value="">— kies type —</option>';
  var alle = (typeof DATA !== 'undefined' && DATA.opbouw_per_type)
    ? Object.keys(DATA.opbouw_per_type) : [];
  alle.forEach(function (t) {
    if (mag.indexOf(t) < 0) return;
    html += '<option value="' + naslagEsc(t) + '"' +
            (t === huidig ? ' selected' : '') + '>' + naslagEsc(t) + '</option>';
  });
  if (huidig && mag.indexOf(huidig) < 0) {
    html += '<optgroup label="Huidig · past niet bij de bewerking">' +
            '<option value="' + naslagEsc(huidig) + '" selected class="niet-lever">' +
            naslagEsc(huidig) + '</option></optgroup>';
  }
  return html;
}

function opbouwKeuzeHTML(rij) {
  var type = (rij && rij.glasType) || '';
  var huidig = (rij && rij.opbouw) || '';
  var bew = (rij && rij.glasbewerking) || '';
  var mag = type ? opbouwVoorBewerking(type, bew) : [];
  var html = '<option value="">— kies opbouw —</option>';
  mag.forEach(function (o) {
    html += '<option value="' + naslagEsc(o) + '"' +
            (o === huidig ? ' selected' : '') + '>' + naslagEsc(o) + '</option>';
  });
  if (huidig && mag.indexOf(huidig) < 0) {
    html += '<optgroup label="Huidig · past niet bij de bewerking">' +
            '<option value="' + naslagEsc(huidig) + '" selected class="niet-lever">' +
            naslagEsc(huidig) + '</option></optgroup>';
  }
  return html;
}

// Een waarde die niet meer in de lijst staat (een oude, niet-omzetbare, of
// er is met de hand iets ingetypt) moet wél zichtbaar blijven in het vakje.
// Zonder deze regel toont de browser de eerste optie terwijl de rij iets
// anders bevat — en dan bestel je iets anders dan je ziet staan.
function bewerkingOpties(huidig) {
  const lijst = (typeof DATA !== 'undefined' && DATA.glasbewerking)
    ? DATA.glasbewerking.slice() : glasbewerkingLijst();
  if (huidig && lijst.indexOf(huidig) < 0) lijst.push(huidig);
  return lijst;
}

// ═══════════════ ROEDEN ═══════════════
// Twee stelsels, elk met hun eigen profielbreedtes:
//
//   Kruisroeden in glas — een roede in de spouw, niets op het glas.
//                         Leverbaar in 18, 26 en 45 mm.
//   Wienersprossen      — een aluminium kader in de spouw met daarover
//                         verlijmde latjes. Leverbaar in 20, 24 en 30 mm.
//
// Bron: de roedenpagina van Glaslinq, nagekeken 18 september 2026. De
// opplakroeden (alleen latjes op het glas, 28 en 38 mm) zijn eruit: die
// worden niet besteld. Klopt de lijst niet met wat Van Noordenne levert,
// dan is dit de enige plek die aangepast hoeft te worden — plus het
// bijbehorende SQL-script.
const ROEDE_BREEDTES = {
  wienersprossen: ['20 mm', '24 mm', '30 mm'],
  kruisroeden: ['18 mm', '26 mm', '45 mm'],
};
const ROEDE_GEEN = 'Geen roedenverdeling';
const ROEDE_OVERIG = 'Overig (zie opmerking)';

// Welk stelsel hoort bij een gekozen verdeling? Leeg betekent: niet te
// zeggen, en dan worden alle breedtes getoond.
function roedeSoort(verdeling) {
  const v = String(verdeling || '');
  if (/^Wienersprossen/i.test(v)) return 'wienersprossen';
  if (/^Kruisroeden/i.test(v)) return 'kruisroeden';
  return '';
}

function roedeBreedtesVoor(verdeling) {
  const soort = roedeSoort(verdeling);
  const alle = (typeof DATA !== 'undefined' && DATA.roedenbreedte)
    ? DATA.roedenbreedte.slice() : [];
  if (!soort) return alle;
  const eigen = ROEDE_BREEDTES[soort] || [];
  // Overig blijft altijd staan: er is altijd wel een bijzonder profiel.
  return alle.filter(b => eigen.indexOf(b) >= 0 || b === ROEDE_OVERIG);
}

// Een keuzelijst die een waarde uit een ouder project laat staan. De
// opplakroeden zijn uit de app gehaald; een project waarin ze staan mag
// niet stilletjes iets anders gaan tonen dan er werkelijk in zit.
function keuzeMetOude(lijst, huidig, kopje) {
  let html = '';
  lijst.forEach(v => {
    html += '<option value="' + naslagEsc(v) + '"' +
            (v === huidig ? ' selected' : '') + '>' + naslagEsc(v) + '</option>';
  });
  if (huidig && lijst.indexOf(huidig) < 0) {
    html += '<optgroup label="' + naslagEsc(kopje) + '">' +
            '<option value="' + naslagEsc(huidig) + '" selected class="niet-lever">' +
            naslagEsc(huidig) + '</option></optgroup>';
  }
  return html;
}

function roedenKeuzeHTML(rij) {
  const alle = (typeof DATA !== 'undefined' && DATA.roedenverdeling)
    ? DATA.roedenverdeling : [ROEDE_GEEN];
  return keuzeMetOude(alle, (rij && rij.roedenverdeling) || '', 'Oude waarde');
}

function roedeBreedteKeuzeHTML(rij) {
  const mag = roedeBreedtesVoor(rij && rij.roedenverdeling);
  const huidig = (rij && rij.roedenbreedte) || '';
  let html = '<option value="">\u2014</option>';
  html += keuzeMetOude(mag, huidig, 'Hoort niet bij deze roede');
  return html;
}

// ═══════════════ DUCO-ROOSTERS ═══════════════
// De grenzen komen uit DATA.roosters in index.html; hier staat wat je erbij
// wilt zien. De foto's staan lokaal in ./roosters/ en worden opgehaald met
// roosterfotos-ophalen.sh, om dezelfde reden als de catalogusfoto's: zonder
// bereik moet het ook werken en de URL's van Duco veranderen.
// DucoTon 10 en 10 ZR zijn hetzelfde profiel, handmatig of zelfregelend; dat
// geldt ook voor GlasMax ZR en SR. Die delen dus hun foto.
const DUCO_ROOSTERS = [
  { naam: 'DucoTon 10',     foto: 'ducoton-10',   min: 4,  max: 30,
    uitleg: 'Klassiek tonrooster, handmatig instelbaar | glasaftrek 80 mm' },
  { naam: 'DucoTon 10 ZR',  foto: 'ducoton-10',   min: 18, max: 30,
    uitleg: 'Zelfregelend tonrooster, meest verkocht | glasaftrek 80 mm' },
  { naam: 'DucoTon 18',     foto: 'ducoton-18',   min: 18, max: 22,
    uitleg: 'Groot tonrooster voor renovatie | glasaftrek 120 mm' },
  { naam: 'DucoSmart 60',   foto: 'ducosmart-60', min: 13, max: 22,
    uitleg: 'Compact klepventilator, minimale glasaftrek 60 mm' },
  { naam: 'DucoKlep 15 ZR', foto: 'ducoklep-15',  min: 18, max: 46,
    uitleg: 'Vlak klepprofiel, ook voor triple glas | glasaftrek 80 mm' },
  { naam: 'DucoFlat 12 ZR', foto: 'ducoflat-12',  min: 18, max: 30,
    uitleg: 'Plat profiel voor schuiframen | glasaftrek 80 mm' },
  { naam: 'DucoGlasMax ZR', foto: 'ducoglasmax',  min: 8,  max: 38,
    uitleg: 'Geluidswerend, zelfregelend | glasaftrek 80 mm' },
  { naam: 'DucoGlasMax SR', foto: 'ducoglasmax',  min: 8,  max: 38,
    uitleg: 'Geluidswerend akoestisch (sound-reducing) | glasaftrek 80 mm' },
];

// Waar de foto's vandaan komen als ze nog niet lokaal staan. Zo is de tabel
// meteen compleet, ook voordat roosterfotos-ophalen.sh gedraaid is; met de
// bestanden in ./roosters/ werkt hij daarna ook zonder bereik.
const DUCO_BRON = {
  'ducoton-10': 'https://www.duco.eu/Wes/CDN/1/Products/ProductImages/2022-12-19%2014.15.59.600%20-%20DucoTon_10.jpg?width=600&mode=crop',
  'ducoton-18': 'https://www.duco.eu/Wes/CDN/1/Products/ProductImages/2014-10-07%2013.09.15.584%20-%2093_DucoTon_18.jpg?width=600&mode=crop',
  'ducosmart-60': 'https://www.duco.eu/Wes/CDN/1/PRODUCTS/95_DucoSmart%2060/FOTOS/DucoSmart%2060.jpg?width=600&mode=crop',
  'ducoklep-15': 'https://www.duco.eu/Wes/CDN/1/PRODUCTS/62_DucoKlep%2015/FOTOS/DucoKlep%2015.jpg?width=600&mode=crop',
  'ducoflat-12': 'https://www.duco.eu/Wes/CDN/1/Products/ProductImages/2024-12-10%2008.34.17.086%20-%20productshot-DucoFlat-80-ZR_thumb.jpg?width=600&mode=crop',
  'ducoglasmax': 'https://www.duco.eu/Wes/CDN/1/Products/ProductImages/2015-02-12%2016.28.46.139%20-%20DUCOGLASMAX.jpg?width=600&mode=crop',
};

// Eigen doorsnedetekeningen als laatste vangnet. Staat ./roosters/ nog leeg
// én is er geen bereik naar Duco, dan zie je hier toch waar het profiel op
// lijkt: welke kant het glas op zit, hoe hoog het profiel bouwt en waar de
// lucht langs gaat. Het is een schets, geen maatvoering — die staat in de
// kolommen ernaast.
const SCHETS_STIJL =
  '<rect width="120" height="90" fill="#ffffff"/>' +
  '<rect x="50" y="46" width="14" height="34" fill="#d8e8ee" stroke="#8fa9b4" stroke-width="1.2"/>' +
  '<path d="M57 46 v34" stroke="#8fa9b4" stroke-width="0.8"/>' +
  '<text x="4" y="86" font-family="Arial,sans-serif" font-size="8" fill="#9b9892">buiten</text>' +
  '<text x="86" y="86" font-family="Arial,sans-serif" font-size="8" fill="#9b9892">binnen</text>';
// Pijl die de luchtstroom van buiten naar binnen aangeeft. Hij wordt als
// laatste getekend, dus óver het profiel heen; een witte onderlaag houdt hem
// leesbaar op het donkere profiel.
function schetsPijl(y) {
  return '<path d="M14 ' + y + ' H100" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 ' + y + ' H98" stroke="#d00243" stroke-width="2.2" fill="none"/>' +
    '<path d="M104 ' + y + ' l-9 -5 v10 z" fill="#d00243" stroke="#ffffff" stroke-width="1.2"/>';
}

const ROOSTER_SCHETS = {
  // Tonrooster: ronde kap boven op het glas, handmatig of zelfregelend.
  'ducoton-10': { pijl: 30, vorm:
    '<path d="M30 42 h60 v-7 a30 30 0 0 0 -60 0 z" fill="#43423f"/>' +
    '<rect x="30" y="42" width="60" height="4" fill="#1d1d1b"/>' },
  // Zelfde vorm, breder en hoger: het grote profiel voor renovatie.
  'ducoton-18': { pijl: 28, vorm:
    '<path d="M22 42 h76 v-6 a38 32 0 0 0 -76 0 z" fill="#43423f"/>' +
    '<rect x="22" y="42" width="76" height="4" fill="#1d1d1b"/>' },
  // Klepventilator, compact: laag kastje met een scharnierende klep.
  'ducosmart-60': { pijl: 33, vorm:
    '<rect x="36" y="24" width="48" height="18" rx="3" fill="#43423f"/>' +
    '<path d="M36 42 l-15 -10" stroke="#43423f" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="36" y="42" width="48" height="4" fill="#1d1d1b"/>' },
  // Vlakke klep, ook voor triple: breder kastje, klep verder open.
  'ducoklep-15': { pijl: 34, vorm:
    '<rect x="28" y="26" width="64" height="16" rx="3" fill="#43423f"/>' +
    '<path d="M28 42 l-17 -14" stroke="#43423f" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="28" y="42" width="64" height="4" fill="#1d1d1b"/>' },
  // Plat profiel voor schuiframen: nauwelijks bouwhoogte.
  'ducoflat-12': { pijl: 38, vorm:
    '<rect x="24" y="34" width="72" height="8" rx="2" fill="#43423f"/>' +
    '<rect x="24" y="42" width="72" height="4" fill="#1d1d1b"/>' },
  // Geluidswerend: twee kamers achter elkaar, de lucht maakt een bocht.
  'ducoglasmax': { pijl: 32, vorm:
    '<rect x="26" y="22" width="68" height="20" rx="3" fill="#43423f"/>' +
    '<rect x="31" y="26" width="26" height="12" fill="#f6f5f4"/>' +
    '<rect x="63" y="26" width="26" height="12" fill="#f6f5f4"/>' +
    '<rect x="26" y="42" width="68" height="4" fill="#1d1d1b"/>' },
};

// De schets als data-URI, zodat hij net als een foto in een <img> past en
// ook in het uitvergrote venster werkt.
function roosterSchets(slug) {
  var s = ROOSTER_SCHETS[slug];
  if (!s) return '';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="120" height="90">' +
    SCHETS_STIJL + s.vorm + schetsPijl(s.pijl) + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Staat het bestand er niet, dan eerst de bron van Duco proberen, daarna de
// eigen doorsnedetekening, en pas als ook die ontbreekt geven we het op.
function roosterFotoFout(img, slug) {
  var stap = img.dataset.stap || '0';
  if (stap === '0' && DUCO_BRON[slug]) {
    img.dataset.stap = '1';
    img.src = DUCO_BRON[slug];
    return;
  }
  if (stap !== '2' && ROOSTER_SCHETS[slug]) {
    img.dataset.stap = '2';
    img.classList.add('nsl-schets');
    img.title = 'Schematische doorsnede — de foto van Duco is hier niet beschikbaar';
    img.src = roosterSchets(slug);
    return;
  }
  img.replaceWith(naslagGeenFoto());
}

function ducoTabel() {
  return '<table class="legenda legenda-foto">' +
    '<thead><tr><th>Foto</th><th>Roostertype</th><th>Min. glasdikte</th>' +
    '<th>Max. glasdikte</th><th>Toelichting</th></tr></thead><tbody>' +
    DUCO_ROOSTERS.map(function (r) {
      return '<tr>' +
        '<td class="lg-foto"><img src="roosters/' + r.foto + '.jpg" alt="' + naslagEsc(r.naam) +
          '" loading="lazy" onclick="naslagGroot(\'' + r.foto + '\',\'' + naslagEsc(r.naam) +
          '\',\'Duco ventilatierooster\',\'roosters\')" ' +
          'onerror="roosterFotoFout(this, \'' + r.foto + '\')"></td>' +
        '<td>' + naslagEsc(r.naam) + '</td>' +
        '<td>\u2265 ' + r.min + ' mm</td>' +
        '<td>\u2264 ' + r.max + ' mm</td>' +
        '<td>' + naslagEsc(r.uitleg) + '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="info-note" style="margin-top:10px">Foto\u2019s van Duco. Is er geen bereik en ' +
    'staan de foto\u2019s nog niet in de map <code>roosters/</code>, dan zie je een eigen ' +
    'doorsnedetekening van het profiel. De glasdiktes zijn dezelfde waarden waarop de app ' +
    'in de invoertabel controleert.</div>';
}

// ═══════════════ TABELLEN (voorheen tabblad Legenda) ═══════════════
const NASLAG_TABELLEN = [
  {
    titel: 'Glastypen, U-waarde en gewicht',
    html: `<table class="legenda">
      <thead><tr><th>Glastype</th><th>U-waarde (W/m²K)</th><th>Gewicht (kg/m²)</th><th>Toelichting</th></tr></thead>
      <tbody>
        <tr><td>Enkel glas</td><td>± 5,6</td><td>7,5–47,5</td><td>1 glasblad. Gewicht = dikte(mm) × 2,5 kg/m².</td></tr>
        <tr><td>HR glas</td><td>± 2,5</td><td>20–30</td><td>Dubbelglas luchtspouw + coating. Bijv. 4-12-4.</td></tr>
        <tr><td>HR+ glas</td><td>± 1,8</td><td>20–30</td><td>Coating + argon, spouw 12-15 mm. Bijv. 4-14-4.</td></tr>
        <tr><td>HR++ glas</td><td>± 1,1</td><td>20–35</td><td>Verbeterde coating + argon, spouw ≥13 mm. Bijv. 4-16-4.</td></tr>
        <tr><td>HR+++ glas (Triple)</td><td>± 0,6</td><td>30–45</td><td>Driedubbel glas, 2 spouwen + edelgas. Bijv. 4-16-4-16-4.</td></tr>
        <tr><td>Gelaagd glas (VSG)</td><td>—</td><td>15–40</td><td>PVB-folie tussen glasbladen. Doorvalveilig. Bijv. 44.2.</td></tr>
        <tr><td>Gehard gelaagd (ESG+VSG)</td><td>—</td><td>20–50</td><td>Gehard + gelaagd. Sterk &amp; doorvalveilig. Bijv. 66.2.</td></tr>
        <tr><td>Gehard glas (ESG)</td><td>—</td><td>10–47,5</td><td>Thermisch gehard, breekt in korrels. Bijv. 6 mm ESG.</td></tr>
        <tr><td>Zonwerend glas</td><td>± 1,1</td><td>20–30</td><td>HR++ + zonwerende coating (lage g-waarde). Bijv. 4-16-4 ZW.</td></tr>
        <tr><td>Akoestisch glas</td><td>± 1,1</td><td>20–35</td><td>Akoestische PVB-folie (PVB-A). Rw 38-45 dB. Bijv. 4-16-44.2A.</td></tr>
      </tbody>
    </table>`,
  },
  {
    titel: 'Maatsoorten en speling',
    html: `<table class="legenda">
      <thead><tr><th>Maatsoort</th><th colspan="3">Uitleg</th></tr></thead>
      <tbody>
        <tr><td><strong>Glasmaat (direct)</strong></td><td colspan="3">Directe netto bestelmaat. Geen correctie nodig. Voer de exacte glasmaat in.</td></tr>
        <tr><td><strong>Sponningmaat</strong></td><td colspan="3">Dit is de werkelijke maat van de sponning, zonder aftrek van eventuele speling. De app trekt de speling er zelf af: 2× per richting, dus bij 4 mm speling gaat er −8 mm van de breedte en −8 mm van de hoogte.</td></tr>
        <tr><td><strong>Dagmaat</strong></td><td colspan="3">Zichtmaat van de ruit met glaslatten. 2× speling wordt opgeteld. Bijv. 4 mm speling → +8 mm totaal.</td></tr>
        <tr><td><strong>Speling aftrek rondom</strong></td><td colspan="3">Instelbare randspeling per zijde, die van de sponningmaat af gaat. Standaard 4 mm. Kies hoger bij grote ruiten of kunststof kozijnen.</td></tr>
        <tr><td><strong>Bijtelling dagmaat</strong></td><td colspan="3">Dit is de maat die de rúit groter moet worden dan de dagmaat van het kozijn. Te gebruiken bij bijvoorbeeld meten van binnenuit. Standaard 11 mm per zijde, dus +22 mm op de breedte en +22 mm op de hoogte.</td></tr>
      </tbody>
    </table>`,
  },
  {
    titel: 'Duco ventilatieroosters op glas',
    html: ducoTabel(),
  },
  {
    titel: 'Figuurglas: in welke uitvoeringen',
    html: `<table class="legenda">
      <thead><tr><th>Uitvoering</th><th>Leverbaar</th><th>Waar je op let</th></tr></thead>
      <tbody>
        <tr><td><strong>Enkel</strong></td><td>Ja, alle soorten</td>
          <td>Standaard 4 mm. Crepi ook 6, 8 en 10 mm; Carre 4 en 5 mm; Cathedraal grof en Master carre/point ook 6 mm; Niagara alleen 5 mm.</td></tr>
        <tr><td><strong>Gelaagd (VSG)</strong></td><td>Beperkt</td>
          <td>Alleen van de soorten die in een dikte leverbaar zijn die zich laat lamineren — in de praktijk Crepi, Chinchilla, Canale en satijn, als 44.2 of 44.4. Per project navragen.</td></tr>
        <tr><td><strong>Gehard (ESG)</strong></td><td>Beperkt</td>
          <td>Niet elk patroon laat zich harden; de structuurzijde bepaalt het. Altijd vooraf navragen, ook omdat harden na bewerking moet.</td></tr>
        <tr><td><strong>Dubbel (HR++)</strong></td><td>Ja</td>
          <td>Het figuurblad is één van de twee bladen, meestal de binnenzijde. Spouw minimaal 13 mm voor HR++. Maximale afmeting ligt lager dan bij blank glas: vaak rond 1650 × 2160 mm, bij grof gehamerd en Crepi 6 mm meer.</td></tr>
        <tr><td><strong>Triple (HR+++)</strong></td><td>Ja, op aanvraag</td>
          <td>Van Noordenne zegt dat vrijwel elke samenstelling mogelijk is; het figuurblad komt aan de binnenzijde. Altijd samenstelling en maximale maat vooraf laten bevestigen.</td></tr>
      </tbody>
    </table>
    <div class="info-note" style="margin-top:10px">Maten en beperkingen hierboven zijn wat leveranciers publiceren,
      niet een toezegging van Van Noordenne. Zet bij een afwijkende ruit de vraag in de opmerking van de bestellijst.</div>`,
  },
];

// ═══════════════ OPMAAK ═══════════════
// De opmaak staat hier en niet in index.html, zodat dit tabblad in één
// bestand te onderhouden is. Wordt één keer toegevoegd.
const NASLAG_CSS = `
  .nsl-zoek { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .nsl-zoek input {
    flex: 1; padding: 9px 12px; font-size: 14px; font-family: inherit;
    border: 1px solid var(--grijs-rand); border-radius: var(--radius);
    -webkit-appearance: none; appearance: none;
  }
  .nsl-zoek input:focus { outline: 2px solid var(--merk); outline-offset: -1px; }
  .nsl-zoek button {
    background: none; border: none; cursor: pointer; font-size: 14px;
    color: var(--grijs-tekst); padding: 6px 8px;
  }
  .nsl-telling { font-size: 11px; color: var(--grijs-tekst); margin-bottom: 10px; }
  .nsl-telling:empty { margin: 0; }

  .nsl-sectie { margin-bottom: 10px; border-bottom: 1px solid var(--grijs-rand); }
  .nsl-kop {
    display: flex; align-items: center; gap: 10px; width: 100%;
    background: none; border: none; cursor: pointer; text-align: left;
    padding: 12px 2px; font-family: inherit;
  }
  .nsl-kop h3 { font-size: 13px; font-weight: 700; color: var(--blauw); }
  .nsl-pijl { color: var(--merk); font-size: 12px; width: 12px; flex: 0 0 12px; }
  .nsl-aantal { font-size: 11px; color: var(--grijs-tekst); margin-left: auto; }
  .nsl-uitleg { font-size: 12px; color: var(--grijs-tekst); line-height: 1.5; margin: 0 0 12px 22px; }

  .nsl-raster {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px; padding: 0 0 16px 22px;
  }
  .nsl-kaart {
    border: 1px solid var(--grijs-rand); border-radius: var(--radius);
    background: white; overflow: hidden; cursor: zoom-in;
    display: flex; flex-direction: column;
  }
  .nsl-kaart:hover { border-color: var(--merk); }
  .nsl-kaart img, .nsl-kaart .nsl-geenfoto {
    width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block;
    background: var(--grijs-licht);
  }
  .nsl-geenfoto {
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: var(--grijs-tekst); text-align: center; padding: 8px;
  }
  .nsl-kaart-tekst { padding: 8px 9px; }
  .nsl-naam { font-size: 12px; font-weight: 700; color: var(--blauw); line-height: 1.3; }
  .nsl-dikte { font-size: 11px; color: var(--merk); font-weight: 600; margin-top: 3px; }
  .nsl-syn { font-size: 10px; color: var(--grijs-tekst); margin-top: 3px; line-height: 1.4; }

  .nsl-tabelblok { padding: 0 0 16px 22px; overflow-x: auto; }
  /* De tabel met roosters heeft een kolom met kleine foto's; tikken maakt
     ze groot, net als bij de glassoorten. */
  table.legenda-foto td.lg-foto { width: 84px; padding: 4px 6px; }
  table.legenda-foto td.lg-foto img {
    width: 72px; height: 54px; object-fit: cover; display: block;
    border-radius: 4px; border: 1px solid var(--grijs-rand); cursor: zoom-in;
    background: var(--grijs-licht);
  }
  /* Een doorsnedetekening mag niet bijgesneden worden zoals een foto. */
  table.legenda-foto td.lg-foto img.nsl-schets,
  .nsl-groot-vak img.nsl-schets { object-fit: contain; background: white; }
  table.legenda-foto td.lg-foto .nsl-geenfoto {
    width: 72px; height: 54px; font-size: 9px;
    display: flex; align-items: center; justify-content: center; text-align: center;
    border-radius: 4px; border: 1px dashed var(--grijs-rand); background: var(--grijs-licht);
  }

  .nsl-groot {
    position: fixed; inset: 0; z-index: 9100; display: none;
    align-items: center; justify-content: center; padding: 20px;
    background: rgba(29,29,27,0.82);
  }
  .nsl-groot.open { display: flex; }
  .nsl-groot-vak { max-width: 680px; width: 100%; background: white; border-radius: var(--radius); overflow: hidden; }
  .nsl-groot-vak img { width: 100%; height: auto; display: block; }
  .nsl-groot-tekst { padding: 12px 14px; }
  .nsl-groot-tekst h4 { font-size: 15px; color: var(--blauw); }
  .nsl-groot-tekst p { font-size: 12px; color: var(--grijs-tekst); margin-top: 4px; line-height: 1.5; }
  .nsl-groot-sluit {
    display: block; width: 100%; padding: 12px; border: none; border-top: 1px solid var(--grijs-rand);
    background: white; font-family: inherit; font-size: 13px; font-weight: 700;
    color: var(--merk); cursor: pointer;
  }
  .nsl-bron { font-size: 11px; color: var(--grijs-tekst); line-height: 1.6; padding: 14px 0 4px; }

  @media (max-width: 820px) {
    .nsl-raster { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); padding-left: 0; gap: 10px; }
    .nsl-uitleg, .nsl-tabelblok { margin-left: 0; padding-left: 0; }
    .nsl-zoek input { font-size: 16px; }   /* anders zoomt Safari in */
  }
  @media print { .nsl-zoek, .nsl-groot { display: none !important; } }
`;

function naslagCss() {
  if (document.getElementById('naslagCss')) return;
  const s = document.createElement('style');
  s.id = 'naslagCss';
  s.textContent = NASLAG_CSS;
  document.head.appendChild(s);
}

// ═══════════════ WEERGAVE ═══════════════
// Dicht beginnen, behalve figuurglas — daar is het om begonnen.
const naslagOpen = { 'Figuurglas': true };
let naslagZoek = '';

function naslagPast(item, groep) {
  if (!naslagZoek) return true;
  const hooi = (item.naam + ' ' + groep.groep + ' ' + (item.syn || []).join(' ')).toLowerCase();
  return hooi.indexOf(naslagZoek) >= 0;
}

function naslagMaat(item) {
  if (item.dikte) return item.dikte.join(' · ') + ' mm';
  if (item.opbouw) return item.opbouw.join(' · ');
  return '';
}

function naslagKaart(item, groep) {
  const syn = (item.syn && item.syn.length) ? '<div class="nsl-syn">ook: ' + item.syn.join(', ') + '</div>' : '';
  const beeld = item.foto
    ? `<img src="catalogus/${item.foto}.jpg" alt="${naslagEsc(item.naam)}" loading="lazy"
         onerror="this.replaceWith(naslagGeenFoto())">`
    : '<div class="nsl-geenfoto">geen foto</div>';
  return `<div class="nsl-kaart" onclick="naslagGroot('${item.foto}','${naslagEsc(item.naam)}','${naslagEsc(groep.groep)}')">
    ${beeld}
    <div class="nsl-kaart-tekst">
      <div class="nsl-naam">${naslagEsc(item.naam)}</div>
      <div class="nsl-dikte">${naslagMaat(item)}</div>
      ${syn}
    </div>
  </div>`;
}

function naslagGeenFoto() {
  const d = document.createElement('div');
  d.className = 'nsl-geenfoto';
  d.textContent = 'foto ontbreekt';
  return d;
}

function naslagEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

function naslagSectie(id, titel, aantalTekst, inhoud, uitleg) {
  const open = !!naslagOpen[id];
  return `<section class="nsl-sectie">
    <button class="nsl-kop" onclick="naslagKlap('${naslagEsc(id)}')">
      <span class="nsl-pijl">${open ? '▾' : '▸'}</span>
      <h3>${naslagEsc(titel)}</h3>
      <span class="nsl-aantal">${aantalTekst}</span>
    </button>
    ${open ? (uitleg ? `<p class="nsl-uitleg">${uitleg}</p>` : '') + inhoud : ''}
  </section>`;
}

function renderNaslag() {
  const plek = document.getElementById('naslagInhoud');
  if (!plek) return;
  naslagCss();

  let gevonden = 0;
  let secties = '';

  CATALOGUS.forEach(groep => {
    const items = groep.items.filter(i => naslagPast(i, groep));
    gevonden += items.length;
    if (naslagZoek && items.length === 0) return;
    // Tijdens zoeken staan de secties met treffers open, anders zoek je
    // wel maar zie je niets.
    if (naslagZoek) naslagOpen[groep.groep] = true;
    const raster = '<div class="nsl-raster">' + items.map(i => naslagKaart(i, groep)).join('') + '</div>';
    secties += naslagSectie(groep.groep, groep.groep, items.length + ' soorten', raster, groep.uitleg);
  });

  // De tabellen blijven buiten het zoeken: die zoek je niet op naam.
  if (!naslagZoek) {
    NASLAG_TABELLEN.forEach(t => {
      secties += naslagSectie(t.titel, t.titel, '', '<div class="nsl-tabelblok">' + t.html + '</div>', '');
    });
  }

  plek.innerHTML = `
    <div class="card">
      <div class="nsl-zoek">
        <input type="search" id="naslagZoekVeld" placeholder="Zoek een glassoort of synoniem…"
               autocomplete="off" value="${naslagEsc(naslagZoek)}" oninput="naslagZoeken(this.value)">
        <button onclick="naslagZoeken('')" title="Zoekterm wissen">✕</button>
      </div>
      <div class="nsl-telling">${naslagZoek ? gevonden + ' van de ' + naslagAantal() + ' soorten' : ''}</div>
      ${secties || '<em style="color:var(--grijs-tekst)">Niets gevonden.</em>'}
      <div class="nsl-bron">
        Catalogus overgenomen uit de online showroom van Van Noordenne, 15 september 2026.
        Zij noemen ruim 80 soorten figuurglas en draadglas uit voorraad; hier staat wat ze
        online tonen. Diktes en uitvoeringen zijn een leidraad — de leverancier bevestigt.
      </div>
    </div>
    <div class="nsl-groot" id="naslagGroot" onclick="naslagGrootSluit()"></div>`;

  // Na het opnieuw opbouwen staat de tekstcursor weg; bij typen moet hij
  // terug in het zoekveld, anders kun je maar één letter intypen.
  if (naslagZoek) {
    const veld = document.getElementById('naslagZoekVeld');
    if (veld) { veld.focus(); veld.setSelectionRange(veld.value.length, veld.value.length); }
  }
}

function naslagAantal() {
  return CATALOGUS.reduce((n, g) => n + g.items.length, 0);
}

function naslagKlap(id) {
  naslagOpen[id] = !naslagOpen[id];
  renderNaslag();
}

function naslagZoeken(waarde) {
  naslagZoek = (waarde || '').trim().toLowerCase();
  renderNaslag();
}

// map is 'catalogus' voor de glassoorten en 'roosters' voor de Duco-foto's.
function naslagGroot(foto, naam, groep, map) {
  const vak = document.getElementById('naslagGroot');
  if (!vak) return;
  const pad = (map || 'catalogus') + '/' + foto + '.jpg';
  const terug = (map === 'roosters' && DUCO_BRON[foto])
    ? ` onerror="roosterFotoFout(this, '${naslagEsc(foto)}')"` : '';
  vak.innerHTML = `<div class="nsl-groot-vak" onclick="event.stopPropagation()">
    ${foto ? `<img src="${pad}" alt="${naslagEsc(naam)}"${terug}>` : ''}
    <div class="nsl-groot-tekst">
      <h4>${naslagEsc(naam)}</h4>
      <p>${naslagEsc(groep)}</p>
    </div>
    <button class="nsl-groot-sluit" onclick="naslagGrootSluit()">Sluiten</button>
  </div>`;
  vak.classList.add('open');
}

function naslagGrootSluit() {
  const vak = document.getElementById('naslagGroot');
  if (vak) { vak.classList.remove('open'); vak.innerHTML = ''; }
}

// Voor de test in Node.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATALOGUS, glasbewerkingLijst, BEWERKING_OUD, bewerkingBijwerken, NASLAG_TABELLEN,
    bladDiktes, bewerkingDiktes, bewerkingKan, opbouwVoorBewerking,
    glasTypesVoorBewerking, regelStrijdig, bewerkingKeuzeHTML,
    glasTypeKeuzeHTML, opbouwKeuzeHTML, strijdigUitleg, STRIJDIG_NOOT,
    BEWERKING_STANDAARD, BEWERKING_OVERIG,
    DUCO_ROOSTERS, DUCO_BRON, ducoTabel, ROOSTER_SCHETS, roosterSchets, roosterFotoFout,
    ROEDE_BREEDTES, roedeSoort, roedeBreedtesVoor,
    roedenKeuzeHTML, roedeBreedteKeuzeHTML
  };
}
