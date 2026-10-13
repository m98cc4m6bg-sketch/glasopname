# Glasopname v99: bijwerken is verplicht en veilig

*13 oktober 2026. Gevraagd door Jan, met een harde eis: nooit gegevens
kwijt. Zijn keuzes: élke nieuwe versie is verplicht, met aftellen en daarna
automatisch.*

## Installeren, in deze volgorde

1. **SQL eerst:** draai `21_versieslot.sql` in Supabase (SQL Editor →
   *Run*). Heb je `20_opbouwlijsten.sql` (van v96) nog niet gedraaid, doe dat
   dan ook, maakt niet uit in welke volgorde.
2. **Bestanden:** dit is het **complete pakket**, zonder `config.js`.
   - Open de map `glasopname` uit de zip.
   - Druk op **Cmd+Shift+.** om verborgen bestanden te tonen.
   - Selecteer alles wat erín staat en sleep het naar je repomap.
   - Kies overal *Vervang*.
   - Sleep niet de map `glasopname` zelf.
3. Commit en push.
4. **Deze ene keer nog met de hand:** de apparaten draaien nog v98 en
   kennen het nieuwe bijwerken nog niet. Tik daar op *Nu bijwerken* in de
   melding, of op ↻ Bijwerken. Vanaf v99 gaat het vanzelf.

## Wat er misging

- **Op het startscherm kwam de melding niet.** De melding "Nu bijwerken"
  stond in een balk die op het startscherm verborgen is.
- **De melding verdween** zodra je een project opende, en kwam na ✕ pas
  terug als de app opnieuw startte. Een iPad-app op het beginscherm kan
  dagen openstaan, dus een apparaat kon lang op een oude versie blijven.
- **Het bijwerken wachtte 0,9 seconde op het opslaan** en herlaadde dan,
  klaar of niet. Het werk stond dan nog wel op het apparaat, maar netjes
  was anders.
- **Het echte risico zat in oude apparaten.** De app stuurt bij elke opslag
  het hele project. Een apparaat met een oude versie kent onderdelen niet
  die een nieuwere versie erbij zette. Het schreef het project dan terug
  zónder die onderdelen: stil verlies. In v98 kon dat niet gebeuren, want
  de gegevens veranderden niet, maar bij een volgende versie die gegevens
  toevoegt wel.

## Wat er nu gebeurt

### 1. De melding staat overal

Er is een donkere balk onderaan, op elk scherm:
- het startscherm, ook het tabblad Naslag;
- het inloggen;
- in een project, ook boven een open venster.

De balk is niet weg te tikken. De app kijkt bij het openen, bij elke
terugkeer en elke 5 minuten of er een nieuwe versie is.

### 2. Verplicht, met aftellen

De balk telt af: 60 seconden als er een project open is, anders 10. Met
**Nu bijwerken** gaat het meteen.

Ben je na het aftellen nog bezig, dan wacht de app tot je 10 seconden niets
doet. Hij onderbreekt je dus niet midden in een maat. Staat er een venster
open, zoals een vraag of het wachtwoord, dan wacht hij ook. Na 5 minuten
werkt hij in elk geval bij, zodat een vergeten venster het niet eeuwig
tegenhoudt.

### 3. Veilig bijwerken, in vaste stappen

1. **Opslaan, en wachten tot de server "ontvangen" zegt.** Er wordt niet op
   een klok gewacht. Een veld waar de cursor nog in staat, wordt eerst
   afgesloten, zodat ook de laatste letters meegaan.
2. **Is het opgeslagen**, dan sluit de app het project en gaat hij naar het
   startscherm (jouw wens).
3. **Lukt het niet**, door geen bereik of een server die niet antwoordt, dan
   blijft het werk op het apparaat staan met de vlag "moet nog omhoog".
   Na het bijwerken gaat het project meteen weer open en gaat het werk
   vanzelf naar de server zodra dat kan. Er gaat dus nooit iets weg dat
   niet óf op de server óf op het apparaat staat.
4. **De nieuwe versie laadt.**
5. **Een melding.** Bijvoorbeeld: *Bijgewerkt naar v100. Je werk in
   "Voorstraat" is opgeslagen.* Met de knop **Verder met "Voorstraat"**.

Foto's die nog op uploaden wachten, blijven gewoon in de wachtrij op het
apparaat staan en gaan daarna verder.

### 4. Een slot tegen oude versies

Dit is het stuk dat de harde eis echt waarborgt, ook als iemand de melding
negeert of geen bereik heeft.

- De app zet bij elke opslag zijn versienummer in het project
  (`_versieNr`, bijvoorbeeld 99).
