# Glasopname v76 — roosterfoto's, Canalé mat, roeden opgeschoond, vormherkenning

## 1a. Foto's bij de Duco-roosters

De tabel op het tabblad Naslag heeft er een kolom Foto bij. Tikken op een
foto maakt hem groot, net als bij de glassoorten.

Zes bestanden voor acht roosters: DucoTon 10 en 10 ZR zijn hetzelfde
profiel (handmatig of zelfregelend), en dat geldt ook voor GlasMax ZR en
SR.

**Nog te doen:** de foto's staan nog niet in de repo. Ophalen doe je met
hetzelfde script als voor de glascatalogus, nu met twee argumenten:

```
bash fotos-ophalen.sh roosterfotos.txt roosters
```

De URL's staan in `roosterfotos.txt` en komen van de productpagina's van
Duco. Tot ze er staan toont de tabel netjes "foto ontbreekt"; verder werkt
alles gewoon.

## 1b. Canalé mat blank

Ontbrak inderdaad. Hij staat nu in de catalogus (Figuurglas, 4 mm, ook te
vinden op *Flutes mat* en *ribbelglas mat*) en daarmee ook in de
keuzelijst Glasbewerking — 43 soorten in plaats van 42. De controle op
dikte/opbouw werkt er meteen op: hij past in 4-16-4, niet in 6-16-6.

**Wat er nog mist is de foto.** De showroom van Van Noordenne liet zich
hier niet uitlezen, dus de bron-URL heb ik niet. In
`catalogus-fotos.txt` staat een regel klaar met uitleg: zet daar de URL
uit de showroom in, of leg de foto zelf neer als
`catalogus/canale-mat-blank.jpg`. Zonder foto toont de kaart "foto
ontbreekt" en is de soort gewoon kiesbaar.

## 2. Project → Project info

Alleen het opschrift op de tab. Alles wat er intern naar verwijst blijft
`project`, dus bestaande projecten en links veranderen niet.

## 3. Roeden opgeschoond

**Eruit:** de vier opplakroeden. En de twee breedtes die alleen bij hen
hoorden: 28 en 38 mm.

**Erbij:** 20 en 24 mm — die horen bij wienersprossen en ontbraken.

**Per stelsel gescheiden.** De kolom Breedte toont nu alleen wat bij de
gekozen verdeling hoort:

| verdeling | breedtes |
|---|---|
| Wienersprossen — aluminium kader in de spouw, latjes erover verlijmd | 20, 24, 30 mm |
| Kruisroeden in glas — alleen een roede in de spouw | 18, 26, 45 mm |
| Overig / niets gekozen | alle |

*Overig (zie opmerking)* blijft altijd staan; er is altijd wel een
bijzonder profiel.

Wissel je van stelsel, dan wordt een breedte die daar niet bij hoort
losgelaten. Anders zou er iets besteld worden dat niet bestaat.

**Bron van die indeling:** de roedenpagina van Glaslinq, nagekeken op
18 september 2026. Dat is een isolatieglasleverancier, niet Van Noordenne
— hun eigen lijst kon ik niet inzien. Klopt het niet met wat Noordenne
levert, dan hoeft er maar één tabel aangepast te worden: `ROEDE_BREEDTES`
in `naslag.js`, plus de lijst in het SQL-script. Zeg het en ik pas het aan.

**Bestaande projecten** houden hun waarde. Een opplakroede uit een ouder
project blijft in de regel zichtbaar onder het kopje *Oude waarde*, en een
breedte die niet bij het stelsel hoort onder *Hoort niet bij deze roede* —
je moet kunnen zien wat er werkelijk in staat.

**Draai `12_roeden_en_canale.sql` in Supabase.** Zonder dat script duwt de
database de oude lijsten er weer in en staan de opplakroeden terug.
`cloud.js` herkent dat nu en waarschuwt in de console.

## 4. Vormherkenning bij het tekenen

Teken een vorm en blijf even stilstaan (ruim een halve seconde) vóór je
loslaat. De streek wordt dan netjes gezet:

| wat je tekent | wat het wordt |
|---|---|
| een rechte veeg | rechte lijn (met het pijlgereedschap: een pijl) |
| schacht met twee weerhaken | pijl |
| vier hoeken | rechthoek, en bij bijna gelijke zijden een vierkant |
| een rondje | cirkel of ovaal |
| drie hoeken | driehoek |
| een scheve lijn of rechthoek (gereedschap Lijn / Pijl / Rechthoek) | recht getrokken: horizontaal, verticaal of precies 45° |

