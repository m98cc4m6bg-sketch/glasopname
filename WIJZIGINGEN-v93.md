# Glasopname v93 — Ontgrendelen, 'Opgenomen door', foto's zonder bereik en de originelen

*12 oktober 2026. Twee fouten gemeld door Jan, en route 2 voor de originele
foto's (gekozen in een andere sessie).*

---

## Installeren — in deze volgorde

1. **Eerst SQL:** open Supabase → SQL Editor, plak `19_originelen.sql` en
   klik op *Run*. Onderaan hoort één regel te staan met `false`, `52428800`
   en acht soorten bestanden. Dit verhoogt de grens per bestand in de
   opslagmap van 8 naar 50 MB en laat ook HEIC-foto's toe.
2. **Dan de bestanden** in de repo zetten (GitHub Desktop):
   * gewijzigd: `index.html`, `cloud.js`, `fotos.js`, `pdf.js`, `project.js`,
     `undo.js`, `sw.js`, `lib/LEESMIJ.md`, `CLAUDE.md`
   * nieuw: `wachtrij.js`, `originelen.js`, `lib/jszip-3.10.1/jszip.min.js`,
     `19_originelen.sql`
   * testreeksen: `test-v93.js` (nieuw), `test-index.js`, `test-offline.js`,
     `test-rook.js`, `test-sql.sql`
   * van v92 (als die niet geplaatst is): `test-v91.js` en
     `WIJZIGINGEN-v92.md`. De app-bestanden van v92 (`index.html`, `fotos.js`,
     `pdf.js`, `sw.js`) zitten al in deze zip, met v93 erbovenop. **Deze zip
     past dus op v91 én op v92.**
3. **Op élk apparaat ↻ Bijwerken**; linksboven moet **v93** staan. Dat is
   deze keer belangrijker dan anders: op een apparaat dat nog v92 draait, kan
   iemand 'Opgenomen door' gewoon overtypen, en daar gaat een foto zonder
   bereik nog steeds verloren.

Er is geen Edge Function nodig; de bestelmail staat nog steeds niet ingesteld
(handover §11e).

## Afvinklijst

- [x] 1. De knop ‹Ontgrendelen› doet weer iets, en **waarom het misging**
- [x] 2. 'Opgenomen door' staat vast; wijzigen alleen met je eigen wachtwoord
- [x] 3. Foto's zonder bereik: eerst op het apparaat, dan vanzelf naar de cloud
- [x] 4. Het origineel van elke foto en van de leverfoto mee naar Supabase
- [x] 5. ‹Exporteren → Originele foto's (zip)›
- [x] 6. Opruimen: een project definitief verwijderen neemt de originelen mee
- [x] Testen: hele batterij twee keer, plus de SQL, plus een nieuwe reeks met
      echte kliks in Chromium
- [x] Handover en projectkennis bijgewerkt

---

## 1. Ontgrendelen deed niets

### Wat er misging

In een besteld project werd de knop ‹Ontgrendelen› **zo'n 200 keer per
seconde** weggegooid en vervangen door een nieuwe. Je tikte dus vrijwel altijd
op een knop die er een fractie van een seconde later niet meer was, en dan
gebeurt er niets. Op de iPad kostte dat bovendien de hele tijd rekenkracht en
batterij, zolang er een besteld project openstond.

Hoe dat kwam: in v90 heb ik een bewaker toegevoegd (een *MutationObserver*)
die opmerkt wanneer er velden op het invoertabblad bijkomen en die dan meteen
weer op slot zet. Dezelfde ronde tekent ook de balk met de knop opnieuw. Maar
die balk staat óók op het invoertabblad. De bewaker zag de nieuwe balk dus als
"er komt iets bij", en tekende de balk opnieuw. Die zag hij weer. Enzovoort,
zonder einde.

### Hoe dit kon na alle fixes en tests

Eerlijk antwoord: de fout zit er **sinds v90** in, en ik heb hem er zelf in
gezet. In v88 en v89 werkte de knop; de bewaker kwam erbij in de reparatie van
v90 (doortypen in een besteld project). In v91 heb ik het slot verder
dichtgezet en ook toen niet op de knop gedrukt.

