# Glasopname v78 — tekeningen schalen en de lasso

Twee dingen uit de tekenfunctie die nog niet werkten zoals in een notitie-app.

## 1. Alles kan nu van maat veranderen

Tot nu toe kon alleen een tekstvak groter of kleiner: de vier hoekgrepen om
een rechthoek, pijl, lijn of vrije streek verplaatsten alle vier hetzelfde.

De hoek **rechtsonder** schaalt nu — bij tekst, bij een tekening, en bij een
hele selectie. De andere drie hoeken verplaatsen, zoals je gewend bent. Je
ziet het aan de muisaanwijzer: schuin pijltje in plaats van het
verplaatskruis.

De linkerbovenhoek blijft staan en de rechteronderhoek volgt je vinger. Twee
dingen veranderen bewust **niet** mee:

- **de lijndikte** — een pijl die je kleiner sleept hoort geen haarlijn te
  worden; dun/normaal/dik kies je in de balk;
- **de lettergrootte** — bij tekst is het vak de vorm en breekt de zin
  daarbinnen opnieuw af, precies zoals in v77.

Ondergrens is 12 eenheden, zodat je iets nooit tot niets kunt slepen en het
daarna niet meer terugvindt.

## 2. Lasso: meerdere onderdelen tegelijk

Nieuw gereedschap in de balk, naast het selectiepijltje: een stippellus met
een staartje. Omcirkel wat je wilt hebben en laat los.

- Alles wat voor **70 %** binnen de lus valt gaat mee. Helemaal precies
  omcirkelen lukt op een telefoon toch niet, en een streek die er half in
  ligt wil je meestal wél mee hebben.
- Een rechthoek en een tekstvak zijn in de gegevens maar twee punten; daar
  tellen de vier hoeken en het midden mee, zodat een lus om alleen het
  midden niet genoeg is.
- Elk gekozen onderdeel krijgt een dun kadertje, met daaromheen één groot
  kader met grepen. Daar sleep je aan, en rechtsonder schaal je de hele
  groep in één keer.
- **Kleur en dikte gelden voor alles wat geselecteerd is.** Tien gele lijnen
  in één keer rood maken is dus één tik.
- 🗑 verwijdert de hele selectie, ✕ heft hem op. Alles in één stap, dus
  ongedaan maken zet het ook in één keer terug.
- De lasso werkt met de vinger, ook met "Met vinger tekenen" uit — net als
  het selectiepijltje en het tekstgereedschap. Twee vingers blijft schuiven
  en zoomen.

Staat er al iets geselecteerd, dan pakt een tik op een greep die selectie op
in plaats van een nieuwe lus te beginnen. Je hoeft dus niet heen en weer
tussen de twee gereedschappen.

## Onderweg gevonden

Met het achtste gereedschap erbij paste de knoppenrij op een iPhone niet
meer op één regel en liep hij buiten de balk door. `.tk-groep` breekt nu af
over twee regels. Getoetst op 402 px: geen enkele knop steekt nog buiten de
balk en de pagina schuift niet opzij.

## Testen

Alles groen. Nieuw in `test-teken.js` (Chromium, echte muis- en
aanraakberichten):

| test | wat |
|---|---|
| 14 | een rechthoek schalen: linkerbovenhoek blijft, rechteronder gaat mee, dikte blijft 6 |
| 15 | lasso om twee van de drie onderdelen; het derde valt erbuiten en het kader loopt er niet naartoe |
| 16 | de hele selectie verplaatsen, verkleuren en verwijderen — en wat erbuiten ligt blijft ongemoeid |
| 17 | de tekenbalk past op 402 px |

De acht bestaande suites (index, naslag, cloud, teken, vormen, kop, en de
drie pdf-suites met pdfplumber) draaien ongewijzigd door.

## Wat nog niet als Notability werkt

Voor de volledigheid, zodat je weet waar je aan toe bent:

- **geen markeerstift** — alle kleuren zijn dekkend;
- **geen druk op de pen** — de lijndikte is overal gelijk, ook met een Pencil;
- **de gum wist hele streken**, niet een stuk uit een lijn;
- **geen kopiëren of dupliceren** van een onderdeel.

## Bijwerken

Alle bestanden uit de zip over de bestaande heen. Versie **v78** in
`index.html`, `pdf.js` en `sw.js` — alle drie hetzelfde nummer, anders
blijft de service worker de oude versie serveren.

Geen SQL nodig.
