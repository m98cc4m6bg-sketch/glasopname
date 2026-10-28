# Invoer, foto's, tekeningen en bolletjes

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** De invoertabel, foto's en tekeningen met merkbolletjes, het aantal per regel, verhuizen tussen blokken, maten typen.

**Bestanden.** `index.html` (invoertabel, `verhuisRuit`), `fotos.js`, `teken.js`, `merken.js`, `kopie.js`, `bulk.js`.

## Valkuilen

* **Een foto die nog verwerkt wordt** (v123): elke route die een foto
  verkleint of bewaart, loopt via `metBezig(...)` en kijkt met
  `bijProject(pid)` of het project nog hetzelfde is (`nieuwPad` gebruikt
  het open project!). `magVerlaten` wacht op `glasFotoBezig()`.

* **Bolletjes op meer tekeningen** (v124, keuze Jan): een ruit staat in het
  blok van de tekening met de meeste bolletjes. Nieuwe code die bolletjes
  verandert: daarna `naarBolletjes(rij)` in dezelfde stap, vóór
  `herbereken` (de speling hoort bij het blok).

* **Foto's opruimen** (v124): alleen wat geen enkel project noemt
  (`glas_foto_nog_nodig`, tabel `glas_foto_pad`): een apart bewaarde kopie
  houdt de paden van het origineel. Geldt voor `fotosOpruimen`, de wachtrij
  (`zonderVerdwenen`) en Opslag nakijken.

* **In een fotoblok volgt het aantal de bolletjes** (v110, keuze Jan): heeft
  een regel bolletjes, dan veranderen `aantal` en `markeringen` alleen samen
  (`markErbij`, `markEenMinder`, de strook `scheefHTML`). Nieuwe code die
  `aantal` zet (doorvoeren, gelijktrekken, import, terugzetten): eerst
  `aantalVolgtBolletjes(rij)`. Nooit stil rechtzetten; ook niet bij openen.
  Aanwijzen verandert nooit het aantal (een maatstaat is de waarheid).

* Meer dan één tekenroute (`renderTabel`, `renderFotos`,
  `renderFotoTabellen`): regel het aan de bron.

* **Een maat is een tekstvak** (v120, `leesMaat`, `maatNaTypen`): een
  getalvak liet in Chrome de komma stil weg (1212,5 → 12125). Een halve mm
  naar beneden, met een melding (`kortBericht`). Het aantal: `zetAantal`
  (heel getal 1–999). Vóór de bestellijst `vreemdeControle` (glas < 100 mm,
  > 3210 × 6000, aantal > 99, rooster en glasdikte).

* 'Opgenomen door' staat vast na de eerste ruit; wijzigen alleen via
  `opnemerWijzig()` (wachtwoord + logboek).

* Opruimen van foto's neemt de submap `origineel/` mee (`fotosOpruimen`).

* **Een ruit naar een ander blok** (v125, keuze Jan): via `verhuisRuit`
  (index.html), die bij een andere speling de oude als eigen `correctie`
  geeft met `correctieMee` (telt niet in het kenmerk). Nieuwe code die
  `fotoId` verandert: ook via `verhuisRuit`.

## Het verhaal erbij

* **In een fotoblok volgt het aantal de bolletjes** (v110, bugboek valkuil 25). Een regel met minstens één bolletje heeft een vast aantal-vak (`aantalCel`, `aantalVolgtBolletjes`), en `setVal` weigert `aantal`. Uitzondering, bewust: `ruitenTerugZoalsBesteld` (de gebruiker zet een ruit terug zoals hij besteld is; daarna toont de strook het verschil). Na het aanraken van een bolletje negeert de foto 0,7 s elke tik (`pauzeerFototik`, de naklik van iOS); een test moet dan even wachten.

* **Waarom één lijst `rijen`**: foto-ruiten en losse maten staan in dezelfde lijst, onderscheiden door `fotoId`, zodat de bestellijst uit één bron telt. Coördinaten van bolletjes en inkt zijn verhoudingen (0–1, tekenlaag 1000 breed), nooit pixels.