- De database weigert een opslag met een lager nummer dan er al staat. Dat
  doet het nieuwe script `21_versieslot.sql`.
- Het oude apparaat ziet dan *Eerst bijwerken: je werk staat op dit
  apparaat*. Zijn werk blijft daar staan, en na het bijwerken gaat het
  alsnog omhoog. Wat de nieuwe versie had opgeslagen, blijft daarbij staan.
- Opent een apparaat een project dat al door een nieuwere versie is
  opgeslagen, dan zoekt het meteen naar die nieuwe versie.
- Ook apparaten die nog v98 draaien, worden zo tegengehouden. Hun
  statusbalk toont dan de tekst uit de database: *Verouderde app-versie:
  tik op ↻ Bijwerken*.

Projecten van vóór v99 hebben nog geen nummer. Daar mag iedereen in
opslaan, tot de eerste opslag met v99. De status, de prullenbak en de
tellingen vallen er niet onder; alleen de inhoud.

### 5. Kleinere dingen

- **↻ Bijwerken** slaat nu ook eerst op en wacht daarop. Tot v98 herlaadde
  de knop meteen als er geen nieuwe versie was.
- **Een tweede tabblad** (op de Mac) dat meegaat met het bijwerken, stelt
  eerst zijn eigen werk veilig. Tot v98 herlaadde het midden in wat je deed.
- **Het allereerste bezoek** op een apparaat herlaadt niet meer voor niets.

## Getest

Twee keer de hele batterij, alles groen, plus `test-sql.sql` twee keer
tegen een lokale PostgreSQL. Daarin staat een nieuw blok (18) voor
`21_versieslot.sql`:

- weigeren bij een lager nummer;
- weigeren als er geen nummer is maar wel een nieuwer project;
- een tekst als nummer telt als 0;
- de status wijzigen mag;
- het script twee keer draaien mag.

De nieuwe reeks `test-v99.js` draait in Chromium mét service worker. De
server krijgt halverwege een hoger versienummer, zoals wanneer jij een
versie online zet. Getest is:

1. **Startscherm:** de balk staat bovenop, telt af, is niet weg te tikken,
   en de app werkt vanzelf bij.
2. **Midden in het typen:**
   - de app wacht tot je stil bent;
   - alles wat getypt is, staat in de database;
   - daarna het startscherm, en *Verder met …* opent het project met je
     werk.
3. **Zonder bereik:**
   - het bijwerken lukt toch, uit de cache;
   - het project gaat weer open, met de vlag "moet nog omhoog";
   - met bereik gaat het werk alsnog omhoog.
4. **Een oudere versie op een nieuwer project:**
   - de opslag wordt geweigerd;
   - de database blijft zoals hij was;
   - het werk blijft op het apparaat, zonder de server te bestoken;
   - na het bijwerken gaat het alsnog omhoog, zonder het werk van de
     nieuwe versie weg te gooien.
5. **Twee tabbladen:** in het ene wordt nog getypt terwijl het andere
   bijwerkt. Alles wat in het veld stond, komt in de database.
6. **↻ Bijwerken zonder nieuwe versie:** eerst opslaan, dan herladen.

De tests vangen ook de fouten waar ze voor bedoeld zijn. Om dat na te gaan
heb ik deze dingen expres stukgemaakt:
- niet wachten op het opslaan;
- geen versienummer meesturen;
- niet wachten tot je stil bent.

Telkens sloeg een test aan.

**Niet getest:**
- **Echte Safari op iPad en iPhone.** Vooral:
  - hoe een app op het beginscherm de nieuwe versie oppikt;
  - de balk boven de iOS-balk onderin;
  - dat iOS een app op de achtergrond stillegt. Komt hij terug na het
    aftellen, dan werkt hij vrijwel meteen bij; je werk wordt eerst
    opgeslagen.
- **De echte Supabase.** De weigering in de app is getest tegen een
  nagebootste database met dezelfde regel als het script. Het script zelf
  is getest tegen een echte PostgreSQL, maar niet via Supabase.

## Nog niet opgelost

**Twee tabbladen met elk een project, zonder bereik.**
- Alle tabbladen op één apparaat delen de kopie op het apparaat en de vlag
  "moet nog omhoog".
- Met bereik gaat het goed; dat is getest in punt 5.
- Zonder bereik, met in twee tabbladen tegelijk een ander project open, kan
  bij herladen het niet-opgeslagen werk van het ene tabblad het andere
  overschrijven op het apparaat.
- Dit zat er al vóór v99. Op de iPad en iPhone speelt het niet: één app is
  één venster.
- Voorstel voor een volgende versie: de app laat maar één tabblad tegelijk
  een project openen, of houdt de kopie per project bij.
