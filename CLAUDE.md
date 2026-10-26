# Glasopname — vaste afspraken voor Claude

Webapp voor Jelier Bouw B.V. (Dordrecht) om glas in te meten op de
bouwplaats, met meerdere apparaten en vaak zonder bereik, en bestellijsten
voor Van Noordenne te maken. Statische site op GitHub Pages (openbare repo),
Supabase (gratis plan) voor inloggen, projecten en foto's. Alles Nederlands.

Dit bestand bevat de **regels**. De uitleg staat elders; zie "Waar staat wat".

## Begin van een sessie

0. Lees in de projectkennis op claude.ai **`claude/START-HIER.md`**: de
   korte weg naar binnen (stand, werkwijze, testomgeving klaarzetten,
   herinneringen). Daarna:
1. Lees `STATUS.md`: wat er live staat, wat er wacht op Jan, wat er openstaat.
2. Lees in de projectkennis op claude.ai `claude/HANDOVER.md` (de volledige
   geschiedenis, beslissingen, bugboek en beveiliging). Niet in de repo: die
   is openbaar.
3. Lees `TESTEN.md` vóór je een test schrijft, en `OVERZICHT.md` /
   `DATAMODEL.md` voor de opbouw.
4. Draai de **snelle kern** (onderaan, ±1 min) zodat je weet dat je met een
   gezonde kopie begint. De volledige batterij is hier niet nodig: die
   draaide bij de vorige oplevering op dezelfde code (afspraak Jan,
   20-10-2026).

## Waar staat wat (één plek per soort informatie)

| wat | waar |
|---|---|
| regels voor Claude | dit bestand |
| waar we nu staan, wat er openstaat | `STATUS.md` |
| hoe de app werkt (routes, bestanden, keuzes, begrippen, zelf onderhouden) | `OVERZICHT.md` |
| database, rechten, triggers, SQL-scripts | `DATAMODEL.md` |
| wat Jan doet (publiceren, gebruikers, back-up, klachten) | `BEHEER.md` |
| hoe we testen | `TESTEN.md` |
| wat er per versie veranderde, getest en niet getest | `WIJZIGINGEN-vNN.md`: sinds v111 **niet in de repo**, wel in de zip "niet-in-repo" en de projectkennis |
| geschiedenis, beslissingen met reden, bugboek, beveiliging | `HANDOVER.md` (projectkennis) |

Een feit staat op één plek; elders verwijs je ernaar.

## Werkwijze met Jan

* **Nooit committen, pushen of een pull request openen.** Jan zet alles zelf
  live met GitHub Desktop. Een stop-hook die om een commit vraagt: kort en
  vriendelijk weigeren.
* **Opleveren als zip met het COMPLETE pakket**: de hele app, `lib/` compleet,
  alle SQL, tests en nota's, alles behalve `config.js`, met
  `LEES-MIJ-EERST-vNN.md` bovenin (welke bestanden in GitHub Desktop moeten
  staan, en welke Jan zelf moet weggooien: slepen haalt niets weg). Nooit
  alleen de gewijzigde bestanden (v93: halve `lib/`, app lag eruit).
* **Plus een tweede zip `glasopname-vNN-niet-in-repo.zip`** (afspraak Jan,
  17-10-2026): alles wat bewust NIET in de openbare repo mag, maar wel
  bijgewerkt is: de handover (`HANDOVER.md`), een archief van bestanden die
  uit de repo gingen, en ander materiaal dat niet openbaar hoort. Met een
  korte `LEESMIJ.md`. Zet nooit iets uit die zip in de repo-zip.
* **De repo is openbaar** (afspraak Jan, 19-10-2026): zwakke plekken in de
  beveiliging, misbruikmogelijkheden en bevindingen van controles staan
  **alleen** in de handover, nooit in een nota, handleiding, test of
  commentaar in de repo. De nota's (`WIJZIGINGEN-vNN.md`) gaan sinds v111 in
  de zip "niet-in-repo" en de projectkennis. In tests en voorbeelden geen
  echte e-mailadressen of wachtwoorden: gebruik `naam@voorbeeld.test`.