Waarom de tests groen bleven: na v90 was de les "toets de belofte op de
gegevens, niet de knoppen". Dat bleef goed, maar ik heb het te letterlijk
genomen. De tests riepen de functie achter de knop (`slotOntgrendel()`)
rechtstreeks aan, en die functie deed het prima. **Niemand klikte op de knop
zelf.** De testomgeving (jsdom) had dat ook niet kunnen vangen: die heeft geen
echte klikken en geen echte timing.

### Wat er nu gebeurt

* De balk wordt alleen opnieuw getekend als er werkelijk iets veranderd is
  (dicht, open, of een andere status of naam).
* De bewaker kijkt niet meer naar veranderingen in de balk zelf. Het zit er
  dubbel in, want precies deze lus maakte de knop onbruikbaar.
* **Nieuwe testreeks `test-v93.js`** in een echte browser (Chromium), met
  echte kliks op de echte knop en het echte wachtwoordvenster. Die test telt
  ook hoe vaak de knop vervangen wordt: nu 0 keer, tegen 329 keer in anderhalve
  seconde met de code van v92. Tegen v92 faalt de klik.
* Hetzelfde geldt voor ‹Weer vastzetten›; ook die is nu met een klik getest.

## 2. 'Opgenomen door' was door iedereen te wijzigen

### Wat er misging

Je had gelijk, en ook dit had ik moeten zien: het veld was **nooit**
afgeschermd. Het was een gewoon tekstveld. De app vulde het in met de naam van
wie het project als eerste *opende*, niet van wie het inmat, en daarna kon
iedereen er een andere naam overheen typen, zonder wachtwoord en zonder dat
het in het logboek kwam. Het wachtwoord gold alleen voor ontgrendelen.

### Wat er nu gebeurt (jouw keuze: vast, wijzigen met wachtwoord)

* **Het wordt automatisch de naam van wie de eerste ruit invult** (breedte,
  hoogte, merk, glastype of opmerking), niet meer van wie het project opent.
  Een collega die later verder meet, verandert de naam niet.
* Daarna **staat het vast**: het veld is grijs en je kunt er niet in typen.
  Ernaast staat de knop **Wijzigen…**. Die vraagt eerst je eigen wachtwoord
  (hetzelfde als voor het inloggen) en daarna de nieuwe naam.
* In het logboek komt: *"opgenomen door" gewijzigd van julian naar Bart door
  julian*.
* Het slot zit ook op de gegevens, niet alleen op het veld. Een andere weg
  in de app naar dit veld weigert, en Cmd+Z maakt het niet leeg.
* Een ouder project waar al ruiten in staan maar nog geen naam: dat krijgt
  de naam van wie er als eerste weer iets in wijzigt. Openen alleen vult
  niets meer in. (Tot v92 vulde de app de naam al bij het openen, dus in de
  praktijk hebben bijna alle projecten er al een.)

Net als het slot na bestellen is dit een slot **in de app**, niet in de
database. Voor onderling werk is dat genoeg (handover §9).

## 3. Foto's zonder bereik

### Wat er misging (tot v92)

Een foto ging pas in het project als het uploaden meteen lukte. Op een dak of
in een kelder kreeg je *"Mislukt"*, en de foto was weg.

### Wat er nu gebeurt

* Elke foto, tekening en leverfoto gaat **eerst op het apparaat zelf**
  (IndexedDB, de opslag van de browser) en meteen in het project. Je kunt
  direct verder: bolletjes zetten, tekenen, draaien en een pdf maken, ook
  zonder bereik.
* **Uploaden gaat vanzelf**, altijd meteen (jouw keuze): direct na de foto,
  bij elke start van de app, zodra er weer bereik is, als je de app weer voor
  je haalt, en verder elke halve minuut. Eerst de verkleinde foto's, daarna
  de originelen.
* Bovenaan staat een **oranje teller** (*⇡ 3 te uploaden*) zolang er iets
  wacht. Tik erop voor uitleg. Wordt hij **rood**, dan weigert de opslag een
  bestand; meestal is `19_originelen.sql` dan nog niet gedraaid.
