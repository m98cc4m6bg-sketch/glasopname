# Toebehoren, glaslatten en sponning

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Het tabblad Toebehoren (latten, band, kit, tape, zaagplan; nooit naar de leverancier) en de lattenkennis. De vakkennis zelf staat in `GLASLATTEN.md`.

**Bestanden.** `toebehoren.js`, `latten.js`, `naslag.js` (`lattenTabel`), `pdf.js` (`toebehorenPagina`).

## Valkuilen

* **Toebehoren-tabellen** (v118): per foto een `section.tb-groep` met een
  eigen tabel en kopregel; vanaf 1261 px vaste kolommen (`colgroup`
  `tbc-…`, `table-layout: fixed`), 641–1260 px twee regels per ruit,
  ≤ 640 px kaartjes. Een kolom erbij = ook een `col` en de breedtes
  narekenen op 1280 (test-v118 onderdeel 7 meet dat).

* **Toebehoren** (v111, `toebehoren.js`) gaat nooit naar de leverancier:
  alleen in de PDF invoer (`toebehorenPagina`), nooit op de bestellijst of
  in de mail. Keuzes per ruit in `info.toebehoren.perRuit`, **niet op de
  ruit** (een veld op de ruit geeft een nieuw stempel `gewOp`, en dan werkt
  "Oudere stand?" niet meer). Band, kit en verlies: `kijkWeigert()`. De
  latkeuzes (zijde, onderlat, standaardlat) sinds v114 ook `slotWeigert`
  (`latSlot`).

* **Glaslatten en sponning** (v113, `latten.js`, kennis in `GLASLATTEN.md`):
  - **Opslag.** `sponningDiepte`, `glaslat`, `bandBinnen`, `uitfrezen`, en
    sinds v114 `latZijde` en `diepteOnder`, sinds v115 `latOmgekeerd`, staan
    in `info.toebehoren.perRuit`, NIET op de ruit. Lezen gaat via
    `GlasLatten.ruit(r)` (`rw`), schrijven via `toebehorenZetRuit`.
  - **Waar (v115, wens Jan).** Op Invoer alleen Diepte en Onder
    (`sponCellenHTML`, ids `pk-`/`pko-`). Al het andere op Toebehoren
    (`toebehoren.js` `perRuitHTML`/`ruitRij`, per foto met `fotoVoorbeeldHTML`
    uit fotos.js en `inktSVGHTML` uit teken.js). Glastype/opbouw op
    Toebehoren gaan via `wijzigGlasType`/`wijzigOpbouw` (dezelfde gegevens als
    Invoer). Na een wijziging tekent `toebehorenNaWijziging` (= `later()`) de
    tabel een tik later, en pas als een tik/klik klaar is; `zetInhoud`
    vervangt alleen cellen die anders zijn en laat het vak met de focus
    staan. Velden krijgen `data-sleutel` (type-, opb-, diepte-, onder-,
    zijde-, lat-, olat-, band-) voor de focus en de tests.
  - **↶ per tabel** (`blokbalk.js`) kijkt sinds v115 ook naar Diepte en Onder
    (staan niet op de ruit).
  - **Slot (v114, keuze Jan: "mee op slot").** Alle lat-functies staan in
    `SLOT_FUNCTIES`, en `magKiezen()` in latten.js vraagt `slotWeigert()`
    (het venster roept de functies direct aan, dus beide zijn nodig). Alleen
    de chip is `vrij-bij-slot` (bekijken mag). `bulkVrijBijSlot` is weg.
  - **Latzijde (v114, v115).** Geen standaard. `zijde(r)`:
    'binnen'/'buiten'/'beide'/'geen' of '' (een oude `tweeKanten` = 'beide').
    'geen' = latten meegeleverd: `pakket` geeft status 'geen', Toebehoren
    telt geen latten (wel band/kit/tape); een csv-import zet 'geen'. Onderlat
    via `onderlatVoorRuit(r)`: eigen keuze ('ZELFDE', 'NEUS' of een id),
    anders buiten → neuslat, binnen/beide/'' → dezelfde lat. Een gekozen neuslat is ook een neuslat
    (`neuslatVoor(r, gekozen)`). Het oordeel over de hele ruit:
    `oordeelRuit(r)` (het slechtste van boven en onder), kort `kortRuit`.
  - **Vaste eerste kolom.** Geen `overflow: hidden` op `table.invoer`: dat
    maakt de tabel een eigen schuifvenster en breekt `position: sticky`.
  - **Het vak in de tabel niet vervangen** terwijl het de focus heeft
    (`bijwerken(laatId)` op Invoer, `zetInhoud` op Toebehoren): dat brak het
    ongedaan maken, de eerste tik en (iPad) het toetsenbord.
  - **Rekenregel.** nodig = glas (`totaalDikte`) + band binnen + band buiten
    + lat in de sponning (× 2 bij zijde 'beide'). Een opdeklat heeft 0 in de
    sponning en zijn eigen sponning erbij; **omgekeerd** (v115,
    `latOmgekeerd`, alleen `draaibaar(l)`) neemt hij zijn eigen sponning in.
    Marge 1 mm. Een gewone glaslat met ruimte over = status **'zicht'**
    (`u.zicht` mm; A5 eerst 3 mm speling), géén waarschuwing (Jan, v115);
    alleen een opdeklat kan 'ruim'/'te ruim' zijn. `ERNST`: zicht = past.
    **v119 (Jan): nooit uitsteken, liever niet vlak.** Precies 0 over =
    **'vlak'** (oranje; **v120: ook onderin buiten**, met eerst een neuslat
    in het advies). Een A5 met −1 tot 3 mm over = **'nood'** (`u.uitsteek`
    = 3 − over; v120: ook 1 mm te krap), ook in `pakketScheef` (vraag vóór
    de bestellijst) en `werkvloerLetOp` (v120: plus 'vlak met kozijn' en de
    opmerking). Het advies (`adviezenMet`) noemt bij vlak/nood alleen wat
    netjes in valt (zicht, of een opdeklat 'past'). Strook "vlak" op
    Toebehoren (v120).
  - **Binnen (v117, Jan): nooit een neus- of ventilatielat** (`onderMagBij`).
    Een oude keuze: `alleenBuiten` → rood, niet stil veranderd.
  - **Neuslat in het zaagplan** (v121, Jan): recht, `sp.b` (sponningmaat in
    de breedte) + `NEUSLAT_TOESLAG_MM` (20; de scharniersponning), los van
    `VERSTEK_TOESLAG_MM`. Stukken hebben `recht: true` (`isNeuslat`); de
    werkvloer zegt "N30 recht". De maat S + 9 is bevestigd (Jan, v121).
  - **Max glaspakket** (v117): `r.maxPakket` (op de ruit, uit de import);
    `maxOordeel` telt mee in `oordeelRuit` (`waar: 'max'`), ook bij 'geen';
    `opbouwTeDik` voor de keuzelijst. Niet in de opmerking.
  - **Neuslat (v115).** rest = diepte onder − glas − band (− lat aan de 2e
    kant); ventilatie = S − rest (≥ 5), uitsteek = ventilatie + 9.
    `neuslatOpties(r)`: passend / te klein; automatisch de kleinste die past.
    Neus 9 mm (tekening Jongeneel, v114).
  - **Advies** per plek (`adviezenMet(r)` en `adviezenMet(r, 'onder')`) en
    per zijde (buiten geen rechte/ronde latten, `latMagBij`). Onderin heeft
    een opdeklat geen eigen montage (zoals boven of normaal).
  - **Eén bron** voor de Naslag: `lattenTabel()` in naslag.js leest
    `GlasLatten.LATTEN`. De glasaftrek van een rooster komt uit
    `ducoAftrek()` (DATA.roosters), niet uit de tekst in naslag.js.
  - **Band buiten** nooit 2 mm. Band per ruit (v118): binnen 2/3/4/5, buiten
    3/4/5 (`BAND_BINNEN`, `BAND_BUITEN`, `bandBuitenVan`); leeg = de
    projectstandaard. **5 mm = een rol 2 + een rol 3** op elkaar: in het
    totaal per rol en in "m band" per ruit dubbel.
  - **Oude namen** ('Glaslat', 'Neuslat', 'Ventilatielat', en sinds v114
    'GL13' → B13 en 'B2' → B1) worden bij het lezen omgezet (`normaal`,
    `onderNaam`). Een oude onderlat 'Glaslat' wordt 'ZELFDE' (v115; tot v114
    '', wat bij buiten een neuslat werd), niet A4.
  - **Foto's van Jongeneel**: geen script (de site blokkeert dat). Via de
    browser in de Claude-desktopapp (bugboek, valkuilen).
  - **Eén getal voor de lengtes** (v120): het zaagplan + `RESERVE_LENGTES` per lattype. Het grote
    getal en de rekenregel moeten altijd hetzelfde zeggen.
  - **Kleuren.** Gebruik de namen in `:root` (`--accent`, `--ink`, `--ok`,
    `--warn`, `--err`); het pdf-rood is 193, 18, 28.
  - **Een `width: 1%` in een tabel met `width: auto`** laat hem toch de hele
    breedte vullen (Toebehoren).

