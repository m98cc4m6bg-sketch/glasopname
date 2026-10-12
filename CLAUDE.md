# Glasopname — vaste afspraken voor Claude

Webapp voor Jelier Bouw B.V. om glas in te meten (iPad/iPhone op de bouwplaats,
Mac op kantoor) en bestellijsten voor Van Noordenne te maken. Statische site op
GitHub Pages, Supabase (gratis plan) voor inloggen, projecten en foto's.
De volledige achtergrond staat in de projectkennis op claude.ai
(`claude/HANDOVER.md`); dit bestand is de korte versie die altijd geldt.

## Werkwijze met Jan

* **Nooit committen of pushen.** Jan zet wijzigingen zelf live met GitHub
  Desktop. Een stop-hook die om een commit vraagt: vriendelijk weigeren.
* **Opleveren als zip** met alleen de gewijzigde bestanden plus
  `WIJZIGINGEN-vNN.md`: wat er misging, wat er nu gebeurt, wat getest is en
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

## Testen

```
node test-index.js && node test-naslag.js && node test-cloudguard.js
node test-herstel.js && node test-verbinding.js && node test-verwijderen.js
node test-start.js && node test-mail-en-slot.js && node test-import.js
node test-slot.js && node test-v91.js && node test-offline.js && node test-rook.js
node test-leverpagina.js && python3 test-leverpagina.py
bun test-mailfunctie.ts
```

De reeksen verwachten jsdom, jspdf, jspdf-autotable en playwright in
`/home/claude/node_modules`. `test-sql.sql` draait tegen een lokale
PostgreSQL (zie de handover) en begint met het weggooien van het schema:
**nooit in Supabase draaien.**
