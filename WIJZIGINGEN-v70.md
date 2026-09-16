# v70 — de vervaagde kopbalk op de iPhone

Gewijzigd: `index.html` (één meta-regel plus versienummer), `sw.js` en
`pdf.js` (alleen het versienummer). Daarnaast één regel in
`manifest.webmanifest` die jij moet aanpassen, zie onderaan.

## Wat er aan de hand is

Het is het Liquid Glass-effect van iOS 26. Safari tekent onder de statusbalk
een glazen band die een paar regels naar beneden doorloopt, en laat de inhoud
van de pagina daar doorheen schemeren. De kleur van die band komt uit de
`theme-color` van de pagina.

En daar zat het: `theme-color` stond nog op `#1a3a5c`, een donkerblauw van
vóór de huisstijl met antraciet en rood. Een donkerblauwe band over een witte
kopbalk geeft precies die grauwe waas over het logo. Nu staat hij op wit,
gelijk aan de achtergrond van de kopbalk, en valt de band samen met wat
eronder ligt.

De twee eerdere wijzigingen blijven staan en waren allebei nodig:
`viewport-fit=cover` eruit (de pagina begint nu onder de statusbalk in plaats
van erachter) en `status-bar-style: default` (voor de app vanaf het
beginscherm). De kleur was het derde stuk.

## Wat jij nog moet doen

In `manifest.webmanifest` staat ook een `theme_color`, waarschijnlijk
dezelfde `#1a3a5c`. Zet die op `#ffffff`, anders krijgt de app vanaf het
beginscherm alsnog de oude band. Dat bestand heb ik niet, dus die regel moet
je zelf wijzigen — één woord.

## Getest

De hele testreeks blijft groen (`test-index.js`, `test-naslag.js`,
`test-cloud.js` en de leverpagina-testen).

## Niet getest

Het effect zelf. Dit is een kleur die iOS gebruikt om een band te tekenen die
ik hier niet kan zien; of het logo nu scherp blijft, zie jij op het toestel.
Blijft het wazig, zeg het dan meteen — dan is de band breder dan de kopbalk
en zet ik er ruimte boven in plaats van te blijven kleuren.
