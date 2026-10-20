# Glasopname — vaste afspraken voor Claude

Webapp voor Jelier Bouw B.V. (Dordrecht) om glas in te meten op de
bouwplaats, met meerdere apparaten en vaak zonder bereik, en bestellijsten
voor Van Noordenne te maken. Statische site op GitHub Pages (openbare repo),
Supabase (gratis plan) voor inloggen, projecten en foto's. Alles Nederlands.

Dit bestand bevat de **regels**. De uitleg staat elders; zie "Waar staat wat".

## Begin van een sessie

1. Lees `STATUS.md`: wat er live staat, wat er wacht op Jan, wat er openstaat.
2. Lees in de projectkennis op claude.ai `claude/HANDOVER.md` (de volledige
   geschiedenis, beslissingen, bugboek en beveiliging). Niet in de repo: die
   is openbaar.
3. Lees `TESTEN.md` vóór je een test schrijft, en `OVERZICHT.md` /
   `DATAMODEL.md` voor de opbouw.
4. Draai één keer de testbatterij (onderaan) zodat je weet dat je met een
   gezonde kopie begint.

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
  (v106: vier bestanden ontbraken, het slot deed niets).
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
3. De hele testbatterij **twee keer**. Elke nieuwe test moet aantoonbaar rood
   worden als je de reparatie terugdraait (mutatie). Ook de overgang vanaf
   wat live staat (`test-overgang.js`).
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
* Alles wat `projectInfo` vervangt (zetStaat, undo, samenvoegen) behoudt
  `bestellingen` (undo.js, `bestellingenErbij`, script 23).
* **Gebruikers nooit verwijderen**, behalve bij vertrek: verwijzingen worden
  `null`. Nieuwe kolom naar `auth.users`: de naam als tekst ernaast.

**Opslaan en samenwerken**
* Elke opslag draagt `data._versieNr` (versieslot, script 21),
  `glasBewerkslotVelden()` en `_basis` (bewerkslot, script 24). Een nieuwe
  manier van opslaan moet ze allemaal meesturen: zonder `_versieNr` weigert de
  database, zonder `_apparaat` slaat hij de slotcontrole over (gat), zonder
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
  `bedieningInTekst`.
* **Toebehoren** (v111, `toebehoren.js`) gaat nooit naar de leverancier:
  alleen in de PDF invoer (`toebehorenPagina`), nooit op de bestellijst of
  in de mail. Keuzes per ruit in `info.toebehoren.perRuit`, **niet op de
  ruit** (een veld op de ruit geeft een nieuw stempel `gewOp`, en dan werkt
  "Oudere stand?" niet meer). Wijzigen: `kijkWeigert()`, niet `slotWeigert`.
* **Glaslatten en sponning** (v113, `latten.js`, kennis in `GLASLATTEN.md`):
  - **Opslag.** `sponningDiepte`, `glaslat`, `bandBinnen` en `uitfrezen`
    staan in `info.toebehoren.perRuit`, NIET op de ruit. Lezen gaat via
    `GlasLatten.ruit(r)` (`rw`), schrijven via `toebehorenZetRuit`.
  - **Slot.** Op Invoer zijn het vak, de latknop en de chip `vrij-bij-slot`.
    Ze staan niet in `SLOT_FUNCTIES`; bulk mag via `bulkVrijBijSlot`.
    Alleen meekijken houdt ze tegen.
  - **Het vak in de tabel niet vervangen** terwijl het de focus heeft
    (`naWijziging(id, true)`): dat brak het ongedaan maken en de eerste
    tik op de chip.
  - **Rekenregel.** nodig = glas (`totaalDikte`) + band binnen + band buiten
    + lat in de sponning (× 2 bij twee kanten). Een opdeklat heeft 0 in de
    sponning en zijn eigen sponning erbij. Marge 1 mm (krap/ruim).
  - **Neuslat.** De kleinste met "rest + 5 ≤ S". Hij neemt níet zijn hele
    breedte in.
  - **Band buiten** nooit 2 mm.
  - **Oude namen** ('Glaslat', 'Neuslat', 'Ventilatielat') worden bij het
    lezen omgezet (`normaal`, `onderNaam`). Een oude onderlat 'Glaslat'
    wordt '' (zelfde als boven), niet A4.
  - **Eén getal voor de lengtes**: max(totaal + 10 %, zaagplan). Het grote
    getal en de rekenregel moeten altijd hetzelfde zeggen.
  - **Kleuren.** Gebruik de namen in `:root` (`--accent`, `--ink`, `--ok`,
    `--warn`, `--err`); het pdf-rood is 193, 18, 28.
  - **Een `width: 1%` in een tabel met `width: auto`** laat hem toch de hele
    breedte vullen (Toebehoren).
