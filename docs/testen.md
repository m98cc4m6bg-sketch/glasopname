# Testen: de commando's, de batterij en de valkuilen van de opstelling

*Hoe en hoeveel we testen staat in `TESTEN.md` (lees dat vóór je een test schrijft). Hier de
commando's en de opstelling. Verhuisd uit `CLAUDE.md` en de handover op 27-10-2026 (stap 1).
De snelle kern staat ook in `CLAUDE.md`.*

**Harde regel.** Toets de belofte op de gegevens, **én** klik één keer echt in Chromium op
de knop die ertoe doet (v90, v93).

## Snelle kern, reeksen per onderdeel, batterij en mutaties

Volg `TESTEN.md` (hoofdstuk "Hoeveel testen"). Tijden gemeten op
20-10-2026 in de cloudomgeving van Claude (2 processorkernen), v113.

**Snelle kern** (±1,5 min). Bij het begin van een sessie, tijdens het
bouwen, na elke ronde van een beoordelaar, en bij elke oplevering:

```
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-start.js && node test-import.js
node test-slot.js && node test-offline.js && node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
OUD=/tmp/live124 node test-overgang.js   # OUD = kopie van wat live staat (27-10-2026: v124, a7fc36b; git archive); ook vanaf v98
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
node test-v124-rechten.js               #  ±4 min; rollen, Beheer, werkvloer, rechten die veranderen, opruimen (namaak van script 30 in de test!)
OUD123=/tmp/live123 node test-v124-werkpunten.js   #  ±2 min; projectnaam, max glaspakket, spacer
node test-v124-herstel.js               #  ±3 min; ↶ (bolletjes, na herladen), Onlangs verwijderd
node test-v124-tekeningen.js            #  ±2,5 min; aanwijzen op meer tekeningen, verhuizen
node test-v124-toebehoren.js            #  ±1 min; latkiezer, drie stappen
node test-v124-cycli.js                 #  ±5 min; zeven werkgangen over alles heen
node test-v125.js                       #  ±3 min; Verder met, naam in de prullenbak vrij (namaak van script 31!), werkvloer leverfoto/taken, spacer, speling bij verhuizen, onderlat
```

**Mutatieproef** (`--mutaties`): alleen bij 🔴, en alleen voor de reeks
die je wijziging raakt. Een nieuwe test bewijs je met de hand (reparatie
terugdraaien, rood, terugzetten), dat kost minuten. Duur per reeks:
v106 48 mutaties ±25–40 min, v109 22 ±25 min, v110 61 ±45+ min,
v111 51 ±40 min, v112 21 ±15 min, v113 40 ±30 min, v114 34 ±40 min,
v115 37 ±45 min, v116 9 ±4 min, v117 17 ±10 min, v118 18 ±25 min, v119 11 ±10 min,
v120 33 ±40 min, v121 17 ±20 min, v122 3 ±2 min, v123 34 ±18 min,
v124-rechten 39 ±55 min, v124-werkpunten 37 ±35 min, v124-herstel 36 ±60 min,
v124-tekeningen 27 ±30 min, v124-toebehoren 40 ±20 min, v124-cycli 7 ±25 min,
v125 18 ±4 min. Script 31: proef tegen PostgreSQL (`proef-script-31/`, zip
"niet-in-repo").
Script 30: proef tegen PostgreSQL (175 controles, 67 mutaties) en de app
tegen een echte PostgREST (`proef-script-30/`, zip "niet-in-repo"). Script 28 en 29:
proef tegen PostgreSQL, 57 controles en 18 mutaties (zip "niet-in-repo",
`proef-script-28/`). Script 27: proef
tegen PostgreSQL, 42 controles en 8 mutaties (zip "niet-in-repo"). Script 26 (rechten): een eigen proef tegen een lokale
PostgreSQL met 14 mutaties (staat in de zip "niet-in-repo", niet in de repo).
Die van v104 en v105 werken nu niet, en van v110 passen 9 mutaties niet
meer (gezien 21-10-2026; zie TESTEN.md, "Onderhoud van de batterij"). Een oudere reeks opnieuw alleen gericht (`ALLEEN=`), zie
TESTEN.md.