* Ziet een collega op een ander apparaat jouw foto nog niet, dan staat er nu:
  *"Deze foto staat nog niet in de cloud. Hij wacht waarschijnlijk nog op het
  apparaat waarmee hij gemaakt is"*, met een knop om het opnieuw te proberen.
  Tot v92 stond er "ben je offline?", wat dan niet klopte.
* **Draaien** (↻) werkt nu ook zonder bereik.
* **Uitloggen** met foto's in de wachtrij: de app zegt dat ze bewaard blijven
  en meegaan zodra er weer iemand inlogt.
* Kan het apparaat geen IndexedDB gebruiken (bijvoorbeeld Safari in een privé
  venster), dan werkt het zoals vroeger: meteen uploaden, en alleen met bereik.

**Belangrijk:** wat in de wachtrij staat, staat **alleen op dat apparaat**.
Verwijder de app niet van het beginscherm en wis de websitegegevens niet
zolang de teller er staat. De app vraagt de browser om deze opslag niet op te
ruimen, maar Safari belooft dat niet hard.

## 4. De originele foto's

* Bij **elke foto** en bij **de leverfoto** gaat het bestand zoals het van de
  camera of uit de fotobibliotheek kwam ongewijzigd mee naar Supabase, in de
  map `<project>/origineel/`. Onveranderd: zelfde bytes, zelfde soort (jpg,
  heic, png).
* De verkleinde versie (1600 px) blijft wat de app op het scherm en in de pdf
  gebruikt.
* **Tekeningen** (uit een pdf of een afbeelding via *Tekening*) krijgen geen
  origineel, zoals afgesproken.
* ↻ Draaien draait alleen de verkleinde foto; het origineel blijft zoals het
  van de camera kwam.
* Komt er een nieuwe foto in een bestaande groep, dan hoort het nieuwe
  origineel erbij, niet dat van de vorige foto.

**Let op de ruimte.** Het gratis plan van Supabase heeft 1 GB opslag in
totaal. Met originelen van 3 à 5 MB is dat na zo'n 20 à 30 projecten met tien
foto's vol. Kijk af en toe in Supabase bij *Storage* of *Settings → Usage*.

## 5. Exporteren → Originele foto's (zip)

Nieuw in het menu **⬇ Exporteren**. Je krijgt één zip-bestand,
*Projectnaam - Originele fotos - 12-10-2026.zip*, met:

* per foto het origineel, genoemd naar de groep: *01 Voorgevel.jpg*,
  *02 Foto 2.jpg* … (tekens die niet in een bestandsnaam mogen, worden weggelaten);
* *Leverlocatie.jpg* (of .png, .heic);
* foto's van vóór v93 hebben geen origineel; daarvan staat de verkleinde
  versie erin, met *(verkleind)* in de naam, zodat het archief compleet is.
  Je krijgt daar een melding over;
* `overzicht.txt` met de oorspronkelijke bestandsnaam en grootte per foto.

Opslaan gaat zoals bij de pdf's: op de Mac een gewone download (of in Chrome
het opslagvenster), op de iPad het deelvenster (bijvoorbeeld *Bewaar in
Bestanden*). Werkt het deelvenster niet, dan valt hij terug op downloaden.

## 6. Kleinere dingen

* Een project **definitief verwijderen** (prullenbak, of na 30 dagen) ruimt
  nu ook de map `origineel/` op. Wat van dat project nog in een wachtrij
  stond, gaat niet meer omhoog. Tot v92 werd alleen de bovenste map geleegd;
  dat was genoeg zolang er geen submappen waren.
* **Leverfoto weghalen** haalt het origineel mee weg.
* Na het draaien van de **leverfoto** werd die niet opnieuw getoond; nu wel.

---

## Getest

Twee keer de hele batterij, alles groen. Ook `test-sql.sql` twee keer tegen
een echte PostgreSQL 16, met de nieuwe controle 16 (script 19 twee keer
achter elkaar; de map gaat naar 50 MB en acht soorten, andere mappen blijven
ongemoeid).

Nieuw: **`test-v93.js`**, 78 controles in Chromium, met echte kliks en de
echte vensters. Supabase is nagebootst: database en opslag leven in de test,
zodat ze blijven bestaan als de pagina herladen wordt.

