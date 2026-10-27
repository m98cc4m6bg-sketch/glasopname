/* latten.js — glaslatten en "past het pakket in de sponning?" (v113, v115)
 *
 * Wens van Jan (19-10-2026): de app moet glaslatten kennen (de typen van
 * Jongeneel, met maten en foto), per ruit de sponningdiepte kunnen opnemen,
 * en uitrekenen of glas + glasband + glaslat in de sponning past. Met een
 * waarschuwing als het niet past, en de keuze "sponning uitfrezen naar …".
 *
 * v115 (Jan, 20-10-2026): op Invoer alleen nog de twee diepten (zij/boven en
 * onder); de latkeuzes staan op Toebehoren (toebehoren.js tekent de tabel,
 * dit bestand rekent en tekent de vensters). Opdeklatten kunnen omgekeerd,
 * een gewone glaslat is nooit "te ruim", en een neuslat kies je op
 * ventilatie en uitsteek.
 *
 * ── Hoe het zit (uitgezocht 19/20-10-2026; zie GLASLATTEN.md voor de bronnen) ──
 *
 * Sponningdiepte (Jan) = de ruimte LOODRECHT op het glas: van de aanslag
 * tot de buitenkant van het kozijn. (In NPR 3577 heet dat "sponningbreedte";
 * "sponninghoogte" is de maat langs het glas, de randafdekking, min. 17 mm.)
 * In die ruimte moet komen:
 *
 *     band aan de aanslagzijde + glas + band aan de latzijde + glaslat
 *
 * Twee diepten per ruit (v115): de stijlen en de bovendorpel hebben vaak een
 * scharniersponning (het uitgefreesde hol waar de knoop van het scharnier in
 * valt), waardoor daar minder bruikbare diepte is dan onderin. De onderdorpel
 * heeft een schuin afwateringsvlak en geen scharnier. Daarom: Diepte (zij en
 * boven) en Onder (leeg = gelijk).
 *
 * - Glas: de dikte van de opbouw (4-15-4 = 23 mm; gelaagd 33.1 = 3 + 3 +
 *   0,38 = 6,38 mm). De app rekent hem al uit (rij.totaalDikte).
 * - Glasband (dubbelzijdig PE-band, 9 mm breed): binnen 2, 3 of 4 mm;
 *   buiten 3 of 4 mm, NOOIT 2 (Jan: "werking"; de buitenkant werkt het meest
 *   door zon en vocht, Duitse/Oostenrijkse richtlijnen zeggen buiten ≥ binnen).
 * - Glaslat "a×b" (zo noemt Jongeneel hem, bijv. A4 17x15): a = hoogte langs
 *   het glas (min. 17 mm, KVT 12.3.2), b = de ruimte die hij IN de sponning
 *   inneemt. Een A4 17x15 neemt dus 15 mm in.
 *   Is er meer ruimte dan nodig, dan schuift de lat gewoon verder de sponning
 *   in, tegen het glas aan, en blijft er een randje sponning in het zicht.
 *   Dat is een normale manier van monteren (Jan, v115): de app meldt dan
 *   "past · N mm sponning in zicht", geen waarschuwing (tot v114: "te ruim").
 * - Glaslat met sponninkje (A5): het sponninkje valt over de kozijnrand, dus
 *   er komt minder in de sponning (Jan: 12 mm bij een 17x15) en de rest
 *   steekt iets buiten het kozijn. Handig als het krap is.
 * - Opdeklat (E6, E7, …): komt OP het kozijn, raam of deur, niet in de
 *   sponning. Een opdeklat met eigen sponning (E7 3 mm, E22 5, GLD1 7,5,
 *   GLD2 14) kan twee kanten op (Jan, v115):
 *     normaal:   de sponning van de lat zit aan de glaskant en maakt ruimte:
 *                beschikbaar = sponningdiepte + eigen sponning;
 *     omgekeerd: het dikke deel van de lat steekt de sponning in, de sponning
 *                van de lat valt over het kozijn: de lat neemt de eigen
 *                sponning IN: beschikbaar = sponningdiepte − eigen sponning.
 *   Een opdeklat ligt vast op het kozijn en kan niet verder schuiven: meer
 *   dan 1 mm te ruim = het glas klemt niet (blijft een echte melding).
 *   Voorbeeld van Jan: deur 40 mm, sponning 27 mm; 22 mm glas (4-13-5) + 3 +
 *   3 mm band = 28 mm past niet eens zonder lat. E7 (3 mm) met 4 mm band
 *   binnen: 30 tegen 29 mm, ruim +1.
 * - Neuslat (N25 … N55, alleen onderaan, bij buitenbeglazing): profiel 18
 *   hoog. Onderin zit een uitsparing van S mm breed (S = het modelnummer,
 *   N35 → 35) die over de dorpel valt; daarvoor zit de neus (9 mm breed
 *   volgens de tekeningen van Jongeneel). De totale breedte (S + 9) zegt weinig;
 *   S bepaalt wat hij in de sponning doet. De lat ligt tegen het glas (met
 *   band), dus:
 *       rest       = diepte onder − glas − band (− de lat aan de andere kant bij "beide")
 *       ventilatie = S − rest        (ruimte tussen kozijn en begin van de neus)
 *       uitsteek   = ventilatie + 9  (hoe ver de lat in totaal voor het kozijn uitsteekt)
 *   De neus moet minstens 5 mm vrij van de voorkant van de dorpel blijven
 *   (KVT 12.3.1; ventilatie, en het water moet weg kunnen). Meer mag: een
 *   neuslat is flexibel. Te klein = past niet; te groot bestaat niet. De
 *   app toont alleen de neuslatten die passen, met ventilatie en uitsteek,
 *   en kiest vanzelf de kleinste (ventilatie zo dicht mogelijk bij 5 mm).
 * - Ventilatie-glaslat (C1–C3): onderaan bij buitenbeglazing; gaatjes of
 *   sleuven aan de onderkant ventileren de sponning. Niets te maken met een
 *   Duco-rooster (dat ventileert de ruimte).
 *
 * Latzijde per ruit: binnen, buiten, beide (glas tussen twee latten, geen
 * aanslag) of geen (latten meegeleverd met nieuwe kozijnen, bijv. na een
 * csv-import; dan telt Toebehoren alleen band, kit en tape). Onderin:
 * buiten = de kleinste neuslat die past; binnen en beide = dezelfde lat als
 * boven (v115, keuze Jan); per ruit anders te kiezen.
 *
 * Wanneer past het (keuze van Jan): tot 1 mm te krap vangt het band op
 * (inpersen); meer = past niet. Bij een opdeklat is tot 1 mm te ruim ook
 * goed ("ruim"), meer = het glas klemt niet.
 *
 * De maten hieronder komen van Jongeneel: de nettomaat op de productpagina en
 * de maattekening op de foto's (v114 nagekeken). Wat niet zeker is, staat op
 * zeker: false en toont de app als "maat nog niet nagemeten".
 * Foto's: latten/<id>.jpg (productfoto) en latten/<id>-tek.jpg (maattekening),
 * van de pagina's in latfotos.txt. Jongeneel houdt scripts tegen met een
 * beveiligingsscherm; een nieuwe foto laat je door Claude ophalen via de
 * browser in de desktopapp (BEHEER.md §6). Zolang een foto er niet is,
 * tekent de app het profiel.
 *
 * Eén bron (v115): de lijst LATTEN hieronder is ook de bron van het tabblad
 * Glaslatten in de Naslag (naslag.js leest GlasLatten.LATTEN). Een maat of
 * foto verander je dus alleen hier.
 */