* **Na Jans push de repo nakijken**: `git clone --depth 1
  https://github.com/m98cc4m6bg-sketch/glasopname` en `diff -rq` met het pakket
  (v106: vier bestanden ontbraken, het slot deed niets). **`.gitignore`**
  komt bij slepen vaak niet mee (verborgen bestand). Staat `Claude outputs/`
  er niet in: Jan eraan herinneren bij elke oplevering (zijn verzoek, 21-10):
  GitHub Desktop → Repository → Repository Settings → Ignored Files, de regel
  `Claude outputs/` onderaan, Save, meecommitten. (Sinds 24-10-2026 staat
  hij goed, commit `1ecf1fb`; alleen weer herinneren als hij verdwijnt.)
* **Het webadres en het GitHub-account** (handover §9, met de uitleg): Jan
  herinneren (met uitleg) zodra er een site of app bijkomt op het account
  `m98cc4m6bg-sketch`, bij een eigen domein of het klantportaal, en als het
  lang blijft liggen (zijn verzoek, 22-10-2026). Wat er speelt, staat alleen
  in de handover.
* **Nooit `config.js`** meesturen of wijzigen. Nooit een `service_role`- of
  `sb_secret_…`-sleutel in de repo of een workflow.
* **SQL eerst**: staat er een script bij, dan bovenaan de nota: eerst in
  Supabase → SQL Editor, dan pas de bestanden.
* **Werk in blokken; vraag Jan bij grote ontwerpkeuzes** (AskUserQuestion).
  Zijn antwoorden bevatten vaak een correctie op je aanname.
* **Niveau noemen** (skill houdbaar-bouwen): 🟢 gewoon bouwen, 🟠 bouwen met
  uitleg, 🔴 (database, rechten, inloggen, data omzetten, service worker,
  niet terug te draaien) eerst uitleggen en op akkoord wachten.
* **Nederlands**, ook in code en commentaar. Commentaar zegt *waarom*, met
  het versienummer erbij.
* **Lange klussen**: Jan wil tussendoor korte updates.

## Bij elke oplevering

1. Drie versienummers gelijk ophogen: `APP_VERSIE` (index.html),
   `PDF_VERSIE` (pdf.js), `VERSIE` (sw.js). `test-index.js` bewaakt dat.
2. Nieuw `.js`-bestand of bibliotheek: `<script src>` in index.html, de
   `SHELL`-lijst in sw.js, en mee in de zip.
3. Testen naar het **niveau** van de wijziging (afspraak Jan, 20-10-2026;
   zie "Testen" onderaan en de skill grondig-testen). Kort:
   - 🟢 de snelle kern + de tests van wat je raakt + één echte klik en een
     schermafdruk;
   - 🟠 daarbij een test voor het nieuwe gedrag die aantoonbaar rood wordt
     als je de reparatie terugdraait, en de volledige batterij **één keer**;
   - 🔴 daarbij de mutatieproef van de reeks die je raakt.
   De overgang vanaf wat live staat (`test-overgang.js`, ±20 s) zit in de
   snelle kern en draait dus altijd.
4. **De handleidingen bijwerken** (opdracht van Jan, 17-10-2026):
   `BEHEER.md`, `OVERZICHT.md`, `DATAMODEL.md`. Elke nieuwe functie,
   bugoplossing, gewijzigde keuze, nieuw script, nieuw bestand of nieuw
   risico, in gewone taal met de reden; datum en versie bovenaan. Feiten
   nakijken tegen de code (op 17-10 vond een controle er 17 fout).
5. **`STATUS.md` bijwerken**: live versie, vorige sessie, wacht op Jan.
6. **`WIJZIGINGEN-vNN.md`** (in de zip "niet-in-repo" en de projectkennis, niet in de repo; afspraak Jan, 19-10-2026): wat er misging, wat er nu gebeurt, bestanden,
   hoe Jan het zelf controleert, getest en **niet getest** (bijna altijd:
   echte Safari op iPad/iPhone, Android, Windows, de echte Supabase), en een
   kopje **"Handleidingen"**.
7. **Projectkennis bijwerken**: `claude/HANDOVER.md` (bugboek, beslissingen,
   open punten), `claude/WIJZIGINGEN-vNN.md`, de handleidingen en de
   gewijzigde bronbestanden.

## Valkuilen (kort; het verhaal erachter staat in de handover §6–§8)

**Gegevens**
* Nooit gegevens kwijt. Na elke stap staat het werk op de server, óf op het
  apparaat met de vlag "moet nog omhoog" (`glasopname_pending`).