1. **Ontgrendelen**: knop blijft staan; klik → wachtwoordvenster; fout
   wachtwoord → melding en slot blijft; goed → open, maten te wijzigen,
   wijziging in de database, logboek; ‹Weer vastzetten› met een klik.
2. **Opgenomen door**: openen vult niets in; eerste ruit → julian; typen in
   het veld en `projectVeld` doen niets; Cmd+Z laat hem staan; Wijzigen met
   fout wachtwoord → niets; met goed → Bart, in de database en in het
   logboek; collega meet verder → blijft Bart; ouder project openen → niets.
3. **Zonder bereik**: foto (3000×2000) → verkleind naar 1600, origineel met
   naam, soort en grootte, te zien uit de wachtrij, teller "2 te uploaden",
   niets in de cloud; pdf invoer mét de foto; draaien; herladen (nog steeds
   zonder bereik) → foto nog te zien. Weer bereik → alles omhoog, verkleind
   eerst, het origineel **byte voor byte gelijk**, teller weg.
4. **Ander apparaat**: de nieuwe melding met de knop.
5. **Zip**: juiste namen (ook met / en : en " in de titel), origineel byte
   voor byte, leverlocatie als png, *(verkleind)* voor een oude foto, geen
   tekening, overzicht.txt, de melding; leverfoto weg → origineel uit de cloud.
6. **Geweigerd** (script 19 niet gedraaid, 9 MB HEIC): verkleinde foto gaat
   wel, origineel blijft met de reden, teller rood, niet steeds opnieuw
   proberen, uitleg noemt het script; na "het script" en een herstart gaat
   hij alsnog, als image/heic.
7. **Tekening** zonder origineel; nieuwe foto in een bestaande groep krijgt
   het nieuwe origineel.
8. **Definitief verwijderen**: niets meer van het project in de opslag, ook
   niet in `origineel/`, en niets meer in de wachtrij.
9. **Zonder IndexedDB**: met bereik meteen geüpload (ook het origineel),
   zonder bereik "Mislukt" en geen kapotte foto.

De test vangt de oude fouten: met de slotcode van v92 faalt §1 (329 keer
vervangen, klik komt niet aan). Zonder de afscherming in `projectVeld`
falen vijf controles in §2.

## Niet getest — eerlijk

* **Safari op de iPad en iPhone.** Alles hierboven is Chromium. In het
  bijzonder niet uitgeprobeerd:
  * of Safari bij het kiezen van een foto een **HEIC of een JPG** aanlevert.
    Meestal maakt Safari er bij een webapp zelf een JPG van, dan is het
    "origineel" een JPG op volle grootte. Is het een HEIC, dan wordt hij ook
    zo bewaard. Beide werken in de test;
  * of IndexedDB in de **app op het beginscherm** de foto's bewaart na het
    sluiten van de app en een herstart van de iPad (zou moeten, niet
    gecontroleerd);
  * het **deelvenster voor de zip** na het verzamelen (zelfde route als de
    pdf; Safari kan weigeren als de tik te lang geleden is, dan wordt het
    downloaden);
  * het geheugen bij een **zip van een groot project** op de iPad (alles gaat
    in één keer in het geheugen).
* **De echte Supabase**, en script 19 in de echte SQL Editor. Getest tegen
  een nagemaakte `storage.buckets` met dezelfde kolommen. Supabase's eigen
  foutmeldingen bij "te groot" en "verkeerd soort" heb ik nagebootst op
  basis van wat Storage teruggeeft (code 413/415); als de echte tekst anders
  is, probeert de app het iets vaker opnieuw dan nodig, maar gaat er niets
  verloren.
* Echte iPhone-foto's van 48 megapixel (grootte, tijd om te uploaden over
  4G).

## Wat ik je aanraad om zelf te proberen

1. Een besteld project openen → ‹Ontgrendelen› → je wachtwoord.
2. Projectinfo → *Opgenomen door* → *Wijzigen…*.
3. Op de iPad **vliegtuigmodus aan**, een foto maken, zien dat hij erin
   staat met de oranje teller, vliegtuigmodus uit, zien dat de teller
   verdwijnt. Dan op de Mac kijken of de foto er is.
4. ‹Exporteren → Originele foto's (zip)› en de zip openen.