* `pdf.js` `schoon()`: een teken buiten het pdf-lettertype (emoji, →, ≥, ł)
  wordt in jsPDF rommel; nieuwe tekst in een pdf via `schoon` of `pdfTekst`
  (die zetten om, halen emoji weg en maken van de rest "?").
* Een ingekorte momentopname (`kort`) heeft alleen `KORT_VELDEN`; zet daar
  geen veld bij dat oude ingekorte standen niet hebben (dan lijkt alles
  "gewijzigd"). Lees zo'n stand met een terugval (`bedieningTekst`).
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
* De Edge Function `mail` is **niet uitgerold** (geen functie, geen Resend,
  geen geheimen). Schrijf niets alsof hij bestaat.
* Toets de belofte op de gegevens, **én** klik één keer echt in Chromium op
  de knop die ertoe doet (v90, v93).

## Testen

Volg `TESTEN.md`. De batterij (vanuit de projectmap):

```
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-verbinding.js && node test-verwijderen.js
node test-start.js && node test-mail-en-slot.js && node test-import.js
node test-slot.js && node test-v91.js && node test-v93.js && node test-offline.js
node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
node test-v98.js && python3 test-v98.py
node test-v99.js
node test-v102.js
node test-v103.js                     # en: --mutaties
node test-v104.js                     # en: --mutaties
node test-v105.js                     # en: --mutaties
OUD105=/tmp/v105werk node test-v106.js   # bewerkslot en v107/v108; en: --mutaties (48); zonder v105-map: OUD105=/tmp/v103live
node test-v109.js                     # inloggen, wachtwoord vergeten, herstellink, script 25; en: --mutaties (22, ±25 min)
node test-v110.js                     # aantal en bolletjes, EXTRA/annuleren; en: --mutaties (43, ±45 min); PLAATJES=map voor schermafdrukken
node test-v111.js                     # bediening, Toebehoren; en: --mutaties (±50, ±40 min); PLAATJES=map; OUD=map van live (kenmerk)
node test-v112.js                     # alleen een andere bediening na bestellen; en: --mutaties (21, ±15 min)
node test-v113.js                     # glaslatten, sponning, neuslat, één getal, uiterlijk; en: --mutaties (40, ±30 min); PLAATJES=map
OUD=/tmp/live112 node test-overgang.js   # OUD = git archive van wat live staat (19-10-2026: v112, 132ec05); ook vanaf v98
bun test-mailfunctie.ts
```

Verwacht jsdom, jspdf, jspdf-autotable en playwright in
`/home/claude/node_modules`, en Chromium in `/opt/pw-browsers/chromium`.
`test-sql.sql` draait tegen een lokale PostgreSQL (handover §10) en begint met
het weggooien van het schema: **nooit in Supabase draaien.** PostgreSQL 16
staat in deze omgeving in `/usr/lib/postgresql/16/bin` (draaien als
`su postgres`, map in `/tmp`). `config.js` zit niet in de zip; voor
`test-index.js` in de werkmap kopiëren uit de repo-clone (nooit meesturen).