* **`magVerlaten` gooit nooit werk weg** (v123, keuze Jan): ‹Apart bewaren en
  doorgaan› = `reddingBewaar` + `reddingenUploaden`; lukt dat bewaren niet,
  dan niet doorgaan. Een nieuwe weg uit een project (zoals een nieuwe knop
  "sluiten") loopt via `magVerlaten`. Uitloggen wist daarna de kopie
  (`wisKopieNaUitloggen`), nooit de redding of de fotowachtrij.
* **Een foto die nog verwerkt wordt** (v123): elke route die een foto
  verkleint of bewaart, loopt via `metBezig(...)` en kijkt met
  `bijProject(pid)` of het project nog hetzelfde is (`nieuwPad` gebruikt
  het open project!). `magVerlaten` wacht op `glasFotoBezig()`.
* **Van wie is de inhoud?** `basisVan` / `_projectId` (v103). Werk dat niet bij
  het open project hoort, gaat als apart project naar de server
  (`reddingBewaar` → `reddingenUploaden`), nooit weg, nooit over een ander
  project heen.
* **Mislukt is niet leeg** (`lijstOf()`); elke `limit()` telt mee
  (`count: 'exact'`). **0 rijen bij opslaan** kan "niet ingelogd" zijn:
  eerst `sessieCheck()`.
* Iets weggooien op tijd: met de klok van de server (`prullenbak_opruimbaar`).
* `zetStaat()` ruimt undo en selectie op; elke nieuwe weg waarlangs andere
  inhoud binnenkomt, loopt via `zetStaat`.
* **Een stap voor ↶ bewaar je vóór de wijziging** (`bewaarStap` legt de stand
  van nú vast). Erna = ↶ doet niets (de fout van `tekenKies` tot v122). Een
  handeling die achteraf niets deed: `stapTerugnemen(label)` (undo.js).
* **↶ per tabel** (`blokbalk.js`) vergelijkt regels, bolletjes, diepten én
  (v123) speling/bijtelling (`maatVan`), onthoudt waar hij was
  (`waarGebleven`) en zet nooit een ruit terug die elders staat. Iets nieuws
  dat per tabel geldt: ook in `blokKenmerk` en de vergelijking.
* Alles wat `projectInfo` vervangt (zetStaat, undo, samenvoegen) behoudt
  `bestellingen` (undo.js, `bestellingenErbij`, script 23).
* **Gebruikers nooit verwijderen**, behalve bij vertrek: verwijzingen worden
  `null`. Nieuwe kolom naar `auth.users`: de naam als tekst ernaast.

**Opslaan en samenwerken**
* Elke opslag draagt `data._versieNr` (versieslot, script 21),
  `glasBewerkslotVelden()` en `_basis` (bewerkslot, script 24). Een nieuwe
  manier van opslaan moet ze allemaal meesturen: zonder `_versieNr` weigert de
  database, zonder `_apparaat` werkt de slotcontrole niet, zonder
  `_basis` weigert hij zodra een ander intussen opsloeg. Alleen
  `synchroniseer` doet een `update` van `data`; apart gaat via `insert`.
