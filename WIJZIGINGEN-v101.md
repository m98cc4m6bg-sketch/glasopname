# Glasopname v101: oude apparaten komen vanzelf mee, en het nieuwe icoon

*13 oktober 2026. Gemeld door Jan na het plaatsen van v100.*

> Op de Mac in de app gewacht, door projecten geklikt, iets ingevoerd en
> weer verwijderd, op ↻ geklikt: geen v100 en geen melding. Pas na
> verversen van de browser stond v100 er, zonder melding. Op de iPhone
> (app op het beginscherm) hetzelfde, en die blijft op v98 staan. Op de
> Mac ook nog niet het nieuwe icoon.

## Installeren

Geen SQL. Plaats de bestanden zoals altijd:
1. Open de map `glasopname` uit de zip en druk op **Cmd+Shift+.**
2. Selecteer alles wat erín staat, sleep het naar je repomap en kies
   *Vervang*.
3. Commit en push.

Daarna hoef je **niets** te doen. Ook de iPhone op v98 komt vanzelf mee,
zie hieronder.

## Wat er misging

**De nieuwe versie kwam wél binnen, maar de oude versie meldde hem niet.**
Wat er gebeurt als je een nieuwe versie online zet, bepaalt de code die op
het apparaat draait: de **oude** versie. Op de iPhone en de Mac was dat
v98. Die had precies de twee fouten die in v99 zijn opgelost:

- de melding "Nu bijwerken" kwam in een balk die op het startscherm
  verborgen is;
- zodra je een project opende, wiste de app die balk.

Je zag dus nooit iets. Ik heb dit nagespeeld: v98 op het startscherm, v100
online zetten. De melding staat er, maar onzichtbaar, en na het openen van
een project is hij weg.

**Het ↻-knopje op het startscherm** haalde alleen de lijsten opnieuw op. Het
keek niet naar een nieuwe versie. ↻ Bijwerken zat alleen in de kop van een
geopend project (op de iPhone onder ☰).

**Na verversen in de browser stond v100 er zonder melding.** Dat klopt. De
app haalt zijn bestanden eerst van de server, en de nieuwe versie
herkende zichzelf en nam stil over.

**Waarom de tests dit niet zagen:** `test-v99.js` test het bijwerken van de
níeuwe versie naar een nóg nieuwere. Maar de overgang van wat live staat
naar het nieuwe werd nooit getest, terwijl juist de oude code daar het werk
doet. Dat staat nu in `TESTEN.md`, en er is een test voor (zie onder).

**Het icoon:** de nieuwe bestanden staan sinds v98 goed in de repo, maar
Safari bewaart een favicon in een eigen opslag en haalt hem niet opnieuw op
zolang het adres hetzelfde blijft.

## Wat er nu gebeurt

1. **Apparaten op v98 of ouder komen vanzelf mee.** Wie zo'n oude versie
   draait, krijgt de nieuwe versie zonder dat hij iets hoeft te doen:
   - de nieuwe versie neemt zelf over zodra hij compleet binnen is;
   - de oude pagina herlaadt vanzelf;
   - wat er getypt was, staat al op het apparaat (elke toetsaanslag) en gaat
     daarna naar de server;
   - dit gebeurt alleen bij v98 en ouder.

   Vanaf v99 regelt de app het zelf: de balk met aftellen, eerst opslaan,
   dan bijwerken. Dat blijft zo, zodat niemand midden in een maat wordt
   onderbroken.
2. **↻ op het startscherm kijkt nu ook naar een nieuwe versie.**
3. **Bij elke controle haalt de app de versie vers van de server**, nooit
   uit de browsercache. Chrome deed dat al; nu elke Safari ook.
4. **De iconen hebben een nieuw adres** (`favicon.png?v=2` enzovoort), in de
   pagina, het manifest en de offline-kopie. Safari haalt het nieuwe icoon
   dan op.

## Getest

Twee keer de hele batterij, alles groen, en twee nieuwe controles. De eerste
is de nieuwe reeks **`test-overgang.js`**: hij begint met de versie die nu
live staat (uit de repo) en zet dan deze versie "online". Hij draait twee
keer, vanaf **v98** (jouw iPhone) en vanaf **v100** (jouw Mac):

| situatie | v98 → v101 | v100 → v101 |
|---|---|---|
| app open op het startscherm, niemand raakt iets aan | komt vanzelf op v101 | komt vanzelf op v101 (balk, aftellen) |
| midden in het werk, net iets getypt | komt op v101; getypt staat in de database en is terug te vinden | idem, via het startscherm en "Verder met …" |

Zonder de nieuwe overname blijft de v98-test op v98 staan. De test vangt
dus precies wat jij zag.

De tweede controle zit in **`test-index.js`**. Hij controleert nu dat:
- elk bestand dat de app offline nodig heeft, in de repo staat. Ontbreekt
  er één, dan komt er sinds v100 nooit meer een update;
- de iconen een versie in hun adres hebben, en precies dat adres ook
  offline bewaard wordt.

**Niet getest:**
- **Echte Safari op iPhone en Mac.** Vooral:
  - of iOS de overname meteen doet terwijl de app op het beginscherm open
    staat, of pas bij de volgende keer openen;
  - of Safari het nieuwe icoon ophaalt.
- **Het icoon op het beginscherm van iPhone en iPad.** Dat verandert pas
  als je de app weghaalt en opnieuw toevoegt. Doe dat alleen als de teller
  bovenaan leeg is: foto's die nog op uploaden wachten, staan alleen op dat
  apparaat.
- **Komt het icoon in Safari op de Mac nog steeds niet?** Sluit Safari
  helemaal af (Cmd+Q) en open opnieuw. Helpt dat niet, gooi dan alleen de
  icoonopslag van Safari weg:
  1. Sluit Safari.
  2. Kies in Finder Ga → Ga naar map, en typ
     `~/Library/Safari/Favicon Cache`.
  3. Gooi de inhoud van die map weg.

  Wis **niet** de websitegegevens van de app in Safari. Daarin staat werk
  dat nog naar de server moet, en foto's die op uploaden wachten.

## Je iPhone, nu meteen

Hij komt vanzelf op v101 zodra je v101 hebt geplaatst en de app opent. Wil
je hem nú al op v100: open een project, tik op ☰ en dan op ↻ Bijwerken. Of
veeg de app helemaal weg en open hem opnieuw.