**Past er niets, dan gebeurt er niets** — liever de streek zoals je hem
tekende dan de verkeerde vorm. Een kras of een vijfhoek blijft dus staan
zoals hij is. De streek wordt beoordeeld op hoe goed hij op een lijn,
rechthoek, ellips of driehoek past, én of zijn lengte bij die omtrek past;
dat tweede zeeft het krabbelwerk eruit.

Zodra de vorm er staat is de streek vast: doorbewegen verandert er niets
meer aan. Loslaten en opnieuw beginnen als het toch anders moet.

In de tekenbalk staat bij pen, lijn, pijl en rechthoek:
**ⓘ Hou vast voor nette vormen en lijnen**. Is er iets van gemaakt, dan
verschijnt twee tellen lang **✓ rechthoek gemaakt** — anders weet je niet
of het gelukt is.

De pdf hoefde niet aangepast: een driehoek is een gesloten veelhoek en een
ellips een veelhoek van 48 stukjes, allebei soorten die de pdf al kon
tekenen.

## Gewijzigde bestanden

| bestand | wat |
|---|---|
| `naslag.js` | Canalé mat blank, Duco-tabel met foto's, roedenstelsels en -breedtes |
| `index.html` | tabnaam, roedenlijsten en -keuzevakjes, opmaak |
| `teken.js` | vormherkenning, vasthouden, hint in de balk |
| `cloud.js` | herkent ook een verouderde roeden- of bewerkingslijst |
| `sw.js` | roosterfoto's offline, versienummer |
| `pdf.js` | versienummer |
| `fotos-ophalen.sh` | werkt nu ook voor een andere lijst en map |
| `roosterfotos.txt` | **nieuw** — de zes Duco-foto's |
| `catalogus-fotos.txt` | regel klaargezet voor Canalé mat blank |
| `12_roeden_en_canale.sql` | **nieuw — draaien in Supabase** |

## Getest

| reeks | controles | wat |
|---|---|---|
| `test-vormen.js` | 17 | **nieuw** — het rekenwerk van de vormherkenning met nagebootste handstreken: lijn, pijl, rechthoek, vierkant, cirkel, ovaal, driehoek, en drie gevallen die juist níets mogen opleveren |
| `test-teken.js` | 34 | het tekstvak plus **nieuw** het vasthouden zelf in Chromium: een bibberige rechthoek wordt een rechthoek, zonder stilstaan blijft de streek vrij, een scheve lijn wordt horizontaal |
| `test-naslag.js` | 73 | catalogus, leverbaarheid, en **nieuw** Canalé mat blank, de roosterfoto's (zes bestanden, acht regels, grenzen gelijk aan `DATA.roosters`) en de roedenindeling |
| `test-index.js` | 136 | invoertabel, en **nieuw** de tabnaam, de gefilterde breedtes en het loslaten van een breedte die niet meer past |
| `test-kop.js` | 22 | vaste kop en gele balk |
| `test-cloud.js` | 8 | opnemer en 'ingelogd als' |
| `test-strijdig-pdf.js` + `.py` | 5 + 17 | markering, liggend A4 |
| `test-leverpagina.js` + `.py` | 12 + 22 | leverpagina |

Alles groen. De Naslag-tabel en de keuzelijst zijn in Chromium nagekeken;
schermafdrukken zijn meegestuurd. Daarop staat "foto ontbreekt" omdat de
roosterfoto's nog opgehaald moeten worden — dat is meteen de test van die
terugval.

**Niet getest:** of de zes Duco-URL's het doen — die haalt het script bij
jou op, ik kan hier geen bestanden van internet trekken. Mislukt er een,
dan meldt het script dat met de naam erbij.

## Controle na het plaatsen

1. `12_roeden_en_canale.sql` draaien. De controleregel hoort
   `12 · 7 · 43 · 0 · 0` te geven.
2. `bash fotos-ophalen.sh roosterfotos.txt roosters` draaien en de map
   `roosters/` mee naar GitHub.
3. App verversen; rechtsboven **v76**, in de console `[pdf] v76`.
