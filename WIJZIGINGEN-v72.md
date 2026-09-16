# Glasopname v72 — de invoerblokken duidelijker uit elkaar

*Bevat ook de wijziging van v71 (wazige bovenrand op de iPhone).*

## Wat er aan de hand was

De blokken op het tabblad Invoer liepen in elkaar over: één lange pagina
met tabellen, zonder dat je zag waar de ene groep ophield en de volgende
begon.

Er zat een echte fout onder. In de opmaak stond:

```css
.foto-blok { box-shadow: var(--schaduw); }
```

Die variabele bestaat niet — hij heet `--shadow`. De browser gooit zo'n
regel weg, dus de kaarten hadden **in het geheel geen schaduw**. Ze waren
wit op een lichtgrijze pagina, zonder rand en zonder schaduw, en dus niet
van elkaar te onderscheiden.

## Wat er nu anders is

Elke groep is een echte kaart, in dezelfde stijl als de rest van de app —
antraciet, logo-rood, dezelfde hoekafronding.

* **Rand en schaduw.** Een dunne rand in het bestaande grijs plus een
  lichte schaduw. De blokken staan nu 26 px uit elkaar in plaats van 16.
* **Een eigen kopbalk per blok.** De regel met het pijltje, de titel en
  de telling is een grijze band over de volle breedte van de kaart, met
  de titel iets groter (14 px) en de telling als klein etiket rechts.
  Je ziet in één oogopslag waar een blok begint.
* **Een gekleurde zijkant zegt wat voor blok het is:**

  | kleur | betekenis |
  |---|---|
  | rood | groep met foto of tekening |
  | geel | groep die zijn foto kwijt is |
  | grijs | de vangbak "Zonder foto of tekening" onderaan |

  Het geel bestond al voor groepen zonder foto; dat is nu onderdeel van
  één systeem in plaats van een losse uitzondering.
* **De tabel staat in een omlijnde wikkel.** De schaduw is van de tabel
  zelf af gehaald — binnen een kaart gaf die een vage dubbele rand.
* **Dichtgeklapt is de kopbalk de hele kaart.** Eerst bleef er een lege
  witte strook onder de balk staan.
* **Op een telefoon** iets minder binnenruimte in de kaart (12 px in
  plaats van 16), zodat de tabel breed blijft. De kopbalk rekent mee via
  `--kaart-pad`, dus dat hoeft nergens apart bijgehouden te worden.

Aan de tabellen, de kolommen, het rekenwerk en de export is niets
veranderd. Alleen `index.html` is aangeraakt (opmaak plus drie regels in
`zetBlok`, die de kaart een klasse `dicht` geeft).

## Getest

* Opmaak nagekeken in Chromium op 1440 px en op 390 px (iPhone-breedte)
  met een proefpagina die dezelfde opbouw gebruikt als de app —
  schermafdrukken zijn meegestuurd.
* `test-index.js` — 49 controles, waaronder tien nieuwe over de kaarten
  en het in- en uitklappen
* `test-naslag.js` — 35 controles
* `test-cloud.js` — 5 controles
* `test-leverpagina.js` + `test-leverpagina.py` — 28 controles

Alles groen.

**Niet getest:** hoe Safari op iOS deze opmaak precies tekent — dat kan
ik hier niet draaien. De gebruikte eigenschappen (`border`, `box-shadow`,
negatieve marges, CSS-variabelen) zijn al jaren overal hetzelfde, dus
verschillen zijn niet te verwachten.

## Controle na het plaatsen

Rechtsboven moet **v72** staan en in de console `[pdf] v72`. Staat er nog
v70 of v71: alle tabbladen van de app sluiten en opnieuw openen, dan laat
de service worker de oude versie los.
