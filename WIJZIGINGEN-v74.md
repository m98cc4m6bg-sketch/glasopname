# Glasopname v74 — tekst op de foto, smallere invoertabel, vaste kop

Zeven punten, in de volgorde waarin je ze opgaf.

## 1. Tekstvak direct op de foto

Het `prompt()`-venster is weg. Kies je het tekstgereedschap en tik je op
de foto, dan verschijnt daar meteen een invoerveld — in de kleur, de
grootte en de stijl die de tekst straks op de foto krijgt. Op een telefoon
of tablet komt het toetsenbord vanzelf op.

* De tekst is **tijdens het typen al een echt onderdeel** van de
  tekening, en staat ook meteen geselecteerd. Je kunt hem dus verplaatsen
  en schalen zonder eerst iets af te ronden.
* Links van het vak zit een greep om te **verplaatsen**, rechtsonder één
  om te **schalen**. Bij schalen groeien de letters mee, zodat ze in het
  vak blijven passen.
* Het veld houdt de aandacht terwijl je sleept — het toetsenbord klapt
  dus niet weg.
* Het vak groeit mee met wat je typt.
* Sluit je af zonder iets te typen, dan blijft er niets achter.
* Tik je met het selectiegereedschap op bestaande tekst en kies je ✎,
  dan komt hetzelfde vak terug met de tekst erin.

## 2. De invoertabel smaller

Vier ingrepen, zonder kolommen te schrappen die je nodig hebt:

| ingreep | wat het scheelt |
|---|---|
| gewicht uit de kolom Dikte (staat nu in de tooltip, en gewoon in de samenvatting, bestellijst en pdf) | ± 60 px |
| Duco type en RAL kleur komen pas in beeld zodra ergens **Rooster = Ja** staat | ± 180 px |
| roedenbreedte en -opmerking pas zodra ergens een **verdeling** gekozen is; de kolom Verdeling blijft altijd staan | ± 130 px |
| kopjes ingekort (Corr., Bewerking, Opm., Glas B./H.), maten zonder 'mm' in de berekende cellen, krappere binnenruimte op een tablet | ± 90 px |

Daar staat één ding tegenover: de keuzevakjes worden zo breed als hun
kopje, en aan `HR-` of `4-1` heb je niets. Elk van die kolommen heeft nu
een **ondergrens** (glastype 92, opbouw 78, bewerking 100, maatsoort 80,
verdeling 86, Duco en RAL 88 px), zodat de waarde leesbaar blijft.

Gemeten in Chromium, een regel met glastype en opbouw ingevuld:

| schermbreedte | v73 | v74 kaal | v74 met rooster én roeden |
|---|---|---|---|
| 1024 px (iPad 10,2") | 1424 px | 1125 px | 1402 px |
| 1194 px (iPad Pro 11") | 1424 px | **past** | 1402 px |
| 1366 px (iPad Pro 12,9") | 1424 px | **past** | 1391 px |

Op een 11"-iPad hoef je bij een gewone regel dus niet meer te schuiven;
op een 10,2" scheelt het ruim 300 px.

De bestellijst-pdf is niet veranderd en blijft liggend A4 — dat wordt nu
ook echt gecontroleerd: paginaformaat 842 × 595 punten en geen tekst
buiten de marges.

## 3. Iconen in de tekenbalk

* **Selecteren** was een muispijltje, wat op een tablet niets zegt. Het is
  nu een stippelkader met een pijl erin — het gebaar dat je maakt.
* **Tekst** is een vette **A**.

## 4 en 5. Kleuren

* De standaardkleur staat op het bestaande **geel** (`#ffe45c`).
* Het rood is helderder: `#ff2020` in plaats van het logo-rood `#d00243`.
  Dat logo-rood zakt weg tegen baksteen; dit springt eruit.

Bestaande tekeningen houden hun eigen kleur — die is per streek bewaard.
Een oude streek in het logo-rood licht alleen niet meer op in de
kleurenbalk, omdat die kleur er niet meer in staat.

## 6. Kop blijft staan

De tabbladen én de balk met Importeren/Exporteren staan in één vaste kop
die bij het scrollen boven in beeld blijft. De knoppenbalk verschijnt
alleen op de tabbladen waar hij iets doet. Staat de selectiebalk van de
bulkbewerking open, dan schuift de vaste kop daar netjes onder. Bij
afdrukken staat hij gewoon mee in de stroom.

## 7. Ingelogd als

Naast de titel in de kopbalk staat nu `ingelogd als **julian**` — de naam
vóór de @ uit het e-mailadres waarmee je bent ingelogd, in lichte tekst.
Hij verschijnt bij het inloggen en verdwijnt bij het uitloggen. Op een
smal scherm (< 640 px) blijft hij weg; daar is de ruimte te krap.

## Gewijzigde bestanden

| bestand | wat |
|---|---|
| `teken.js` | tekstvak op de foto, schalen en verplaatsen, iconen, kleuren |
| `index.html` | tabelbreedte, vaste kop, 'ingelogd als', opmaak |
| `cloud.js` | vult en wist 'ingelogd als' bij in- en uitloggen |
| `sw.js`, `pdf.js` | versienummer |

Geen SQL nodig deze keer.

## Getest

| reeks | controles | wat |
|---|---|---|
| `test-teken.js` | 27 | **nieuw** — draait in een echte Chromium: tikken opent het vak, typen komt in de tekening, slepen verplaatst, hoekgreep schaalt en de letters schalen mee, het veld houdt de aandacht, leeg vak laat niets achter, gereedschap wisselen sluit netjes af |
| `test-index.js` | 128 | onder meer de wegvallende kolommen (rooster én roeden), de ondergrenzen, de vaste kop en 'ingelogd als' |
| `test-naslag.js` | 51 | catalogus en leverbaarheid ongemoeid |
| `test-cloud.js` | 8 | 'Opgenomen door' en 'ingelogd als' |
| `test-strijdig-pdf.js` + `.py` | 5 + 17 | markering op de bestellijst, plus **nieuw** de controle op liggend A4 en de marges |
| `test-leverpagina.js` + `.py` | 12 + 22 | leverpagina ongemoeid |

Alles groen. De tabelbreedtes zijn in Chromium gemeten op 1024, 1194 en
1366 px; schermafdrukken zijn meegestuurd.

**Niet getest:** Safari op iOS zelf — of het toetsenbord daar precies zo
opkomt kan ik hier niet nagaan. Het tekstvak is een gewone `<input>` die
bij het openen focus krijgt binnen de aanraking zelf; dat is de manier
waarop iOS het toetsenbord toestaat.

## Controle na het plaatsen

Rechtsboven moet **v74** staan en in de console `[pdf] v74`. Staat er nog
v73: alle tabbladen van de app sluiten en opnieuw openen.