* Nieuw veld bovenin `data`: neem het mee in `inhoudVan` (cloud.js).
* Nieuwe functie die iets wijzigt: begin met `kijkWeigert()` (bewerkslot)
  en, voor de invoer, `slotWeigert()` / `SLOT_FUNCTIES` / `opSlot()`
  (slot na bestellen, vanaf status 'besteld'; dekt ook foto's en tekenen).
* Na offline/fout/achtergrond eerst lezen (`naOffline`,
  `voorlezenEnVersturen`).
* Bestellingen: alleen ‹Ja, verstuurd› of een gelukte bestelmail legt vast
  (`projectInfo.bestellingen`, nooit overschrijven). Vergelijken altijd met
  `besteldeStand()`. Een oudere stand gaat nooit stil mee (`voorControles`).
  Script 23 rekent `info.besteld` zoals `besteldBijwerken()`: verander ze
  samen.
* **In een fotoblok volgt het aantal de bolletjes** (v110, keuze Jan): heeft
  een regel bolletjes, dan veranderen `aantal` en `markeringen` alleen samen
  (`markErbij`, `markEenMinder`, de strook `scheefHTML`). Nieuwe code die
  `aantal` zet (doorvoeren, gelijktrekken, import, terugzetten): eerst
  `aantalVolgtBolletjes(rij)`. Nooit stil rechtzetten; ook niet bij openen.
  Aanwijzen verandert nooit het aantal (een maatstaat is de waarheid).
* Alleen een ander aantal na een bestelling = EXTRA / "N annuleren"
  (`aantalVerschil`, v110), anders VERVANGT. `teBestellen()` deelt in;
  `bestelMomentopname()` en de pdf volgen die indeling: verander ze samen.
  Na een EXTRA zit een ruit in méér lijsten: noem ze met `besteldInTekst()`
  ("1e en 2e"), nooit alleen `st.nr` (dat is de laatste lijst; de leverancier
  liet dan de rest staan en maakte te veel).
  Een EXTRA/minder is een verschil: `standVan` rekent het totaal vanaf wat
  er dán geldt (`andereBasis`), niet vanaf `o.aantal`.
* **Bediening** (v111): `bediening`/`bedieningAantal`/`bedieningLengte` op de
  ruit; telt in `ruitKenmerk` alleen mee als hij gekozen is, met de kale
  velden (nooit de schermtekst). Rooster op Nee (ook doorvoeren in bulk.js)
  haalt hem weg; `bedieningTekst` toont niets zonder rooster.
  Na een bestelling alleen de bediening anders (v112, keuze Jan) = nooit
  VERVANGT: `bedieningVerschil` → blok ALLEEN BEDIENING (`teBestellen().bediening`,
  `bedieningVan` in de momentopname, `bedieningTabel`). Glas en bediening
  kunnen uit verschillende lijsten komen: noem ze met `besteldInTekst` en
  `bedieningInTekst`. Op papier en scherm `bedieningOpPapier` (v117: bij een
  rooster zonder extra bediening "standaard"); vergelijken en het kenmerk
  blijven op de kale velden.
* **Bi-color en ALLEEN ROOSTER** (v114, keuze Jan): `biColor` ('Ja' of
  afwezig) en `ralBinnen` op de ruit; in het kenmerk alleen als bi-color
  gekozen is (anders "gewijzigd" bij elke bestelde ruit). Op papier altijd
  `ralTekst(r)` / `roosterTekst(r)`, nooit `r.ralKleur` rauw.
* **Bestellijst: één bron** (v118, wens Jan): `bestellijstModel()` in pdf.js
  bepaalt kolommen (lege weg, `leegWaarde`), regels, kader, blokken
  (annuleren, bediening, rooster) en totaal, voor de pdf **én** het tabblad
  (`renderBestellijst`). Iets veranderen aan de lijst = in het model, nooit
  alleen in één van de twee. Zonder pdf.js (test-index, test-herstel in
  jsdom) een eenvoudig model in `renderBestellijst`.
* **Kruisje** (v118, wens Jan): elk menu of venster dat openklapt krijgt
  `sluitKruis(el, sluit, label)` (index.html; ook Escape) of, in een
  `<details>`, een `button.sluit-x` direct na de summary. In een menu is
  een knop normaal 100 % breed: de regels `.veld-menu > button.sluit-x` e.d.
  houden hem rond (32 px, op een aanraakscherm 44 px).
* **Toebehoren-tabellen** (v118): per foto een `section.tb-groep` met een
  eigen tabel en kopregel; vanaf 1261 px vaste kolommen (`colgroup`
  `tbc-…`, `table-layout: fixed`), 641–1260 px twee regels per ruit,
  ≤ 640 px kaartjes. Een kolom erbij = ook een `col` en de breedtes
  narekenen op 1280 (test-v118 onderdeel 7 meet dat).
* **PDF werkvloer** (v118): `bouwWerkvloerPdf` in pdf.js; niet voor de
  leverancier (geen levercontrole in `startExport`, niets vastgelegd);
  de laatste pagina's zijn `toebehorenPagina(doc, eigenTitel)`.
  `bedieningVerschil` kijkt naar bediening én rooster (`ROOSTER_VELDEN`) en
  geeft `roosterWas/roosterNu` → `teBestellen().rooster`, `roosterVan` in
  de momentopname, `roosterIn` in `standVan`, `roosterTabel`. Een ander
  Duco type alleen bij dezelfde glasaftrek (`ducoWisselMag`), anders
  VERVANGT. `KORT_VELDEN` bevat sinds v114 de roostervelden: een ingekorte
  bestelling van daarvoor (`kort: 1`) kent ze niet, dus altijd via
  `kortBewaard(oud, veld)`.
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
    browser in de Claude-desktopapp (handover §6).
  - **Eén getal voor de lengtes** (v120): het zaagplan + `RESERVE_LENGTES` per lattype. Het grote
    getal en de rekenregel moeten altijd hetzelfde zeggen.
  - **Kleuren.** Gebruik de namen in `:root` (`--accent`, `--ink`, `--ok`,
    `--warn`, `--err`); het pdf-rood is 193, 18, 28.
  - **Een `width: 1%` in een tabel met `width: auto`** laat hem toch de hele
    breedte vullen (Toebehoren).
* `pdf.js` `schoon()`: een teken buiten het pdf-lettertype (emoji, →, ≥, ł)
  wordt in jsPDF rommel; nieuwe tekst in een pdf via `schoon` of `pdfTekst`
  (die zetten om, halen emoji weg en maken van de rest "?").
* Een ingekorte momentopname (`kort`) heeft alleen `KORT_VELDEN`. Een veld
  dat oude ingekorte standen niet hebben, lijkt daar "leeg" (en dan lijkt
  alles "gewijzigd"): zet er alleen iets bij met een nieuw `kort`-nummer en
  een bewaking (v114: `kort: 2` en `kortBewaard()` voor de roostervelden).
  Lees zo'n stand met een terugval (`bedieningTekst`).
* `pasDataToe()` laat `app_data.glas_data` winnen van `DATA` in index.html:
  een keuzelijst wijzigen vraagt óók een SQL-script.

**Bijwerken en offline**
* Nooit `location.reload()` zonder `opslaanEnWachten()` (verplicht en veilig
  bijwerken, v99).
* Zet in `SHELL` nooit een bestand dat niet in de repo staat: dan komt er
  nooit meer een update (`allesInCache`, v100).
* Een update komt aan via de code van de **oude** versie: test de overgang
  vanaf wat live staat. De redding voor v98 en ouder in sw.js
  (`draaitOudeVersie`) pas weghalen als geen apparaat meer zo oud is.
* Iconen met versie in het adres (`?v=2`) in index.html, manifest én SHELL.
* Foto's via `bewaarBestand()` / `fotoBlob()` (wachtrij op het apparaat);
  nooit rechtstreeks `storage.upload`. Originelen in `<project>/origineel/`.
* **Een bestand uit IndexedDB nooit zelf uploaden** (v116): Safari stuurt
  het als 0 bytes mee ("No content provided", 400), Chrome niet. Altijd de
  inhoud inlezen en een nieuwe `Blob` versturen (`kopie()` in wachtrij.js);
  een `File` bewaart `zet()` als kopie (`alsKopie`). Een leeg bestand nooit
  uploaden of weggooien; gelezen ≠ bewaarde grootte = niet uploaden. Een
  fout op het apparaat zelf (`e.lokaal`, ook een tijdslimiet bij het
  lezen) mag de ronde niet stoppen.

**Scherm**
* Meer dan één tekenroute (`renderTabel`, `renderFotos`,
  `renderFotoTabellen`): regel het aan de bron.
* `innerHTML` binnen een stuk dat een MutationObserver bewaakt = eindeloze
  lus (v93): alleen opnieuw tekenen als er iets veranderd is.
* `hidden` verliest van `display` uit de CSS: zet `.klasse[hidden] {
  display: none; }` erbij.
* De werkbalk `.toolbar` is alleen op Invoer zichtbaar. "Alleen kijken":
  balk op Invoer, strook `#kijkChip` op de andere tabbladen (v108).
* Berichtjes onderin (`toonMelding`) zonder knop verdwijnen na 8 s; iets wat
  de gebruiker móét zien: een venster (`appMelding`).
* Inloggen is een echt `<form>` (`cloudLoginVerstuur`,
  `wachtwoordAanbieden`): geen eigen Enter-afhandeling erbij. Het "verstuurt"
  na een geslaagde inlog naar `leeg.html` (https, eigen site; `about:blank`
  gaf in Safari een waarschuwing, v109) in een kader met `sandbox`. De
  velden hebben bewust **geen `name`**: anders staan e-mail en wachtwoord in
  het adres (GET). Elke knop in zo'n formulier die niet inlogt: `type="button"`.
* Een herstellink (v109): `leesHerstelLink()` leest het adres vóór
  `createClient` en haalt het leeg met `replaceState`; de bibliotheek leest
  het adres NIET zelf (`detectSessionInUrl: false`, anders komt de code via
  de terug-knop terug). `herstelSessie()` zet de sessie. Het venster
  `#cloudHerstel` komt terug (herladen, nieuw tabblad) via localStorage
  `glasopname_herstel` = id van de gebruiker; een gewone inlog wist die vlag.
  `same_password` van Supabase = gelukt (het getypte wachtwoord IS het
  wachtwoord).
* Eén naslag (`#naslagInhoud`), verplaatst, nooit gekopieerd.
* **Een maat is een tekstvak** (v120, `leesMaat`, `maatNaTypen`): een
  getalvak liet in Chrome de komma stil weg (1212,5 → 12125). Een halve mm
  naar beneden, met een melding (`kortBericht`). Het aantal: `zetAantal`
  (heel getal 1–999). Vóór de bestellijst `vreemdeControle` (glas < 100 mm,
  > 3210 × 6000, aantal > 99, rooster en glasdikte).
* **Alles wat uit een project komt, gaat door `esc()`** (escapet ook `'` en
  `>`, v120). Nummers van ruiten en foto's komen in de HTML; bij het laden
  zet `glasVeiligeIds()` ze recht (ruit: heel getal; foto: `[A-Za-z0-9_-]`),
  met de bolletjes mee, en slaat de herstelde stand op. Script 26 weigert
  vreemde nummers in de database.
* **`kortBericht(tekst, {soort, knop, actie, ms})`** (v120): een berichtje
  onderin met hoogstens één knop (Terugzetten, ↶). Rood alleen bij
  `soort: 'fout'`.
* **Rood** (v120, Jan): alleen de hoofdknop en fouten; geen rode
  kolomkoppen of knoppen die gewoon iets doen.
* **Aanraakscherm** (v120): knoppen 44 px, bolletjes minstens 22 px met
  een tik-plek van 44 px (`.foto-mark::before`); de tabellen blijven
  compact.
* **Bestellingen** (v120): elke bestelling heeft `basis` (het tijdstip van
  de laatst bekende geldige; '' = de eerste). Twee geldige met dezelfde
  basis = dubbel besteld (`glasDubbelBestelMelding`, rode balk
  `.bestel-dubbel`). Het nummer voor de leverancier: `volgendBestelNr()`
  (ingetrokken telt niet mee).
* **Eén kopie per apparaat** (`glasopname_v2`): twee tabbladen delen hem.
  `opslaanLokaal` bewaart werk van een ánder project dat nog omhoog moet
  eerst apart (`reddingBewaar`); `start()` gooit "moet nog omhoog" niet weg
  als de kopie bij een bekend project hoort. Hetzelfde project in twee
  tabbladen: een `kortBericht` (BroadcastChannel), **geen venster**.
* **Een open venster (`.melding-laag`) houdt het bewerkslot op**
  (`anderVenster()` in bewerkslot.js): een collega die wil overnemen, wacht
  tot het dicht is. Iets wat alleen informeert en vanzelf kan komen: een
  `kortBericht`, geen `appMelding` (v120, gevonden met test-v106 §11).
* **De actiebalk op Toebehoren** (v121, P3): alleen bij aangevinkte ruiten
  (`gekozen`, alleen in het geheugen) en niet op slot. Het voorbeeld rekent
  met keuzes die nog niet bewaard zijn via `proef` in `perRuitVan`; zet
  `proef` **altijd** terug in een `finally`, anders toont de tabel iets wat
  niet bewaard is. Een keuze in de balk tekent alleen het voorbeeld en de
  knop opnieuw (`toebehorenBalkKies`), niet de pagina: zo blijft de cursor
  in het vak. `keuzeOp` is de ene plek die een keuze op een ruit toepast
  (voorbeeld én Toepassen). Het blok bovenin is dan één regel; zonder
  vinkjes werkt het op alle ruiten (met een vraag).
* Telefoon of tablet: `glasMobiel()`. Bestanden naar de gebruiker:
  `bestandAfleveren()` / `afleveren()`; liever xlsx dan csv.
* Taken en logboek horen bij één project: een laat antwoord voor een ander
  project wordt genegeerd (`renderProject`).
* 'Opgenomen door' staat vast na de eerste ruit; wijzigen alleen via
  `opnemerWijzig()` (wachtwoord + logboek).
* De inmeetdatum is tekst (dd-mm-jjjj): nooit als tekst sorteren. De
  projectenlijst sorteert in de databasevraag (grens 1000) en op naam nog eens
  met `Intl.Collator('nl', {numeric})`.
* Opruimen van foto's neemt de submap `origineel/` mee (`fotosOpruimen`).

**Omgeving**
* **De automatische back-up** (v122) staat in een **aparte privé repository**
  `glasopname-backup` (`backup.py`, `test_backup.py`, workflow), niet in
  deze. Komt er een tabel bij in de database, of een nieuwe opslagmap:
  ook `TABELLEN`/`EXTRA` in `backup.py` bijwerken en `test_backup.py`
  draaien; lever die repo dan apart aan (zip `glasopname-backup.zip`). Het
  back-upaccount staat op `alleen_lezen` (script 27): nooit in de app
  gebruiken; `glasGebruikers` laat het weg. Wachtwoord van dat account
  wijzigen: SQL (`BEHEER.md` §8), **nooit** het account verwijderen. Doel:
  Dropbox (app-map in Jans bestaande account; draait sinds 26-10-2026). Een
  OneDrive-versie bestaat (v2, in het archief van de handover), maar vraagt
  een Microsoft 365-beheerder; daar kan Jan zelf niet bij (26-10).
* **Nummering van bestellingen** op twee plekken: `bestellingenSamenvoegen`
  (index.html) en `bestellingen_samenvoegen` (script 27). Verander ze samen.
* **Nummers van ruiten en foto's** op twee plekken: `veiligeIds` (index.html,
  zet recht bij het laden) en `glas_ids_fout` (script 28, weigert). Wat de
  database weigert, moet de app eerst rechtzetten: verander ze samen (v123).
