# Glasopname — vaste afspraken voor Claude

Webapp voor Jelier Bouw B.V. om glas in te meten (iPad/iPhone op de bouwplaats,
Mac op kantoor) en bestellijsten voor Van Noordenne te maken. Statische site op
GitHub Pages, Supabase (gratis plan) voor inloggen, projecten en foto's.
De volledige achtergrond staat in de projectkennis op claude.ai
(`claude/HANDOVER.md`); dit bestand is de korte versie die altijd geldt.

## Werkwijze met Jan

* **Nooit committen of pushen.** Jan zet wijzigingen zelf live met GitHub
  Desktop. Een stop-hook die om een commit vraagt: vriendelijk weigeren.
* **Opleveren als zip met het COMPLETE pakket** (afspraak van Jan, meermaals
  gevraagd): de hele app, `lib/` compleet, alle SQL, tests en nota's — alles
  behalve `config.js`. Nooit alleen de gewijzigde bestanden: bij v93 zat er
  een halve map `lib/` in, Finder verving de hele map, en de app lag eruit.
  Met `WIJZIGINGEN-vNN.md` erin: wat er misging, wat er nu gebeurt, wat getest is en
  **wat niet getest kon worden** (bijna altijd: echte Safari op iPad/iPhone,
  de echte Supabase, echte bestanden van de leverancier).
* **Nooit `config.js`** meesturen of wijzigen. Nooit een `service_role`- of
  `sb_secret_…`-sleutel in de repo of in een workflow.
* **SQL eerst.** Staat er een SQL-script bij, dan bovenaan de nota: eerst in
  Supabase → SQL Editor draaien, dan pas de bestanden.
* **Werk in blokken.** Bij een groot blok eerst de ontwerpkeuzes voorleggen.
* **Nederlands**, ook in code en commentaar. Commentaar legt uit *waarom*,
  met het versienummer erbij.

## Bij elke oplevering

1. Drie versienummers gelijk ophogen: `APP_VERSIE` (index.html),
   `PDF_VERSIE` (pdf.js), `VERSIE` (sw.js). `test-index.js` bewaakt dat.
2. Een nieuw `.js`-bestand of bibliotheek: `<script src>` in index.html, de
   `SHELL`-lijst in sw.js, en mee in de zip. Vergeet je sw.js, dan werkt het
   offline niet — en dat merkt Jan pas op een dak.
3. De hele testbatterij **twee keer** draaien (zie hieronder).

## Valkuilen

* `cloud.js pasDataToe()` overschrijft `DATA` uit index.html met
  `app_data.glas_data` uit de database. Een keuzelijst wijzigen vraagt dus
  óók een SQL-script.
* Het scherm wordt via meer dan één route getekend (`renderTabel`,
  `renderFotos`, `renderFotoTabellen`). Regel dingen aan de bron.
* Het slot na bestellen zit op de gegevens: elke weg naar een wijziging gaat
  langs `slotWeigert()` of staat in `SLOT_FUNCTIES` (index.html). Het slot
  geldt vanaf de status 'besteld' en alle statussen daarna, en dekt ook de
  foto's en het tekenen.
* Een nieuwe functie die regels, bolletjes of tekeningen verandert? In
  `SLOT_FUNCTIES` zetten, of laten lopen via `setVal`.
* Toets in testen de belofte op de gegevens, niet de knoppen (de les van v90).
  **Én** klik minstens één keer echt op de knop, in Chromium (`test-v93.js`):
  de knop ‹Ontgrendelen› werkte van v90 t/m v92 niet, terwijl alle tests
  groen waren, omdat ze `slotOntgrendel()` rechtstreeks aanriepen (v93).
* Iets dat telkens opnieuw tekent (`innerHTML`) binnen een stuk scherm dat
  een `MutationObserver` bewaakt, geeft een eindeloze lus. Alleen opnieuw
  tekenen als er iets veranderd is (zie `slotToepassen`, v93).
* Foto's gaan altijd via `bewaarBestand()` in fotos.js: eerst in de
  wachtrij op het apparaat (`wachtrij.js`, IndexedDB), dan op de
  achtergrond naar Storage. Nooit meer rechtstreeks `storage.upload`. Een
  foto ophalen gaat via `fotoBlob(pad)` (wachtrij eerst, dan cloud).
