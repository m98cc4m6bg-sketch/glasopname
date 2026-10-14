# Glasopname v102: projectenlijst sorteren

*13 oktober 2026. Gevraagd door Jan: een keuzemenu met aanmaakdatum,
alfabet en laatst gewijzigd.*

## Installeren

Geen SQL. Plaats de bestanden zoals altijd:
1. Open de map `glasopname` uit de zip en druk op **Cmd+Shift+.**
2. Selecteer alles wat erín staat, sleep het naar je repomap en kies
   *Vervang*.
3. Commit en push.

De apparaten werken vanzelf bij: v101 regelt dat met de balk en het
aftellen.

## Wat er verandert

Op het startscherm staat bij Projecten een keuzelijst **Sorteren**:

| keuze | volgorde |
|---|---|
| **Laatst gewijzigd** (standaard, zoals tot nu toe) | wat het laatst veranderd is bovenaan. Een taak toevoegen of afvinken telt ook als wijziging. |
| **Aanmaakdatum (nieuwste eerst)** | het laatst aangemaakte project bovenaan. In de regel staat dan ook "aangemaakt …". |
| **Alfabet (A–Z)** | op projectnaam, zoals je het verwacht. |

Bij **Alfabet** sorteert de app zoals je het verwacht:
- hoofdletters tellen niet mee;
- *Éénhoorn* staat bij de E;
- *Project 2* komt vóór *Project 10*;
- projecten zonder naam staan achteraan.

**Onthouden en zoeken:**
- De keuze wordt **per apparaat** onthouden. In privémodus werkt kiezen
  ook, alleen weet de app de keuze na herladen niet meer.
- Zoeken houdt de gekozen volgorde aan.

**Alleen de volgorde op het scherm verandert.** Sorteren schrijft niets in
de database; de test controleert dat ook.

## Twee valkuilen, afgevangen

1. **Er viel een deel van de projecten weg.** Tot nu toe haalde de lijst de
   200 laatst gewijzigde projecten op. Sorteer je die op naam, dan zou een
   oud project dat op naam bovenaan hoort, ongemerkt ontbreken. Nu:
   - de volgorde zit in de vraag aan de database zelf;
   - de grens is verhoogd naar 1000 projecten. Dat is nog geen halve MB.
2. **De database sorteert tekst anders dan een mens.** Een database zet
   bijvoorbeeld *Zuid* vóór *appel*, *Project 10* vóór *Project 2*, en
   *Éénhoorn* helemaal achteraan. De app sorteert de lijst daarom nog eens
   zelf, op de Nederlandse manier.

Verder:
- **Snel wisselen:** kies je snel achter elkaar iets anders, of typ je in
  het zoekveld, dan toont de lijst altijd het antwoord op je laatste keuze.
  Een ouder antwoord dat later binnenkomt, wordt genegeerd.
- **Aanraakschermen:** de keuzelijst is daar 16 px. Anders zoomt Safari in
  zodra je hem aantikt. Dat geldt ook voor een iPad in liggende stand.

De **datum van inmeten** zit er bewust niet in. Die staat als tekst
(dd-mm-jjjj) en sorteert dan verkeerd. Aanmaakdatum is een echte datum uit
de database.

## Bij het testen gevonden

**In privémodus deed kiezen niets.** De app kon de keuze niet bewaren en
las hem daarna ook niet terug. Nu houdt hij de keuze van de lopende sessie
in het geheugen.

## Getest

Twee keer de hele batterij, alles groen. Ook `test-overgang.js` vanaf
**v101 (wat nu live staat)** en vanaf **v98**: beide apparaten komen vanzelf
op v102, zonder dat er werk verloren gaat.

De nieuwe reeks `test-v102.js` werkt met 250 projecten en lastige namen.
De nagebootste database sorteert en begrenst echt, zoals PostgreSQL. Getest
is:
- de standaardvolgorde;
- alle 250 zichtbaar;
- alfabet:
  - het oudste project bovenaan;
  - hoofdletters, accenten, getallen;
  - naamloos achteraan;
- aanmaakdatum;
- niets naar de database;
- onthouden na herladen;
- zoeken houdt de sortering aan;
- snel wisselen;
- privémodus;
- telefoon (390 px): 16 px en niets buiten beeld;
- een iPad in liggende stand: 16 px.

Om na te gaan dat de tests de fouten vangen, heb ik dit expres stukgemaakt:
- **zonder de eigen sortering op naam:** de tests op alfabet sloegen aan;
- **met de oude grens van 200:** de tests op "alle 250" en "Aardbei
  bovenaan" sloegen aan.

**Niet getest:**
- **De sortering van de echte Supabase.** Die verschilt per installatie;
  daarom sorteert de app op naam zelf nog eens.
- **Echte Safari, Android en Windows.** Vooral hoe de keuzelijst daar
  openklapt.