* **Een oud script opnieuw draaien** zet zijn eigen regels terug: daarna 26,
  27 en 28 opnieuw, in die volgorde (proef28 §7 laat zien dat dat klopt).
* **Zoeken** (v123): `zoekVerzoek` in cloud.js, met script 29 via
  `glas_zoek_projecten` (rpc), anders `or()` met `data->info->>klant`. Een
  nieuw zoekveld: in beide. De namaak in de tests kent sinds test-v123 het
  JSON-pad in `or()` en de rpc (`S.zoek29`).
* De Edge Function `mail` is **niet uitgerold** (geen functie, geen Resend,
  geen geheimen). Schrijf niets alsof hij bestaat.
* Toets de belofte op de gegevens, **én** klik één keer echt in Chromium op
  de knop die ertoe doet (v90, v93).

## Testen

Volg `TESTEN.md` (hoofdstuk "Hoeveel testen"). Tijden gemeten op
20-10-2026 in de cloudomgeving van Claude (2 processorkernen), v113.

**Snelle kern** (±1,5 min). Bij het begin van een sessie, tijdens het
bouwen, na elke ronde van een beoordelaar, en bij elke oplevering:

```
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-start.js && node test-import.js
node test-slot.js && node test-offline.js && node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
OUD=/tmp/live node test-overgang.js   # OUD = kopie van wat live staat (26-10-2026: v122, e5ac52e); ook vanaf v98
bun test-mailfunctie.ts
```