Verwacht jsdom, jspdf, jspdf-autotable en playwright in
`/home/claude/node_modules`, en Chromium in `/opt/pw-browsers/chromium`.
`test-sql.sql` draait tegen een lokale PostgreSQL (opzet: `START-HIER.md` in de projectkennis) en begint met
het weggooien van het schema: **nooit in Supabase draaien.** PostgreSQL 16
staat in deze omgeving in `/usr/lib/postgresql/16/bin` (draaien als
`su postgres`, map in `/tmp`). `config.js` zit niet in de zip; voor
`test-index.js` in de werkmap kopiëren uit de repo-clone (nooit meesturen).


## Valkuilen van de opstelling (jsdom en Chromium)

**Valkuilen in jsdom**, allemaal al een keer een halve dag gekost:

* `document.visibilityState` is daar `'prerender'`; de reeksen zetten dat met
  `Object.defineProperty` op `'visible'`.
* De reeksen vuren `DOMContentLoaded` zelf nog eens af, dus elke
  opstartroutine komt twee keer langs. Dat is geen kunstgreep maar een
  vangnet: juist zo kwam de koppelingsbug van v87 boven water.
* `melding.js` overschrijft je eigen `appFout`/`appVraag`-stubs (zie §6.5).
* `test-rook.js` onderschept de jsPDF-bestanden op naam en serveert ze uit
  `node_modules` (dezelfde versie als in `lib/`).
* **Nagekomen aanroepen in een gesloten testvenster.** De nagebootste
  database antwoordt met beloftes van buiten het jsdom-venster, en die lopen
  na `w.close()` door. In `test-mail-en-slot.js` en `test-start.js` wordt
  precies die fout (`reading 'getElementById'`, binnen 5 s na een sluiting)
  genegeerd. Een echte browser kent dit niet. (v91)
* De mocks van de querybouwer kennen sinds v91 ook `.is()` en `.not()`
  (het filter van de prullenbak). Een nieuwe mock heeft die ook nodig.
* Pdf's die een test maakt (`uit-*.pdf`) horen niet in de repo.
* **`test-v93.js` bootst Supabase anders na** dan de jsdom-reeksen: de pagina
  krijgt in plaats van `lib/supabase-js…` een namaak die elke vraag via
  `exposeFunction` aan node doorgeeft. Database en Storage leven in node,
  blijven dus bestaan bij herladen en de test kan er rechtstreeks in kijken.
  `serviceWorkers: 'block'`, en `showSaveFilePicker` uitgezet zodat er
  gedownload wordt. Wil je een nieuwe knop toetsen: daar hoort hij.
* **`test-v109.js` gebruikt de échte supabase-js** tegen een nagebootste
  server op een eigen poort (met CORS). De namaak-bibliotheek van de andere
  reeksen kent geen herstellink, geen `updateUser` en geen
  `onAuthStateChange`-seintjes. Nieuwe tests rond inloggen horen daar. De
  tokens moeten de vorm van een JWT hebben (met `exp`), en een link uit een
  mail is een nieuwe pagina (eerst `about:blank`).
* **Het afgeschermde inlogkader** (v109, `sandbox`): Playwright zet zijn
  hulpscripts in elk kader en krijgt daar meldingen met "sandboxed". Dat is
  de testopzet; alle Chromium-reeksen negeren alleen die meldingen.
* Alleen het `#`-deel van het adres veranderen opent géén ander project (er
  is geen `hashchange`-afhandeling); de test gaat daarom eerst naar
  `about:blank`.

## Staan alle mutatie-ankers nog in de code?

Een mutatie zoekt een stukje tekst in de code; past dat niet meer, dan "past niet". Snel nakijken voor alle reeksen:

```
node -e "const fs=require('fs');for(const f of fs.readdirSync('.').filter(n=>/^test-.*\.js$/.test(n))){const m=fs.readFileSync(f,'utf8').match(/const MUTATIES = (\{[\s\S]*?\n\});/);if(!m)continue;const M=eval('('+m[1]+')');for(const[n,d]of Object.entries(M)){const t=fs.readFileSync(d[0],'utf8');for(let i=1;i<d.length;i+=2)if(t.indexOf(d[i])<0)console.log(f,n,'past niet')}}"
```

Gericht één oudere mutatie: `MUTATIE=naam ALLEEN=sectie node test-v113.js` (moet een FOUT geven).
