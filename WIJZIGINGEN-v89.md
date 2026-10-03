# Glasopname v89 — de import dicht, de ruitentelling goed, en medewerkers verwijderbaar

*3 oktober 2026. De import is doorgelicht en herbouwd: wat er niet zonder
twijfel te lezen is, komt er niet in, en voordat er iets in de lijst belandt
zie je regel voor regel wat er komt en uit welke kolom het komt. Verder: een
regel met Aantal 4 telt nu als vier ruiten, en een vertrokken medewerker kan
weer uit Supabase.*

---

## Installeren

1. Twee kleine SQL-scripts in Supabase → *SQL Editor*, in deze volgorde:
   * **`15_ruiten_tellen.sql`** — telt het aantal ruiten per project opnieuw,
     zodat bestaande projecten meteen het goede getal laten zien.
   * **`16_gebruikers_verwijderen.sql`** — maakt medewerkers verwijderbaar
     (zie punt 3).
   Beide mogen zo vaak gedraaid worden als je wilt.
2. De bestanden naar GitHub: `index.html`, `import.js`, `cloud.js`, `pdf.js`,
   `sw.js`. Geen nieuw .js-bestand. `config.js` blijft zoals hij is.

---

## 1. De ruitentelling

Een regel met Aantal 4 telde als één ruit in de projectenlijst en op het
startscherm. Dat is nu de som van de kolom Aantal: 4 + 1 + 1 + 2 over vijf
regels (waarvan één leeg) komt op 8 uit. Bestaande projecten krijgen hun
goede getal met `15_ruiten_tellen.sql`, of zodra er weer in opgeslagen wordt.

## 2. Nieuwe medewerkers in de namenlijst

Dit werkte al en blijft zo: maak je iemand aan in Supabase, dan zet een
trigger hem meteen in de tabel `gebruikers` en staat hij in de keuzelijst bij
een taak. De naam begint als het stuk vóór de @ en is in Supabase bij te
werken. Elke plek in de app die later een namenlijst nodig heeft, haalt die
uit dezelfde bron (`glasGebruikers()`), dus één keer bijwerken is overal goed.
Iemand uit de lijst halen zonder zijn naam uit oude taken te wissen:
`update public.gebruikers set actief = false where email = '…';`

## 3. Een vertrokken medewerker kunnen verwijderen

Wat niet werkte: iemand in Supabase verwijderen zodra hij ooit een project had
gewijzigd of een taak op zijn naam had staan.

```
ERROR: update or delete on table "users" violates foreign key constraint
       "projecten_gewijzigd_door_fkey" on table "projecten"
```

Die verwijzingen stonden op *no action* — dan weigert de database de
verwijdering. `16_gebruikers_verwijderen.sql` zet ze op *set null*: de
verwijzing wordt leeggemaakt, de rest blijft staan. De namen in oude taken en
in het logboek staan apart als tekst bewaard, dus daar blijft zichtbaar wie
het was. Getest op een echte Postgres: gebruiker weg, taak blijft met naam
"weg" erbij, project houdt zijn geschiedenis.

## 4. De import — wat er mis kon gaan, en wat er nu gebeurt

Ik heb zestien soorten aangeleverde lijsten door de echte import gehaald en
gekeken wat er in de opname belandde. Eerst het goede nieuws: **kolommen van
plaats wisselen is geen probleem** zolang de koppen meeverhuizen — de app
koppelt op kopnaam, niet op positie. En staat er geen kopregel, of koppen die
hij niet kent, dan koppelt hij niets zelf en staat de knop uit tot jij kiest.

Wat er wél mis ging, en nu niet meer:

| geval | tot v88 | vanaf v89 |
|---|---|---|
| `A;"let op; buitenzijde";800;1400` | de regel schoof één kolom op: 800 werd de hoogte, de breedte bleef leeg, en niemand zag het | de CSV wordt met aanhalingstekens gelezen: 800 × 1400 met de opmerking heel |
| `A,"mat, 2 lagen",1200,600` | er kwam een ruit van **2 mm** uit (het getal uit de opmerking) | gewoon 1200 × 600 |
| Een regelovergang binnen aanhalingstekens | werd twee halve regels | blijft één regel met een opmerking van twee regels |
| `-1200` | ging er zo in | geweigerd: "«-1200» is niet groter dan nul" |
| `1,2` (meters) | werd stilzwijgend **1 mm** | geweigerd: "«1,2» is geen heel aantal millimeters" |
| `ca 1200` | werd 1200 | geweigerd: "«ca 1200» is geen maat" |
| Een regel met een cel te veel | ging er in, soms verschoven | geweigerd: "deze regel heeft 4 cellen, de kop 3 — mogelijk verschoven" |
| Een maat die ontbreekt | halve ruit in de lijst | geweigerd: "geen breedte" / "geen hoogte" |
| Werkblad met meer tabbladen | las stilzwijgend het eerste | je kiest zelf welk tabblad, met het aantal regels erbij |
| Twee breedtekolommen (sponning én glas) | de eerste won, zonder melding | de app zegt welke kolom blijft liggen |
| Kolom «Hoogte» aan Breedte knopen | kon gewoon | wordt tegengehouden met uitleg |