Draai daarnaast altijd de reeks(en) van het onderdeel dat je raakt
(bijv. latten → `test-v113/v114/v115/v117/v118.js`, bestellijst-tabblad en werkvloer → `test-v118.js`, foto's en wachtrij → `test-v93/v103/v116.js`,
bestellen → `test-v104/105/110/112/114.js`,
bewerkslot → `test-v106.js`, inloggen → `test-v109.js`).

**Volledige batterij** (±25 min). Bij 🟠 en 🔴, één keer, op de
eindversie. De snelle kern plus:

```
node test-verbinding.js && node test-verwijderen.js     #  38 s,  9 s
node test-mail-en-slot.js && node test-v91.js           #  21 s, 45 s
node test-v93.js                                        #  73 s
node test-v98.js && python3 test-v98.py                 #  26 s
node test-v99.js && node test-v102.js                   #  86 s, 10 s
node test-v103.js                                       #  69 s
node test-v104.js                                       # 152 s
node test-v105.js                                       # 160 s
OUD105=/tmp/v105werk node test-v106.js   # 341 s; zonder v105-map: OUD105=/tmp/v103live
node test-v109.js                                       #  90 s
node test-v110.js                       # 129 s; PLAATJES=map voor schermafdrukken
OUD=/tmp/live109 node test-v111.js      #  70 s; OUD = map met v109 (kenmerk)
node test-v112.js && node test-v113.js                  #  16 s, 35 s
node test-v114.js                       # latzijde, onderdorpel, bi-color, ALLEEN ROOSTER, latmaten; PLAATJES=map
node test-v115.js                       #  41 s; latten op Toebehoren, omgekeerd, zicht, neuslat, geen (meegeleverd), naslag
node test-v116.js                       #  ±25 s; wachtrij: Safari stuurt een bestand uit IndexedDB leeg (nagebootst)
node test-v117.js                       #  ±60 s; pakket, max glaspakket, binnen, voorbeeld, zaagplan, bediening standaard; PLAATJES=map
node test-v118.js                       #  ±3 min; werkvloer-pdf, tabblad = pdf, Invoer rood, per-foto-tabellen, ✕, band buiten; PLAATJES=map
node test-v119.js                       #  ±70 s; vlak met kozijn, A5 nood, strook beide, Alles exporteren + werkvloer
node test-v120.js                       #  ±6 min; grote proef: komma, aantallen, twee tabbladen, dubbel besteld, import, latten, pdf-kop, ✕ terug, ids, telefoon, back-up
node test-v121.js                       #  ±2 min; neuslat recht + 20, melding beide, actiebalk (P3) op pc, iPad, iPhone; PLAATJES=map
node test-v122.js                       #  ±40 s; back-upaccount (alleen lezen) niet in de keuzelijsten, LEESMIJ van 💾
node test-v123.js                       #  ±3 min; bekende punten v90/v103: zoeken, weestaken, import (tekst, pdf), merken, draaien, tekenen, ↶ per tabel, foto + project wisselen, apart bewaren, uitloggen, pdf invoer, leverweek, ✕, spoor; PLAATJES=map
```

