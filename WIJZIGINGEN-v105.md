# Glasopname v105: een volgende bestellijst is een aanvulling

*14 oktober 2026. Jans antwoord op de open vraag van v104:*
- *een volgende bestellijst is altijd een **aanvulling**;*
- *een ruit die al besteld was en daarna gewijzigd is: **opnieuw bestellen**,
  met "vervangt K1 uit de 1e bestelling", zodat de leverancier ziet wat er
  nog geannuleerd kan worden.*

v105 bevat alles van v104. Heb je v104 nog niet online gezet, zet dan alleen
v105 neer, en lees ook `WIJZIGINGEN-v104.md`. Daar staan de bestellingen
zelf, Android en Windows.

## Twee vragen voor jou (niet dringend)

1. **Alleen het aantal anders** (K3 van 1 naar 2): nu komt K3 op de
   aanvulling als "VERVANGT K3 uit de 1e (1x 892 x 892)" met aantal 2. Is de
   eerste al gemaakt, dan moet de leverancier die annuleren en er twee maken.
   Liever "EXTRA bij K3 uit de 1e: +1" (aantal 1)?
2. **Een vervanging heeft hetzelfde merk** als de oude (K1). Lukt de
   annulering niet, dan liggen er twee K1's met een andere maat op de bouw.
   Liever "K1 (2e)" in de kolom Merk?

## Installeren

**Eerst SQL, dan de bestanden.**

1. **Supabase → SQL Editor:** plak `23_bestellingen.sql` en kies *Run*.
   - Ook als je de versie van v104 al gedraaid had: deze rekent nu met
     aanvullingen.
   - Het script mag vaker gedraaid worden.
   - Staat `22_gebruik_en_prullenbak.sql` (van v103) er nog niet in, draai
     die dan eerst.
2. De bestanden zoals altijd:
   1. Open de map uit de zip en druk op **Cmd+Shift+.**
   2. Selecteer alles wat erín staat, sleep het naar je repomap en kies
      *Vervang*.
   3. Commit en push.

**Waarom v105 en niet een nieuwe v104?** Staat v104 al online, dan zien de
apparaten aan het versienummer dat er iets nieuws is. Met hetzelfde nummer
zouden ze de nieuwe bestanden niet ophalen.

## Wat er verandert (🟠, en 🔴 voor script 23)

### Op de pdf
Zolang er nog niets besteld is, verandert er niets: de 1e bestellijst bevat
alles wat compleet is.

Na de 1e bestelling wordt een nieuwe bestellijst één van twee dingen.

**1. Een aanvulling, als er iets bij te bestellen of te annuleren is.**
- **De naam:** `Bestellijst_Kerkstraat_1_2e_aanvulling.pdf`, in de kop
  "Bestellijst glas - AANVULLING".
- **Bovenaan, in een gele balk:**
  - "2e BESTELLIJST = AANVULLING op de eerdere bestelling (1e van 14-10-2026)";
  - "Hierop staan ALLEEN nieuwe ruiten en ruiten die anders gemaakt moeten
    worden. Alles wat eerder besteld is en hier niet op staat, blijft zoals
    besteld".
- **In de tabel alleen wat nieuw of anders is.** Een ruit die niet veranderde,
  staat er niet op; die maakt de leverancier al.
- **De kolom Wijz.:**
  - **NIEUW**: een extra ruit, erbij maken;
  - **VERVANGT K1 uit de 1e (1x 1192x592)**: maak deze in plaats van de
    eerder bestelde. Tussen haakjes staat het oude aantal en de oude
    glasmaat, en het oude glas als dat anders was.
- **Onder de tabel:**
  - **ANNULEREN, als dat nog kan**: de ruiten die besteld waren en vervallen
    zijn, met hun maat en uit welke bestellijst ze komen;
  - **VERVANGEN**: de oude versie van de ruiten met VERVANGT, ook om te
    annuleren als dat nog kan.