(function () {
  'use strict';

  /* ═══ INSTELLINGEN ═════════════════════════════════════════════ */
  var MARGE_MM = 1;            // tot zoveel te krap (of bij een opdeklat te ruim): past nog (Jan, v113)
  var NEUS_VRIJ_MM = 5;        // neuslat: neus min. 5 mm vrij van de voorkant dorpel (KVT 12.3.1)
  var STANDAARD_LAT = 'A4';    // projectstandaard als er niets gekozen is (17x15 = KVT-minimum)
  var JONGENEEL = 'https://www.jongeneel.nl';
  /* ═══ DE LATTEN (Jongeneel, Meranti FSC gegrond, 4000 mm) ═══════
     id: modelcode van Jongeneel. inSponning: mm in de sponning (loodrecht
     op het glas). hoogte: langs het glas. eigenSponning: opdeklat = extra
     ruimte voor het glas; neuslat = S (breedte van de uitsparing over de
     dorpel). neus: hoe ver de neus verder uitsteekt (neuslat). */
  var LATTEN = [
    // v114: alle maten nagekeken op de maattekeningen bij Jongeneel (foto's 1
    // en 2 op de productpagina, in latten/<id>.jpg en latten/<id>-tek.jpg).
    { id: 'A4',  soort: 'glaslat', vorm: 'schuin', maat: '17x15', hoogte: 17, inSponning: 15, artikel: 'B7601017015400.FVG', zeker: true },
    { id: 'A5',  soort: 'glaslat-sponning', vorm: 'schuin', maat: '17x15', hoogte: 17, inSponning: 12, artikel: 'B7602017015400.FVG', zeker: true,
      opm: 'Tekening Jongeneel: 12 + 3 breed, onderin een sponninkje van 3x3. Het sponninkje valt over de kozijnrand: 12 mm in de sponning (Jan).' },
    { id: 'A10', soort: 'glaslat', vorm: 'schuin', maat: '17x19', hoogte: 17, inSponning: 19, artikel: 'B7602017019400.FVG', zeker: true },
    { id: 'A12', soort: 'glaslat', vorm: 'schuin', maat: '17x26', hoogte: 17, inSponning: 26, artikel: 'B7601017026400.FVG', zeker: true },
    { id: 'A16', soort: 'glaslat', vorm: 'schuin', maat: '15x33', hoogte: 15, inSponning: 33, artikel: 'B7601015033400.FVG', zeker: true,
      opm: '15 mm hoog: lager dan het KVT-minimum van 17 mm. Niet in het advies bij dubbel glas.' },
    { id: 'B1',  soort: 'glaslat', vorm: 'recht', maat: '17x17', hoogte: 17, inSponning: 17, artikel: 'B7621017017400.FVG', zeker: true },
    { id: 'B5',  soort: 'glaslat', vorm: 'recht', maat: '17x19', hoogte: 17, inSponning: 19, artikel: 'B7621017019400.FVG', zeker: true },
    // Tot v113 "GL13"; Jongeneel noemt hem B13.
    { id: 'B13', soort: 'glaslat', vorm: 'recht', maat: '17x27', hoogte: 17, inSponning: 27, artikel: 'B7621017027400.FVG', zeker: true },
    { id: 'B14', soort: 'glaslat', vorm: 'recht', maat: '25x25', hoogte: 25, inSponning: 25, artikel: 'B7621025025400.FVG', zeker: true },
    { id: 'B17', soort: 'glaslat', vorm: 'recht', maat: '17x35', hoogte: 17, inSponning: 35, artikel: 'B7621017035400.FVG', zeker: true },
    // v120 (Jan, 22-10): Jongeneel geeft voor de C1 twee maten: 17x26 (naam en
    // productfoto) en 23 breed (een tweede, CAD-tekening). De app rekent met 26:
    // is hij in werkelijkheid 23, dan zegt de app eerder "past niet" dan dat
    // hij uitsteekt. De tekening van 23 staat er niet bij (MET_TEKENING).
    { id: 'C1',  soort: 'ventilatie', vorm: 'schuin', maat: '17x26', hoogte: 17, inSponning: 26, artikel: 'B7641017026400.FVG', zeker: false,
      opm: 'Jongeneel noemt twee maten: 17x26 (naam en foto) en 23 breed (een tweede tekening). De app rekent met 26; meet één lat na.' },
    { id: 'C2',  soort: 'ventilatie', vorm: 'schuin', maat: '20x27', hoogte: 20, inSponning: 27, artikel: 'B7641020027400.FVG', zeker: true },
    { id: 'C3',  soort: 'ventilatie', vorm: 'schuin', maat: '22x30', hoogte: 22, inSponning: 30, artikel: 'B7641022030400.FVG', zeker: true },
    { id: 'E6',  soort: 'opdek', maat: '9x32', dikte: 9, hoogte: 32, inSponning: 0, eigenSponning: 0, artikel: 'B7652009032400.FVG', zeker: true,
      opm: 'Vlakke opdeklat, zonder eigen sponning (tekening Jongeneel).' },
    { id: 'E7',  soort: 'opdek', maat: '9x32 met sponning', dikte: 9, hoogte: 32, inSponning: 0, eigenSponning: 3, artikel: 'B7651009032400.FVG', zeker: true,
      opm: 'Eigen sponning 16 breed, 3 diep (tekening Jongeneel).' },
    { id: 'E8',  soort: 'opdek', maat: '13x32', dikte: 13, hoogte: 32, inSponning: 0, eigenSponning: 0, artikel: 'B7651013032400.FVG', zeker: true,
      opm: 'Vlakke opdeklat, zonder eigen sponning (tekening Jongeneel; tot v113 rekende de app met 3 mm).' },
    { id: 'E22', soort: 'opdek', maat: '12x33 met sponning', dikte: 12, hoogte: 33, inSponning: 0, eigenSponning: 5, artikel: 'B7651012033400.FVG', zeker: true,
      opm: 'Eigen sponning 16 breed, 5 diep (tekening Jongeneel).' },
    { id: 'GLD1', soort: 'opdek', maat: '20x34,5 (deur)', dikte: 20, hoogte: 34.5, inSponning: 0, eigenSponning: 7.5, artikel: 'B7652020035400.FVG', zeker: true,
      opm: 'Deur-glaslat D1: eigen sponning 17,5 breed, 7,5 diep (tekening Jongeneel; netto 20x35).' },
    { id: 'GLD2', soort: 'opdek', maat: '25x34,5 (deur)', dikte: 25, hoogte: 34.5, inSponning: 0, eigenSponning: 14, artikel: 'B7652025035400.FVG', zeker: true,
      opm: 'Deur-glaslat D2: eigen sponning 17,5 breed, 14 diep (tekening Jongeneel; netto 25x35; tot v113 rekende de app met 13).' },
    // Neuslat: S (eigenSponning) = modelnummer = het deel over de dorpel. De neus
    // is volgens de tekeningen 9 mm breed (de nettomaat "18x40" is 6 mm meer dan
    // 25 + 9; de tekening is leidend, de neus telt alleen voor de uitsteek).
    { id: 'N25', soort: 'neuslat', maat: '18x40', hoogte: 18, eigenSponning: 25, neus: 9, artikel: 'B7691018040400.FVG', zeker: true },
    { id: 'N30', soort: 'neuslat', maat: '18x45', hoogte: 18, eigenSponning: 30, neus: 9, artikel: 'B7691018045400.FVG', zeker: true },
    { id: 'N35', soort: 'neuslat', maat: '18x50', hoogte: 18, eigenSponning: 35, neus: 9, artikel: 'B7691018050400.FVG', zeker: true },
    { id: 'N40', soort: 'neuslat', maat: '18x55', hoogte: 18, eigenSponning: 40, neus: 9, artikel: 'B7691018055400.FVG', zeker: true },
    { id: 'N45', soort: 'neuslat', maat: '18x60', hoogte: 18, eigenSponning: 45, neus: 9, artikel: 'B7691018060400.FVG', zeker: true },
    { id: 'N50', soort: 'neuslat', maat: '18x65', hoogte: 18, eigenSponning: 50, neus: 9, artikel: 'B7691018065400.FVG', zeker: true },
    { id: 'N55', soort: 'neuslat', maat: '18x70', hoogte: 18, eigenSponning: 55, neus: 9, artikel: 'B7691018070400.FVG', zeker: true },
    { id: 'G915', soort: 'glaslat', vorm: 'rond', maat: '9x15 grenen', hoogte: 9, inSponning: 15, lengte: 2700, hout: 'Grenen', artikel: 'B7702009015270F', zeker: true,
      opm: 'Grenen binnenlatje voor enkel glas (9 hoog).' },
    { id: 'G916', soort: 'glaslat', vorm: 'recht', maat: '9x16 grenen', hoogte: 9, inSponning: 16, lengte: 2700, hout: 'Grenen', artikel: 'B7702009016270F', zeker: true,
      opm: 'Grenen binnenlatje voor enkel glas (9 hoog).' }
  ];
  // Welke latten een tweede foto hebben (de maattekening, latten/<id>-tek.jpg).
  var MET_TEKENING = { A4: 1, A5: 1, A10: 1, A12: 1, A16: 1, B1: 1, B5: 1, B13: 1, B14: 1, B17: 1, E22: 1, GLD1: 1, GLD2: 1,
    N25: 1, N30: 1, N35: 1, N40: 1, N45: 1, N50: 1, N55: 1, G915: 1, G916: 1 };
  var SOORT_NAAM = {
    'glaslat': 'Glaslat', 'glaslat-sponning': 'Glaslat met sponning', 'ventilatie': 'Ventilatielat',
    'opdek': 'Opdeklat', 'neuslat': 'Neuslat'
  };
  var VORM_NAAM = { schuin: 'schuin', recht: 'recht', rond: 'rond' };
  LATTEN.forEach(function (l) {
    if (!l.lengte) l.lengte = 4000;
    if (!l.hout) l.hout = 'Meranti';
    l.naam = l.id + ' ' + (SOORT_NAAM[l.soort] || l.soort).toLowerCase() + (l.vorm && l.soort === 'glaslat' ? ' ' + VORM_NAAM[l.vorm] : '') +
      ' ' + l.maat;
    l.foto = 'latten/' + l.id + '.jpg';
    if (MET_TEKENING[l.id]) l.tekening = 'latten/' + l.id + '-tek.jpg';
  });
  var OPNAAM = {};
  LATTEN.forEach(function (l) { OPNAAM[l.id] = l; });

  // Namen uit v111/v112 (toen waren er nog geen typen): wat die betekenen.
  // v114: B2 verkoopt Jongeneel niet meer (zelfde maat als B1); GL13 heet B13.
  var OUDE_NAMEN = { 'Glaslat': STANDAARD_LAT, 'Neuslat': 'NEUS', 'Ventilatielat': 'C1', 'B2': 'B1', 'GL13': 'B13' };
  function normaal(id) {
    if (id == null || id === '') return '';
    return OUDE_NAMEN[id] || id;
  }
  function latVan(id) { return OPNAAM[normaal(id)] || null; }

  function getal(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  // v120: ook > en '.
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function nl(n) { return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 }); }
  function rond(n) { return Math.round(n * 100) / 100; }

  // De keuzes per ruit (sponningdiepte, diepte onder, glaslat, montage,
  // band binnen, uitfrezen, latzijde, onderlat) staan bij het project onder
  // Toebehoren (info.toebehoren.perRuit), niet op de ruit zelf (v113, na de
  // controle): een wijziging op de ruit geeft hem een nieuw stempel (gewOp),
  // en dan herkent de app een oudere stand van een ander apparaat niet meer
  // ("Oudere stand?"). Wijzigen gaat sinds v114 wél mee op slot na een
  // bestelling (keuze Jan); zie magKiezen().
  function rw(r) { return (r && window.toebehorenRuit && toebehorenRuit(r)) || {}; }
  function zetRw(id, veld, waarde) { if (window.toebehorenZetRuit) toebehorenZetRuit(id, veld, waarde); }

  // Aan welke kant de latten zitten (v114, Jan: "geen standaard zijde, dit
  // wisselt continu, ook binnen een kozijn"): 'binnen', 'buiten', 'beide',
  // sinds v115 'geen' (meegeleverd met nieuwe kozijnen), of '' (nog niet
  // gekozen). Een oude vink "latten twee kanten" (v111–v113) telt als 'beide'.
  var ZIJDEN = ['binnen', 'buiten', 'beide', 'geen'];
  var ZIJDE_NAAM = { binnen: 'binnen', buiten: 'buiten', beide: 'beide', geen: 'geen (meegeleverd)' };
  function zijde(r) {
    var e = rw(r);
    if (ZIJDEN.indexOf(e.latZijde) >= 0) return e.latZijde;
    return e.tweeKanten ? 'beide' : '';
  }

  /* ─── de keuzes van het project (staan in toebehoren.js) ───────── */
  // Banddiktes (v118, wens Jan): 5 mm = 2 + 3 mm op elkaar. Buiten nooit 2.
  var BAND_BINNEN = [2, 3, 4, 5], BAND_BUITEN = [3, 4, 5];
  function project() {
    var k = window.toebehorenKeuzes ? toebehorenKeuzes() : null;
    k = k || {};
    var buitenDikte = getal(k.buiten && k.buiten.dikte);
    var binnenDikte = getal(k.binnen && k.binnen.dikte);
    return {
      lat: latVan(k.standaardLat) && latVan(k.standaardLat).soort !== 'neuslat' ? normaal(k.standaardLat) : STANDAARD_LAT,
      bandBinnen: BAND_BINNEN.indexOf(binnenDikte) >= 0 ? binnenDikte : 3,
      // Buiten nooit 2 mm (Jan): een oude 2 telt als 3.
      bandBuiten: BAND_BUITEN.indexOf(buitenDikte) >= 0 ? buitenDikte : 3
    };
  }
  // Band buiten van deze ruit (v118: per ruit te kiezen, anders het project).
  function bandBuitenVan(r, p) {
    var b = getal(rw(r).bandBuiten);
    return BAND_BUITEN.indexOf(b) >= 0 ? b : (p || project()).bandBuiten;
  }

  // De lat die voor deze ruit geldt (boven en zijkanten).
  function latVoorRuit(r) {
    var eigen = rw(r).glaslat ? latVan(rw(r).glaslat) : null;
    if (eigen && eigen.soort !== 'neuslat') return eigen;
    return latVan(project().lat) || OPNAAM[STANDAARD_LAT];
  }
  // Een opdeklat met een eigen sponning kan omgekeerd (v115).
  function draaibaar(l) { return !!(l && l.soort === 'opdek' && getal(l.eigenSponning) > 0); }
  // Zit de lat van deze ruit omgekeerd? Alleen bij een draaibare lat.
  function omgekeerd(r) { return draaibaar(latVoorRuit(r)) && !!rw(r).latOmgekeerd; }
  // Korte naam met de montage: "E7 omgekeerd".
  function latLabel(l, om) { return l ? l.id + (om && draaibaar(l) ? ' omgekeerd' : '') : ''; }

  /* ─── past het? ──────────────────────────────────────────────── */
  // Geeft { status, over, nodig, beschikbaar, glas, bandBinnen, bandBuiten,
  //         lat, omgekeerd, uitfrezenNaar, maxGlas, tekst } of { status: 'onbekend', reden }.
  // status: 'past' | 'zicht' | 'vlak' | 'nood' | 'krap' | 'ruim' | 'te ruim' | 'past niet' | 'onbekend' | 'geen'
  // v119 (Jan): 'vlak' = de lat komt precies vlak met het kozijn (past, maar
  // liever niet: esthetisch); 'nood' = een A5 past alleen dankzij zijn
  // sponninkje en steekt dan voor het kozijn uit (noodmaatregel).
  //   zicht   (v115): gewone glaslat met ruimte over; hij schuift verder in,
  //           er blijft N mm sponning in het zicht. Gewoon goed.
  //   ruim / te ruim: alleen bij een opdeklat (die kan niet verder schuiven).
  //   geen    (v115): latzijde "geen", latten meegeleverd.
  // anders: { plek: 'onder', sponningDiepte, lat, omgekeerd, bandBinnen, uitfrezen, tweeKanten }
  function pakket(r, anders) {
    anders = anders || {};
    var p = project();
    var e = rw(r);
    // plek 'onder' (v114): de onderdorpel, met zijn eigen diepte als die is
    // ingevuld (anders dezelfde als de stijlen).
    var diepte = getal(anders.sponningDiepte !== undefined ? anders.sponningDiepte
      : anders.plek === 'onder' && getal(e.diepteOnder) > 0 ? e.diepteOnder : e.sponningDiepte);
    var glas = getal(r && r.totaalDikte);
    var eigenLat = latVoorRuit(r);
    var lat = anders.lat ? latVan(anders.lat) : eigenLat;
    // Omgekeerd: zoals gevraagd; anders zoals bij deze ruit gekozen (alleen
    // voor zijn eigen lat, ook onderin als daar dezelfde lat zit).
    var om = draaibaar(lat) && (anders.omgekeerd !== undefined ? !!anders.omgekeerd
      : !!(lat && eigenLat && lat.id === eigenLat.id && e.latOmgekeerd));
    var bandBinnen = getal(anders.bandBinnen !== undefined ? anders.bandBinnen : e.bandBinnen);
    if (BAND_BINNEN.indexOf(bandBinnen) < 0) bandBinnen = p.bandBinnen;
    var bandBuiten = anders.bandBuiten !== undefined && BAND_BUITEN.indexOf(getal(anders.bandBuiten)) >= 0 ? getal(anders.bandBuiten) : bandBuitenVan(r, p);
    var uitfrezen = anders.uitfrezen !== undefined ? !!anders.uitfrezen : !!e.uitfrezen;
    // Latten aan beide kanten (binnen en buiten): het glas zit tussen twee
    // latten, zonder aanslag, dus de lat telt twee keer (v113; Jan bevestigd).
    var keer = (anders.tweeKanten !== undefined ? anders.tweeKanten : zijde(r) === 'beide') ? 2 : 1;
    var uit = { glas: glas, bandBinnen: bandBinnen, bandBuiten: bandBuiten, lat: lat, omgekeerd: om, diepte: diepte, uitfrezen: uitfrezen,
                keer: keer, plek: anders.plek === 'onder' ? 'onder' : 'boven', zijde: zijde(r) };
    if (!anders.lat && zijde(r) === 'geen') { uit.status = 'geen'; uit.reden = 'geen latten: meegeleverd'; uit.tekst = 'Geen latten: meegeleverd met het kozijn.'; return uit; }
    if (!(glas > 0)) { uit.status = 'onbekend'; uit.reden = 'nog geen glasopbouw'; return uit; }
    var opdek = !!(lat && lat.soort === 'opdek');
    var c = opdek ? getal(lat.eigenSponning) || 0 : 0;
    // Wat de lat in de sponning inneemt: een glaslat zijn breedte; een
    // opdeklat niets, omgekeerd zijn eigen sponning (het dikke deel steekt in).
    var inSp = (lat ? (opdek ? (om ? c : 0) : getal(lat.inSponning) || 0) : 0) * keer;
    // Wat een opdeklat (normaal) aan ruimte geeft.
    var extra = (opdek && !om ? c : 0) * keer;
    uit.inSponning = inSp; uit.eigenSponning = extra; uit.klemt = opdek;
    uit.nodig = rond(glas + bandBinnen + bandBuiten + inSp);
    // Uitfrezen: de sponning wordt zo diep als nodig (glas + band + lat).
    uit.uitfrezenNaar = Math.ceil(uit.nodig - extra);
    if (!(diepte > 0)) { uit.status = 'onbekend'; uit.reden = anders.plek === 'onder' ? 'nog geen diepte' : 'nog geen sponningdiepte'; return uit; }
    var beschikbaar = (uitfrezen ? Math.max(diepte, uit.uitfrezenNaar) : diepte) + extra;
    uit.beschikbaar = beschikbaar;
    // Uitfrezen aan terwijl de sponning al diep genoeg is: er valt niets te frezen.
    uit.frezen = uitfrezen && uit.uitfrezenNaar > diepte;
    // Kleiner dan glas + band: misschien de maat langs het glas gemeten
    // (in veel bronnen heet díe "sponningdiepte", meestal 17–20 mm).
    if (diepte < glas + bandBinnen + bandBuiten) uit.vraag = 'Is ' + nl(diepte) + ' mm de maat loodrecht op het glas (van de aanslag tot ' +
      'de buitenkant van het kozijn)? Hij is kleiner dan glas en band samen (' + nl(glas + bandBinnen + bandBuiten) + ' mm).';
    uit.maxGlas = rond(diepte + extra - bandBinnen - bandBuiten - inSp);
    var over = rond(beschikbaar - uit.nodig);
    uit.over = over;
    // Een glaslat met sponninkje (A5) kan tot zijn volle breedte (+3 mm,
    // het sponninkje) verder in zonder dat er sponning in zicht komt.
    var speling = lat && lat.soort === 'glaslat-sponning' ? (getal(lat.hoogteSponninkje) || 3) : 0;
    uit.zicht = !opdek && over > 0 ? rond(Math.max(0, over - speling)) : 0;
    // v119 (Jan): latten nooit laten uitsteken. Een A5 die alleen dankzij
    // zijn sponninkje past (0 tot 3 mm over), steekt zoveel voor het kozijn
    // uit: noodmaatregel. Een lat die precies vlak komt: waarschuwing.
    // v120 (controle v119): ook een A5 die tot 1 mm te krap zit (het band
    // vangt dat op) steekt uit, en dan nog verder: ook 'nood', niet het
    // mildere 'krap'.
    if (!opdek && lat && speling && over >= -MARGE_MM && over < speling) uit.uitsteek = rond(speling - over);
    uit.status = over < -MARGE_MM ? 'past niet'
      : uit.uitsteek ? 'nood'
      : over < 0 ? 'krap'
      : opdek ? (over === 0 ? 'past' : over <= MARGE_MM ? 'ruim' : 'te ruim')
      : !lat ? (over === 0 ? 'past' : 'zicht')
      : uit.zicht > 0 ? 'zicht'
      // v120 (Jan): ook onderin aan de buitenkant is vlak een waarschuwing
      // (de uitzondering van v119 is eruit).
      : 'vlak';
    uit.tekst = pakketTekst(uit);
    return uit;
  }

  function pakketTekst(u) {
    var latDeel = u.inSponning ? ' + ' + (u.keer === 2 ? '2 × ' + nl(u.inSponning / 2) : nl(u.inSponning)) + ' lat (' +
      latLabel(u.lat, u.omgekeerd) + (u.keer === 2 ? ', twee kanten' : '') + ')' : '';
    var delen = nl(u.glas) + ' glas + ' + u.bandBinnen + ' + ' + u.bandBuiten + ' band' + latDeel + ' = ' + nl(u.nodig) + ' mm';
    var ruimte = (u.frezen ? 'uitgefreesd ' + nl(u.beschikbaar - (u.eigenSponning || 0)) : 'sponning ' + nl(u.diepte)) +
      (u.eigenSponning ? ' + ' + nl(u.eigenSponning) + ' (opdeklat ' + u.lat.id + (u.keer === 2 ? ', twee kanten' : '') + ')' : '') + ' mm';
    var oordeel = u.status === 'past' ? 'past precies'
      : u.status === 'nood' ? 'past alleen dankzij het sponninkje van de ' + u.lat.id + ' (noodmaatregel): de lat' + (u.keer === 2 ? 'ten steken' : ' steekt') + ' ' +
        nl(u.uitsteek) + ' mm voor het kozijn uit' + (u.over < 0 ? ' (en het band wordt ' + nl(-u.over) + ' mm ingedrukt)' : '') +
        '. Liever een andere lat, dunner band of uitfrezen'
      : u.status === 'vlak' ? 'past, maar de lat' + (u.keer === 2 ? 'ten komen' : ' komt') + ' precies vlak met het kozijn (liever niet: ' +
        'een andere lat, zodat er een randje sponning in zicht blijft)'
      : u.status === 'zicht' ? 'past: ' + nl(u.zicht) + ' mm sponning in zicht (de lat' + (u.keer === 2 ? 'ten schuiven' : ' schuift') +
        ' verder de sponning in, tegen het glas)' +
        // Onderin aan de buitenkant houdt dat randje water vast (controle v115).
        (u.plek === 'onder' && (u.zijde === 'buiten' || u.zijde === 'beide') ? '; let op: onderin buiten blijft op dat randje water staan, ' +
          'liever een neuslat' : '')
      : u.status === 'krap' ? 'krap: ' + nl(-u.over) + ' mm te dik (het band vangt het op)'
      : u.status === 'ruim' ? 'ruim: ' + nl(u.over) + ' mm over'
      // Een opdeklat ligt vast op het kozijn: dan klemt het glas niet.
      : u.status === 'te ruim' ? 'te ruim: ' + nl(u.over) + ' mm over, het glas klemt niet (de opdeklat ligt vast op het kozijn)'
      : 'past niet: ' + nl(-u.over) + ' mm te weinig';
    return delen + '; ' + ruimte + ' → ' + oordeel;
  }

  // Korte tekst voor in de tabel en de pdf: "past · 3 mm zicht", "PAST NIET −3".
  function kort(u) {
    if (!u || u.status === 'onbekend') return '';
    if (u.status === 'geen') return 'meegeleverd';
    var s = (u.over > 0 ? '+' : u.over < 0 ? '−' : '') + nl(Math.abs(u.over));
    return { 'past': 'past', 'zicht': 'past · ' + nl(u.zicht) + ' mm in zicht', 'vlak': 'past · vlak met kozijn',
             'nood': 'nood: steekt ' + nl(u.uitsteek) + ' mm uit', 'krap': 'krap ' + s, 'ruim': 'ruim ' + s,
             'te ruim': 'te ruim ' + s, 'past niet': 'past niet ' + s }[u.status] +
      (u.frezen ? ' (frezen ' + u.uitfrezenNaar + ')' : '');
  }
  function goedAlgemeen(x) { return goed(x); }
  function goed(x) { return !!x && (x.status === 'past' || x.status === 'zicht' || x.status === 'vlak' || x.status === 'nood' || x.status === 'krap' || x.status === 'ruim'); }
  function probleem(x) { return !!x && (x.status === 'past niet' || x.status === 'te ruim'); }

  /* ─── neuslat ────────────────────────────────────────────────── */
  // De ruimte voor het glas (met band) tot de voorkant van de dorpel:
  // rest = diepte onder − glas − band (− de lat aan de andere kant bij "beide").
  // Geeft { rest, u (pakket onder) } of { reden }.
  function neusRest(r) {
    var e = rw(r);
    var p = project();
    var diepte = getal(getal(e.diepteOnder) > 0 ? e.diepteOnder : e.sponningDiepte);
    var glas = getal(r && r.totaalDikte);
    if (!(glas > 0)) return { rest: null, reden: 'nog geen glasopbouw' };
    if (!(diepte > 0)) return { rest: null, reden: 'nog geen diepte' };
    var bandBinnen = getal(e.bandBinnen);
    if (BAND_BINNEN.indexOf(bandBinnen) < 0) bandBinnen = p.bandBinnen;
    var bandBuiten = bandBuitenVan(r, p);
    var keer = zijde(r) === 'beide' ? 2 : 1;
    // Bij latten aan twee kanten zit onderin aan de andere kant dezelfde lat
    // als boven: die neemt ruimte in (een opdeklat normaal geeft ruimte).
    var binnenLat = 0;
    if (keer === 2) {
      var b = latVoorRuit(r);
      binnenLat = b.soort === 'opdek' ? (omgekeerd(r) ? getal(b.eigenSponning) || 0 : -(getal(b.eigenSponning) || 0)) : getal(b.inSponning) || 0;
    }
    var nodig = glas + bandBinnen + bandBuiten + binnenLat;
    // Uitfrezen onderin: zo diep dat het glas met band erin past (de neuslat
    // zelf ligt erover, die heeft geen diepte nodig).
    var B = e.uitfrezen ? Math.max(diepte, Math.ceil(nodig)) : diepte;
    return { rest: rond(B - nodig), B: B, diepte: diepte, frezen: B > diepte, glas: glas, bandBinnen: bandBinnen, bandBuiten: bandBuiten,
             keer: keer, binnenLat: binnenLat };
  }
  // Voor één neuslat: ventilatie (ruimte tussen kozijn en neus) en uitsteek
  // (hoe ver de lat in totaal voor het kozijn uitsteekt).
  function neusMaten(l, rest) {
    var v = rond(l.eigenSponning - rest);
    return { lat: l, ventilatie: v, uitsteek: rond(v + l.neus), past: v >= NEUS_VRIJ_MM };
  }
  // Alle neuslatten met hun maten bij deze ruit (v115, wens Jan: alleen de
  // passende tonen, met ventilatie en uitsteek). Kleinste eerst.
  function neuslatOpties(r) {
    var alle = LATTEN.filter(function (l) { return l.soort === 'neuslat'; })
      .sort(function (a, b) { return a.eigenSponning - b.eigenSponning; });
    var nr = neusRest(r);
    if (nr.rest == null) return { bekend: false, reden: nr.reden, alle: alle, passend: [], teKlein: [] };
    if (nr.rest < -MARGE_MM) return { bekend: true, rest: nr.rest, glasPastNiet: true, reden: 'het glas past er onderin al niet in',
      alle: alle, passend: [], teKlein: [] };
    var lijst = alle.map(function (l) { return neusMaten(l, nr.rest); });
    return { bekend: true, rest: nr.rest, alle: alle, lijst: lijst,
             passend: lijst.filter(function (x) { return x.past; }),
             teKlein: lijst.filter(function (x) { return !x.past; }) };
  }
  // Neuslat onderaan: de gekozen, of de kleinste die past.
  // Geeft { lat, rest, nodigS, ventilatie, uitsteek, reden }.
  function neuslatVoor(r, gekozen) {
    var o = neuslatOpties(r);
    if (!o.bekend) return { lat: null, reden: o.reden || 'onbekend' };
    if (o.glasPastNiet) return { lat: null, rest: o.rest, nodigS: null, ventilatie: null, uitsteek: null, reden: o.reden };
    var nodigS = rond(o.rest + NEUS_VRIJ_MM);
    var keuze = gekozen ? neusMaten(gekozen, o.rest) : o.passend[0];
    var lat = keuze && keuze.past ? keuze.lat : null;
    return { lat: lat, rest: o.rest, nodigS: nodigS,
             ventilatie: lat ? keuze.ventilatie : null, uitsteek: lat ? keuze.uitsteek : null,
             reden: lat ? '' : gekozen ? gekozen.id + ' is te klein: ' + (keuze.ventilatie < 0 ? 'de neus zit ' + nl(-keuze.ventilatie) +
               ' mm achter de voorkant van de dorpel' : 'maar ' + nl(keuze.ventilatie) + ' mm ventilatie') + ' (min. ' + NEUS_VRIJ_MM + ')'
               : 'geen neuslat groot genoeg (nodig ' + nl(nodigS) + ' mm over de dorpel; de grootste, N55, heeft 55)' };
  }

  /* ─── de onderlat ────────────────────────────────────────────── */
  // De keuze per ruit: '' = automatisch (volgt de zijde), 'ZELFDE' = dezelfde
  // lat als boven, 'NEUS' = de kleinste neuslat die past, of een lattype.
  // Een 'Glaslat' uit v111/v112 betekende "dezelfde lat als boven" (v115:
  // nu ook zo bewaard; tot v114 telde hij als automatisch).
  function onderKeuze(r) {
    var w = rw(r).onderlat;
    if (!w) return '';
    if (w === 'Glaslat' || w === 'ZELFDE') return 'ZELFDE';
    if (w === 'NEUS') return 'NEUS';
    var n = normaal(w);
    return n === 'NEUS' || latVan(n) ? n : '';
  }
  // De onderlat van deze ruit. Volgt de latzijde (keuze Jan): buiten → de
  // kleinste neuslat die past; binnen en beide → dezelfde lat als boven
  // (v115; tot v114 kreeg "beide" buiten een neuslat); nog geen zijde →
  // dezelfde lat. Een eigen keuze per ruit (Toebehoren) gaat altijd voor.
  // Geeft { id, lat, neus (bij een neuslat: neuslatVoor), eigen, isNeus, zelfde, geen }.
  function onderlatVoorRuit(r) {
    if (zijde(r) === 'geen') return { id: '', lat: null, neus: null, eigen: false, isNeus: false, zelfde: false, geen: true };
    var boven = latVoorRuit(r);
    var eigen = onderKeuze(r);
    var keuze = eigen === 'ZELFDE' ? boven.id : eigen || (zijde(r) === 'buiten' ? 'NEUS' : boven.id);
    // v117 (Jan): bij latzijde binnen nooit een neus- of ventilatielat (die
    // zijn voor buiten). Een eerdere keuze wordt niet stil veranderd: het
    // oordeel wordt rood tot je iets anders kiest (keuze Jan).
    var binnen = zijde(r) === 'binnen';
    if (keuze === 'NEUS') {
      var n = neuslatVoor(r);
      return { id: n.lat ? n.lat.id : 'NEUS', lat: n.lat, neus: n, eigen: !!eigen, isNeus: true, zelfde: false, alleenBuiten: binnen };
    }
    var l = latVan(keuze) || boven;
    // Een bepaalde neuslat gekozen (bijv. N30): als neuslat beoordelen (heeft
    // geen "in de sponning"), niet als gewone lat (controle v114).
    if (l.soort === 'neuslat') {
      var ng = neuslatVoor(r, l);
      return { id: l.id, lat: ng.lat, neus: ng, eigen: !!eigen, isNeus: true, zelfde: false, gekozen: l, alleenBuiten: binnen };
    }
    return { id: l.id, lat: l, neus: null, eigen: !!eigen, isNeus: false, zelfde: l.id === boven.id,
             alleenBuiten: binnen && l.soort === 'ventilatie' };
  }
  // Het pakket onderin (niet bij een neuslat).
  function pakketOnder(r, anders) {
    var o = onderlatVoorRuit(r);
    if (o.geen || o.isNeus) return null;
    return pakket(r, Object.assign({ plek: 'onder', lat: o.lat.id }, anders || {}));
  }

  // Het oordeel over de hele ruit (v114): boven en zijkanten, en onderin
  // (eigen diepte van de onderdorpel, of een andere onderlat). Het slechtste
  // telt voor het label in de tabel en de controle bij de bestellijst.
  var ERNST = { 'onbekend': 0, 'geen': 0, 'past': 1, 'zicht': 1, 'vlak': 2, 'ruim': 2, 'nood': 3, 'krap': 3, 'te ruim': 4, 'past niet': 5 };
  function neusTekst(n) {
    return n.lat.naam + ': ' + nl(n.ventilatie) + ' mm ventilatie, steekt ' + nl(n.uitsteek) + ' mm voor het kozijn uit';
  }
  // v117 (wens Jan): de dikte van het pakket. Zonder lat = glas + band
  // binnen + band buiten; met lat = wat er in de sponning moet (nodig).
  function pakketDikte(r) {
    var u = pakket(r);
    if (!(u.glas > 0)) return null;
    var zonder = rond(u.glas + u.bandBinnen + u.bandBuiten);
    return { glas: u.glas, band: u.bandBinnen + u.bandBuiten, zonder: zonder,
             met: u.status !== 'geen' && u.nodig != null && u.lat ? u.nodig : null, max: maxPakket(r) };
  }
  // Max glaspakket (incl. band) uit een maatstaat (import, kozijnfabriek).
  function maxPakket(r) {
    var m = getal(r && r.maxPakket);
    return m > 0 ? m : null;
  }
  // v117 (keuze Jan: controleren en grijs maken): past glas + band binnen
  // het max glaspakket? Ook bij latten "geen (meegeleverd)": juist dan.
  function maxOordeel(r, glas) {
    var max = maxPakket(r);
    if (!max) return null;
    var u = pakket(r);
    var g = glas != null ? glas : u.glas;
    if (!(g > 0)) return null;
    var pk = rond(g + u.bandBinnen + u.bandBuiten);
    var over = rond(max - pk);
    return { status: over < 0 ? 'past niet' : 'past', over: over, max: max, pakket: pk, plek: 'max',
             tekst: 'glas ' + nl(g) + ' + band ' + u.bandBinnen + ' + ' + u.bandBuiten + ' = ' + nl(pk) + ' mm; max glaspakket (maatstaat) ' +
               nl(max) + ' mm: ' + (over < 0 ? 'te dik, ' + nl(-over) + ' mm' : 'past' + (over > 0 ? ', ' + nl(over) + ' mm over' : '')) };
  }
  // Te dik voor het max glaspakket? Voor de keuzelijst van de opbouw (grijs).
  function opbouwTeDik(r, dikte) {
    var m = maxOordeel(r, getal(dikte));
    return !!(m && m.status === 'past niet');
  }
  // v124 (wens Jan): past er van dit glastype nog één opbouw binnen het max
  // glaspakket (met de band van deze ruit)? opbouwen = de opbouwen die je mag
  // kiezen (al gefilterd op de bewerking), lookup = DATA.lookup.
  // Geeft null zonder max glaspakket, anders
  //   { past, teDik, onbekend (aantallen), dunste (dikste pakket van de
  //     dunste opbouw, met band), max, band, kan (er is iets te kiezen) }.
  // Een opbouw zonder bekende dikte (niet in de lookup: een oude waarde, of
  // de lijst in de database is anders) beoordelen we niet: die telt als
  // "onbekend" en houdt het type kiesbaar, zoals de opbouw zelf ook nooit
  // grijs werd zonder dikte (v117).
  function maxType(r, opbouwen, lookup, type) {
    var max = maxPakket(r);
    if (!max) return null;
    var u = pakket(r);
    var band = u.bandBinnen + u.bandBuiten;
    var uit = { past: 0, teDik: 0, onbekend: 0, dunste: null, max: max, band: band, bandBinnen: u.bandBinnen, bandBuiten: u.bandBuiten };
    (opbouwen || []).forEach(function (o) {
      var e = lookup ? lookup[type + '|' + o] : null;
      var d = e ? getal(e.totaal) : NaN;
      if (!(d > 0)) { uit.onbekend++; return; }
      var pk = rond(d + band);
      if (uit.dunste == null || pk < uit.dunste) uit.dunste = pk;
      if (pk > max) uit.teDik++; else uit.past++;
    });
    uit.kan = uit.past > 0 || uit.onbekend > 0 || !(opbouwen || []).length;
    return uit;
  }

  function oordeelRuit(r) {
    var mx = maxOordeel(r);
    var boven = pakket(r);
    if (boven.status === 'geen') {
      var og = { boven: boven, onder: null, onderlat: onderlatVoorRuit(r), slechtste: boven, waar: 'boven', geen: true, max: mx };
      if (mx && mx.status === 'past niet') { og.slechtste = mx; og.waar = 'max'; }
      return og;
    }
    var o = onderlatVoorRuit(r);
    var onder = null;
    var e = rw(r);
    if (o.alleenBuiten) {
      onder = { status: 'past niet', over: null, plek: 'onder', alleenBuiten: true,
                tekst: 'onderin ' + (o.isNeus ? 'een neuslat' : 'een ventilatielat') + ' (' + (o.gekozen || o.lat || { id: 'neuslat' }).id +
                  '): die is alleen voor buiten; bij latzijde binnen kies je een lat voor binnen' };
    } else if (o.isNeus) {
      // Alleen iets te zeggen als de diepte er is.
      if (o.neus && o.neus.rest != null) {
        onder = o.lat ? { status: 'past', tekst: 'onderin ' + neusTekst(o.neus), neus: o.neus, plek: 'onder' }
          : { status: 'past niet', tekst: 'onderin geen neuslat: ' + o.neus.reden, neus: o.neus, over: null, plek: 'onder' };
      }
    } else if (!o.zelfde || getal(e.diepteOnder) > 0) {
      onder = pakketOnder(r);
      if (onder && onder.status === 'onbekend') onder = null;
    }
    var slechtste = boven, waar = 'boven';
    // v117: een neus- of ventilatielat bij binnen gaat voor, ook als boven
    // even slecht is: dat is een keuze die je moet zien.
    if (onder && (ERNST[onder.status] > ERNST[boven.status] || (onder.alleenBuiten && ERNST[onder.status] >= ERNST[boven.status]))) {
      slechtste = onder; waar = 'onder';
    }
    if (mx && ERNST[mx.status] > ERNST[slechtste.status]) { slechtste = mx; waar = 'max'; }
    return { boven: boven, onder: onder, onderlat: o, slechtste: slechtste, waar: waar, max: mx };
  }
  // Kort voor het label: "past niet −4", of "onder: past niet −3", of "geen neuslat".
  function kortRuit(o) {
    if (o.waar === 'max') return 'te dik −' + nl(-o.slechtste.over) + ' (max ' + nl(o.slechtste.max) + ')';
    if (o.geen) return 'meegeleverd';
    if (o.waar === 'onder' && o.slechtste.alleenBuiten) return 'onder: ' + ((o.onderlat.gekozen || o.onderlat.lat || { id: 'neuslat' }).id) + ' alleen buiten';
    if (o.waar === 'onder') {
      // Een neuslat (boven nog onbekend): de neuslat noemen (controle v114).
      if (o.slechtste.over == null) {
        var ol = o.onderlat || {};
        return ol.lat ? 'onder: ' + ol.lat.id : ol.gekozen ? 'onder: ' + ol.gekozen.id + ' te klein' : 'geen neuslat';
      }
      return 'onder: ' + kort(o.slechtste);
    }
    return kort(o.boven);
  }

  /* ─── advies ─────────────────────────────────────────────────── */
  // Wat wel past, als het niet (goed) past: een paar concrete keuzes, elk
  // met een actie ({ lat, omgekeerd, onderlat, band, uitfrezen }) die je in
  // het venster aantikt (v114). plek 'onder' (v115): advies voor onderin.
  // Per zijde (v115, Jan: ja): buiten geen rechte of ronde latten (daar moet
  // het water af; een schuine lat is voor buiten), geen grenen binnenlatjes.
  function adviezen(r, plek) { return adviezenMet(r, plek).map(function (a) { return a.tekst; }); }
  function latMagBij(l, z, u, onder) {
    if (l.soort === 'neuslat') return false;
    if (l.soort === 'ventilatie' && !onder) return false;
    if (l.soort === 'opdek' && onder && z === 'buiten') return false;   // onderin buiten: neuslat of schuine lat
    // Geen latjes lager dan 17 mm bij dubbel glas (KVT 12.3.2: min. 17 hoog;
    // A16 15x33 en de grenen 9 mm latjes zijn voor enkel glas).
    if (u.glas > 8 && l.soort !== 'opdek' && l.hoogte < 17) return false;
    if ((z === 'buiten' || z === 'beide') && (l.vorm === 'recht' || l.vorm === 'rond')) return false;
    return true;
  }
  function adviezenMet(r, plek) {
    var onder = plek === 'onder';
    var z = zijde(r);
    if (z === 'geen') return [];
    var ol = onder ? onderlatVoorRuit(r) : null;
    if (onder && ol.isNeus) return neusAdvies(r, ol);
    // Onderin dezelfde lat en dezelfde diepte als boven: het advies van boven geldt.
    if (onder && ol.zelfde && !(getal(rw(r).diepteOnder) > 0)) return [];
    var u = onder ? pakketOnder(r) : pakket(r);
    // v119: ook bij 'nood' (A5 steekt uit) en 'vlak' (precies vlak met het
    // kozijn) iets aanraden, maar dan alleen wat er netjes in valt (zicht).
    var netjes = u && (u.status === 'nood' || u.status === 'vlak');
    if (!u || (!probleem(u) && !netjes)) return [];
    var goed = netjes ? function (x) { return !!x && (x.status === 'zicht' || x.status === 'past'); } : goedAlgemeen;
    var uit = [];
    var basis = onder ? { plek: 'onder', lat: u.lat.id, omgekeerd: u.omgekeerd } : {};
    var met = function (x) { return Object.assign({}, basis, x); };
    [2, 3, 4].forEach(function (b) {
      if (b === u.bandBinnen) return;
      var x = pakket(r, met({ bandBinnen: b }));
      if (goed(x)) uit.push({ tekst: 'Band binnen ' + b + ' mm' + (onder ? ' (rondom)' : '') + ': ' + kort(x), actie: { band: b } });
    });
    // De opdeklat omdraaien (v115): het dikke deel de sponning in (−) of de
    // sponning van de lat naar het glas (+).
    if (draaibaar(u.lat)) {
      var d = pakket(r, met({ omgekeerd: !u.omgekeerd }));
      if (goed(d)) uit.push({ tekst: u.lat.id + ' ' + (u.omgekeerd ? 'normaal monteren (sponning van de lat naar het glas, +' : 'omgekeerd monteren (dikke deel in de sponning, −') +
        nl(u.lat.eigenSponning) + ' mm): ' + kort(d), actie: onder ? null : { lat: u.lat.id, omgekeerd: !u.omgekeerd } });
    }
    // Een andere lat, zo nodig samen met een ander band binnen (v113: bij
    // Jans deur past E7 pas met 4 mm band binnen). Liefst met het band dat er
    // nu is; anders het band waarmee hij het best past. Een opdeklat met
    // eigen sponning in beide standen.
    // Onderin heeft een lat geen eigen montage: een opdeklat daar zit zoals
    // dezelfde lat boven (omgekeerd als die omgekeerd is), anders normaal
    // (controle v115: het advies beloofde anders iets wat niet bewaard wordt).
    var opties = [];
    var boven = latVoorRuit(r);
    LATTEN.forEach(function (l) {
      if (!latMagBij(l, z, u, onder)) return;
      var standen = !draaibaar(l) ? [false] : onder ? [l.id === boven.id && omgekeerd(r)] : [false, true];
      standen.forEach(function (om) {
        if (u.lat && l.id === u.lat.id && (onder || om === u.omgekeerd)) return;
        opties.push({ lat: l, om: om });
      });
    });
    var latten = opties.map(function (o) {
        var zelfde = pakket(r, met({ lat: o.lat.id, omgekeerd: o.om }));
        if (goed(zelfde)) return { lat: o.lat, om: o.om, x: zelfde, band: null };
        var best = null;
        [2, 3, 4].forEach(function (b) {
          if (b === u.bandBinnen) return;
          var x = pakket(r, met({ lat: o.lat.id, omgekeerd: o.om, bandBinnen: b }));
          if (goed(x) && (!best || Math.abs(x.over) < Math.abs(best.x.over))) best = { lat: o.lat, om: o.om, x: x, band: b };
        });
        return best;
      })
      .filter(Boolean)
      // v120: eerst wat netjes past (zicht, past) en pas daarna een
      // noodmaatregel (nood) of vlak; daarbinnen zonder ander band eerst.
      .sort(function (a, b) { return (ERNST[a.x.status] || 0) - (ERNST[b.x.status] || 0) || (a.band ? 1 : 0) - (b.band ? 1 : 0) || Math.abs(a.x.over) - Math.abs(b.x.over); });
    var nagemeten = function (l) { return l.zeker ? '' : ' (maat nog niet nagemeten)'; };
    latten.slice(0, 3).forEach(function (o) {
      var actie = onder ? { onderlat: o.lat.id } : { lat: o.lat.id, omgekeerd: o.om };
      if (o.band) actie.band = o.band;
      uit.push({ tekst: (onder ? 'Onderin ' : 'Lat ') + o.lat.naam + (o.om ? ' omgekeerd' : '') + nagemeten(o.lat) +
        (o.band ? ' + band binnen ' + o.band + ' mm' : '') + ': ' + kort(o.x), actie: actie });
    });
    // v120 (Jan: vlak ook onderin buiten oranje): daar houdt een randje
    // sponning water vast, dus eerst een neuslat aanraden als die past.
    if (onder && netjes && (z === 'buiten' || z === 'beide') && typeof neuslatVoor === 'function') {
      var neus = neuslatVoor(r);
      if (neus && neus.lat) uit.unshift({ tekst: 'Onderin een neuslat ' + neusTekst(neus) + ' (het water loopt af)', actie: { onderlat: neus.lat.id } });
    }
    if (u.status === 'past niet' && !u.frezen) uit.push({ tekst: (onder ? 'Onderdorpel' : 'Sponning') + ' uitfrezen naar ' + u.uitfrezenNaar + ' mm (' +
      nl(u.uitfrezenNaar - u.diepte) + ' mm dieper; laat genoeg hout voor de aanslag staan)', actie: { uitfrezen: true } });
    // Dunner glas alleen als het verschil klein is (anders geen bruikbaar advies).
    // (Geen actie: ander glas kies je zelf, in de tabel.)
    if (u.status === 'past niet' && u.maxGlas > 0 && u.glas - u.maxGlas <= 4) uit.push({ tekst: 'Of dunner glas: met deze lat en dit band max. ' +
      nl(u.maxGlas) + ' mm glas (glastype en opbouw zijn in de tabel aan te passen)', actie: null });
    return uit;
  }
  // Advies als er onderin geen neuslat past (v115).
  function neusAdvies(r, ol) {
    var n = ol.neus || {};
    if (ol.lat || n.rest == null) return [];
    var uit = [];
    if (ol.gekozen && !ol.lat) {
      // Zelf een te kleine gekozen: de kleinste die wel past.
      var auto = neuslatVoor(r);
      if (auto.lat) uit.push({ tekst: 'Neuslat ' + neusTekst(auto), actie: { onderlat: auto.lat.id } });
    }
    if (n.rest < -MARGE_MM) {
      // Het glas met band past onderin al niet: eerst dat.
      var nr = neusRest(r);
      if (!nr.frezen && !rw(r).uitfrezen) uit.push({ tekst: 'Onderdorpel uitfrezen naar ' + Math.ceil(nr.B - nr.rest) + ' mm (het glas met band past er nu niet in)',
        actie: { uitfrezen: true } });
      if (nr.bandBinnen > 2 && nr.rest + nr.bandBinnen - 2 >= -MARGE_MM) uit.push({ tekst: 'Band binnen 2 mm (rondom)', actie: { band: 2 } });
      return uit;
    }
    if (!ol.gekozen || !neuslatVoor(r).lat) {
      // Geen neuslat groot genoeg: een ventilatielat of schuine lat onderin.
      var z = zijde(r);
      LATTEN.filter(function (l) { return l.soort === 'ventilatie' || (l.soort === 'glaslat' && l.vorm === 'schuin'); })
        .map(function (l) { return { lat: l, x: pakket(r, { plek: 'onder', lat: l.id }) }; })
        .filter(function (o) { return goed(o.x) && latMagBij(o.lat, z, o.x, true); })
        .sort(function (a, b) { return Math.abs(a.x.over) - Math.abs(b.x.over); })
        .slice(0, 3)
        .forEach(function (o) { uit.push({ tekst: 'Onderin ' + o.lat.naam + ': ' + kort(o.x), actie: { onderlat: o.lat.id } }); });
    }
    return uit;
  }

  /* ─── tekeningen (geen foto: het profiel) ──────────────────────── */
  // Een eenvoudige doorsnede op schaal, met de maten erbij.
  function profielSVG(l, px) {
    px = px || 64;
    if (!l) return '';
    var w, h, pad = 6, pad2;
    var schaal, punten = '', extra = '';
    if (l.soort === 'neuslat') {
      w = l.eigenSponning + l.neus; h = l.hoogte;
      schaal = (px - 2 * pad) / Math.max(w, h * 2.2);
      var S = l.eigenSponning * schaal, W = w * schaal, H = h * schaal, u5 = 5 * schaal;
      // 18 hoog in totaal: het lijf boven de uitsparing is 13, de neus 18
      // (onderin een uitsparing van 5 mm, S breed, die over de dorpel valt).
      punten = [[0, 0], [W, 0], [W, H], [S, H], [S, H - u5], [0, H - u5]];
      extra = '<line x1="0" y1="' + (H + 3) + '" x2="' + S + '" y2="' + (H + 3) + '" stroke="#888" stroke-width="0.6"/>' +
              '<text x="' + (S / 2) + '" y="' + (H + 11) + '" font-size="8" text-anchor="middle" fill="#555">' + l.eigenSponning + '</text>';
      pad2 = H + 14;
    } else if (l.soort === 'opdek') {
      w = l.hoogte; h = l.dikte;
      schaal = (px - 2 * pad) / Math.max(w, h * 2);
      var Wo = w * schaal, Ho = h * schaal, c = (l.eigenSponning || 0) * schaal, d = 16 * schaal;
      punten = c ? [[0, 0], [Wo, 0], [Wo, Ho], [d, Ho], [d, Ho - c], [0, Ho - c]] : [[0, 0], [Wo, 0], [Wo, Ho], [0, Ho]];
      pad2 = Ho + 4;
    } else {
      w = l.inSponning; h = l.hoogte;
      schaal = (px - 2 * pad) / Math.max(w, h);
      var Wg = w * schaal, Hg = h * schaal;
      if (l.vorm === 'schuin') punten = [[0, 0], [Wg * 0.45, 0], [Wg, Hg * 0.45], [Wg, Hg], [0, Hg]];
      else if (l.vorm === 'rond') punten = null;
      else punten = [[0, 0], [Wg, 0], [Wg, Hg], [0, Hg]];
      if (l.soort === 'glaslat-sponning') punten = [[0, 0], [Wg * 0.45, 0], [Wg, Hg * 0.45], [Wg, Hg - 3 * schaal], [Wg - 3 * schaal, Hg - 3 * schaal], [Wg - 3 * schaal, Hg], [0, Hg]];
      if (l.soort === 'ventilatie') {
        extra = '<rect x="' + (Wg * 0.3) + '" y="' + (Hg - 2) + '" width="' + (Wg * 0.15) + '" height="2" fill="white"/>' +
                '<rect x="' + (Wg * 0.6) + '" y="' + (Hg - 2) + '" width="' + (Wg * 0.15) + '" height="2" fill="white"/>';
      }
      if (!punten) extra = '<path d="M0 ' + Hg + ' L0 0 Q ' + Wg + ' 0 ' + Wg + ' ' + Hg + ' Z" fill="#c8a27a" stroke="#7a5a3a" stroke-width="1"/>';
      pad2 = Hg + 4;
    }
    var poly = punten ? '<polygon points="' + punten.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') +
      '" fill="#c8a27a" stroke="#7a5a3a" stroke-width="1"/>' : '';
    return '<svg class="lat-profiel" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + px + ' ' + Math.max(px, pad2 + pad * 2) + '" width="' + px +
      '" height="' + px + '" role="img" aria-label="Profiel ' + esc(l.naam) + '">' + poly + extra + '</svg>';
  }

  // Montage van een opdeklat met eigen sponning (v115): doorsnede van de
  // kozijnrand met glas en lat. Normaal: de sponning van de lat aan de
  // glaskant (ruimte +c). Omgekeerd: het dikke deel steekt c de sponning in.
  // Links de aanslag, rechts de buitenkant van het kozijn (stippellijn).
  function montageSVG(l, om, px) {
    px = px || 76;
    if (!draaibaar(l)) return '';
    var D = 44, c = Math.max(3, Math.min(9, l.eigenSponning * 0.8)), T = 11;
    var x0 = om ? D - c : D;                  // waar de lat over het glas begint
    var lat = om ? [[D - c, 4], [D - c + T, 4], [D - c + T, 44], [D, 44], [D, 28], [D - c, 28]]
                 : [[D + c, 4], [D + T, 4], [D + T, 44], [D, 44], [D, 28], [D + c, 28]];
    var glasEind = om ? D - c : D + c;        // tot waar glas + band mogen
    var pijl = om ? '<text x="' + (D - c / 2) + '" y="62" font-size="11" text-anchor="middle" fill="#b42318" font-weight="700">−' + nl(l.eigenSponning) + '</text>'
                  : '<text x="' + (D + c / 2) + '" y="62" font-size="11" text-anchor="middle" fill="#1b7a3d" font-weight="700">+' + nl(l.eigenSponning) + '</text>';
    return '<svg class="lat-montage" viewBox="-8 0 74 66" width="' + px + '" height="' + Math.round(px * 66 / 74) + '" role="img" aria-label="' +
      esc(l.id + (om ? ' omgekeerd' : ' normaal')) + '">' +
      // kozijn: aanslag links, sponning (bodem) en de buitenkant
      '<path d="M-8 0 H0 V28 H' + D + ' V50 H-8 Z" fill="#e8dccb" stroke="#9a8064" stroke-width="0.8"/>' +
      // glas met band (blauw) tot waar het mag
      '<rect x="0" y="0" width="' + (glasEind - 0) + '" height="27" fill="#cfe8f3" stroke="#7aa7bd" stroke-width="0.6"/>' +
      '<line x1="' + D + '" y1="0" x2="' + D + '" y2="50" stroke="#1d1d1b" stroke-width="0.9" stroke-dasharray="2 2"/>' +
      '<polygon points="' + lat.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" fill="#c8a27a" stroke="#7a5a3a" stroke-width="1"/>' +
      pijl + '</svg>';
  }

  // Doorsnede van het pakket in de sponning, op schaal (venster per ruit).
  function pakketSVG(u) {
    if (!u || !(u.glas > 0)) return '';
    var B = u.diepte > 0 ? (u.frezen ? Math.max(u.diepte, u.uitfrezenNaar) : u.diepte) : u.nodig;
    var totaal = Math.max(B + (u.eigenSponning || 0), u.nodig) + 2;
    var breedte = 300, s = breedte / totaal, h = 46;
    var x = 0, delen = [];
    // Met een naam eronder (controle v113: welke 3 is welk band?).
    var stuk = function (mm, kleur, tekst, naam) {
      delen.push('<rect x="' + (x * s).toFixed(1) + '" y="8" width="' + Math.max(mm * s, 0.5).toFixed(1) + '" height="' + h + '" fill="' + kleur +
        '" stroke="#444" stroke-width="0.5"/>' + (mm * s > 16 ? '<text x="' + ((x + mm / 2) * s).toFixed(1) + '" y="' + (8 + h / 2 + 3) +
        '" font-size="9" text-anchor="middle" fill="#222">' + esc(tekst) + '</text>' : '') +
        (naam ? '<text x="' + ((x + mm / 2) * s).toFixed(1) + '" y="5" font-size="7" text-anchor="middle" fill="#666">' + esc(naam) + '</text>' : ''));
      x += mm;
    };
    // v115: ook een omgekeerde opdeklat neemt ruimte in de sponning in.
    var latStuk = u.inSponning ? u.inSponning / (u.keer || 1) : 0;
    if (latStuk && u.keer === 2) stuk(latStuk, '#c8a27a', u.lat.id, 'lat');   // twee kanten: ook een lat aan deze kant
    // De aanslag zit aan de andere kant dan de latten: latten binnen → het
    // band buiten tegen de aanslag; latten buiten → het band binnen (v115).
    var eerst = u.zijde === 'buiten' ? [u.bandBinnen, '#e9ecef'] : [u.bandBuiten, '#9aa3ad'];
    var dan = u.zijde === 'buiten' ? [u.bandBuiten, '#9aa3ad'] : [u.bandBinnen, '#e9ecef'];
    stuk(eerst[0], eerst[1], eerst[0], 'band');
    stuk(u.glas, '#cfe8f3', nl(u.glas) + ' glas', 'glas');
    stuk(dan[0], dan[1], dan[0], 'band');
    if (latStuk) stuk(latStuk, '#c8a27a', latLabel(u.lat, u.omgekeerd), 'lat');
    // Sponning in zicht (v115): gestreept tussen lat en buitenkant kozijn.
    var zicht = u.status === 'zicht' && u.zicht > 0 ? '<rect x="' + ((B - u.zicht) * s).toFixed(1) + '" y="8" width="' + (u.zicht * s).toFixed(1) + '" height="' + h +
      '" fill="url(#pk-arc)" stroke="#bbb" stroke-width="0.5"/><text x="' + ((B - u.zicht / 2) * s).toFixed(1) + '" y="5" font-size="7" text-anchor="middle" fill="#666">zicht</text>' : '';
    var sponLijn = '<line x1="' + (B * s).toFixed(1) + '" y1="0" x2="' + (B * s).toFixed(1) + '" y2="' + (h + 16) +
      '" stroke="' + (u.status === 'past niet' ? '#b42318' : '#1d1d1b') + '" stroke-width="1.5" stroke-dasharray="3 2"/>' +
      '<text x="' + (B * s - 2).toFixed(1) + '" y="' + (h + 26) + '" font-size="9" text-anchor="end" fill="#444">' +
      (u.plek === 'onder' ? 'onder ' : 'sponning ') + nl(B) + '</text>';
    var opdek = u.eigenSponning ? '<line x1="' + ((B + u.eigenSponning) * s).toFixed(1) + '" y1="0" x2="' + ((B + u.eigenSponning) * s).toFixed(1) +
      '" y2="' + (h + 16) + '" stroke="#c8a27a" stroke-width="1.5"/>' : '';
    return '<svg class="pakket-svg" viewBox="0 0 ' + (breedte + 4) + ' ' + (h + 32) + '" width="100%" role="img" aria-label="Doorsnede pakket">' +
      '<defs><pattern id="pk-arc" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="5" height="5" fill="#f1ebe3"/><line x1="0" y1="0" x2="0" y2="5" stroke="#d4c3ad" stroke-width="2"/></pattern></defs>' +
      '<rect x="0" y="0" width="2" height="' + (h + 16) + '" fill="#7a5a3a"/>' +
      '<text x="3" y="' + (h + 26) + '" font-size="8" fill="#7a5a3a">' + (u.keer === 2 ? 'geen aanslag' : 'aanslag') + '</text>' +
      delen.join('') + zicht + sponLijn + opdek + '</svg>';
  }

  // Doorsnede onderin met een neuslat (v115): glas met band, de dorpel, de
  // neuslat over de dorpel, en de ventilatie en uitsteek als maat.
  function neusSVG(r, n) {
    var nr = neusRest(r);
    if (!n || !n.lat || nr.rest == null) return '';
    var u = nr, S = n.lat.eigenSponning, N = n.lat.neus;
    var x0 = (u.keer === 2 ? nr.binnenLat : 0) + u.bandBinnen + u.glas + u.bandBuiten;   // waar de neuslat begint
    var B = nr.B;
    var totaal = Math.max(B, x0 + S + N) + 3;
    var breedte = 300, s = breedte / totaal;
    var X = function (mm) { return (mm * s).toFixed(1); };
    var h = '';
    // de dorpel (onder de sponning) met zijn voorkant
    h += '<rect x="0" y="52" width="' + X(B) + '" height="18" fill="#e8dccb" stroke="#9a8064" stroke-width="0.8"/>';
    h += '<text x="4" y="64" font-size="8" fill="#7a5a3a">dorpel</text>';
    // glas en band (staan op de dorpel, op blokjes)
    var x = 0;
    var vak = function (mm, kleur, tekst) {
      h += '<rect x="' + X(x) + '" y="4" width="' + X(mm) + '" height="44" fill="' + kleur + '" stroke="#444" stroke-width="0.5"/>' +
        (mm * s > 16 ? '<text x="' + X(x + mm / 2) + '" y="30" font-size="9" text-anchor="middle" fill="#222">' + esc(tekst) + '</text>' : '');
      x += mm;
    };
    if (u.keer === 2 && nr.binnenLat > 0) vak(nr.binnenLat, '#c8a27a', 'lat');
    vak(u.bandBinnen, '#e9ecef', u.bandBinnen);
    vak(u.glas, '#cfe8f3', nl(u.glas) + ' glas');
    vak(u.bandBuiten, '#9aa3ad', u.bandBuiten);
    // de neuslat: lijf over de dorpel (S) en de neus (N) voor het kozijn
    var y1 = 24, yL = 47, yN = 60;
    h += '<polygon points="' + [[x0, y1], [x0 + S + N, y1], [x0 + S + N, yN], [x0 + S, yN], [x0 + S, yL], [x0, yL]].map(function (p) {
      return X(p[0]) + ',' + p[1]; }).join(' ') + '" fill="#c8a27a" stroke="#7a5a3a" stroke-width="1"/>';
    h += '<text x="' + X(x0 + Math.min(S, 30) / 2 + 1) + '" y="39" font-size="9" fill="#3a2a1a">' + esc(n.lat.id) + '</text>';
    // voorkant kozijn
    h += '<line x1="' + X(B) + '" y1="0" x2="' + X(B) + '" y2="74" stroke="#1d1d1b" stroke-width="1.2" stroke-dasharray="3 2"/>';
    // maten: ventilatie en uitsteek
    var maat = function (a, b, y, tekst, kleur) {
      return '<line x1="' + X(a) + '" y1="' + y + '" x2="' + X(b) + '" y2="' + y + '" stroke="' + kleur + '" stroke-width="1"/>' +
        '<line x1="' + X(a) + '" y1="' + (y - 3) + '" x2="' + X(a) + '" y2="' + (y + 3) + '" stroke="' + kleur + '"/>' +
        '<line x1="' + X(b) + '" y1="' + (y - 3) + '" x2="' + X(b) + '" y2="' + (y + 3) + '" stroke="' + kleur + '"/>' +
        '<text x="' + X(b) + '" y="' + (y + 3) + '" dx="4" font-size="9" fill="' + kleur + '">' + esc(tekst) + '</text>';
    };
    h += maat(B, x0 + S, 82, 'ventilatie ' + nl(n.ventilatie), n.ventilatie >= NEUS_VRIJ_MM ? '#1b7a3d' : '#b42318');
    h += maat(B, x0 + S + N, 96, 'uitsteek ' + nl(n.uitsteek), '#444');
    return '<svg class="pakket-svg neus-svg" viewBox="0 0 ' + (breedte + 90) + ' 102" width="100%" role="img" aria-label="Doorsnede onderin met neuslat">' + h + '</svg>';
  }

  // Foto als die er is (latten/<id>.jpg), anders de tekening.
  function plaatje(l, px) {
    return '<span class="lat-plaatje" data-lat="' + esc(l.id) + '">' + profielSVG(l, px) +
      '<img src="' + esc(l.foto) + '" alt="" loading="lazy" onload="this.parentNode.classList.add(\'met-foto\')" onerror="this.remove()"></span>';
  }

  /* ─── vensters ─────────────────────────────────────────────────── */
  var laag = null;
  function grootWeg() { var g = document.querySelector('.lat-groot'); if (g && g.parentNode) { g.parentNode.removeChild(g); return true; } return false; }
  function sluit() {
    grootWeg();
    if (laag && laag.parentNode) laag.parentNode.removeChild(laag);
    laag = null;
    document.removeEventListener('keydown', toets, true);
  }
  // Escape: eerst de grote foto, dan het venster (controle v113). Staat er een
  // melding van de app boven (appFout), dan sluit Escape alleen die.
  function toets(e) {
    // v124: met de pijltjes langs de keuzes in het venster (glaslat, onderlat),
    // zoals in de latkiezer op Toebehoren; Enter kiest (het zijn knoppen).
    // Niet in een keuzelijst of vak: daar zijn de pijltjes van dat vak.
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && laag && !document.querySelector('.lat-groot')) {
      var t = e.target;
      if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      var lijst = Array.prototype.slice.call(laag.querySelectorAll('.lat-item')).filter(function (b) { return b.offsetParent !== null; });
      if (!lijst.length) return;
      var i = lijst.indexOf(document.activeElement);
      var naar = lijst[e.key === 'ArrowDown' ? Math.min(lijst.length - 1, i + 1) : Math.max(0, i - 1)];
      e.preventDefault();
      try { naar.focus({ preventScroll: true }); } catch (x) { naar.focus(); }
      if (naar.scrollIntoView) naar.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key !== 'Escape') return;
    if (window.appMeldingBezig && document.querySelector('.melding-laag')) return;
    e.preventDefault();
    if (!grootWeg()) sluit();
  }
  function venster(kop, html) {
    sluit();
    laag = document.createElement('div');
    laag.className = 'lat-laag';
    laag.innerHTML = '<div class="lat-venster" role="dialog" aria-modal="true" aria-label="' + esc(kop) + '">' +
      '<div class="lat-kop"><h3>' + esc(kop) + '</h3><button type="button" class="lat-sluit" aria-label="Sluiten">✕</button></div>' +
      '<div class="lat-inhoud">' + html + '</div></div>';
    laag.addEventListener('click', function (e) {
      if (e.target === laag || (e.target.closest && e.target.closest('.lat-sluit'))) sluit();
    });
    document.addEventListener('keydown', toets, true);
    document.body.appendChild(laag);
    if (window.fotoVoorbeeldenVullen) fotoVoorbeeldenVullen(laag);
    var knop = laag.querySelector('.lat-sluit');
    if (knop && knop.focus) try { knop.focus({ preventScroll: true }); } catch (e) { knop.focus(); }
    return laag;
  }
  window.latVensterOpen = function () { return !!laag || !!document.querySelector('.lat-groot'); };

  // Wijzigen mag niet als je alleen meekijkt, en sinds v114 ook niet na een
  // bestelling zonder ontgrendelen (keuze Jan: "mee op slot"). slotWeigert
  // dekt beide en meldt het; opSlot() is voor het tekenen (velden uit).
  function opSlot() { return !!(window.invoerOpSlot && invoerOpSlot()); }
  function magKiezen() {
    if (window.slotWeigert && slotWeigert()) return false;
    return true;
  }

  // Bovenin elk venster (v115, wens Jan): over welke ruit het gaat, met de
  // foto of tekening en zijn merkletter erop.
  function ruitKop(r) {
    var e = rw(r);
    var d = getal(e.sponningDiepte), dO = getal(e.diepteOnder);
    var foto = r.fotoId && window.fotoVoorbeeldHTML ? fotoVoorbeeldHTML(r.fotoId, { rijId: r.id, klein: true }) : '';
    var z = zijde(r);
    return '<div class="lat-ruitkop">' + foto + '<div class="lat-ruitkop-tekst"><b class="lat-ruitmerk">' + esc(r.merk || '(zonder merk)') + '</b>' +
      (parseInt(r.aantal, 10) > 1 ? ' ×' + parseInt(r.aantal, 10) : '') + '<small>' +
      esc([r.opbouw ? r.opbouw + (r.totaalDikte ? ' (' + nl(r.totaalDikte) + ' mm)' : '') : 'nog geen opbouw',
           d ? 'diepte ' + nl(d) + (dO && dO !== d ? ', onder ' + nl(dO) : '') : 'nog geen diepte',
           z ? 'latten ' + ZIJDE_NAAM[z] : 'latzijde nog kiezen'].join(' · ')) + '</small></div></div>';
  }

  // De keuzelijst met foto's: per soort, met per lat of hij past bij deze ruit.
  // Wat past staat bovenaan (controle v113: anders zoek je het tussen twintig
  // latten). Een opdeklat met eigen sponning staat er twee keer in: normaal en
  // omgekeerd, met een tekening van de montage (v115). terug: na het kiezen
  // weer het pakketvenster openen.
  function kiezer(id, terug) {
    var r = typeof getRij === 'function' ? getRij(id) : null;
    if (!r) return;
    var p = project();
    var e = rw(r);
    var z = zijde(r);
    var huidig = e.glaslat ? normaal(e.glaslat) : '';
    var huidigOm = omgekeerd(r);
    var regel = function (o) {
      var l = o.lat;
      var u = pakket(r, { lat: l.id, omgekeerd: o.om });
      var oordeel = u.status === 'onbekend' || u.status === 'geen' ? '' : '<span class="pk-chip pk-' + u.status.replace(' ', '-') + '">' + esc(kort(u)) + '</span>';
      var buitenRecht = (z === 'buiten' || z === 'beide') && (l.vorm === 'recht' || l.vorm === 'rond');
      return '<button type="button" class="lat-item' + (huidig === l.id && huidigOm === o.om ? ' gekozen' : '') + '" data-kies="' + esc(l.id) + '"' +
        (o.om ? ' data-om="1"' : '') + '>' + plaatje(l, 56) + (draaibaar(l) ? montageSVG(l, o.om, 60) : '') +
        '<span class="lat-tekst"><b>' + esc(l.id) + '</b> ' + esc(l.maat) + (draaibaar(l) ? ' · <b>' + (o.om ? 'omgekeerd' : 'normaal') + '</b>' : '') +
        '<small>' + (l.soort === 'opdek' ? (draaibaar(l) ? (o.om ? 'het dikke deel steekt ' + nl(l.eigenSponning) + ' mm de sponning in'
            : 'eigen sponning naar het glas: ' + nl(l.eigenSponning) + ' mm extra ruimte') : 'op het kozijn, vlak')
          : nl(l.inSponning) + ' mm in de sponning, ' + nl(l.hoogte) + ' hoog') +
        (buitenRecht ? ' · <i>buiten liever een schuine lat (water)</i>' : '') +
        (l.zeker ? '' : ' · <i>maat nog niet nagemeten</i>') + '</small></span>' + oordeel + '</button>';
    };
    var opties = [];
    LATTEN.forEach(function (l) {
      if (['glaslat', 'glaslat-sponning', 'opdek'].indexOf(l.soort) < 0) return;
      (draaibaar(l) ? [false, true] : [false]).forEach(function (om) { opties.push({ lat: l, om: om }); });
    });
    var passend = getal(e.sponningDiepte) > 0 ? opties.filter(function (o) {
      var u = pakket(r, { lat: o.lat.id, omgekeerd: o.om });
      // Bovenaan: wat past zonder veel sponning in zicht (dan liefst een bredere lat).
      return goed(u) && !(u.status === 'zicht' && u.zicht > 4);
    }) : [];
    var groepen = (passend.length ? '<div class="lat-groep lat-passend"><h4>Past bij deze ruit</h4>' + passend.map(regel).join('') + '</div>' : '') +
      ['glaslat', 'glaslat-sponning', 'opdek'].map(function (s) {
        var lijst = opties.filter(function (o) { return o.lat.soort === s && passend.indexOf(o) < 0; });
        return lijst.length ? '<div class="lat-groep"><h4>' + esc(SOORT_NAAM[s]) + '</h4>' + lijst.map(regel).join('') + '</div>' : '';
      }).join('');
    var std = latVan(p.lat);
    var html = ruitKop(r) + '<p class="lat-uitleg">Tik op een foto om hem groot te zien. Rechts: past het bij deze ruit' +
      (e.sponningDiepte ? ' (diepte ' + esc(nl(e.sponningDiepte)) + ' mm)' : ' (vul eerst de diepte in)') +
      '. Een gewone lat die ruimte over heeft, schuift verder in: dan blijft er wat sponning in zicht.</p>' +
      '<button type="button" class="lat-item' + (huidig ? '' : ' gekozen') + '" data-kies="">' + plaatje(std, 56) +
      '<span class="lat-tekst"><b>Projectstandaard</b> ' + esc(std.naam) + '<small>in te stellen bij de instellingen bovenaan Toebehoren</small></span></button>' + groepen;
    var l = venster('Glaslat · ' + (r.merk || 'deze ruit'), html);
    l.querySelector('.lat-inhoud').addEventListener('click', function (ev) {
      var foto = ev.target.closest && ev.target.closest('.lat-plaatje');
      if (foto && foto.closest('.lat-item')) { ev.stopPropagation(); groot(foto.getAttribute('data-lat')); return; }
      var knop = ev.target.closest && ev.target.closest('[data-kies]');
      if (!knop) return;
      kiesLat(id, knop.getAttribute('data-kies'), knop.getAttribute('data-om') === '1');
      sluit();
      if (terug) pakketVenster(id);
    });
  }

  // De onderlat kiezen (v115): automatisch, dezelfde lat als boven, een
  // neuslat (alleen die passen, met ventilatie en uitsteek), een
  // ventilatielat, of een andere lat.
  // v118 (Jan): een kruisje om een uitgeklapt blok weer in te klappen.
  var KRUIS_DETAILS = '<button type="button" class="sluit-x" aria-label="Inklappen" onclick="this.parentNode.open = false">✕</button>';
  function onderKiezer(id, terug) {
    var r = typeof getRij === 'function' ? getRij(id) : null;
    if (!r) return;
    var e = rw(r);
    var z = zijde(r);
    var keuze = onderKeuze(r);
    var boven = latVoorRuit(r);
    var no = neuslatOpties(r);
    var auto = neuslatVoor(r);
    var chip = function (u) {
      return u && u.status !== 'onbekend' && u.status !== 'geen' ? '<span class="pk-chip pk-' + u.status.replace(' ', '-') + '">' + esc(kort(u)) + '</span>' : '';
    };
    var item = function (waarde, plaatjeHTML, titel, uitleg, rechts) {
      return '<button type="button" class="lat-item' + (keuze === waarde ? ' gekozen' : '') + '" data-onder="' + esc(waarde) + '">' +
        plaatjeHTML + '<span class="lat-tekst">' + titel + '<small>' + uitleg + '</small></span>' + (rechts || '') + '</button>';
    };
    var autoTekst = z === 'buiten' ? (auto.lat ? 'buiten: de kleinste neuslat die past, nu ' + esc(neusTekst(auto)) : 'buiten: de kleinste neuslat die past' +
        (no.bekend ? ' (' + esc(auto.reden || 'geen') + ')' : ' (volgt uit de diepte)'))
      : 'dezelfde lat als boven (' + esc(latLabel(boven, omgekeerd(r))) + ')' + (z ? '' : '; buiten: een neuslat');
    var zelfdeU = pakket(r, { plek: 'onder', lat: boven.id });
    var html = ruitKop(r) +
      '<p class="lat-uitleg">Een <b>neuslat</b> ligt onderin over de dorpel; de neus moet minstens ' + NEUS_VRIJ_MM + ' mm vóór het kozijn blijven ' +
      '(ventilatie, het water moet weg). <b>Ventilatie</b> = de ruimte tussen kozijn en neus. <b>Uitsteek</b> = hoe ver de lat in totaal ' +
      'voor het kozijn uitsteekt (handig als je bestaande latten wilt volgen).' +
      (getal(e.diepteOnder) > 0 ? '' : ' Onderin rekent de app met de diepte van zij en boven' + (e.sponningDiepte ? ' (' + nl(e.sponningDiepte) + ' mm)' : '') +
        '; is de onderdorpel dieper, vul dan Onder in.') + '</p>' +
      item('', '<span class="lat-plaatje lat-auto">A</span>', '<b>Automatisch</b>', autoTekst) +
      item('ZELFDE', plaatje(boven, 56), '<b>Zelfde lat als boven</b> ' + esc(latLabel(boven, omgekeerd(r))), esc(boven.naam), chip(zelfdeU));
    // Neuslatten: alleen die passen (v115, wens Jan).
    var nh = '';
    if (!no.bekend) {
      nh = '<p class="lat-uitleg">Welke neuslatten passen, volgt uit de diepte' + (r.totaalDikte ? '' : ' en de glasopbouw') + '. Alle maten:</p>' +
        no.alle.map(function (l) { return item(l.id, plaatje(l, 56), '<b>' + esc(l.id) + '</b> ' + esc(l.maat), nl(l.eigenSponning) + ' mm over de dorpel, neus ' + nl(l.neus) + ' mm'); }).join('');
    } else if (no.glasPastNiet) {
      nh = '<p class="pk-oordeel pk-past-niet">Het glas met band past onderin niet: ' + esc(nl(-no.rest)) + ' mm te weinig. Eerst oplossen (uitfrezen, ander band of dunner glas).</p>';
    } else {
      nh = no.passend.map(function (x) {
        return item(x.lat.id, plaatje(x.lat, 56), '<b>' + esc(x.lat.id) + '</b> ' + esc(x.lat.maat) + (auto.lat && auto.lat.id === x.lat.id ? ' · kleinste' : ''),
          nl(x.ventilatie) + ' mm ventilatie · steekt ' + nl(x.uitsteek) + ' mm voor het kozijn uit',
          '<span class="pk-chip pk-past">' + nl(x.ventilatie) + ' mm vent.</span>');
      }).join('') || '<p class="pk-oordeel pk-past-niet">Geen neuslat groot genoeg: onderin is ' + esc(nl(no.rest)) + ' mm voor het glas; de grootste (N55) ' +
        'geeft dan ' + esc(nl(55 - no.rest)) + ' mm ventilatie. Kies hieronder een ventilatielat of schuine lat.</p>';
      if (no.teKlein.length) nh += '<p class="lat-uitleg">Te klein (minder dan ' + NEUS_VRIJ_MM + ' mm ventilatie): ' +
        esc(no.teKlein.map(function (x) { return x.lat.id; }).join(', ')) + '.</p>';
    }
    var andere = function (soorten, kop, open) {
      var lijst = LATTEN.filter(function (l) { return soorten.indexOf(l.soort) >= 0; });
      return '<details class="lat-groep"' + (open ? ' open' : '') + '><summary><h4>' + esc(kop) + '</h4></summary>' + KRUIS_DETAILS + lijst.map(function (l) {
        var u = pakket(r, { plek: 'onder', lat: l.id });
        var buitenRecht = (z === 'buiten' || z === 'beide') && (l.vorm === 'recht' || l.vorm === 'rond');
        return item(l.id, plaatje(l, 56), '<b>' + esc(l.id) + '</b> ' + esc(l.maat),
          (l.soort === 'opdek' ? 'op het kozijn' : nl(l.inSponning) + ' mm in de sponning') + (buitenRecht ? ' · <i>buiten liever schuin</i>' : ''), chip(u));
      }).join('') + '</details>';
    };
    // Neuslatten horen bij buitenbeglazing; bij binnen of beide ingeklapt
    // onderaan (controle v115).
    var neusBlok = z === 'buiten' || !z ? '<div class="lat-groep lat-passend"><h4>Neuslatten die passen</h4>' + nh + '</div>'
      : '<details class="lat-groep"' + (keuze && latVan(keuze) && latVan(keuze).soort === 'neuslat' ? ' open' : '') +
        '><summary><h4>Neuslatten die passen (buitenbeglazing)</h4></summary>' + KRUIS_DETAILS + nh + '</details>';
    // v117 (Jan): bij binnen kunnen ze helemaal niet (alleen voor buiten).
    var binnen = z === 'binnen';
    html += (z === 'buiten' || !z ? neusBlok : '') +
      (binnen ? '' : andere(['ventilatie'], 'Ventilatielatten', z === 'buiten' && no.bekend && !no.passend.length)) +
      andere(['glaslat', 'glaslat-sponning', 'opdek'], 'Andere lat onderin', keuze && keuze !== 'NEUS' && keuze !== 'ZELFDE' && latVan(keuze) && latVan(keuze).soort !== 'ventilatie') +
      (z === 'buiten' || !z || binnen ? '' : neusBlok) +
      (binnen ? '<p class="lat-uitleg">Latzijde binnen: neuslatten en ventilatielatten horen bij buitenbeglazing en zijn hier niet te kiezen.</p>' : '');
    var l = venster('Onderlat · ' + (r.merk || 'deze ruit'), html);
    l.querySelector('.lat-inhoud').addEventListener('click', function (ev) {
      var foto = ev.target.closest && ev.target.closest('.lat-plaatje');
      if (foto && foto.getAttribute('data-lat') && foto.closest('.lat-item')) { ev.stopPropagation(); groot(foto.getAttribute('data-lat')); return; }
      var knop = ev.target.closest && ev.target.closest('[data-onder]');
      if (!knop) return;
      kiesOnder(id, knop.getAttribute('data-onder'));
      sluit();
      if (terug) pakketVenster(id);
    });
  }

  function latInfo(l) {
    return l.soort === 'opdek' ? nl(l.dikte) + ' dik, ' + nl(l.hoogte) + ' breed, ' + (draaibaar(l) ? 'eigen sponning ' + nl(l.eigenSponning) +
        ' mm (normaal +' + nl(l.eigenSponning) + ', omgekeerd −' + nl(l.eigenSponning) + ')' : 'vlak (geen eigen sponning)')
      : l.soort === 'neuslat' ? nl(l.hoogte) + ' hoog, over de dorpel ' + nl(l.eigenSponning) + ' mm, neus ' + nl(l.neus) + ' mm'
      : nl(l.hoogte) + ' hoog, ' + nl(l.inSponning) + ' mm in de sponning';
  }
  function groot(latId) {
    var l = latVan(latId); if (!l) return;
    grootWeg();
    var g = document.createElement('div');
    g.className = 'lat-groot';
    // Zo groot als het scherm toelaat (iPad: ruim 400 px).
    var px = Math.max(220, Math.min(440, Math.round((window.innerWidth || 400) * 0.75)));
    // v114: daaronder de maattekening van Jongeneel, als die er is.
    g.innerHTML = '<div class="lat-groot-inhoud" style="max-width:' + (px + 40) + 'px">' + plaatje(l, px) +
      (l.tekening ? '<img class="lat-tek" src="' + esc(l.tekening) + '" alt="Maattekening ' + esc(l.id) + '" style="max-width:' + px +
        'px" onerror="this.remove()">' : '') +
      (draaibaar(l) ? '<div class="lat-montages">' + montageSVG(l, false, 110) + montageSVG(l, true, 110) + '</div>' : '') +
      '<p><b>' + esc(l.naam) + '</b><br>' + latInfo(l) + '<br>' +
      esc(l.hout) + ', ' + nl(l.lengte / 1000) + ' m · artikel ' + esc(l.artikel) + (l.opm ? '<br><i>' + esc(l.opm) + '</i>' : '') + '</p>' +
      '<button type="button" class="btn btn-secondary btn-sm">Sluiten</button>' +
      '<button type="button" class="sluit-x" aria-label="Sluiten">✕</button></div>';   // v118: kruisje
    g.addEventListener('click', function () { if (g.parentNode) g.parentNode.removeChild(g); });
    document.body.appendChild(g);
  }

  function kiesLat(id, latId, om) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Glaslat ' + (r.merk || ''));
    var l = latId ? OPNAAM[latId] : null;
    zetRw(id, 'glaslat', l ? latId : '');
    // De montage hoort bij de lat: bij de projectstandaard of een lat die
    // niet kan draaien gaat hij uit.
    var wordt = l || latVan(project().lat);
    zetRw(id, 'latOmgekeerd', om && draaibaar(wordt) ? true : '');
    naWijziging(id);
  }
  // Mag deze onderlat bij deze ruit? Neus- en ventilatielatten alleen als
  // de latzijde niet "binnen" is (v117, Jan).
  function onderMagBij(r, w, z) {
    var zz = z !== undefined ? z : zijde(r);
    if (zz !== 'binnen' || !w) return true;
    if (w === 'NEUS') return false;
    var l = latVan(normaal(w));
    return !(l && (l.soort === 'neuslat' || l.soort === 'ventilatie'));
  }
  function kiesOnder(id, waarde) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    var w = waarde === 'ZELFDE' || waarde === 'NEUS' ? waarde : waarde && latVan(waarde) ? normaal(waarde) : '';
    // v117: bij latzijde binnen geen neus- of ventilatielat.
    if (!onderMagBij(r, w)) {
      if (window.appMelding) appMelding('Bij latzijde binnen kan onderin geen neuslat of ventilatielat: die zijn voor buiten. ' +
        'Kies een lat voor binnen, of zet de latzijde op buiten.', { kop: 'Alleen voor buiten' });
      return;
    }
    if (window.bewaarStap) bewaarStap('Onderlat ' + (r.merk || ''));
    zetRw(id, 'onderlat', w);
    naWijziging(id);
  }
  function zetMontage(id, om) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (!draaibaar(latVoorRuit(r))) return;
    if (window.bewaarStap) bewaarStap('Montage ' + (r.merk || ''));
    zetRw(id, 'latOmgekeerd', om ? true : '');
    naWijziging(id);
  }

  // Na een wijziging: de cellen op Invoer, opslaan, Toebehoren.
  // vakLaten: de wijziging komt uit een vak in de tabel op Invoer zelf. Dan
  // dat vak NIET vervangen (het heeft nog de focus; vervangen brak het
  // ongedaan maken, controle v113); alleen de rest bijwerken.
  function naWijziging(id, vakLaten) {
    bijwerken(vakLaten ? id : null);
    if (typeof opslaan === 'function') opslaan();
    if (window.toebehorenNaWijziging) toebehorenNaWijziging();
  }

  // Het venster per ruit (v115): boven en zijkanten, onderin, met tekening,
  // oordeel en advies per plek, en alle keuzes.
  function pakketVenster(id) {
    var r = getRij(id); if (!r) return;
    var adv = { boven: [], onder: [] };
    var teken = function () {
      var u = pakket(r);
      var o = oordeelRuit(r);
      var p = project();
      var e = rw(r);
      var uit = opSlot() ? ' disabled' : '';
      var lat = latVoorRuit(r);
      var z = zijde(r);
      var dOnder = getal(e.diepteOnder);
      var slotTekst = uit && !(window.glasAlleenKijken && glasAlleenKijken()) ? '<p class="pk-slot">🔒 Op slot na de bestelling. Ontgrendelen kan via de balk bovenaan Invoer.</p>' : '';
      var zijdeVeld = '<label>Latzijde <span><select class="pk-zijde' + (z ? '' : ' leeg') + '"' + uit + '>' + zijdeOpties(z) + '</select></span>' +
        '<small>buiten: onderin de passende neuslat; binnen: onderin dezelfde lat; beide: glas tussen twee latten (geen aanslag), onderin dezelfde lat; ' +
        'geen: latten meegeleverd (nieuwe kozijnen)</small></label>';
      // v117: max glaspakket uit de maatstaat (import).
      var maxHTML = o.max ? '<h4 class="pk-plek">Max glaspakket (maatstaat)</h4><p class="pk-oordeel pk-' + o.max.status.replace(' ', '-') + '">' +
        esc(o.max.tekst) + '</p>' : '';
      if (u.status === 'geen') {
        adv = { boven: [], onder: [] };
        return ruitKop(r) + slotTekst + '<p class="pk-oordeel pk-leeg">Geen latten: meegeleverd met het kozijn. Toebehoren telt voor deze ruit alleen band, kit en tape.</p>' +
          maxHTML + '<div class="pk-velden">' + zijdeVeld + '</div>';
      }
      adv = { boven: adviezenMet(r), onder: adviezenMet(r, 'onder') };
      var advHTML = function (lijst, plek) {
        return lijst.length ? '<div class="pk-advies"><b>Zo past het wel' + (plek === 'onder' ? ' (onderin)' : '') + ':</b>' + (uit ? '' : ' <small>(tik om te kiezen)</small>') +
          '<ul>' + lijst.map(function (a, i) {
            return '<li>' + (a.actie && !uit ? '<button type="button" class="pk-advies-knop" data-advies="' + plek + ':' + i + '">' + esc(a.tekst) + '</button>' : esc(a.tekst)) + '</li>';
          }).join('') + '</ul></div>' : '';
      };
      // Boven en zijkanten
      var bovenHTML = '<h4 class="pk-plek">Boven en zijkanten</h4>' + (u.status === 'onbekend' ? '<p class="lat-uitleg">Nog niet te beoordelen: ' + esc(u.reden) + '.</p>'
        : pakketSVG(u) + '<p class="pk-oordeel pk-' + u.status.replace(' ', '-') + '">' + esc(u.tekst) + '</p>' +
          (u.vraag ? '<p class="pk-vraag">' + esc(u.vraag) + '</p>' : '')) + advHTML(adv.boven, 'boven');
      // Onderin
      var ol = o.onderlat;
      var onderHTML = '<h4 class="pk-plek">Onderin · ' + esc(ol.isNeus ? (ol.lat ? ol.lat.naam : 'neuslat') : latLabel(ol.lat, ol.zelfde && omgekeerd(r)) +
        (ol.zelfde ? ' (zelfde als boven)' : '')) + (dOnder ? ' · onder ' + nl(dOnder) + ' mm' : '') + '</h4>';
      if (ol.alleenBuiten) {
        onderHTML += '<p class="pk-oordeel pk-past-niet">' + esc(o.onder.tekst) + '.</p>';
      } else if (ol.isNeus) {
        onderHTML += ol.lat ? neusSVG(r, ol.neus) + '<p class="pk-oordeel pk-past">' + esc(neusTekst(ol.neus)) + '</p>'
          : ol.neus && ol.neus.rest != null ? '<p class="pk-oordeel pk-past-niet">Geen neuslat: ' + esc(ol.neus.reden) + '</p>'
          : '<p class="lat-uitleg">Welke neuslat, volgt uit de diepte en de glasopbouw.</p>';
      } else {
        var uo = pakketOnder(r);
        onderHTML += !uo || uo.status === 'onbekend' ? '<p class="lat-uitleg">Nog niet te beoordelen' + (uo && uo.reden ? ': ' + esc(uo.reden) : '') + '.</p>'
          : (o.onder ? pakketSVG(uo) + '<p class="pk-oordeel pk-' + uo.status.replace(' ', '-') + '">' + esc(uo.tekst) + '</p>'
            : '<p class="lat-uitleg">Zelfde lat en zelfde diepte als boven: zie hierboven.</p>');
      }
      onderHTML += advHTML(adv.onder, 'onder');
      var montage = draaibaar(lat) ? '<label>Montage ' + lat.id + ' <span><select class="pk-montage"' + uit + '>' +
        '<option value=""' + (omgekeerd(r) ? '' : ' selected') + '>normaal: sponning van de lat naar het glas (+' + nl(lat.eigenSponning) + ' mm)</option>' +
        '<option value="1"' + (omgekeerd(r) ? ' selected' : '') + '>omgekeerd: dikke deel in de sponning (−' + nl(lat.eigenSponning) + ' mm)</option>' +
        '</select>' + montageSVG(lat, omgekeerd(r), 60) + '</span></label>' : '';
      var onderNaam = keuzeNaam(r);
      return ruitKop(r) + slotTekst + bovenHTML + onderHTML + maxHTML +
        '<div class="pk-velden">' +
          '<div class="pk-paar">' +
          '<label>Diepte zij/boven <span><input type="text" inputmode="decimal" class="pk-diepte" value="' +
            esc(e.sponningDiepte != null ? String(e.sponningDiepte).replace('.', ',') : '') + '"' + uit +
            '> mm</span><small>loodrecht op het glas: aanslag tot buitenkant kozijn (bruikbaar, dus naast de scharniersponning)</small></label>' +
          '<label>Diepte onder <span><input type="text" inputmode="decimal" class="pk-onderdiepte" value="' +
            esc(dOnder ? String(dOnder).replace('.', ',') : '') + '" placeholder="' + esc(e.sponningDiepte ? String(e.sponningDiepte).replace('.', ',') : 'gelijk') + '"' + uit +
            '> mm</span><small>leeg = gelijk aan zij/boven</small></label>' +
          '</div>' +
          zijdeVeld +
          '<label>Glaslat <span><button type="button" class="btn btn-secondary btn-sm pk-lat"' + uit + '>' + esc(latLabel(lat, omgekeerd(r))) +
            ' ' + esc(lat.maat) + (e.glaslat ? '' : ' (standaard)') + ' ▾</button></span></label>' +
          montage +
          '<label>Onderlat <span><button type="button" class="btn btn-secondary btn-sm pk-onderlat"' + uit + '>' + esc(onderNaam) + ' ▾</button></span></label>' +
          '<label>Band binnen <span><select class="pk-band"' + uit + '>' +
            '<option value=""' + (e.bandBinnen ? '' : ' selected') + '>standaard (' + p.bandBinnen + ' mm)</option>' +
            BAND_BINNEN.map(function (b) { return '<option value="' + b + '"' + (+e.bandBinnen === b ? ' selected' : '') + '>' + b + ' mm' + (b === 5 ? ' (2 + 3)' : '') + '</option>'; }).join('') +
            '</select></span></label>' +
          // v118 (wens Jan): band buiten per ruit (3, 4 of 5; nooit 2).
          '<label>Band buiten <span><select class="pk-band-buiten"' + uit + '>' +
            '<option value=""' + (e.bandBuiten ? '' : ' selected') + '>standaard (' + p.bandBuiten + ' mm)</option>' +
            BAND_BUITEN.map(function (b) { return '<option value="' + b + '"' + (+e.bandBuiten === b ? ' selected' : '') + '>' + b + ' mm' + (b === 5 ? ' (2 + 3)' : '') + '</option>'; }).join('') +
            '</select></span><small>nooit 2 mm; 5 mm = 2 + 3 mm op elkaar</small></label>' +
          // Alleen als er iets te frezen valt (of het al aanstaat).
          (u.uitfrezenNaar > (getal(e.sponningDiepte) || 0) || e.uitfrezen || probleem(pakketOnder(r)) ||
            (o.onderlat.isNeus && o.onderlat.neus && o.onderlat.neus.rest < -MARGE_MM)
            ? '<label class="pk-frees"><input type="checkbox" class="pk-uitfrezen"' + (e.uitfrezen ? ' checked' : '') + uit + '> Sponning uitfrezen naar ' +
              '<b>' + u.uitfrezenNaar + ' mm</b>' + (getal(e.sponningDiepte) && u.uitfrezenNaar > getal(e.sponningDiepte)
                ? ' (' + nl(u.uitfrezenNaar - getal(e.sponningDiepte)) + ' mm dieper)' : '') + '</label>' : '') +
        '</div>' +
        (lat.zeker ? '' : '<p class="lat-uitleg"><i>De maat van ' + esc(lat.id) + ' is nog niet nagemeten: ' + esc(lat.opm || 'zie de lijst') + '</i></p>');
    };
    var l = venster('Latten · ' + (r.merk || 'ruit'), teken());
    var inhoud = l.querySelector('.lat-inhoud');
    var opnieuw = function () {
      var scroll = inhoud.scrollTop;
      inhoud.innerHTML = teken();
      inhoud.scrollTop = scroll;
      if (window.fotoVoorbeeldenVullen) fotoVoorbeeldenVullen(inhoud);
    };
    inhoud.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.classList.contains('pk-diepte')) { zetDiepte(id, t.value, true); opnieuw(); }
      else if (t.classList.contains('pk-onderdiepte')) { zetOnderDiepte(id, t.value, true); opnieuw(); }
      else if (t.classList.contains('pk-zijde')) { zetZijde(id, t.value, true); opnieuw(); }
      else if (t.classList.contains('pk-montage')) { zetMontage(id, t.value === '1'); opnieuw(); }
      else if (t.classList.contains('pk-band')) { zetBand(id, t.value); opnieuw(); }
      else if (t.classList.contains('pk-band-buiten')) { zetBandBuiten(id, t.value); opnieuw(); }
      else if (t.classList.contains('pk-uitfrezen')) { zetUitfrezen(id, t.checked); opnieuw(); }
    });
    inhoud.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.pk-lat')) { kiezer(id, true); return; }
      if (ev.target.closest && ev.target.closest('.pk-onderlat')) { onderKiezer(id, true); return; }
      var k = ev.target.closest && ev.target.closest('[data-advies]');
      if (k) {
        var d = k.getAttribute('data-advies').split(':');
        pasAdviesToe(id, ((adv[d[0]] || [])[+d[1]] || {}).actie);
        opnieuw();
      }
    });
  }
  // De naam van de onderlat-keuze, kort (knop in het venster en de tabel).
  function keuzeNaam(r) {
    var ol = onderlatVoorRuit(r);
    if (ol.geen) return '—';
    var k = onderKeuze(r);
    if (ol.alleenBuiten) return (ol.gekozen || ol.lat || { id: 'neuslat' }).id + ' · alleen buiten!';
    // v117 (Jan): ook hoe ver hij uitsteekt, zonder het venster te openen.
    if (ol.isNeus) return ol.lat ? ol.lat.id + ' · vent. ' + nl(ol.neus.ventilatie) + ' · uitst. ' + nl(ol.neus.uitsteek) : (ol.gekozen ? ol.gekozen.id + ' te klein' : 'neuslat ?');
    return (k === 'ZELFDE' || (!k && ol.zelfde) ? 'zelfde (' + ol.lat.id + ')' : ol.lat.id);
  }

  // Een advies aantikken (v114, keuze Jan): lat, montage, onderlat, band
  // en/of uitfrezen in één stap (één keer ongedaan maken).
  function pasAdviesToe(id, actie) {
    if (!actie || !magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Advies ' + (r.merk || ''));
    if (actie.lat && OPNAAM[actie.lat]) {
      zetRw(id, 'glaslat', actie.lat === project().lat ? '' : actie.lat);
      zetRw(id, 'latOmgekeerd', actie.omgekeerd && draaibaar(OPNAAM[actie.lat]) ? true : '');
    }
    if (actie.onderlat) zetRw(id, 'onderlat', actie.onderlat);
    if (actie.band) zetRw(id, 'bandBinnen', actie.band);
    if (actie.uitfrezen) zetRw(id, 'uitfrezen', true);
    naWijziging(id);
  }

  /* ─── wijzigen ───────────────────────────────────────────────────── */
  // Een getal voor de sponningdiepte, of null (leeg), of undefined (geen getal).
  // Ook voor doorvoeren (bulk.js), zodat daar dezelfde regel geldt.
  function diepteVan(waarde) {
    var t = String(waarde == null ? '' : waarde).trim().replace(',', '.');
    if (t === '') return null;
    var n = Number(t);
    return n > 0 && n < 200 ? Math.round(n * 10) / 10 : undefined;
  }
  // uitVenster: vanuit een venster of Toebehoren een eigen stap voor
  // ongedaan maken; in de tabel op Invoer doet het vak dat zelf
  // (focusin/focusout in undo.js).
  function zetDiepte(id, waarde, uitVenster) {
    if (!magKiezen()) { naWijziging(id, !uitVenster); return; }
    var r = getRij(id); if (!r) return;
    var n = diepteVan(waarde);
    if (n === undefined) {
      if (window.appFout) appFout('"' + waarde + '" is geen sponningdiepte. Vul de diepte in mm in (bijv. 45), of laat het vak leeg.',
        { kop: 'Sponningdiepte' });
      naWijziging(id, !uitVenster);
      return;
    }
    if (uitVenster && window.bewaarStap) bewaarStap('Sponningdiepte ' + (r.merk || ''));
    zetRw(id, 'sponningDiepte', n == null ? '' : n);
    naWijziging(id, !uitVenster);
  }
  function zetOnderDiepte(id, waarde, uitVenster) {
    if (!magKiezen()) { naWijziging(id, !uitVenster); return; }
    var r = getRij(id); if (!r) return;
    var n = diepteVan(waarde);
    if (n === undefined) {
      if (window.appFout) appFout('"' + waarde + '" is geen diepte. Vul de diepte onderin in mm in, of laat het vak leeg (= gelijk aan zij en boven).',
        { kop: 'Diepte onder' });
      naWijziging(id, !uitVenster);
      return;
    }
    if (uitVenster && window.bewaarStap) bewaarStap('Diepte onder ' + (r.merk || ''));
    zetRw(id, 'diepteOnder', n == null ? '' : n);
    naWijziging(id, !uitVenster);
  }
  // De latzijde. uitVenster: eigen ongedaan-stap.
  function zetZijde(id, waarde, uitVenster) {
    if (!magKiezen()) { naWijziging(id, !uitVenster); return; }
    var r = getRij(id); if (!r) return;
    if (uitVenster && window.bewaarStap) bewaarStap('Latzijde ' + (r.merk || ''));
    var w = ZIJDEN.indexOf(waarde) >= 0 ? waarde : '';
    zetRw(id, 'latZijde', w);
    // De oude vink "twee kanten" gaat op in de zijde.
    if (rw(r).tweeKanten) zetRw(id, 'tweeKanten', '');
    naWijziging(id, !uitVenster);
  }
  function zetBand(id, waarde) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Band binnen ' + (r.merk || ''));
    var n = parseInt(waarde, 10);
    zetRw(id, 'bandBinnen', BAND_BINNEN.indexOf(n) >= 0 ? n : '');
    naWijziging(id);
  }
  // v118: band buiten per ruit.
  function zetBandBuiten(id, waarde) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Band buiten ' + (r.merk || ''));
    var n = parseInt(waarde, 10);
    zetRw(id, 'bandBuiten', BAND_BUITEN.indexOf(n) >= 0 ? n : '');
    naWijziging(id);
  }
  function zetUitfrezen(id, aan) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Uitfrezen ' + (r.merk || ''));
    zetRw(id, 'uitfrezen', aan ? true : '');
    naWijziging(id);
  }

  /* ─── de twee vakken op Invoer (v115: Diepte en Onder) ───────────── */
  // Jan (v115): op Invoer alleen de diepten, compact; geen oordeel en geen
  // latkeuze (die staan op Toebehoren). Na een bestelling op slot (v114).
  function vakWaarde(v) { return v != null && v !== '' ? String(v).replace('.', ',') : ''; }
  function sponCellenHTML(r) {
    var e = rw(r);
    var uit = opSlot() ? ' disabled' : '';
    return '<td class="kol-spon" id="pk-' + r.id + '"><input type="text" inputmode="decimal" class="spon-input" value="' +
      esc(vakWaarde(e.sponningDiepte)) + '" placeholder="mm" aria-label="Sponningdiepte zij en boven ' + esc(r.merk || '') +
      '" onchange="latDiepte(' + r.id + ', this.value)"' + uit + '></td>' +
      '<td class="kol-sponon" id="pko-' + r.id + '"><input type="text" inputmode="decimal" class="spon-input spon-onder" value="' +
      esc(vakWaarde(e.diepteOnder)) + '" placeholder="' + esc(vakWaarde(e.sponningDiepte) || 'mm') + '" aria-label="Sponningdiepte onder ' + esc(r.merk || '') +
      '" title="Leeg = gelijk aan zij en boven" onchange="latOnderDiepte(' + r.id + ', this.value)"' + uit + '></td>';
  }
  function zijdeOpties(z) {
    return '<option value=""' + (z ? '' : ' selected') + '>?</option>' +
      ZIJDEN.map(function (w) { return '<option value="' + w + '"' + (z === w ? ' selected' : '') + '>' + ZIJDE_NAAM[w] + '</option>'; }).join('');
  }
  // De vakken op Invoer bijwerken met wat er bewaard is (na een wijziging
  // elders: Toebehoren, een venster, ongedaan maken). Een vak met de focus
  // blijft staan (daar typt iemand). laatId: dat vak niet aanraken.
  function bijwerken(laatId) {
    (typeof rijen !== 'undefined' ? rijen : []).forEach(function (r) {
      if (laatId != null && r.id === laatId) {
        // Alleen de placeholder van Onder volgt de diepte.
        var po = document.querySelector('#pko-' + r.id + ' input');
        if (po) po.placeholder = vakWaarde(rw(r).sponningDiepte) || 'mm';
        return;
      }
      var e = rw(r);
      [['pk-', vakWaarde(e.sponningDiepte)], ['pko-', vakWaarde(e.diepteOnder)]].forEach(function (x) {
        var vak = document.querySelector('#' + x[0] + r.id + ' input');
        if (vak && document.activeElement !== vak && vak.value !== x[1]) vak.value = x[1];
      });
      var o = document.querySelector('#pko-' + r.id + ' input');
      if (o) o.placeholder = vakWaarde(e.sponningDiepte) || 'mm';
    });
  }

  window.GlasLatten = {
    LATTEN: LATTEN, SOORT_NAAM: SOORT_NAAM, MARGE_MM: MARGE_MM, NEUS_VRIJ_MM: NEUS_VRIJ_MM, STANDAARD_LAT: STANDAARD_LAT, JONGENEEL: JONGENEEL,
    latVan: latVan, normaal: normaal, latVoorRuit: latVoorRuit, project: project, draaibaar: draaibaar, omgekeerd: omgekeerd, latLabel: latLabel,
    pakket: pakket, pakketOnder: pakketOnder, kort: kort, goed: goed, adviezen: adviezen, neuslatVoor: neuslatVoor, neuslatOpties: neuslatOpties,
    profielSVG: profielSVG, pakketSVG: pakketSVG, montageSVG: montageSVG, neusSVG: neusSVG, plaatje: plaatje, groot: groot, latInfo: latInfo,
    ruit: rw, diepteVan: diepteVan, zijde: zijde, ZIJDEN: ZIJDEN, ZIJDE_NAAM: ZIJDE_NAAM, onderKeuze: onderKeuze, keuzeNaam: keuzeNaam,
    onderlatVoorRuit: onderlatVoorRuit, oordeelRuit: oordeelRuit, kortRuit: kortRuit, adviezenMet: adviezenMet, zijdeOpties: zijdeOpties,
    opSlot: opSlot, ERNST: ERNST,
    BAND_BINNEN: BAND_BINNEN, BAND_BUITEN: BAND_BUITEN, bandBuitenVan: bandBuitenVan,
    pakketDikte: pakketDikte, maxPakket: maxPakket, maxOordeel: maxOordeel, opbouwTeDik: opbouwTeDik, onderMagBij: onderMagBij,
    maxType: maxType   // v124
  };
  window.latPakket = pakketVenster;
  window.latKiezen = kiezer;
  window.latOnderKiezen = onderKiezer;
  window.latKies = kiesLat;
  window.latOnderKies = kiesOnder;
  window.latMontage = zetMontage;
  window.latDiepte = zetDiepte;
  window.latBand = zetBand;
  window.latBandBuiten = zetBandBuiten;
  window.latUitfrezen = zetUitfrezen;
  window.latZijde = zetZijde;
  window.latOnderDiepte = zetOnderDiepte;
  window.latAdvies = pasAdviesToe;
  window.sponCellenHTML = sponCellenHTML;
  window.latPakketBijwerken = bijwerken;
  window.latVensterSluiten = sluit;
})();
