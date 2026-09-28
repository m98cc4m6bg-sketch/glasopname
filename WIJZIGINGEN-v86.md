# Glasopname v86 — "Ophalen mislukt: JWT issued at future"

*28 september 2026. De app opende traag en gaf bij het openen van de
projectenlijst deze melding; een tweede poging werkte gewoon.*

---

## 1. Waar die melding vandaan komt

Dit heeft niets te maken met een verwijderd project. Was dat het geweest, dan
had er "Project bestaat niet meer" gestaan (dat is de melding uit v85).

Wat hier gebeurde: bij het opstarten vernieuwt Supabase je inlogsleutel. In die
sleutel staat een tijdstempel: wanneer hij is uitgegeven. De database
controleert die sleutel met zijn eigen klok. Loopt de klok van de dienst die de
sleutel uitgeeft een paar seconden vóór op de klok van de database, dan lijkt de
sleutel uit de toekomst te komen en wordt hij geweigerd met precies deze tekst
(foutcode PGRST303). Het gaat om de klokken van Supabase zelf, niet om de klok
van je telefoon.

Het is een bekend en tijdelijk probleem aan de kant van Supabase: het treft
vooral de eerste verzoeken met een net vernieuwde sleutel — dus bij het
opstarten van de app, en na een uur stilstand — en een paar seconden later
werkt dezelfde sleutel gewoon. Dat verklaart ook waarom het bij jou na één keer
opnieuw proberen goed ging.

Dat de app traag opende past in hetzelfde beeld: het vernieuwen van de sleutel
en de eerste verzoeken liepen op elkaar te wachten.

## 2. Wat de app nu doet

De app ving dit niet op: de eerste fout werd meteen als eindantwoord getoond,
met de ruwe tekst van de database erbij.

1. **Een fout die vanzelf overgaat wordt automatisch opnieuw geprobeerd** —
   drie keer, na 1,2, 3 en 5 seconden, met een vernieuwde sleutel. Dat geldt
   voor het ophalen van de projectenlijst, het openen van een project, het
   opstarten en het herstellen van de verbinding.
2. **Je ziet wat er gebeurt**: "De server gaf nog geen antwoord. Nieuwe poging
   1 van 3…" in plaats van een rode foutregel.
3. **Blijft het misgaan**, dan volgt er een nette melding met een knop
   *Opnieuw proberen*, met de oorspronkelijke tekst er klein onder voor als je
   wilt weten wat er speelde.
4. **Bij het opslaan** levert zo'n fout geen rode waarschuwing meer op; de app
   probeert het na twee seconden gewoon nog eens.

Herkend worden: PGRST303 en "issued at future", een verlopen sleutel, en de
gewone netwerkfouten ("Failed to fetch", "Load failed", "NetworkError").

## 3. Wat er getest is

`node test-verbinding.js` is uitgebreid met twee gevallen, waarin de
nagebootste server zich precies zo gedraagt als Supabase in dit geval:

* **de sleutelklok loopt voor**: de eerste twee verzoeken worden geweigerd met
  PGRST303. De gebruiker ziet dat er opnieuw geprobeerd wordt, en daarna staat
  de lijst er gewoon — zonder dat er iemand iets doet;
* **de fout blijft aanhouden**: na drie pogingen volgt de nette melding met de
  knop *Opnieuw proberen*.

De bestaande gevallen in die reeks (opstarten zonder verbinding, herstel bij
online komen, terugkeer op het tabblad, vanzelf weer groen worden) zijn
aangepast aan het nieuwe gedrag: de app mag nu eerst een paar keer proberen
voordat hij "Geen verbinding" meldt.

Alle acht reeksen zijn groen: `test-index.js`, `test-naslag.js`,
`test-herstel.js`, `test-cloudguard.js`, `test-verbinding.js`,
`test-verwijderen.js`, `test-rook.js` en `test-leverpagina.js` + `.py`.

**Niet getest:** het echte Supabase. De klokfout is nagebootst met dezelfde
foutcode en tekst die Supabase teruggeeft, maar niet bij de echte dienst
uitgelokt. Ook Safari niet — hier draait alleen Chromium. Aan de opmaak en de
aanraakbediening is niets veranderd.

## 4. Als het toch blijft gebeuren

Het ligt niet aan de app en niet aan je telefoon, dus veel kun je er zelf niet
aan doen. Komt het vaker dan een enkele keer voor, meld het dan bij Supabase
(Support, met vermelding van PGRST303 en het tijdstip); het is een bekend punt
aan hun kant. De app werkt intussen door: je invoer blijft lokaal staan en gaat
alsnog omhoog zodra een verzoek wél door de controle komt.

## 5. Wat je moet doen

1. De bestanden uit de zip in de repo zetten, committen en pushen.
2. Eén keer op **↻ Bijwerken**; linksboven hoort **v86** te komen.
3. Geen SQL nodig.
