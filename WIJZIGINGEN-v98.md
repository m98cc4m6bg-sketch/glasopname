# Glasopname v98: invoer op één plek, naslag op het startscherm, projectgegevens in de pdf

*13 oktober 2026. Gevraagd door Jan; zijn keuzes staan bij elk onderdeel.*

## Installeren, in deze volgorde

1. **SQL:** heb je `20_opbouwlijsten.sql` (van v96) nog niet in Supabase
   gedraaid, doe dat dan eerst (zie `WIJZIGINGEN-v96.md`). Voor v98 zelf is
   er **geen** SQL: klant, adres en levering staan nog steeds op dezelfde
   plek in de gegevens.
2. **Bestanden:** dit is het **complete pakket** (inclusief v95, v96 en
   v97), zonder `config.js`.
   - Open de map `glasopname` uit de zip.
   - Druk op **Cmd+Shift+.** om verborgen bestanden te tonen.
   - Selecteer alles wat erín staat en sleep het naar je repomap.
   - Kies overal *Vervang*.
   - Sleep niet de map `glasopname` zelf.
3. Commit en push, en tik daarna op ↻ Bijwerken. Linksboven staat dan v98.

## Wat er verandert

### 1. Klant en werkadres bovenaan Invoer

Klantnaam, contactpersoon, telefoon en het werkadres (met het zoeken op
postcode) staan nu in één blok bovenaan Invoer, boven de foto's.

- *Bedrijf of naam* heet nu **Klantnaam**.
- De velden *E-mail* en *Soort opdrachtgever* zijn weg. Stond er in een
  ouder project al iets in, dan blijft dat bewaard. Je ziet het op Project
  info en in de pdf, met "(oud veld)" erachter.
- **Inklapbaar** (jouw keuze): het blok staat dicht zodra er een
  klantnaam en een adres zijn ingevuld. Dicht zie je één regel, bijvoorbeeld
  *Fam. de Vries · Voorstraat 12, 3311 ER Dordrecht*. Tik op de balk om het
  blok te openen.
- Het blok klapt niet dicht terwijl je typt, want dan zou de tabel eronder
  wegschuiven. Het gaat dicht bij het openen van het project en als je
  terugkomt op Invoer.

### 2. Levering onderaan Invoer

Afleveren op, gewenste levering, de foto van de leverlocatie (met
tekenen) en de instructie voor de chauffeur staan nu onderaan Invoer, onder
de maten.

### 3. Project info toont, en springt naar Invoer

Op Project info staan klant, adres en levering alleen nog ter inzage, met
een knop **✏️ Invullen op Invoer** (jouw keuze: "Alleen tonen + knop naar
Invoer"). De knop opent het blok en scrolt ernaartoe.

Deze onderdelen blijven gewoon in te vullen op Project info:
- Uitvoering: referentie, status, opgenomen door en bereikbaarheid
- Notities
- Taken
- Logboek

De knop **Aanvullen** in de controle bij het exporteren springt nu ook naar
Invoer, naar het blok waar iets ontbreekt.

### 4. Mee op slot

Na bestellen gaan klant, adres en levering mee op slot, net als de maten
(jouw keuze). Ook langs een andere weg verandert er niets: de functies
vragen het slot zelf na.

Wat op slot wel gewoon werkt:
- in- en uitklappen;
- *Adres in kaarten*;
- de status en de notities op Project info.

Na **Ontgrendelen** kan alles weer.

### 5. Naslag op het startscherm

Het startscherm heeft twee tabbladen: **🏠 Start** (taken, projecten,
prullenbak) en **📖 Naslag**. Je hoeft dus geen project te openen om de
naslag te bekijken. Het is dezelfde naslag als in een project, met zoeken
en de grote foto's.

### 6. Projectgegevens in de pdf invoer

De pdf invoer (*Inmeting_….pdf*) begint met een pagina **Projectgegevens**
(jouw keuze):

- klant en werkadres;
- uitvoering;
- levering;
- notities;
- taken, met op wiens naam ze staan en of ze af zijn;
- het logboek, de laatste 30 regels, met datum en tijd;
- de foto van de leverlocatie, met de tekening erop. Past die niet meer
  op de pagina, dan gaat hij met het kopje naar de volgende pagina.

Wat leeg is, staat er met een streepje. Zonder bereik wacht de pdf hooguit
4 seconden op de taken en het logboek, en neemt dan wat er al op het
scherm stond.

### 7. Twee oude schoonheidsfoutjes, meegenomen

- **Een lege grijze balk boven de invoer.** Bij elk project dat níet op
  slot staat, stond boven de invoer een lege grijze balk. Dat was de
  slotbalk: die moest verborgen zijn, maar de opmaak won het daarvan. Dit
  zat er al sinds v90 in. Dezelfde fout zat bij de keuze voor een tabblad
  bij het importeren. Beide zijn opgelost, en een test bewaakt het nu
  voor de hele pagina.
- **De knop 🗑 Foto bij de leverfoto viel van het scherm.** Op een iPhone
  viel deze knop rechts buiten beeld. De knoppen lopen nu door op een
  tweede regel.

## Getest

Twee keer de hele batterij, alles groen. De nieuwe reeks `test-v98.js`
draait in Chromium, met echte kliks:

- de volgorde op Invoer;
- typen, inklappen en uitklappen, en opnieuw openen;
- de cursor blijft staan als een collega intussen iets wijzigt;
- Project info leest mee, en de knoppen springen naar Invoer;
- het slot, op het scherm én langs de functies, en Ontgrendelen met een
  echte klik;
- de naslag op het startscherm, met zoeken en heen en weer;
- telefoonbreedte (390 px);
- de pdf, en Aanvullen.

`test-v98.py` leest de gemaakte pdf terug met pdfplumber: alle kopjes en
waarden, de volgorde van het logboek, geen ✉ in de tekst, en de foto op
één pagina en op een bruikbare maat.

De tests vangen ook de fouten waar ze voor bedoeld zijn. Om dat na te gaan
heb ik deze dingen expres stukgemaakt:

- het dichtklappen;
- het slot op de klantvelden;
- het slot op de levering;
- de verborgen slotbalk;
- de foto in de pdf.

Telkens sloeg een test aan.

`test-leverpagina.js` is aangepast: Aanvullen gaat nu naar Invoer.

**Niet getest:**
- echte Safari op iPad en iPhone. Op een iPad tik je op een veld: kijk
  dan of het toetsenbord netjes boven het klantblok blijft, en of het
  dichtklappen bij het wisselen van tabblad prettig voelt;
- de echte Supabase: taken en logboek in de pdf zijn getest tegen de
  nagebootste database;
- een heel lang logboek of veel notities in de pdf. Die lopen door op een
  volgende pagina (zo is het gebouwd), maar dat heb ik alleen met korte
  inhoud bekeken.
