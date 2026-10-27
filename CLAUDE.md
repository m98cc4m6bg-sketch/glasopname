# Glasopname — instructies voor Claude

Webapp (PWA) voor Jelier Bouw B.V. om glas in te meten op de bouwplaats, met
meer apparaten tegelijk en vaak zonder bereik, en bestellijsten voor Van
Noordenne te maken. GitHub Pages (openbare repo) + Supabase (gratis plan).
Geen bouwstap. Alles in het Nederlands, ook code en commentaar.
Volg de skills **houdbaar-bouwen** en **grondig-testen**.

Dit bestand bevat alleen de regels en de commando's (≤ 8 kB, niet laten
groeien). Kennis per onderdeel staat in `docs/`; het verhaal achter keuzes
en fouten in de projectkennis op claude.ai.

## Begin van een sessie

1. Projectkennis `claude/START-HIER.md` (stand, werkwijze, herinneringen,
   omgeving klaarzetten), dan `STATUS.md`.
2. Lees daarna alleen wat je wens raakt: `docs/<onderdeel>.md` (tabel
   onderaan), en voor de opbouw `OVERZICHT.md` / `DATAMODEL.md`.
3. Draai de snelle kern, zodat je weet dat je met een gezonde kopie begint.

## Commando's

```
# snelle kern (±1,5 min), in de werkmap
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-start.js && node test-import.js
node test-slot.js && node test-offline.js && node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
OUD=/tmp/live node test-overgang.js   # OUD = git archive van wat live staat
bun test-mailfunctie.ts
# meetlat (bij elke pull request)
./meet.sh
```

Reeksen per onderdeel, de volledige batterij en mutatieproeven:
`docs/testen.md`. Hoeveel testen bij welk niveau: `TESTEN.md`.

## Harde regels

* **Nooit gegevens kwijt.** Na elke stap staat werk op de server óf op het
  apparaat met "moet nog omhoog". Liever twee kopieën dan nul.
* Werkt zonder bereik · één waarheid bij meer apparaten · een bestelling
  verdwijnt nooit · iOS/iPadOS, macOS, Android, Windows (botst iets: meld
  het uit jezelf) · saai en voorspelbaar boven slim.
* **Nooit `config.js`** wijzigen of meesturen. Nooit een `service_role`- of
  `sb_secret_…`-sleutel in de repo, een workflow of een back-uptaak.
* **De repo is openbaar**: zwakke plekken, misbruikmogelijkheden en
  bevindingen van controles alleen in de projectkennis
  (`claude/BEVEILIGING.md`), nooit in code, commentaar, tests, docs of een
  pull request. In tests en voorbeelden `naam@voorbeeld.test`.
* **Gebruikers nooit verwijderen** (behalve bij vertrek).
* **Opleveren via een tak en een pull request** (keuze Jan, 27-10-2026):
  nooit naar `main` pushen, nooit zelf mergen; Jan merget. Staat er SQL bij:
  bovenaan de pull request "eerst in Supabase → SQL Editor, dan mergen".
* De bestelmail (Edge Function `mail`) is **niet uitgerold**: schrijf niets
  alsof hij werkt.
* Toets de belofte op de gegevens **én** klik één keer echt in Chromium op
  de knop die ertoe doet.

## Niveau en budget (vooraf noemen)

🟢 tekst, lay-out, kleine schermlogica: ½ uur · 🟠 nieuwe functie,
berekening, keuzelijst, een naad tussen onderdelen: 2 uur · 🔴 database,
rechten, inloggen, data omzetten, service worker, niet terug te draaien:
4 uur, **eerst uitleggen en op akkoord wachten**. Budget inclusief testen;
eroverheen = stoppen en vragen. Eén wens per sessie en per pull request;
geen bouw-agents (een agent alleen als onafhankelijke controle bij 🔴).

## Bij elke oplevering

1. Drie versienummers samen omhoog: `APP_VERSIE` (index.html), `PDF_VERSIE`
   (pdf.js), `VERSIE` (sw.js). Nieuw `.js`-bestand of bibliotheek: ook
   `<script src>` in index.html en de `SHELL`-lijst in sw.js. Alleen docs:
   geen versienummer omhoog.
2. Testen naar niveau (`TESTEN.md`, "Hoeveel testen"); altijd de overgang
   vanaf wat live staat.
3. `BEHEER.md`, `OVERZICHT.md`, `DATAMODEL.md` (+ `GLASLATTEN.md`) en
   `STATUS.md` bijwerken: gewone taal, met de reden, nagekeken tegen de
   code. Een nieuwe valkuil gaat in `docs/<onderdeel>.md`, **niet hier**.
4. Pull request: wat er veranderde (niveau, tijd tegenover budget), per
   bestand één regel, hoe Jan het zelf controleert, getest en **niet
   getest** (bijna altijd: echte Safari/iPad/iPhone, Android, Windows, de
   echte Supabase), de uitvoer van `./meet.sh`.
5. Projectkennis: de nota `claude/WIJZIGINGEN-vNN.md`, en waar nodig
   `claude/BESLISSINGEN.md`, `claude/BUGBOEK.md`, `claude/BEVEILIGING.md`,
   `claude/START-HIER.md`.

## Vijf valkuilen die overal gelden

* `pasDataToe()` laat de database winnen van `DATA`: een keuzelijst wijzigen
  vraagt óók een SQL-script.
* Meer dan één tekenroute (`renderTabel`, `renderFotos`,
  `renderFotoTabellen`): regel het aan de bron.
* Elke opslag draagt `_versieNr`, `glasBewerkslotVelden()` en `_basis`.
* Nooit `location.reload()` zonder `opslaanEnWachten()`.
* Wat op twee plekken staat (app en SQL), verander je samen: zie
  `docs/database-en-rechten.md`.

## Onderdelen

| onderdeel | lees |
|---|---|
| opslaan, offline werk, versieslot, bewerkslot, apart bewaren | `docs/opslaan-en-samenwerken.md` |
| ↶, Cmd+Z, Onlangs verwijderd | `docs/ongedaan-maken.md` |
| invoertabel, foto's, tekeningen, bolletjes, aantal | `docs/invoer-en-fotos.md` |
| bestellen, aanvullingen, bestellijst, pdf | `docs/bestellen.md` |
| Toebehoren, glaslatten, sponning | `docs/toebehoren-en-latten.md` (+ `GLASLATTEN.md`) |
| SQL-scripts, rechten, rollen, zoeken, back-up | `docs/database-en-rechten.md` (+ `DATAMODEL.md`) |
| bijwerken, service worker, fotowachtrij | `docs/bijwerken-en-offline.md` |
| scherm, vensters, berichtjes, kleuren | `docs/scherm.md` |
| inloggen, wachtwoord, herstellink | `docs/inloggen.md` |
| testcommando's, batterij, opstelling | `docs/testen.md` (+ `TESTEN.md`) |

Verder: `STATUS.md` (stand), `OVERZICHT.md` (hoe het werkt, bestanden),
`DATAMODEL.md` (database), `BEHEER.md` (wat Jan doet), `TESTEN.md`.
