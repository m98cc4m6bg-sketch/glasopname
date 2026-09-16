# Glasopname v71 — wazige bovenrand op de iPhone

## Wat er aan de hand was

Vanaf iOS 26 legt Safari een glazen band over de bovenste strook van de
pagina (Apple noemt dit het *scroll edge effect*). Alles wat daar onder
valt wordt vervaagd. Bij ons zijn dat het logo en de titel "Glasopname".

De drie vorige pogingen probeerden die band de juiste kleur te geven:

| versie | poging | resultaat |
|---|---|---|
| v68 | `apple-mobile-web-app-status-bar-style` op `default` | nog wazig |
| v69 | `viewport-fit=cover` eruit | nog wazig |
| v70 | `theme-color` op wit | nog wazig |

Dat kon ook niet werken: Safari 26 op iOS trekt zich bij een pagina die
bovenaan staat niets aan van `theme-color`. De band is niet te sturen.

## Wat er nu gebeurt

In plaats van de band te kleuren houden we hem **leeg**. Op schermen tot
820 px staat er 46 px witte ruimte boven de kopbalk, zodat het logo en de
titel er onderuit komen. De band vervaagt dan alleen wit op wit, en dat
zie je niet.

Op een iPad of laptop verandert er niets: daar staat de ruimte op nul.

### In de bestanden

* **index.html**
  * nieuwe variabele `--ios-band`, standaard `0px`, binnen
    `@media (max-width: 820px)` op `46px`;
  * de bovenmarge van de kopbalk telt die band mee:
    `padding-top: calc(10px + var(--ios-band) + env(safe-area-inset-top))`;
  * het uitklapmenu onder de menuknop schuift evenveel mee. Daar zat ook
    nog een dubbele regel die de veilige marge wegnam; die is weg;
  * `html` krijgt een witte achtergrond, gelijk aan de kopbalk;
  * de opmerking bij `theme-color` klopt nu met hoe het werkelijk zit.
* **sw.js**, **pdf.js** — versienummer op v71.

## Blijft het wazig?

Dan is de band bij jouw toestel hoger dan 46 px. Eén getal aanpassen is
genoeg: in `index.html`, in het blok `@media (max-width: 820px)`, staat

```css
:root { --ios-band: 46px; }
```

Zet daar bijvoorbeeld `60px` neer. Alles schuift dan mee — kopbalk én
menu.

## Controle na het plaatsen

1. Rechtsboven in de app moet **v71** staan.
2. In de console (Safari op de Mac → Ontwikkelaar → iPhone) moet
   `[pdf] v71` verschijnen.
3. Staat er nog v70: de service worker heeft de oude versie vast. Sluit
   alle tabbladen van de app en open hem opnieuw.

## Getest

* `test-index.js` — 39 controles, inclusief zes nieuwe over de ruimte
  boven de kopbalk
* `test-naslag.js` — 35 controles
* `test-cloud.js` — 5 controles
* `test-leverpagina.js` + `test-leverpagina.py` — 28 controles

Alles groen.