* **De actiebalk op Toebehoren** (v121, P3): alleen bij aangevinkte ruiten
  (`gekozen`, alleen in het geheugen) en niet op slot. Het voorbeeld rekent
  met keuzes die nog niet bewaard zijn via `proef` in `perRuitVan`; zet
  `proef` **altijd** terug in een `finally`, anders toont de tabel iets wat
  niet bewaard is. Een keuze in de balk tekent alleen het voorbeeld en de
  knop opnieuw (`toebehorenBalkKies`), niet de pagina: zo blijft de cursor
  in het vak. `keuzeOp` is de ene plek die een keuze op een ruit toepast
  (voorbeeld én Toepassen). Het blok bovenin is dan één regel; zonder
  vinkjes werkt het op alle ruiten (met een vraag).

## Het verhaal erbij

* **Waarom de keuzes per ruit in `info.toebehoren.perRuit` staan** (v111, bugboek valkuil 28): elke wijziging van een ruit geeft hem in `cloud.js` (`stempelWijzigingen`) een nieuw `gewOp`, tenzij het veld in `VELDEN_BUITEN_SPOOR` staat. Na een bestelling beslist `gewOp` < `g` of iets een "Oudere stand?" is; een nieuw stempel om iets intern omzeilt die bewaking. `VELDEN_BUITEN_SPOOR` uitbreiden is géén oplossing: `inhoudVan` gebruikt die lijst ook, en dan kan zo'n wijziging bij apart bewaren verloren gaan.

* **Foto's van Jongeneel** (v114): jongeneel.nl laat zich niet met een script lezen ("Challenge Validation", ook vanaf Jans Mac). Wat werkt: de ingebouwde browser van de Claude-desktopapp (eerst toegang voor de site), in de pagina `fetch` naar de cloudfront-plaatjes, base64 terug. Een lang script in de pagina asynchroon starten en het resultaat in `window` ophalen (anders time-out na 45 s).
