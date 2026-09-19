# Glasopname v75 — de vaste kop en de gele selectiebalk op de iPhone

Twee dingen uit je opname, met één gemeenschappelijke oorzaak.

## 1. De vaste kop bleef halverwege hangen

In de opname kleeft de balk met de tabbladen en Importeren/Exporteren
niet tegen de bovenrand maar ongeveer 180 px lager, met daarboven een
strook waar de pagina gewoon doorheen schuift.

**Waarom.** De opmaak zei:

```css
.vaste-kop { top: var(--bulkhoogte, 0px); }
```

`--bulkhoogte` is de hoogte van de gele selectiebalk. Die wordt gezet
zodra je een regel selecteert — maar hij wordt **nooit teruggezet** als de
selectie weg is. Eén keer iets selecteren en de vaste kop hing de rest van
de sessie op die hoogte. Op een telefoon werd die balk ook nog eens hoog
(zie punt 2), dus hing hij 180 px te laag.

**Nu.** De kop staat op `top: 0`. Het opschuiven gebeurt alleen nog via de
regel die er al stond en die alleen geldt zolang er werkelijk iets
geselecteerd is:

```css
body.bulk-open .vaste-kop { top: var(--bulkhoogte, 0px); }
```

Een blijven hangen oude waarde kan hem dus niet meer omlaag duwen. Dat
staat nu ook als vaste controle in de testreeks.

## 2. De wazige strook van iOS 26 over de tabbladen

Nu de kop wél tegen de bovenrand kleeft, komt hij daar onder de band die
iOS 26 over de bovenste strook van de pagina legt — hetzelfde probleem als
in v71, maar dan voor een balk die pas bij scrollen bovenaan komt.

Opgelost zoals bij de kopbalk: **zodra de balk werkelijk vastzit** neemt
hij die strook zelf in beslag, met zijn eigen achtergrond. De vervaging
valt dan op leeg grijs in plaats van op de tabbladen.

Dat "zodra hij vastzit" gaat via een peilpunt van één beeldpunt pal boven
de balken. Schuift dat uit beeld, dan krijgt `body` de klasse `kop-vast`.
Geen meekijken met elke scrollbeweging, dus het kost niets. Op een iPad of
laptop is `--ios-band` nul en verandert er niets.

## 3. De gele selectiebalk was breder dan het scherm

De balk was één flexregel zonder afbreken: zes knoppen plus de uitleg
"Gebruik ⇣ in een kolomkop…" naast elkaar. Op een iPhone werd de balk
daardoor ruim twee keer zo breed als het scherm, en dan schuift de **hele
pagina** opzij — dat is wat je in de opname ziet: de tabel staat scheef en
de uitleg hangt rechts over de rand.

Nu:

* de balk breekt af (`flex-wrap`) en is nooit breder dan het scherm;
* op een telefoon staat de telling op een eigen regel en verdelen de
  knoppen zich over twee regels, met grotere raakvlakken (9 px binnenruimte
  in plaats van 4);
* de uitleg over ⇣ valt weg op een telefoon — dat hoort bij een muis.

## Gewijzigde bestanden

Alleen **`index.html`** (opmaak plus het peilpunt en twee kleine functies);
`pdf.js` en `sw.js` krijgen het nieuwe versienummer. `bulk.js` hoefde niet
mee: de stille fout zat in de opmaak, niet daar.

## Getest

| reeks | controles | wat |
|---|---|---|
| `test-kop.js` | 22 | **nieuw** — draait in Chromium op 402 × 874 (iPhone-breedte): de kop kleeft op 0, een blijven hangen `--bulkhoogte` van 183 px duwt hem niet omlaag, de gele balk blijft binnen het scherm, de pagina schuift niet opzij, de kop sluit precies op de balk aan, de knoppen breken over twee regels, en op 1400 px verandert er niets |
| `test-index.js` | 128 | invoertabel, kolommen, bestellijst, vaste kop |
| `test-teken.js` | 27 | tekstvak op de foto |
| `test-naslag.js` | 51 | catalogus en leverbaarheid |
| `test-cloud.js` | 8 | opnemer en 'ingelogd als' |
| `test-strijdig-pdf.js` + `.py` | 5 + 17 | markering, liggend A4, marges |
| `test-leverpagina.js` + `.py` | 12 + 22 | leverpagina |

Alles groen. Schermafdrukken op iPhone-breedte zijn meegestuurd: gescrold
zonder selectie en met een selectie.

**Niet getest:** de vervaging van iOS 26 zelf — die tekent Safari en die
kan ik hier niet nabootsen. Wat ik wel kon meten is dat de balk die strook
met zijn eigen achtergrond bezet houdt (141 px hoog in plaats van 95),
zodat er niets van de tabbladen in valt.

## Controle na het plaatsen

Rechtsboven moet **v75** staan en in de console `[pdf] v75`. Staat er nog
v74: alle tabbladen van de app sluiten en opnieuw openen.