- **ANNULEREN** is een eigen tabel met een rode kop: merk, aantal, maat,
  glas, in welke bestellijst besteld, en waarom ("vervalt" of "vervangen door
  K1 op deze lijst").
- **De totalen** tellen alleen deze aanvulling ("1 NIEUW, 1 VERVANGT,
  1 ANNULEREN").
- **Alleen iets vervallen?** Dan staat er "Geen nieuwe of gewijzigde ruiten op
  deze aanvulling", met het blok ANNULEREN. Dat is ook een bericht aan de
  leverancier, dus de app vraagt "Naar de leverancier?".

**2. Een overzicht, als er niets bij te bestellen is.**
- **De naam:** `Overzicht_besteld_Kerkstraat_1.pdf` (bewust niet
  "Bestellijst…": in een lijst bijlagen zie je vaak alleen het begin).
- **Bovenaan:** "Overzicht bestelde ruiten - GEEN BESTELLING".
- **Onder de tabel:** "GEVRAAGD TE ANNULEREN (kan toch geleverd zijn)": wat er
  geannuleerd is, en de oude maat van vervangen ruiten ("die NIET
  annuleren" bij de nieuwe). Een ruit waarvan alleen het aantal veranderde,
  staat er niet: zelfde merk en maat, dan annuleert een leverancier de
  geldige.
- **Kolom Besteld:** in welke bestellijst elke ruit besteld is.
- Is een bestelde ruit in de app nu onvolledig, dan staat hij eronder bij
  "OOK BESTELD, hier niet getoond".
- **De app vraagt niets en legt niets vast.**

### In de app
- **"Anders dan besteld" vergelijkt met alles wat besteld is**: de 1e plus
  de aanvullingen, min wat geannuleerd is. Niet meer alleen met de laatste
  lijst. Na de aanvulling met K1 en K4 is K3 (uit de 1e) dus niet geel.
- **Op het tabblad Bestellijst:**
  - het rijtje heet "2e bestellijst (aanvulling)", met "1 geannuleerd";
  - een zin "De leverancier maakt in totaal 3 ruiten (de 1e bestellijst plus
    de aanvullingen)";
  - per groep wat ermee gebeurt: "Gewijzigd — komt op de aanvulling; de oude
    annuleren als dat nog kan", "Vervallen — komt op de aanvulling onder
    annuleren";
  - "Maak de bestellijst-pdf: dat wordt de 2e bestellijst, een aanvulling met
    alleen 2 nieuwe of gewijzigde ruiten en 1 te annuleren".
- **Een bestelde ruit die onvolledig wordt** (bijvoorbeeld het glastype
  gewist): die kan niet op een aanvulling. De leverancier maakt hem zoals
  besteld. De app zegt het: "Niet meer compleet — de leverancier maakt hem
  zoals besteld. Vul hem aan, of verwijder hem als hij moet vervallen."
  Bij het maken van de pdf vraagt de app er niet meer naar ("Niet alles gaat
  mee"); hij gaat niet verloren.
- **Met de muis op een geel bolletje** staat er in welke bestellijst de ruit
  besteld is: "Anders dan besteld (in de 1e bestellijst, 14-10 09:29 door
  julian): breedte 1200 → 1210".
- **Intrekken** van een aanvulling: daarna gelden de eerdere weer, en wat
  in de aanvulling stond, is weer geel.
- **"In totaal"** telt ruiten én posities ("4 ruiten in 3 posities").
- **Bestelmail:**
  - het venster zegt "Dit wordt een aanvulling", of bij niets nieuws "Er is
    niets bij te bestellen";
  - het onderwerp ook: "AANVULLING (2e bestellijst) glas — …" of "Overzicht
    bestelde ruiten, GEEN nieuwe bestelling — …";
  - de tekst van de mail zegt het ook ("Bijgaand een AANVULLING op onze
    eerdere bestelling …");
  - bij een aanvulling of overzicht kan de pdf niet uit de mail;
  - een mail van het overzicht legt niets vast;
  - Stoppen bij een van de vragen = niet verstuurd, en de app zegt het.

### Een ander apparaat met een oudere stand (gevonden bij de beoordeling)
Twee apparaten kunnen elkaars ruiten nog overschrijven: wie het laatst
opslaat, wint (al bekend, zie de handover). Met de aanvulling werd dat
duur. Een iPad die offline was, zette K1 terug op de oude maat en kende K4
niet. De volgende aanvulling zou dan **de oude maat opnieuw bestellen en K4
laten annuleren**. Nu:
- **De app herkent een oudere stand.** Dat is een ruit die anders is dan
  besteld, en:
  - precies een eerder bestelde of geannuleerde versie is;
  - of per veld een eerder bestelde waarde heeft (de iPad zette alleen een
    opmerking, kantoor de nieuwe maat: dan is alleen de maat oud);
  - of een stempel heeft dat ouder is dan dat van de bestelde versie.
- **Zo'n ruit gaat nooit stil mee, en wordt nooit stil weggezet.** Vóór de
  pdf (en vóór de bestelmail) vraagt de app "Oudere stand?". Daarbij staat
  per ruit wat er anders is en wie hem het laatst wijzigde, en wanneer. Er
  zijn drie keuzes, zonder dat de app er een voorstelt:
  - **Zet terug zoals besteld**: alleen de oude velden, de opmerking van de
    iPad blijft;
  - **Nee, toch zo bestellen**: voor een bewuste terugzet, of een apparaat
    met een verkeerde klok;
  - **Stoppen**.
- **Een bestelde ruit die weg is**, gaat nooit zonder vraag naar ANNULEREN:
  "Laten annuleren?" met Stoppen / **Zet terug zoals besteld** / Ja, laten
  annuleren.
- Op het tabblad Bestellijst staan dezelfde groepen met dezelfde knoppen.
- **Op de pc komt het opslagvenster pas ná deze vragen.** Stoppen betekent:
  geen bestand.

### In de database (🔴, script 23)
Script 23 rekende "wat er besteld is" (voor oudere apparaten) uit de laatste
lijst. Nu rekent hij net als de app: de 1e plus de aanvullingen, min wat
geannuleerd is. Wat het script verder doet, is niet veranderd: een bestelling
kan er niet uit verdwijnen. **Terugdraaien** blijft:
`drop trigger projecten_bestellingen_samenvoegen on public.projecten;`.

### Bestellingen van v104
Is v104 al gebruikt, dan was een 2e lijst toen een volledige lijst. Die
blijft zo gelden: wat daar niet op stond, telt niet als vervallen. Een
nieuwe lijst daarna is een aanvulling daarop.

## Wat bewaard wordt (voor wie later verder bouwt)
- Elke bestelling krijgt `soort`: `'volledig'` (de 1e) of `'aanvulling'`.
- Een aanvulling bewaart alleen wat erop staat, plus de ruiten die nog nooit
  besteld zijn (onvolledig). `vervangt` = het nummer van de bestelling
  waarvan de ruit de vervanging is. `vervallen` = de geannuleerde ruiten,
  ingekort.
- `besteldeStand()` in index.html rekent uit wat er in totaal besteld is.
  Daarmee wordt alles vergeleken.
- Elke ruit in een bestelling bewaart het stempel van zijn laatste wijziging
  (`g`). Daaraan, en aan de eerder bestelde versies, herkent `oudereStand()`
  een oudere stand. "Toch zo bestellen" zet `tochBestellen` op de ruit (geldt
  tot de volgende bestelling).
- Ingekort wordt alleen wat vervangen is. Wat nog geldt, blijft volledig,
  ook als het uit de 1e komt. Een project van 120 ruiten met drie kleine
  aanvullingen wordt zo ongeveer 5% groter.

## Beoordeling

Dezelfde drie beoordelaars als bij v104: gegevensveiligheid en
synchronisatie, Android/Windows/papier, en het bestelproces met de tests.

| ronde | gegevens | Android/Windows/papier | bestelproces en tests |
|---|---|---|---|
| 1 | 8 | 8 | 8 |
| 2 | 8,5 | 8,5 | 8,5 |
| 3 | 9 | 9 | 9 |

- **Ronde 1** vond het belangrijkste punt: een apparaat met een oudere stand
  kon via de aanvulling een oude maat laten bestellen en een nodige ruit laten
  annuleren. Daarvoor kwamen de herkenning van een oudere stand en de vragen
  "Oudere stand?" en "Laten annuleren?".
- **Ronde 2** vond nog twee dingen:
  - dezelfde ruit die op twee apparaten veranderde (een opmerking op de
    iPad, een maat op kantoor), wat nu per veld herkend wordt;
  - het opslagvenster dat vóór de vragen kwam.
- **Na ronde 3** heb ik hun laatste kleine punten nog opgelost:
  - het overzicht noemt bij een twee keer vervangen ruit steeds de maat die
    nu geldt;
  - "Alles exporteren" vraagt eerst;
  - de bestelmail kijkt naar de stand op het moment van versturen.

## Getest

- **`test-v105.js`** (Chromium): 92 controles in 15 onderdelen, elk met de
  echte situatie bovenaan. Echte kliks en echt typen. Getest is onder meer:
  - de aanvulling, de 3e lijst en het overzicht, ook bij een ruit die twee
    keer is nagemeten;
  - intrekken;
  - alleen annuleren;
  - een iPad die offline was, met en zonder script 23, met en zonder
    herstart;
  - dezelfde ruit op twee apparaten;
  - een klok die achterloopt;
  - bestellingen uit v104;
  - de bestelmail;
  - een project van 120 ruiten (de bestellingen worden ongeveer 5%
    groter);
  - de telefoon (412 px);
  - de volgorde van vraag en opslagvenster op de pc.
- **`test-v104.js`** aangepast aan de aanvulling en weer groen.
- **Mutatieproef:**
  - `test-v105.js --mutaties` zet 31 reparaties één voor één terug;
  - `test-v104.js --mutaties` zet er 34 terug;
  - elke keer werd de reeks rood.

  Eén regel bleek dubbel (de mutatie bleef groen) en is eruit gehaald.
- **`test-sql.sql`** tegen een echte PostgreSQL 16:
  - §20i–j: "wat er besteld is" over een aanvulling heen, en na het
    intrekken ervan;
  - twee keer het script zelf stukgemaakt, en de uitkomst veranderde;
  - de rest gelijk aan v104.
- **De hele batterij** twee keer, met de overgang vanaf **v103 (live)** en
  vanaf v98.
- **De pdf's zelf bekeken** als afbeelding: de aanvulling, het overzicht en
  het tabblad Bestellijst op de telefoon.

## Niet getest

- **De echte Supabase**, zoals bij v104.
- **Een echte leverancier** die een aanvulling met de tabel ANNULEREN leest.
  Laat Van Noordenne de eerste aanvulling even bevestigen.
- **Echte apparaten:**
  - Safari op iPad/iPhone;
  - Android;
  - Chrome of Edge op Windows (het opslagvenster ná een vraag);
  - pdf-viewers;
  - printen;
  - Outlook en Gmail (de mailfunctie is nog niet uitgerold).

## Bekend, voor later

- **Twee apparaten die tegelijk dezelfde ruiten wijzigen**, overschrijven
  elkaar nog steeds: wie het laatst opslaat, wint (zie de handover). Bij een
  bestelde ruit gaat er nu niets meer stil mis; de app vraagt het.
  - Wel een grens: een oude maat die nooit eerder besteld was en daarna op
    het apparaat opnieuw gestempeld is (na een herstart met openstaand
    werk), telt als wijziging. Hij is dan geel, en VERVANGT toont de oude
    maat.
- **De klok van een apparaat telt mee bij de oudere stand.** Staat een klok
  verkeerd, dan kan de vraag "Oudere stand?" komen zonder dat het nodig is.
  De vraag zegt wie en wanneer, en "Nee, toch zo bestellen" lost het op. Een
  stempel van de server zou beter zijn, maar raakt het opslaan zelf.
- **Een annulering bevestigd of niet?** Na "annuleren" telt een ruit in de
  app direct als niet besteld. Kon de leverancier het niet annuleren, dan
  is dat niet vast te leggen.
- De inhoud van een eerdere bestelling bekijken: de gegevens zijn er, het
  scherm nog niet.
- Positienummers tellen per lijst opnieuw. De leverancier herkent een ruit
  aan het merk (K1).
- Na het intrekken van een aanvulling geldt een eerdere bestelling weer. Die
  kan ingekort zijn. Dan ziet de app wél dat er iets anders is, maar soms
  niet meer wat: "overige gegevens gewijzigd".

## Nieuwe begrippen

- **Aanvulling:** een bestellijst met alleen wat er bij komt of anders moet,
  bovenop wat al besteld is.
- **Oudere stand:** een versie van een ruit van vóór de laatste bestelling,
  die een ander apparaat terugzette omdat het de nieuwere versie niet kende.
- **Stempel:** wie een ruit het laatst wijzigde, en wanneer. De app zet dat
  bij het opslaan in de ruit.
- **Wat er besteld is (de besteld-stand):** de 1e bestellijst plus alle
  aanvullingen, min wat geannuleerd is. Dat is wat de leverancier maakt.