* Originele foto's staan in `<project>/origineel/`; opruimen moet die
  submap meenemen (`fotosOpruimen` in cloud.js).
* Alles wat los van de opname wordt opgehaald (taken, logboek) hoort bij één
  project. `renderProject()` haalt het opnieuw op als `glasProjectId`
  veranderd is; een antwoord voor een ander project wordt genegeerd (v95).
  Iets nieuws in die soort? Zelfde patroon.
* 'Opgenomen door' staat vast na de eerste ruit en verandert alleen via
  `opnemerWijzig()` (wachtwoord + logboek). `projectVeld('opnemer')` weigert.
* Klant, werkadres en levering worden sinds v98 ingevuld op **Invoer**
  (klantblok bovenaan, levering onderaan); Project info toont ze alleen.
  Ze gaan mee op slot: elke functie die ze wijzigt begint met `opSlot()`
  in project.js. Een nieuwe functie in die soort? Zelfde regel.
* `hidden` wint niet van een `display` uit de opmaak. Een element met een
  klasse die `display:flex` zet, blijft met `hidden` gewoon in beeld (zo
  stond de lege slotbalk er van v90 t/m v97). Zet er een regel
  `.klasse[hidden] { display: none; }` bij; `test-v98.js` controleert de
  hele pagina.
* Er is één naslag (`#naslagInhoud`); op het startscherm wordt hij
  verplaatst, niet gekopieerd (start.js, v98). Twee kopieën geven dubbele ids.
* **Bijwerken is verplicht en veilig** (v99, cloud.js `verplichtBijwerken`
  / `veiligBijwerken`): opslaan en wachten op de server, dan pas de nieuwe
  versie laden. Nooit `location.reload()` zonder `opslaanEnWachten()`.
  Elke opslag draagt `data._versieNr`; de database weigert een lager nummer
  (`21_versieslot.sql`). Een nieuw onderdeel bovenin `data`? Dan is dat
  slot precies wat voorkomt dat een oud apparaat het wegschrijft — dus
  nooit het versienummer weglaten.
* De service worker installeert een nieuwe versie alleen als **elk**
  bestand uit `SHELL` binnen is (`allesInCache`, v100); anders blijft de
  vorige versie draaien. Zet in `SHELL` dus nooit een bestand dat niet in
  de repo staat (dan komt er nooit meer een update). De catalogusfoto's
  mogen ontbreken. Test "geen bereik" met een server die echt weg is:
  `ctx.setOffline` raakt de service worker niet (`test-v99.js`).
* **De Edge Function `mail` is nog niet uitgerold** (stand oktober 2026): de
  code staat in `supabase/functions/mail/`, maar in Supabase staat geen
  functie, geen Resend en geen geheimen. Jan stelt dat later in (handover
  §11e). Schrijf installatie-instructies dus niet alsof hij bestaat.

## Testen

**Lees eerst `TESTEN.md`** (afspraak van Jan, v100). In het kort:
- Weet wat je test, waarom en waarvoor. Schrijf de echte situatie bovenaan
  elke test: wie, welk apparaat, waar, welk bereik.
- Boots de echte omstandigheden na, en controleer dat je nabootsing klopt.
  Voorbeelden:
  - geen bereik = een server die écht weg is;
  - halverwege afgebroken;
  - oude en nieuwe versie naast elkaar;
  - twee tabbladen;
  - iemand die nog typt.
- Vraag bij elk proces: wat als het hier stopt?
- Bewijs dat elke nieuwe test kan falen: draai de reparatie terug, de test
  moet rood worden.
- Nooit gegevens kwijt: na elke stap staat het werk op de server, óf op het
  apparaat met de vlag "moet nog omhoog".
- Onduidelijk? Vraag het Jan.

```
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-verbinding.js && node test-verwijderen.js
node test-start.js && node test-mail-en-slot.js && node test-import.js
node test-slot.js && node test-v91.js && node test-v93.js && node test-offline.js
node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
node test-v98.js && python3 test-v98.py
node test-v99.js
bun test-mailfunctie.ts
```

De reeksen verwachten jsdom, jspdf, jspdf-autotable en playwright in
`/home/claude/node_modules`, en Chromium in `/opt/pw-browsers/chromium`. `test-sql.sql` draait tegen een lokale
PostgreSQL (zie de handover) en begint met het weggooien van het schema:
**nooit in Supabase draaien.**
