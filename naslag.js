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

function bewerkingLabel(groep, item) {
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
function bewerkingKeuzeHTML(huidig) {
  var html = '';
  var open = '';
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
    if (groep !== open) {
      if (open) html += '</optgroup>';
      if (groep) html += '<optgroup label="' + naslagEsc(groep) + '">';
      open = groep;
    }
    html += '<option value="' + naslagEsc(waarde) + '"' +
            (waarde === huidig ? ' selected' : '') + '>' + naslagEsc(tekst) + '</option>';
  });
  if (open) html += '</optgroup>';
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
        <tr><td><strong>Sponningmaat</strong></td><td colspan="3">Binnenwerks kozijn (de sleuf). 2× speling wordt afgetrokken. Bijv. 4 mm speling → −8 mm totaal.</td></tr>
        <tr><td><strong>Dagmaat</strong></td><td colspan="3">Zichtmaat van de ruit met glaslatten. 2× speling wordt opgeteld. Bijv. 4 mm speling → +8 mm totaal.</td></tr>
        <tr><td><strong>Speling (rondom)</strong></td><td colspan="3">Instelbare randspeling per zijde. Standaard 4 mm. Kies hoger bij grote ruiten of kunststof kozijnen.</td></tr>
      </tbody>
    </table>`,
  },
  {
    titel: 'Duco ventilatieroosters op glas',
    html: `<table class="legenda">
      <thead><tr><th>Roostertype</th><th>Min. glasdikte</th><th>Max. glasdikte</th><th>Toelichting</th></tr></thead>
      <tbody>
        <tr><td>DucoTon 10</td><td>≥ 4 mm</td><td>≤ 30 mm</td><td>Klassiek tonrooster, handmatig instelbaar | glasaftrek 80 mm</td></tr>
        <tr><td>DucoTon 10 ZR</td><td>≥ 18 mm</td><td>≤ 30 mm</td><td>Zelfregelend tonrooster, meest verkocht | glasaftrek 80 mm</td></tr>
        <tr><td>DucoTon 18</td><td>≥ 18 mm</td><td>≤ 22 mm</td><td>Groot tonrooster voor renovatie | glasaftrek 120 mm</td></tr>
        <tr><td>DucoSmart 60</td><td>≥ 13 mm</td><td>≤ 22 mm</td><td>Compact klepventilator, minimale glasaftrek 60 mm</td></tr>
        <tr><td>DucoKlep 15 ZR</td><td>≥ 18 mm</td><td>≤ 46 mm</td><td>Vlak klepprofiel, ook voor triple glas | glasaftrek 80 mm</td></tr>
        <tr><td>DucoFlat 12 ZR</td><td>≥ 18 mm</td><td>≤ 30 mm</td><td>Plat profiel voor schuiframen | glasaftrek 80 mm</td></tr>
        <tr><td>DucoGlasMax ZR</td><td>≥ 8 mm</td><td>≤ 38 mm</td><td>Geluidswerend, zelfregelend | glasaftrek 80 mm</td></tr>
        <tr><td>DucoGlasMax SR</td><td>≥ 8 mm</td><td>≤ 38 mm</td><td>Geluidswerend akoestisch (sound-reducing) | glasaftrek 80 mm</td></tr>
      </tbody>
    </table>`,
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

function naslagGroot(foto, naam, groep) {
  const vak = document.getElementById('naslagGroot');
  if (!vak) return;
  vak.innerHTML = `<div class="nsl-groot-vak" onclick="event.stopPropagation()">
    ${foto ? `<img src="catalogus/${foto}.jpg" alt="${naslagEsc(naam)}">` : ''}
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
  module.exports = { CATALOGUS, glasbewerkingLijst, BEWERKING_OUD, bewerkingBijwerken, NASLAG_TABELLEN };
}