**En er is een stap bijgekomen.** Na het koppelen van de kolommen kom je op
een controlescherm, en pas daar zit de knop om over te nemen. Je ziet:

* **waar het vandaan komt**: bestandsnaam, tabblad, scheidingsteken, en per
  veld uit welke kolom het komt — *"Breedte ← kolom 2: «B (mm)»"*. Een
  verkeerde bron valt daarmee op voordat er iets in de lijst staat;
* **alle regels die overgenomen worden**, niet de eerste acht. Staat een maat
  anders in het bestand dan wat de app overneemt (`1.500` → `1500`,
  `800 mm` → `800`), dan staat de oorspronkelijke tekst erachter;
* **de totalen** om tegen de lijst van de leverancier te houden: aantal
  regels, aantal ruiten, en de reeks breedtes en hoogtes (*breedte 420 – 2380
  mm*). Zijn de maten per ongeluk in centimeters aangeleverd, dan zie je hier
  "breedte 80 – 140 mm" staan en weet je genoeg;
* **de geweigerde regels** met de reden en de oorspronkelijke celinhoud, zodat
  je ze in het bestand kunt verbeteren of met de hand bij kunt typen.

Zoals afgesproken beoordeelt de app **niet** of een maat logisch is — het
bestand is de waarheid. Hij weigert alleen wat hij niet zonder twijfel kan
overnemen, en verandert nooit stilzwijgend iets.

**In het logboek** komt de import er nu zo in te staan:

> `import uit sponningmaten-verhoef.csv: 24 regels toegevoegd, breedte uit «B (mm)», hoogte uit «H (mm)», 2 geweigerd, 1 zonder maten`

---

## Wat er getest is

Dertien reeksen, twee keer achter elkaar volledig groen.

**Nieuw: `test-import.js`** — zestien gevallen, met voor elk de vraag "kan hier
stilzwijgend iets verkeerd gaan": aanhalingstekens met puntkomma en komma,
regelovergang in een cel, gewisselde kolommen, ontbrekende en onmogelijke
maten, duizendtalscheiding, `800 mm`, een cel te veel, aantallen (`4`,
`2 stuks`, leeg, `twee`), tussenkopjes, `1200 x 600` in één cel, de maatsoort,
de kruiscontrole op de kop, en het logboek.

**`test-sql.sql`** is uitgebreid met de ruitentelling (4+1+1+2 = 8) en het
verwijderen van een medewerker; dat draait tegen een echte PostgreSQL.

De rest van de battery (startscherm, mail en slot, herstel, verbinding,
verwijderen, naslag, rooktest in Chromium, de pdf's met pdfplumber, de
mailfunctie met bun) is ongewijzigd groen.

**Wat ik niet heb kunnen testen:**

* **Een echte PDF-bestellijst van de leverancier.** De import uit PDF leest
  woorden op hun x/y-positie; dat is per leverancier anders en ik heb hier
  geen echte Van Noordenne-pdf. De nieuwe CSV-lezer verandert daar niets aan,
  maar het controlescherm geldt ook voor PDF — gooi er eens een echte in en
  kijk wat het controlescherm zegt voordat je overneemt.
* **Een echt Excel-bestand met meerdere tabbladen.** De tabbladkeuze is in
  code getest, niet met een bestand van de leverancier.
* **Safari op iPad.** Het controlescherm is een hoge tabel; op een telefoon
  moet je scrollen.
* **De echte Supabase.** De scripts 15 en 16 draaiden op PostgreSQL 16.

---

## Gewijzigde bestanden

| bestand | wat |
|---|---|
| `15_ruiten_tellen.sql` | **nieuw** — aantal ruiten per project opnieuw tellen |
| `16_gebruikers_verwijderen.sql` | **nieuw** — verwijzingen naar gebruikers op "bij verwijderen leegmaken" |
| `import.js` | CSV-lezer met aanhalingstekens, strenge maatcontrole per regel, tabbladkeuze, kruiscontrole op de kop, het controlescherm, en de regel in het logboek |
| `index.html` | stap 3 in het importvenster met opmaak, tabbladkeuze, `APP_VERSIE` v89 |
| `cloud.js` | ruiten tellen als som van Aantal |
| `pdf.js`, `sw.js` | alleen het versienummer |
| `test-import.js` | **nieuw** — de zestien gevallen |
| `test-sql.sql`, `test-mail-en-slot.js` | uitgebreid met de v89-controles |

De drie versienummers (`APP_VERSIE`, `PDF_VERSIE`, `VERSIE` in `sw.js`) staan
alle drie op `v89`.
