/* latten.js — glaslatten en "past het pakket in de sponning?" (v113)
 *
 * Wens van Jan (19-10-2026): de app moet glaslatten kennen (de typen van
 * Jongeneel, met maten en foto), per ruit de sponningdiepte kunnen opnemen,
 * en uitrekenen of glas + glasband + glaslat in de sponning past. Met een
 * waarschuwing als het niet past, en de keuze "sponning uitfrezen naar …".
 *
 * ── Hoe het zit (uitgezocht 19-10-2026; zie GLASLATTEN.md voor de bronnen) ──
 *
 * Sponningdiepte (Jan) = de ruimte LOODRECHT op het glas: van de aanslag
 * tot de buitenkant van het kozijn. (In NPR 3577 heet dat "sponningbreedte";
 * "sponninghoogte" is de maat langs het glas, de randafdekking, min. 17 mm.)
 * In die ruimte moet komen:
 *
 *     band aan de aanslagzijde + glas + band aan de latzijde + glaslat
 *
 * - Glas: de dikte van de opbouw (4-15-4 = 23 mm; gelaagd 33.1 = 3 + 3 +
 *   0,38 = 6,38 mm). De app rekent hem al uit (rij.totaalDikte).
 * - Glasband (dubbelzijdig PE-band, 9 mm breed): binnen 2, 3 of 4 mm;
 *   buiten 3 of 4 mm, NOOIT 2 (Jan: "werking"; de buitenkant werkt het meest
 *   door zon en vocht, Duitse/Oostenrijkse richtlijnen zeggen buiten ≥ binnen).
 * - Glaslat "a×b" (zo noemt Jongeneel hem, bijv. A4 17x15): a = hoogte langs
 *   het glas (min. 17 mm, KVT 12.3.2), b = de ruimte die hij IN de sponning
 *   inneemt. Een A4 17x15 neemt dus 15 mm in.
 * - Glaslat met sponninkje (A5): het sponninkje valt over de kozijnrand, dus
 *   er komt minder in de sponning (Jan: 12 mm bij een 17x15) en de rest
 *   steekt iets buiten het kozijn. Handig als het krap is.
 * - Opdeklat (E6, E7, …): komt OP het kozijn, raam of deur, niet in de
 *   sponning (0 mm). Een opdeklat met eigen sponning (bijv. 9x32 met 3x16)
 *   vergroot de ruimte: beschikbaar = sponningdiepte + eigen sponning.
 *   Voorbeeld van Jan: deur 40 mm, sponning 27 mm; 22 mm glas (4-13-5) + 3 +
 *   3 mm band = 28 mm past niet eens zonder lat. Met een opdeklat met 5 mm
 *   sponning wordt het 32 mm: 4 mm over, het glas zit los (te ruim). E7
 *   (3 mm) met 4 mm band binnen: 30 tegen 29 mm, ruim +1. Dat advies geeft
 *   adviezen() hieronder.
 * - Neuslat (N25 … N55, alleen onderaan, bij buitenbeglazing): "18x50" is
 *   18 hoog en 50 in totaal breed, maar dat is NIET wat hij in de sponning
 *   inneemt. Onderin zit een uitsparing van ±5 mm hoog en S mm breed (S =
 *   het modelnummer, N35 → 35 mm) die over de dorpel valt; de rest is de
 *   neus die vóór het kozijn uitsteekt (druiplijst). Volgens de tekeningen
 *   van Jongeneel is die neus 9 mm (v114; tot v113 stond hier 15).
 *   Hij past als: afstand glas → voorkant dorpel + 5 mm ≤ S (KVT 12.3.1:
 *   de neus minstens 5 mm vrij van de voorkant van de dorpel). De app kiest
 *   dan de kleinste die past.
 * - Ventilatie-glaslat (C1–C3): onderaan bij buitenbeglazing; gaatjes of
 *   sleuven aan de onderkant ventileren de sponning. Niets te maken met een
 *   Duco-rooster (dat ventileert de ruimte).
 *
 * Wanneer past het (keuze van Jan): tot 1 mm te krap vangt het band op
 * (inpersen), tot 1 mm te ruim is ook goed; beide wel melden als "krap" of
 * "ruim". Meer dan 1 mm te krap = past niet; meer dan 1 mm te ruim = de lat
 * zit los (advies: dikker band binnen, of een bredere lat).
 *
 * De maten hieronder komen van Jongeneel: de nettomaat op de productpagina en
 * de maattekening op de foto's (v114 nagekeken). Wat niet zeker is, staat op
 * zeker: false en toont de app als "maat nog niet nagemeten".
 * Foto's: latten/<id>.jpg (productfoto) en latten/<id>-tek.jpg (maattekening),
 * van de pagina's in latfotos.txt. Jongeneel houdt scripts tegen met een
 * beveiligingsscherm; een nieuwe foto laat je door Claude ophalen via de
 * browser in de desktopapp (BEHEER.md §6). Zolang een foto er niet is,
 * tekent de app het profiel.
 */
