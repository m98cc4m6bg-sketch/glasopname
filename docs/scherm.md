# Scherm, vensters en meldingen

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Opbouw van het scherm, vensters en berichtjes, kleuren en aanraakschermen.

**Bestanden.** `index.html`, `melding.js`, `start.js`, `project.js`, `naslag.js`.

## Valkuilen

* **Kruisje** (v118, wens Jan): elk menu of venster dat openklapt krijgt
  `sluitKruis(el, sluit, label)` (index.html; ook Escape) of, in een
  `<details>`, een `button.sluit-x` direct na de summary. In een menu is
  een knop normaal 100 % breed: de regels `.veld-menu > button.sluit-x` e.d.
  houden hem rond (32 px, op een aanraakscherm 44 px).

* `innerHTML` binnen een stuk dat een MutationObserver bewaakt = eindeloze
  lus (v93): alleen opnieuw tekenen als er iets veranderd is.

* `hidden` verliest van `display` uit de CSS: zet `.klasse[hidden] {
  display: none; }` erbij.

* De werkbalk `.toolbar` is alleen op Invoer zichtbaar. "Alleen kijken":
  balk op Invoer, strook `#kijkChip` op de andere tabbladen (v108).

* Berichtjes onderin (`toonMelding`) zonder knop verdwijnen na 8 s; iets wat
  de gebruiker móét zien: een venster (`appMelding`).

* Eén naslag (`#naslagInhoud`), verplaatst, nooit gekopieerd.

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

* Telefoon of tablet: `glasMobiel()`. Bestanden naar de gebruiker:
  `bestandAfleveren()` / `afleveren()`; liever xlsx dan csv.

* Taken en logboek horen bij één project: een laat antwoord voor een ander
  project wordt genegeerd (`renderProject`).

* De inmeetdatum is tekst (dd-mm-jjjj): nooit als tekst sorteren. De
  projectenlijst sorteert in de databasevraag (grens 1000) en op naam nog eens
  met `Intl.Collator('nl', {numeric})`.

## Het verhaal erbij

* **Wat op elk tabblad moet staan, hoort in de vaste kop** (`#vasteKop`, v108, bugboek valkuil 20): het kijk-label van v106 stond in de werkbalk van Invoer en was op geen ander tabblad te zien.

* **Liever `.xlsx` dan csv** (bugboek, valkuil 22): Excel maakt van 4-12-4 een datum.
