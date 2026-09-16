# v68 — bijschaven van de bediening, vooral op de telefoon

Gewijzigd: `index.html`, `blokbalk.js`, `naslag.js`, `sw.js`, `pdf.js`
(alleen het versienummer). Nieuw: `10_speling_opties.sql` — dat moet in
Supabase gedraaid worden, anders beginnen de lijstjes weer bij 4 mm.

## 0. Speling en bijtelling vanaf 2 mm

`speling_opties` liep van 4 tot 25 mm; 2 en 3 mm zijn erbij gekomen. Die
lijst wordt op drie plekken gebruikt — de keuzelijst bij de losse maten, die
per invoertabel, en de kolom Correctie — dus alle drie bieden ze nu aan. De
standaardwaarden blijven 4 mm speling en 11 mm bijtelling.

## 1. Het groene pilletje werd een blok

`#cloudStatus` heeft `flex: 0 0 132px`. In de kopbalk staat die rij naast
elkaar en is 132 px dus de bréédte. Op een telefoon klapt `.header-actions`
uit tot een kolom, en dan slaat flex-basis op de hóógte — vandaar dat groene
vlak van 132 px hoog. In de telefoonopmaak staat nu `flex: 0 0 auto`.

## 2. De inhoud liep onder de klok door

`apple-mobile-web-app-status-bar-style` stond op `black-translucent`. Dat
betekent letterlijk: teken door tot achter de statusbalk. Safari vervaagt die
rand dan, wat je op de schermafdruk ziet. Nu `default`: iOS houdt die strook
zelf vrij. De `env(safe-area-inset-top)` in de opmaak blijft staan en wordt
in die stand vanzelf nul, dus er ontstaat geen dubbele marge.

Dit is één regel en makkelijk terug te draaien als je de doorlopende
achtergrond liever had.

## 3. Speling en bijtelling: alleen nog de maten

De regel "(algemeen)" bovenaan stamde uit de tijd dat er één instelling voor
het hele project was. Elke tabel heeft nu zijn eigen keuze — ook de losse
maten — dus een aparte regel voor "geen eigen waarde, volg de algemene" zegt
niets meer en levert twee regels op die hetzelfde betekenen. Die is weg: de
lijst toont gewoon 4 t/m 25 mm.

Heeft een blok nog geen eigen waarde, dan staat de maat waarmee op dat moment
gerekend wordt voorgeselecteerd. Onder water verandert er niets: pas als je
zelf een maat kiest krijgt het blok een eigen waarde.

Label en keuzelijst zaten los van elkaar in dezelfde flexregel, en braken op
een smal scherm middenin af; daardoor stond "Bijtelling" naast de
speling-keuze. Ze zitten nu in één omhulsel (`.blok-maat-paar`) dat niet
afbreekt.

## 4. Satijnglas stond er al

Het zit in de lijst als **"Gematteerd — Satijnglas (4/5/6/8/10/12 mm)"** en
"Gematteerd — Satijnglas extra helder (6/8/10 mm)". Niet als "Satijnglas",
dus in een lijst van 42 regels op alfabetische volgorde van de groep viel het
niet op. Er ontbrak niets.

Dat het niet te vinden was, was wel een echt probleem. De keuzelijst heeft nu
kopjes (`optgroup`): Figuurglas, Draadglas, Gematteerd, Getint, Extra helder,
Spiegel, Gekleurd. iOS toont die als kopjes in het keuzewiel. Per regel staat
alleen nog de soort — "Satijnglas (4/5/6/8/10/12 mm)" — maar de waarde die
bewaard wordt blijft de volledige tekst met de groep ervoor, zodat bestaande
projecten en de bestellijst niet veranderen.

Een waarde uit een ouder project die niet meer in de lijst staat krijgt een
eigen kopje "Oude waarde".

**Wat wél in Naslag staat en niet te kiezen is:** 21 van de 61 soorten.

- **16 gelaagde uitvoeringen** (Gelaagd 33.1 blank, 44.2 in kleur, matte
  folie, Silence). Die kies je al via Glas Type "Gelaagd glas (VSG)" plus de
  kolom Opbouw — daar zit de dikte- en gewichtberekening aan vast. Als
  glasbewerking zouden ze onzin opleveren (HR++ mét "Gelaagd 33.1"), dus die
  heb ik bewust niet toegevoegd.
- **5 brandwerende en hittebestendige** (Pyroguard EW30/EW60, Robax). Die
  kun je nu inderdaad nergens kiezen — niet als bewerking en niet als
  glastype. Dat is een echt gat, maar het hoort bij Glas Type met een eigen
  dikte en gewicht per uitvoering, en dat raakt ook `02_glasdata_seed.sql`.
  Zeg het als je dat wilt, dan zoek ik de waarden op bij Pyroguard.

## 5. Kopjes op het tabblad Project

"Werkadres", "Levering", "Notities", "Taken" en de rest waren kleine rode
tekstjes tussen de velden. Ze staan nu in een grijs vlak met een rode streep
ervoor, in donkere letters. Dat leest als een kop, ook op een telefoon, en
het blijft rustig genoeg voor de laptop.

## Getest

`node test-index.js` — 33 controles, waaronder vijf nieuwe: de zeven kopjes in
de keuzelijst, dat satijnglas erin staat, dat de regel de korte naam toont
terwijl de waarde de volledige tekst houdt, dat elke soort uit de catalogus
kiesbaar is, en dat een oude waarde onder "Oude waarde" komt.

Los nagelopen: `blokBalkHTML` levert twee `.blok-maat-paar`-omhulsels op, de
eerste optie leest "4 mm (van losse maten)", "(algemeen)" komt nergens meer
voor, en de losse-matentabel houdt zijn `losseMaatPlek` waar index.html de
bestaande keuzelijsten in schuift.

`node test-naslag.js` (35) en de leverpagina-testen (28 + pdfplumber) blijven
groen.

## Niet getest

- Hoe iOS de `optgroup`-kopjes in het keuzewiel toont. Safari ondersteunt ze,
  maar of ze op een iPhone net zo prettig lezen als in Chrome moet je zien.
- Het effect van `apple-mobile-web-app-status-bar-style: default` op een
  iPhone vanaf het beginscherm. In de browser zelf verandert er niets.
- De opmaak van de nieuwe kopjes op iPad en laptop is alleen in de code
  nagelopen, niet met een schermafdruk vergeleken.