(function () {
  'use strict';

  /* ═══ INSTELLINGEN ═════════════════════════════════════════════ */
  var MARGE_MM = 1;            // tot zoveel te krap of te ruim: past nog (Jan, v113)
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
    { id: 'C1',  soort: 'ventilatie', vorm: 'schuin', maat: '17x26', hoogte: 17, inSponning: 26, artikel: 'B7641017026400.FVG', zeker: true },
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
  var MET_TEKENING = { A4: 1, A5: 1, A10: 1, A12: 1, A16: 1, B1: 1, B5: 1, B13: 1, B14: 1, B17: 1, C1: 1, E22: 1, GLD1: 1, GLD2: 1,
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
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function nl(n) { return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 }); }

  // De keuzes per ruit (sponningdiepte, glaslat, band binnen, uitfrezen, en
  // sinds v114 latzijde en diepte onderdorpel) staan bij het project onder
  // Toebehoren (info.toebehoren.perRuit), niet op de ruit zelf (v113, na de
  // controle): een wijziging op de ruit geeft hem een nieuw stempel (gewOp),
  // en dan herkent de app een oudere stand van een ander apparaat niet meer
  // ("Oudere stand?"). Wijzigen gaat sinds v114 wél mee op slot na een
  // bestelling (keuze Jan); zie magKiezen().
  function rw(r) { return (r && window.toebehorenRuit && toebehorenRuit(r)) || {}; }
  function zetRw(id, veld, waarde) { if (window.toebehorenZetRuit) toebehorenZetRuit(id, veld, waarde); }

  // Aan welke kant de latten zitten (v114, Jan: "geen standaard zijde, dit
  // wisselt continu, ook binnen een kozijn"): 'binnen', 'buiten', 'beide' of
  // '' (nog niet gekozen). Een oude vink "latten twee kanten" (v111–v113)
  // telt als 'beide'.
  var ZIJDEN = ['binnen', 'buiten', 'beide'];
  function zijde(r) {
    var e = rw(r);
    if (ZIJDEN.indexOf(e.latZijde) >= 0) return e.latZijde;
    return e.tweeKanten ? 'beide' : '';
  }

  /* ─── de keuzes van het project (staan in toebehoren.js) ───────── */
  function project() {
    var k = window.toebehorenKeuzes ? toebehorenKeuzes() : null;
    k = k || {};
    var buitenDikte = getal(k.buiten && k.buiten.dikte);
    var binnenDikte = getal(k.binnen && k.binnen.dikte);
    return {
      lat: latVan(k.standaardLat) && latVan(k.standaardLat).soort !== 'neuslat' ? normaal(k.standaardLat) : STANDAARD_LAT,
      bandBinnen: [2, 3, 4].indexOf(binnenDikte) >= 0 ? binnenDikte : 3,
      // Buiten nooit 2 mm (Jan): een oude 2 telt als 3.
      bandBuiten: buitenDikte === 4 ? 4 : 3
    };
  }

  // De lat die voor deze ruit geldt (boven en zijkanten).
  function latVoorRuit(r) {
    var eigen = rw(r).glaslat ? latVan(rw(r).glaslat) : null;
    if (eigen && eigen.soort !== 'neuslat') return eigen;
    return latVan(project().lat) || OPNAAM[STANDAARD_LAT];
  }

  /* ─── past het? ──────────────────────────────────────────────── */
  // Geeft { status, over, nodig, beschikbaar, glas, bandBinnen, bandBuiten,
  //         lat, uitfrezenNaar, maxGlas, tekst } of { status: 'onbekend', reden }.
  // status: 'past' | 'krap' | 'ruim' | 'te ruim' | 'past niet' | 'onbekend'
  function pakket(r, anders) {
    anders = anders || {};
    var p = project();
    var e = rw(r);
    // plek 'onder' (v114): de onderdorpel, met zijn eigen diepte als die is
    // ingevuld (anders dezelfde als de stijlen).
    var diepte = getal(anders.sponningDiepte !== undefined ? anders.sponningDiepte
      : anders.plek === 'onder' && getal(e.diepteOnder) > 0 ? e.diepteOnder : e.sponningDiepte);
    var glas = getal(r && r.totaalDikte);
    var lat = anders.lat ? latVan(anders.lat) : latVoorRuit(r);
    var bandBinnen = getal(anders.bandBinnen !== undefined ? anders.bandBinnen : e.bandBinnen);
    if ([2, 3, 4].indexOf(bandBinnen) < 0) bandBinnen = p.bandBinnen;
    var bandBuiten = p.bandBuiten;
    var uitfrezen = anders.uitfrezen !== undefined ? !!anders.uitfrezen : !!e.uitfrezen;
    // Latten aan beide kanten (binnen en buiten): het glas zit tussen twee
    // latten, zonder aanslag, dus de lat telt twee keer (v113; Jan bevestigd).
    var keer = (anders.tweeKanten !== undefined ? anders.tweeKanten : zijde(r) === 'beide') ? 2 : 1;
    var uit = { glas: glas, bandBinnen: bandBinnen, bandBuiten: bandBuiten, lat: lat, diepte: diepte, uitfrezen: uitfrezen, keer: keer };
    if (!(glas > 0)) { uit.status = 'onbekend'; uit.reden = 'nog geen glasopbouw'; return uit; }
    var inSp = (lat ? (lat.soort === 'opdek' ? 0 : getal(lat.inSponning) || 0) : 0) * keer;
    var extra = (lat && lat.soort === 'opdek' ? getal(lat.eigenSponning) || 0 : 0) * keer;
    uit.inSponning = inSp; uit.eigenSponning = extra;
    uit.nodig = Math.round((glas + bandBinnen + bandBuiten + inSp) * 100) / 100;
    // Uitfrezen: de sponning wordt zo diep als nodig (glas + band + lat).
    uit.uitfrezenNaar = Math.ceil(uit.nodig - extra);
    if (!(diepte > 0)) { uit.status = 'onbekend'; uit.reden = 'nog geen sponningdiepte'; return uit; }
    var beschikbaar = (uitfrezen ? Math.max(diepte, uit.uitfrezenNaar) : diepte) + extra;
    uit.beschikbaar = beschikbaar;
    // Uitfrezen aan terwijl de sponning al diep genoeg is: er valt niets te frezen.
    uit.frezen = uitfrezen && uit.uitfrezenNaar > diepte;
    // Kleiner dan glas + band: misschien de maat langs het glas gemeten
    // (in veel bronnen heet díe "sponningdiepte", meestal 17–20 mm).
    if (diepte < glas + bandBinnen + bandBuiten) uit.vraag = 'Is ' + nl(diepte) + ' mm de maat loodrecht op het glas (van de aanslag tot ' +
      'de buitenkant van het kozijn)? Hij is kleiner dan glas en band samen (' + nl(glas + bandBinnen + bandBuiten) + ' mm).';
    uit.maxGlas = Math.round((diepte + extra - bandBinnen - bandBuiten - inSp) * 100) / 100;
    var over = Math.round((beschikbaar - uit.nodig) * 100) / 100;
    uit.over = over;
    uit.status = over < -MARGE_MM ? 'past niet' : over < 0 ? 'krap' : over === 0 ? 'past' : over <= MARGE_MM ? 'ruim' : 'te ruim';
    uit.tekst = pakketTekst(uit);
    return uit;
  }

  function pakketTekst(u) {
    var delen = nl(u.glas) + ' glas + ' + u.bandBinnen + ' + ' + u.bandBuiten + ' band' +
      (u.lat && u.lat.soort !== 'opdek' ? ' + ' + (u.keer === 2 ? '2 × ' + nl(u.inSponning / 2) : nl(u.inSponning)) +
        ' lat (' + u.lat.id + (u.keer === 2 ? ', twee kanten' : '') + ')' : '') +
      ' = ' + nl(u.nodig) + ' mm';
    var ruimte = (u.frezen ? 'uitgefreesd ' + nl(u.beschikbaar - (u.eigenSponning || 0)) : 'sponning ' + nl(u.diepte)) +
      (u.eigenSponning ? ' + ' + nl(u.eigenSponning) + ' (opdeklat ' + u.lat.id + (u.keer === 2 ? ', twee kanten' : '') + ')' : '') + ' mm';
    var oordeel = u.status === 'past' ? 'past precies'
      : u.status === 'krap' ? 'krap: ' + nl(-u.over) + ' mm te dik (het band vangt het op)'
      : u.status === 'ruim' ? 'ruim: ' + nl(u.over) + ' mm over'
      // Bij een gewone glaslat ligt de lat dan terug (dikker band of een bredere
      // lat lost het op); bij een opdeklat klemt het glas niet (controle v113).
      : u.status === 'te ruim' ? 'te ruim: ' + nl(u.over) + ' mm over, ' +
        (u.lat && u.lat.soort === 'opdek' ? 'het glas klemt niet' : 'de lat ligt ' + nl(u.over) + ' mm terug')
      : 'past niet: ' + nl(-u.over) + ' mm te weinig';
    return delen + '; ' + ruimte + ' → ' + oordeel;
  }

  // Korte tekst voor in de tabel en de pdf: "ruim +1", "PAST NIET −3".
  function kort(u) {
    if (!u || u.status === 'onbekend') return '';
    var s = (u.over > 0 ? '+' : u.over < 0 ? '−' : '') + nl(Math.abs(u.over));
    return { 'past': 'past', 'krap': 'krap ' + s, 'ruim': 'ruim ' + s, 'te ruim': 'te ruim ' + s, 'past niet': 'past niet ' + s }[u.status] +
      (u.frezen ? ' (frezen ' + u.uitfrezenNaar + ')' : '');
  }

  // Wat wel past, als het niet (goed) past: een paar concrete keuzes.
  // v114: elk advies met een actie ({ lat, band, uitfrezen }), zodat je het in
  // het venster kunt aantikken (keuze Jan). adviezen() geeft alleen de teksten.
  function adviezen(r) { return adviezenMet(r).map(function (a) { return a.tekst; }); }
  function adviezenMet(r) {
    var u = pakket(r);
    if (u.status === 'onbekend' || u.status === 'past' || u.status === 'krap' || u.status === 'ruim') return [];
    var uit = [];
    var goed = function (x) { return x.status === 'past' || x.status === 'krap' || x.status === 'ruim'; };
    [2, 3, 4].forEach(function (b) {
      if (b === u.bandBinnen) return;
      var x = pakket(r, { bandBinnen: b });
      if (goed(x)) uit.push({ tekst: 'Band binnen ' + b + ' mm: ' + kort(x), actie: { band: b } });
    });
    // Een andere lat, zo nodig samen met een ander band binnen (v113: bij
    // Jans deur past E7 pas met 4 mm band binnen). Liefst met het band dat er
    // nu is; anders het band waarmee hij het best past.
    // Geen latjes lager dan 17 mm bij dubbel glas (KVT 12.3.2: min. 17 hoog;
    // A16 15x33 en de grenen 9 mm latjes zijn voor enkel glas).
    var latten = LATTEN.filter(function (l) { return l.soort !== 'neuslat' && l.soort !== 'ventilatie' && (!u.lat || l.id !== u.lat.id) &&
        !(u.glas > 8 && l.soort !== 'opdek' && l.hoogte < 17); })
      .map(function (l) {
        var zelfde = pakket(r, { lat: l.id });
        if (goed(zelfde)) return { lat: l, x: zelfde, band: null };
        var best = null;
        [2, 3, 4].forEach(function (b) {
          if (b === u.bandBinnen) return;
          var x = pakket(r, { lat: l.id, bandBinnen: b });
          if (goed(x) && (!best || Math.abs(x.over) < Math.abs(best.x.over))) best = { lat: l, x: x, band: b };
        });
        return best;
      })
      .filter(Boolean)
      .sort(function (a, b) { return (a.band ? 1 : 0) - (b.band ? 1 : 0) || Math.abs(a.x.over) - Math.abs(b.x.over); });
    var nagemeten = function (l) { return l.zeker ? '' : ' (maat nog niet nagemeten)'; };
    latten.slice(0, 3).forEach(function (o) {
      uit.push({ tekst: 'Lat ' + o.lat.naam + nagemeten(o.lat) + (o.band ? ' + band binnen ' + o.band + ' mm' : '') + ': ' + kort(o.x),
                 actie: o.band ? { lat: o.lat.id, band: o.band } : { lat: o.lat.id } });
    });
    // Te ruim en geen lat die binnen 1 mm past: de breedste die erin past
    // (hij ligt dan wat terug; in de praktijk vaak goed, zie GLASLATTEN.md).
    if (u.status === 'te ruim' && !latten.length) {
      var breedste = LATTEN.filter(function (l) { return l.soort !== 'opdek' && l.soort !== 'neuslat' && l.soort !== 'ventilatie' &&
          !(u.glas > 8 && l.hoogte < 17); })
        .map(function (l) { return { lat: l, x: pakket(r, { lat: l.id, bandBinnen: 4 }) }; })
        .filter(function (o) { return o.x.over >= -MARGE_MM; })
        .sort(function (a, b) { return a.x.over - b.x.over; })[0];
      if (breedste && (!u.lat || breedste.lat.id !== u.lat.id)) uit.push({ tekst: 'Breedste lat die erin past: ' + breedste.lat.naam +
        nagemeten(breedste.lat) + ' + band binnen 4 mm: ligt ' + nl(Math.max(0, breedste.x.over)) + ' mm terug',
        actie: { lat: breedste.lat.id, band: 4 } });
    }
    if (u.status === 'past niet' && !u.frezen) uit.push({ tekst: 'Sponning uitfrezen naar ' + u.uitfrezenNaar + ' mm (' +
      nl(u.uitfrezenNaar - u.diepte) + ' mm dieper; laat genoeg hout voor de aanslag staan)', actie: { uitfrezen: true } });
    // Dunner glas alleen als het verschil klein is (anders geen bruikbaar advies).
    // (Geen actie: ander glas kies je zelf in de tabel.)
    if (u.status === 'past niet' && u.maxGlas > 0 && u.glas - u.maxGlas <= 4) uit.push({ tekst: 'Of dunner glas: met deze lat en dit band max. ' +
      nl(u.maxGlas) + ' mm glas', actie: null });
    return uit;
  }

  // Neuslat onderaan (buitenbeglazing): de kleinste die past.
  // rest = afstand van het glas (met band) tot de voorkant van de dorpel.
  // gekozen: een bepaalde neuslat (v114, onderlat per ruit op Toebehoren);
  // anders kiest de app de kleinste die past.
  function neuslatVoor(r, gekozen) {
    var u = pakket(r, { plek: 'onder' });   // v114: met de diepte van de onderdorpel
    if (u.status === 'onbekend' || !(u.diepte > 0)) return { lat: null, reden: u.reden || 'onbekend' };
    // De sponning onderin zoals hij wordt (uitgefreesd als dat aanstaat),
    // min glas en band. De glaslat van boven telt hier niet: onderin komt
    // de neuslat in plaats daarvan.
    // Bij latten aan twee kanten zit aan de andere kant onderin wel een gewone lat.
    var rest = Math.round(((u.uitfrezen ? Math.max(u.diepte, u.uitfrezenNaar) : u.diepte) - u.glas - u.bandBinnen - u.bandBuiten -
      (u.keer === 2 ? u.inSponning / 2 : 0)) * 100) / 100;
    // Past het glas met band er onderin al niet (meer dan de marge), dan ook geen neuslat.
    if (rest < -MARGE_MM) return { lat: null, rest: rest, nodigS: null, uitsteek: null, reden: 'het glas past er al niet in' };
    var nodigS = rest + NEUS_VRIJ_MM;
    var kandidaten = LATTEN.filter(function (l) { return l.soort === 'neuslat'; })
      .sort(function (a, b) { return a.eigenSponning - b.eigenSponning; });
    var lat = gekozen ? (gekozen.eigenSponning >= nodigS ? gekozen : null)
      : kandidaten.filter(function (l) { return l.eigenSponning >= nodigS; })[0] || null;
    return { lat: lat, rest: rest, nodigS: nodigS,
             uitsteek: lat ? Math.round((lat.eigenSponning - rest + lat.neus) * 100) / 100 : null,
             reden: lat ? '' : gekozen ? gekozen.id + ' is te smal (nodig ' + nl(nodigS) + ' mm over de dorpel)'
               : 'geen neuslat breed genoeg (nodig ' + nl(nodigS) + ' mm over de dorpel)' };
  }

  // De onderlat van deze ruit (v114). Volgt de latzijde (keuze Jan):
  // buiten → de passende neuslat; binnen → dezelfde lat als boven; beide →
  // buiten de neuslat (binnen onderin dezelfde lat, telt toebehoren.js apart);
  // nog geen zijde → dezelfde lat als boven. Een eigen keuze per ruit op
  // Toebehoren (onderlat) gaat altijd voor.
  // Geeft { id: lattype of 'NEUS', lat, neus (bij NEUS: neuslatVoor), eigen }.
  function onderlatVoorRuit(r) {
    var e = rw(r);
    var boven = latVoorRuit(r);
    var eigen = e.onderlat === 'Glaslat' ? '' : normaal(e.onderlat);   // 'Glaslat' (v111) = zelfde als boven
    var keuze = eigen || (zijde(r) === 'buiten' || zijde(r) === 'beide' ? 'NEUS' : boven.id);
    if (keuze === 'NEUS') {
      var n = neuslatVoor(r);
      return { id: n.lat ? n.lat.id : 'NEUS', lat: n.lat, neus: n, eigen: !!eigen, isNeus: true };
    }
    var l = latVan(keuze) || boven;
    // Een bepaalde neuslat gekozen (bijv. N30): als neuslat beoordelen (heeft
    // geen "in de sponning"), niet als gewone lat (controle v114).
    if (l.soort === 'neuslat') {
      var ng = neuslatVoor(r, l);
      return { id: l.id, lat: ng.lat, neus: ng, eigen: !!eigen, isNeus: true };
    }
    return { id: l.id, lat: l, neus: null, eigen: !!eigen, isNeus: false };
  }

  // Het oordeel over de hele ruit (v114): boven en zijkanten, en onderin
  // (eigen diepte van de onderdorpel, of een andere onderlat). Het slechtste
  // telt voor het label in de tabel en de controle bij de bestellijst.
  var ERNST = { 'onbekend': 0, 'past': 1, 'ruim': 2, 'krap': 3, 'te ruim': 4, 'past niet': 5 };
  function oordeelRuit(r) {
    var boven = pakket(r);
    var o = onderlatVoorRuit(r);
    var onder = null;
    var e = rw(r);
    if (o.isNeus) {
      // Alleen iets te zeggen als de diepte er is.
      if (boven.status !== 'onbekend' || getal(e.diepteOnder) > 0) {
        onder = o.lat ? { status: 'past', tekst: 'onderin ' + o.lat.naam + ' (neus ' + nl(o.neus.uitsteek) + ' mm voorbij de dorpel)', neus: o.neus }
          : o.neus && o.neus.reden && o.neus.reden !== 'onbekend' && o.neus.reden !== 'nog geen sponningdiepte' && o.neus.reden !== 'nog geen glasopbouw'
            ? { status: 'past niet', tekst: 'onderin geen neuslat: ' + o.neus.reden, neus: o.neus, over: null } : null;
      }
    } else if (o.lat.id !== latVoorRuit(r).id || getal(e.diepteOnder) > 0) {
      onder = pakket(r, { lat: o.lat.id, plek: 'onder' });
      if (onder.status === 'onbekend') onder = null;
    }
    var slechtste = boven, waar = 'boven';
    if (onder && ERNST[onder.status] > ERNST[boven.status]) { slechtste = onder; waar = 'onder'; }
    return { boven: boven, onder: onder, onderlat: o, slechtste: slechtste, waar: waar };
  }
  // Kort voor het label: "past niet −4", of "onder: past niet −3", of "geen neuslat".
  function kortRuit(o) {
    if (o.waar === 'onder') {
      // Een neuslat die past (boven nog onbekend): de neuslat noemen (controle v114).
      if (o.slechtste.over == null) {
        var ol = o.onderlat || {};
        return ol.lat ? 'onder: ' + ol.lat.id : ol.eigen && ol.id && ol.id !== 'NEUS' ? 'onder: ' + ol.id + ' te smal' : 'geen neuslat';
      }
      return 'onder: ' + kort(o.slechtste);
    }
    return kort(o.boven);
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
    var latStuk = u.lat && u.lat.soort !== 'opdek' ? u.inSponning / (u.keer || 1) : 0;
    if (latStuk && u.keer === 2) stuk(latStuk, '#c8a27a', u.lat.id, 'lat');   // twee kanten: ook een lat aan deze kant
    stuk(u.bandBuiten, '#9aa3ad', u.bandBuiten, 'band');
    stuk(u.glas, '#cfe8f3', nl(u.glas) + ' glas', 'glas');
    stuk(u.bandBinnen, '#e9ecef', u.bandBinnen, 'band');
    if (latStuk) stuk(latStuk, '#c8a27a', u.lat.id, 'lat');
    var sponLijn = '<line x1="' + (B * s).toFixed(1) + '" y1="0" x2="' + (B * s).toFixed(1) + '" y2="' + (h + 16) +
      '" stroke="' + (u.status === 'past niet' ? '#b42318' : '#1d1d1b') + '" stroke-width="1.5" stroke-dasharray="3 2"/>' +
      '<text x="' + (B * s - 2).toFixed(1) + '" y="' + (h + 26) + '" font-size="9" text-anchor="end" fill="#444">sponning ' + nl(B) + '</text>';
    var opdek = u.eigenSponning ? '<line x1="' + ((B + u.eigenSponning) * s).toFixed(1) + '" y1="0" x2="' + ((B + u.eigenSponning) * s).toFixed(1) +
      '" y2="' + (h + 16) + '" stroke="#c8a27a" stroke-width="1.5"/>' : '';
    return '<svg class="pakket-svg" viewBox="0 0 ' + (breedte + 4) + ' ' + (h + 32) + '" width="100%" role="img" aria-label="Doorsnede pakket">' +
      '<rect x="0" y="0" width="2" height="' + (h + 16) + '" fill="#7a5a3a"/>' +
      '<text x="3" y="' + (h + 26) + '" font-size="8" fill="#7a5a3a">aanslag</text>' + delen.join('') + sponLijn + opdek + '</svg>';
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

  // De keuzelijst met foto's: per soort, met per lat of hij past bij deze ruit.
  // Wat past (binnen 1 mm) staat bovenaan (controle v113: anders zoek je het
  // tussen twintig latten). terug: na het kiezen weer het pakketvenster openen.
  function kiezer(id, terug) {
    var r = typeof getRij === 'function' ? getRij(id) : null;
    if (!r) return;
    var p = project();
    var e = rw(r);
    var huidig = e.glaslat ? normaal(e.glaslat) : '';
    var goed = function (u) { return u.status === 'past' || u.status === 'krap' || u.status === 'ruim'; };
    var regel = function (l) {
      var u = pakket(r, { lat: l.id });
      var oordeel = u.status === 'onbekend' ? '' : '<span class="pk-chip pk-' + u.status.replace(' ', '-') + '">' + esc(kort(u)) + '</span>';
      return '<button type="button" class="lat-item' + (huidig === l.id ? ' gekozen' : '') + '" data-kies="' + esc(l.id) + '">' +
        plaatje(l, 56) +
        '<span class="lat-tekst"><b>' + esc(l.id) + '</b> ' + esc(l.maat) +
        '<small>' + (l.soort === 'opdek' ? 'op het kozijn' + (l.eigenSponning ? ', eigen sponning ' + nl(l.eigenSponning) + ' mm' : '')
          : nl(l.inSponning) + ' mm in de sponning, ' + nl(l.hoogte) + ' hoog') +
        (l.zeker ? '' : ' · <i>maat nog niet nagemeten</i>') + '</small></span>' + oordeel + '</button>';
    };
    var kiesbaar = LATTEN.filter(function (l) { return l.soort === 'glaslat' || l.soort === 'glaslat-sponning' || l.soort === 'opdek'; });
    var passend = e.sponningDiepte ? kiesbaar.filter(function (l) { return goed(pakket(r, { lat: l.id })); }) : [];
    var groepen = (passend.length ? '<div class="lat-groep lat-passend"><h4>Past bij deze ruit</h4>' + passend.map(regel).join('') + '</div>' : '') +
      ['glaslat', 'glaslat-sponning', 'opdek'].map(function (s) {
        var lijst = kiesbaar.filter(function (l) { return l.soort === s && passend.indexOf(l) < 0; });
        return lijst.length ? '<div class="lat-groep"><h4>' + esc(SOORT_NAAM[s]) + '</h4>' + lijst.map(regel).join('') + '</div>' : '';
      }).join('');
    var std = latVan(p.lat);
    var html = '<p class="lat-uitleg">Tik op een foto of tekening om hem groot te zien. Rechts: past het bij deze ruit' +
      (e.sponningDiepte ? ' (sponning ' + esc(nl(e.sponningDiepte)) + ' mm)' : ' (vul eerst de sponningdiepte in)') + '.</p>' +
      '<button type="button" class="lat-item' + (huidig ? '' : ' gekozen') + '" data-kies="">' + plaatje(std, 56) +
      '<span class="lat-tekst"><b>Projectstandaard</b> ' + esc(std.naam) + '<small>in te stellen op Toebehoren</small></span></button>' + groepen;
    var l = venster('Glaslat voor ' + (r.merk || 'deze ruit'), html);
    l.querySelector('.lat-inhoud').addEventListener('click', function (ev) {
      var foto = ev.target.closest && ev.target.closest('.lat-plaatje');
      if (foto && foto.closest('.lat-item')) { ev.stopPropagation(); groot(foto.getAttribute('data-lat')); return; }
      var knop = ev.target.closest && ev.target.closest('[data-kies]');
      if (!knop) return;
      kiesLat(id, knop.getAttribute('data-kies'));
      sluit();
      if (terug) pakketVenster(id);
    });
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
        'px" onerror="this.remove()">' : '') + '<p><b>' + esc(l.naam) + '</b><br>' +
      (l.soort === 'opdek' ? nl(l.dikte) + ' dik, ' + nl(l.hoogte) + ' breed, eigen sponning ' + nl(l.eigenSponning || 0) + ' mm'
        : l.soort === 'neuslat' ? nl(l.hoogte) + ' hoog, over de dorpel ' + nl(l.eigenSponning) + ' mm, neus ' + nl(l.neus) + ' mm'
        : nl(l.hoogte) + ' hoog, ' + nl(l.inSponning) + ' mm in de sponning') + '<br>' +
      esc(l.hout) + ', ' + nl(l.lengte / 1000) + ' m · artikel ' + esc(l.artikel) + (l.opm ? '<br><i>' + esc(l.opm) + '</i>' : '') + '</p>' +
      '<button type="button" class="btn btn-secondary btn-sm">Sluiten</button></div>';
    g.addEventListener('click', function () { if (g.parentNode) g.parentNode.removeChild(g); });
    document.body.appendChild(g);
  }

  function kiesLat(id, latId) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Glaslat ' + (r.merk || ''));
    zetRw(id, 'glaslat', latId && OPNAAM[latId] ? latId : '');
    naWijziging(id);
  }

  // Na een wijziging: de twee cellen op Invoer, opslaan, Toebehoren.
  // vakLaten: de wijziging komt uit het vak in de tabel zelf. Dan dat vak
  // NIET vervangen (het heeft nog de focus; vervangen brak het ongedaan maken
  // en de eerste tik op het oordeel, controle v113); alleen de rest bijwerken.
  function naWijziging(id, vakLaten) {
    var r = getRij(id);
    var cel = document.getElementById('pk-' + id);
    if (cel && r) {
      if (vakLaten) {
        var vak = cel.querySelector('.spon-input');
        var w = rw(r).sponningDiepte;
        if (vak) vak.value = w != null && w !== '' ? String(w).replace('.', ',') : '';
        bijwerken();
      } else cel.outerHTML = pakketCelHTML(r);
    }
    var lc = document.getElementById('lat-' + id);
    if (lc && r && !vakLaten) lc.outerHTML = latCelHTML(r);
    var zc = document.getElementById('zijde-' + id);
    if (zc && r && !vakLaten) zc.outerHTML = zijdeCelHTML(r);
    if (vakLaten) bijwerken();
    if (typeof opslaan === 'function') opslaan();
    if (window.renderToebehoren && document.getElementById('panel-toebehoren') &&
        document.getElementById('panel-toebehoren').classList.contains('active')) renderToebehoren();
  }

  // Het venster per ruit: het pakket met tekening, latzijde, band binnen,
  // uitfrezen, de onderdorpel en het advies (aan te tikken, v114).
  function pakketVenster(id) {
    var r = getRij(id); if (!r) return;
    var adv = [];
    var teken = function () {
      var u = pakket(r);
      var o = oordeelRuit(r);
      var p = project();
      var e = rw(r);
      adv = adviezenMet(r);
      var uit = opSlot() ? ' disabled' : '';
      var lat = latVoorRuit(r);
      var z = zijde(r);
      var dOnder = getal(e.diepteOnder);
      var onderTekst = o.onder ? '<p class="pk-oordeel pk-onder pk-' + o.onder.status.replace(' ', '-') + '">' +
          esc(o.onderlat.isNeus ? o.onder.tekst : 'Onderin (' + o.onderlat.lat.naam + (dOnder ? ', dorpel ' + nl(dOnder) + ' mm' : '') + '): ' +
          (o.onder.tekst || '')) + '</p>' : '';
      return (u.status === 'onbekend' ? '<p class="lat-uitleg">Nog niet te beoordelen: ' + esc(u.reden) + '.</p>' : pakketSVG(u) +
          '<p class="pk-oordeel pk-' + u.status.replace(' ', '-') + '">' + esc(u.tekst) + '</p>' +
          (u.vraag ? '<p class="pk-vraag">' + esc(u.vraag) + '</p>' : '')) + onderTekst +
        // v114 (controle): op slot zeggen waarom alles uit staat.
        (uit && !(window.glasAlleenKijken && glasAlleenKijken()) ? '<p class="pk-slot">🔒 Op slot na de bestelling. Ontgrendelen kan via de balk bovenaan Invoer.</p>' : '') +
        '<div class="pk-velden">' +
          '<label>Sponningdiepte <span><input type="text" inputmode="decimal" class="pk-diepte" value="' +
            esc(e.sponningDiepte != null ? String(e.sponningDiepte).replace('.', ',') : '') + '"' + uit +
            '> mm</span><small>loodrecht op het glas: van de aanslag tot de buitenkant van het kozijn</small></label>' +
          // v114 (controle): de onderdorpel direct onder de sponningdiepte.
          '<label>Diepte onderdorpel <span><input type="text" inputmode="decimal" class="pk-onderdiepte" value="' +
            esc(dOnder ? String(dOnder).replace('.', ',') : '') + '" placeholder="gelijk"' + uit +
            '> mm</span><small>alleen invullen als de sponning onderin anders is dan aan de zijkanten</small></label>' +
          '<label>Latzijde <span><select class="pk-zijde"' + uit + '>' + zijdeOpties(z) + '</select></span>' +
            '<small>buiten: onderin de passende neuslat; binnen: onderin dezelfde lat; beide: glas tussen twee latten (geen aanslag)</small></label>' +
          '<label>Glaslat <span><button type="button" class="btn btn-secondary btn-sm pk-lat"' + uit + '>' + esc(lat.naam) +
            (e.glaslat ? '' : ' (standaard)') + ' ▾</button></span></label>' +
          '<label>Band binnen <span><select class="pk-band"' + uit + '>' +
            '<option value=""' + (e.bandBinnen ? '' : ' selected') + '>standaard (' + p.bandBinnen + ' mm)</option>' +
            [2, 3, 4].map(function (b) { return '<option value="' + b + '"' + (+e.bandBinnen === b ? ' selected' : '') + '>' + b + ' mm</option>'; }).join('') +
            '</select></span><small>buiten: ' + p.bandBuiten + ' mm (per project, op Toebehoren; nooit 2 mm)</small></label>' +
          // Alleen als er iets te frezen valt (of het al aanstaat).
          (u.uitfrezenNaar > (getal(e.sponningDiepte) || 0) || e.uitfrezen
            ? '<label class="pk-frees"><input type="checkbox" class="pk-uitfrezen"' + (e.uitfrezen ? ' checked' : '') + uit + '> Sponning uitfrezen naar ' +
              '<b>' + u.uitfrezenNaar + ' mm</b>' + (getal(e.sponningDiepte) && u.uitfrezenNaar > getal(e.sponningDiepte)
                ? ' (' + nl(u.uitfrezenNaar - getal(e.sponningDiepte)) + ' mm dieper)' : '') + '</label>' : '') +
        '</div>' +
        (adv.length ? '<div class="pk-advies"><b>Zo past het wel:</b>' + (uit ? '' : ' <small>(tik om te kiezen)</small>') + '<ul>' +
          adv.map(function (a, i) {
            return '<li>' + (a.actie && !uit ? '<button type="button" class="pk-advies-knop" data-advies="' + i + '">' + esc(a.tekst) + '</button>'
              : esc(a.tekst)) + '</li>';
          }).join('') + '</ul></div>' : '') +
        (lat.zeker ? '' : '<p class="lat-uitleg"><i>De maat van ' + esc(lat.id) + ' is nog niet nagemeten: ' + esc(lat.opm || 'zie de lijst') + '</i></p>');
    };
    var l = venster('Pakket ' + (r.merk || ''), teken());
    var inhoud = l.querySelector('.lat-inhoud');
    var opnieuw = function () { inhoud.innerHTML = teken(); };
    inhoud.addEventListener('change', function (ev) {
      var t = ev.target;
      if (t.classList.contains('pk-diepte')) { zetDiepte(id, t.value, true); opnieuw(); }
      else if (t.classList.contains('pk-onderdiepte')) { zetOnderDiepte(id, t.value); opnieuw(); }
      else if (t.classList.contains('pk-zijde')) { zetZijde(id, t.value, true); opnieuw(); }
      else if (t.classList.contains('pk-band')) { zetBand(id, t.value); opnieuw(); }
      else if (t.classList.contains('pk-uitfrezen')) { zetUitfrezen(id, t.checked); opnieuw(); }
    });
    inhoud.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.pk-lat')) { kiezer(id, true); return; }
      var k = ev.target.closest && ev.target.closest('[data-advies]');
      if (k) { pasAdviesToe(id, (adv[+k.getAttribute('data-advies')] || {}).actie); opnieuw(); }
    });
  }

  // Een advies aantikken (v114, keuze Jan): lat, band en/of uitfrezen in één
  // stap (één keer ongedaan maken).
  function pasAdviesToe(id, actie) {
    if (!actie || !magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Advies ' + (r.merk || ''));
    if (actie.lat && OPNAAM[actie.lat]) zetRw(id, 'glaslat', actie.lat === project().lat ? '' : actie.lat);
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
  // uitVenster: vanuit het venster een eigen stap voor ongedaan maken; in de
  // tabel doet het vak dat zelf (focusin/focusout in undo.js).
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
  // De latzijde. uitVenster: eigen ongedaan-stap; in de tabel doet de
  // keuzelijst dat zelf (focusin/focusout, zoals het diepte-vak).
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
  function zetOnderDiepte(id, waarde) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    var n = diepteVan(waarde);
    if (n === undefined) {
      if (window.appFout) appFout('"' + waarde + '" is geen diepte. Vul de diepte van de onderdorpel in mm in, of laat het vak leeg (= gelijk).',
        { kop: 'Diepte onderdorpel' });
      return;
    }
    if (window.bewaarStap) bewaarStap('Diepte onderdorpel ' + (r.merk || ''));
    zetRw(id, 'diepteOnder', n == null ? '' : n);
    naWijziging(id);
  }
  function zetBand(id, waarde) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Band binnen ' + (r.merk || ''));
    var n = parseInt(waarde, 10);
    zetRw(id, 'bandBinnen', [2, 3, 4].indexOf(n) >= 0 ? n : '');
    naWijziging(id);
  }
  function zetUitfrezen(id, aan) {
    if (!magKiezen()) return;
    var r = getRij(id); if (!r) return;
    if (window.bewaarStap) bewaarStap('Uitfrezen ' + (r.merk || ''));
    zetRw(id, 'uitfrezen', aan ? true : '');
    naWijziging(id);
  }

  /* ─── de drie cellen op Invoer (Diepte, Glaslat, Latten) ────────── */
  // Na een bestelling staan het vak, de latknop en de zijde op slot (v114);
  // het label (chip) blijft aan te tikken om te kijken (vrij-bij-slot).
  function chipVan(r) {
    var o = oordeelRuit(r);
    var s = o.slechtste;
    var ontbreekt = s.status === 'onbekend';
    return { tekst: ontbreekt ? '?' : kortRuit(o),
             klas: 'pk-chip ' + (ontbreekt ? 'pk-leeg' : 'pk-' + s.status.replace(' ', '-')) + ' vrij-bij-slot',
             titel: ontbreekt ? (s.reden || '') : (o.boven.tekst || '') + (o.onder && o.onder.tekst ? ' · ' + o.onder.tekst : '') };
  }
  function pakketCelHTML(r) {
    var e = rw(r);
    var c = chipVan(r);
    var uit = opSlot() ? ' disabled' : '';
    return '<td class="kol-spon" id="pk-' + r.id + '"><div class="spon-wrap"><input type="text" inputmode="decimal" class="spon-input" value="' +
      esc(e.sponningDiepte != null ? String(e.sponningDiepte).replace('.', ',') : '') + '" placeholder="mm" aria-label="Sponningdiepte ' + esc(r.merk || '') +
      '" onchange="latDiepte(' + r.id + ', this.value)"' + uit + '>' +
      '<button type="button" class="' + c.klas + '" onclick="latPakket(' + r.id + ')" title="' + esc(c.titel) + '">' + esc(c.tekst) + '</button></div></td>';
  }
  function latCelHTML(r) {
    var l = latVoorRuit(r);
    var eigen = !!rw(r).glaslat;
    return '<td class="kol-lat" id="lat-' + r.id + '"><button type="button" class="lat-knop' + (eigen ? ' eigen' : '') + '" onclick="latKiezen(' + r.id +
      ')" title="' + esc(l.naam) + (eigen ? '' : ' (projectstandaard)') + '">' + esc(l.id) + (eigen ? '' : ' <small>std</small>') + '</button></td>';
  }
  function zijdeOpties(z) {
    return '<option value=""' + (z ? '' : ' selected') + '>?</option>' +
      ZIJDEN.map(function (w) { return '<option value="' + w + '"' + (z === w ? ' selected' : '') + '>' + w + '</option>'; }).join('');
  }
  function zijdeCelHTML(r) {
    var z = zijde(r);
    return '<td class="kol-zijde" id="zijde-' + r.id + '"><select class="zijde-sel' + (z ? '' : ' leeg') + '" aria-label="Latzijde ' + esc(r.merk || '') +
      '" onchange="latZijde(' + r.id + ', this.value)"' + (opSlot() ? ' disabled' : '') + '>' + zijdeOpties(z) + '</select></td>';
  }
  // Na een andere opbouw (dikte) of een andere keuze: alleen bijwerken wat
  // anders is (een MutationObserver kijkt mee, v93).
  function bijwerken() {
    (typeof rijen !== 'undefined' ? rijen : []).forEach(function (r) {
      var cel = document.getElementById('pk-' + r.id);
      if (!cel) return;
      var c = chipVan(r);
      var chip = cel.querySelector('.pk-chip');
      if (chip && (chip.textContent !== c.tekst || chip.className !== c.klas)) {
        chip.textContent = c.tekst; chip.className = c.klas; chip.title = c.titel;
      }
      var lc = document.getElementById('lat-' + r.id);
      if (lc) { var nieuwLat = latCelHTML(r); var lk = lc.querySelector('.lat-knop'); var knopNu = nieuwLat.match(/<button[^>]*>([\s\S]*)<\/button>/);
        if (!lk || !knopNu || lk.innerHTML !== knopNu[1] || lk.className !== nieuwLat.match(/class="(lat-knop[^"]*)"/)[1]) lc.outerHTML = nieuwLat; }
      var zs = document.querySelector('#zijde-' + r.id + ' select');
      if (zs && document.activeElement !== zs && zs.value !== zijde(r)) { zs.value = zijde(r); zs.classList.toggle('leeg', !zijde(r)); }
      else if (zs) zs.classList.toggle('leeg', !zijde(r));
    });
  }

  window.GlasLatten = {
    LATTEN: LATTEN, SOORT_NAAM: SOORT_NAAM, MARGE_MM: MARGE_MM, STANDAARD_LAT: STANDAARD_LAT, JONGENEEL: JONGENEEL,
    latVan: latVan, normaal: normaal, latVoorRuit: latVoorRuit, project: project,
    pakket: pakket, kort: kort, adviezen: adviezen, neuslatVoor: neuslatVoor,
    profielSVG: profielSVG, pakketSVG: pakketSVG, plaatje: plaatje, groot: groot,
    ruit: rw, diepteVan: diepteVan, zijde: zijde, ZIJDEN: ZIJDEN, onderlatVoorRuit: onderlatVoorRuit, oordeelRuit: oordeelRuit,
    kortRuit: kortRuit, adviezenMet: adviezenMet, zijdeOpties: zijdeOpties, opSlot: opSlot
  };
  window.latPakket = pakketVenster;
  window.latKiezen = kiezer;
  window.latKies = kiesLat;
  window.latDiepte = zetDiepte;
  window.latBand = zetBand;
  window.latUitfrezen = zetUitfrezen;
  window.latZijde = zetZijde;
  window.latOnderDiepte = zetOnderDiepte;
  window.latAdvies = pasAdviesToe;
  window.zijdeCelHTML = zijdeCelHTML;
  window.pakketCelHTML = pakketCelHTML;
  window.latCelHTML = latCelHTML;
  window.latPakketBijwerken = bijwerken;
  window.latVensterSluiten = sluit;
})();