**Mutatieproef** (`--mutaties`): alleen bij 🔴, en alleen voor de reeks
die je wijziging raakt. Een nieuwe test bewijs je met de hand (reparatie
terugdraaien, rood, terugzetten), dat kost minuten. Duur per reeks:
v106 48 mutaties ±25–40 min, v109 22 ±25 min, v110 61 ±45+ min,
v111 51 ±40 min, v112 21 ±15 min, v113 40 ±30 min, v114 34 ±40 min,
v115 37 ±45 min, v116 9 ±4 min, v117 17 ±10 min, v118 18 ±25 min, v119 11 ±10 min,
v120 33 ±40 min, v121 17 ±20 min, v122 3 ±2 min, v123 34 ±18 min. Script 28 en 29:
proef tegen PostgreSQL, 57 controles en 18 mutaties (zip "niet-in-repo",
`proef-script-28/`). Script 27: proef
tegen PostgreSQL, 42 controles en 8 mutaties (zip "niet-in-repo"). Script 26 (rechten): een eigen proef tegen een lokale
PostgreSQL met 14 mutaties (staat in de zip "niet-in-repo", niet in de repo).
Die van v104 en v105 werken nu niet, en van v110 passen 9 mutaties niet
meer (gezien 21-10-2026; zie TESTEN.md, "Onderhoud van de batterij"). Een oudere reeks opnieuw alleen gericht (`ALLEEN=`), zie
TESTEN.md.

Verwacht jsdom, jspdf, jspdf-autotable en playwright in
`/home/claude/node_modules`, en Chromium in `/opt/pw-browsers/chromium`.
`test-sql.sql` draait tegen een lokale PostgreSQL (handover §10) en begint met
het weggooien van het schema: **nooit in Supabase draaien.** PostgreSQL 16
staat in deze omgeving in `/usr/lib/postgresql/16/bin` (draaien als
`su postgres`, map in `/tmp`). `config.js` zit niet in de zip; voor
`test-index.js` in de werkmap kopiëren uit de repo-clone (nooit meesturen).
