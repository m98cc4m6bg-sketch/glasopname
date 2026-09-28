# Glasopname v84 — "Geen verbinding" die blijft staan

*28 september 2026. Eén bug, gevonden en gerepareerd: een geopend project
meldde na verloop van tijd "Geen verbinding" en kwam pas weer bij zinnen na
een wijziging of het openen van een ander project.*

---

## 1. Wat er misging

De melding klopte op het moment dat hij verscheen, maar hij bleef staan als de
verbinding er weer was. En zolang hij stond, werd er ook niets meer opgehaald:
wijzigingen van een collega kwamen niet binnen.

De oorzaak zit in wat er in v83 aan het opstarten is toegevoegd. Lukte het
ophalen van het project niet, dan hield de app de projectkoppeling vast — dat
was de reparatie — maar daarna werd er alleen opnieuw geprobeerd als er werk
klaarstond om op te slaan:

```js
setTimeout(function () { if (vuil) synchroniseer(); }, 5000);
```

Stond er niets open, dan gebeurde er dus niets meer. Het pilletje bleef rood,
en de enige weg terug was zelf iets wijzigen (dan liep het opslaan en werd de
melding groen) of een ander project openen (dan werd er opnieuw opgehaald).

Er kwamen twee dingen bij die hetzelfde beeld versterkten:

* **Bij terugkeer op het tabblad werd een fout genegeerd.** De controle die
  draait als je terugkomt (`bijTerugkeer`) haalde het project opnieuw op, maar
  stapte bij een fout stilletjes uit — en zette het pilletje ook niet op groen
  als het juist wél goed ging.
* **De live verbinding meldt niet dat hij wegvalt.** Na een slaapstand, een
  wifi-wissel of een uur stil liggen sluit de websocket van Supabase. De app
  merkte dat niet, en bleef wachten op berichten die nooit meer kwamen.

**Niet de oorzaak: de schrijfrechten.** Dat was een logische gedachte, maar
een `update` die niets verandert geeft gewoon antwoord (en sinds v83
controleert de app ook of er werkelijk een rij geraakt is). Bovendien slaat de
app alleen op als er iets gewijzigd is; bij stilstand gaat er niets naar de
server, dus daar kan geen antwoord uitblijven. Wat er wél meespeelt is de
inlogsessie: die verloopt na een uur en wordt in de achtergrond vernieuwd. Een
verzoek dat net op dat moment valt — of na een slaapstand — geeft dezelfde
fout als geen verbinding.

## 2. Wat er gerepareerd is

Alles in `cloud.js`:

1. **De app blijft zelf proberen.** Na een mislukte poging volgt een nieuwe na
   5, 10, 20 en daarna elke 30 seconden, net zolang tot het lukt. Je hoeft er
   niets voor te doen.
2. **Een verlopen sessie wordt vernieuwd** voordat de volgende poging gedaan
   wordt.
3. **Terugkomen op het tabblad herstelt de verbinding.** Is de stand nog nooit
   binnengekomen, dan wordt dat nu meteen opnieuw geprobeerd; een fout wordt
   gemeld in plaats van genegeerd, en als alles klopt gaat het pilletje weer
   op groen.
4. **Weer online zijn is genoeg.** De `online`-melding van de browser start nu
   ook het ophalen, niet alleen het opslaan.
5. **De live verbinding wordt bewaakt.** Valt het kanaal weg, dan meldt de app
   zich opnieuw aan (3, 6, 12, dan 30 seconden) en vraagt daarna één keer na
   wat er intussen veranderd is.
6. **Een hartslag van vijf minuten.** Staat de app in beeld en is er niets
   openstaands, dan wordt er elke vijf minuten kort gecontroleerd of de
   verbinding er nog is, en of de live verbinding nog leeft. Zo vertelt het
   pilletje wat er nu waar is, in plaats van wat er de laatste keer gebeurde.
   Die controle is één klein verzoek — meteen ook een extra reden waarom het
   Supabase-project niet in slaap valt.
7. **Bestaat het project niet meer**, dan staat dat er voortaan ook
   ("Project bestaat niet meer") in plaats van "geen verbinding".

Tijdens het herstellen gaat de binnengekomen stand langs dezelfde weg als een
melding van een collega: staat er eigen werk open of sta je in een veld, dan
wordt er niets overschreven maar krijg je de keuze. Dat was al zo en is niet
veranderd.

## 3. Wat er getest is

Nieuw: `node test-verbinding.js`. Supabase wordt daarin nagebootst, zodat de
verbinding aan en uit gezet kan worden. Getest:

* opstarten zonder verbinding → het pilletje meldt "Geen verbinding";
* verbinding terug → de app vraagt uit zichzelf opnieuw op en het pilletje
  staat weer op "Opgeslagen";
* terugkomen op het tabblad terwijl de verbinding dood is → dat wordt gemeld
  in plaats van genegeerd;
* en daarna weer goed → het pilletje klopt weer;
* rood laten staan en **niets doen** → na de wachttijd staat het vanzelf weer
  op groen.

De andere zes reeksen zijn opnieuw gedraaid en zijn groen:
`test-index.js`, `test-naslag.js`, `test-herstel.js`, `test-cloudguard.js`,
`test-rook.js` en `test-leverpagina.js` + `.py`.

**Niet getest:** het echte Supabase. Het wegvallen van de websocket, het
vernieuwen van een verlopen sessie en het gedrag na een slaapstand zijn
nagebootst, niet uitgevoerd — daarvoor is een echte inlog nodig. Ook Safari
niet: hier draait alleen Chromium. Er is niets aan de opmaak of aan
aanraakbediening veranderd, dus daar wordt geen verschil verwacht.

**Waar je zelf op kunt letten** na het bijwerken: laat de app een paar uur
openstaan, zet je telefoon een tijdje in vliegtuigstand en weer terug, en kijk
of het pilletje vanzelf weer groen wordt zonder dat je iets typt.

## 4. Wat je moet doen

1. De bestanden uit de zip in de map van de repo zetten, committen en pushen.
2. Eén keer op **↻ Bijwerken** drukken; linksboven moet **v84** komen te staan.
3. Geen SQL nodig.
