# Glasopname v109: wachtwoord bewaren zonder waarschuwing, en een nieuw wachtwoord via een herstellink

*17 oktober 2026.* Jans antwoorden na v108:

> 1. Ja, de vraag komt nu direct, alleen wel pas na een melding over een
>    onveilig verstuurd formulier, en bij "bewaar wachtwoord" vraagt hij om de
>    gebruikersnaam te kiezen.
> 2. Akkoord voor het venster "Kies een nieuw wachtwoord". Voeg ook een knop
>    "Wachtwoord vergeten" toe die alleen een melding geeft: "deze functie
>    zit bewust niet in de app, vraag julian om een herstel link!"

Plus drie kleine punten: script 25, verouderd commentaar, en twee oude
bestanden uit de repo.

**Eerst SQL, dan de bestanden.** Draai `25_canale_mat.sql` in Supabase →
SQL Editor, dan pas de bestanden (zie `LEES-MIJ-EERST-v109.md`).

## 1. "Wachtwoord bewaren?" zonder waarschuwing (🟠)

**Wat er misging.** Om Safari te laten weten dat er is ingelogd, "verstuurde"
v108 het inlogformulier naar `about:blank`: een leeg venster dat niet bij de
website hoort. Safari ziet dat als een formulier dat niet beveiligd
verstuurd wordt, en waarschuwt eerst. Daarna wist Safari niet goed welk veld
de gebruikersnaam was, en vroeg het dat aan jou.

**Wat er nu gebeurt.** Het formulier "verstuurt" naar `leeg.html`: een leeg
pagina'tje dat bij de app zelf hoort, via https. Voor Safari is dat een
gewone, beveiligde inlog op de eigen website. Daardoor:
- geen waarschuwing meer (verwacht);
- het e-mailadres staat in hetzelfde formulier als het wachtwoord, met de
  standaardkenmerken (`username` en `current-password`) die Safari gebruikt
  om de gebruikersnaam te vinden.

Veiligheid, zoals in v108: het wachtwoord gaat alleen naar Supabase. Wat er
naar `leeg.html` gaat, is leeg: de velden hebben bewust geen naam, en
velden zonder naam gaan nooit mee. Getest: het adres is `leeg.html?`, zonder
e-mail en zonder wachtwoord. Het verborgen kader waarin dat pagina'tje
laadt, is afgeschermd (`sandbox`): daar draait nooit code.

Chrome, Edge en Android doen het zoals in v108 (die hebben er een eigen,
nette manier voor).

**Eerlijk:** of Safari nu echt zonder waarschuwing vraagt én het e-mailadres
meteen goed heeft, kan ik hier niet zien (Chromium toont die vragen niet).
Dat moet jouw proef laten zien (zie "Hoe je het zelf controleert"). Werkt het
niet, dan is de volgende stap om Safari het moment op een andere manier te
laten merken.

## 2. "Wachtwoord vergeten?" (🟢)

Onder ‹Inloggen› staat een knop **Wachtwoord vergeten?**. Een tik geeft
alleen een melding:

> **Wachtwoord vergeten**
> Deze functie zit bewust niet in de app, vraag julian om een herstel link!

Verder doet de knop niets: hij logt niet in en verstuurt het formulier niet,
ook niet als e-mail en wachtwoord al zijn ingevuld. Enter in het
wachtwoordveld logt gewoon in. (Je tekst, alleen met een hoofdletter
vooraan.)

## 3. Venster "Kies een nieuw wachtwoord" (🔴, akkoord van Jan)

Stuur je vanuit Supabase een herstelmail, dan opent de link de app met het
venster:

> **Kies een nieuw wachtwoord**
> Je bent via de herstellink ingelogd. Kies een nieuw wachtwoord. Daarmee
> log je voortaan in, ook in de app op je beginscherm en op je andere
> apparaten.
> Account: bart@jelierbouw.nl
> Nieuw wachtwoord (minstens 8 tekens) · Nog een keer
> ‹Wachtwoord opslaan› · Niet nu: uitloggen

- **Opslaan** zet het nieuwe wachtwoord bij Supabase. Daarna biedt de browser
  aan het nieuwe wachtwoord te bewaren (bij het goede e-mailadres), komt de
  melding "Wachtwoord opgeslagen", en daarna het gewone startscherm.
- **Controles vooraf**: minstens 8 tekens, twee keer hetzelfde.
- **Geen bereik** op het moment van opslaan: "Geen verbinding…", het venster
  blijft staan. Nog eens op ‹Wachtwoord opslaan› zodra er bereik is. Kwam
  het eerste verzoek toch aan (Supabase had het al, alleen het antwoord
  ging verloren), dan ziet de app dat bij de tweede keer en gaat hij gewoon
  verder. Typt iemand zijn oude wachtwoord, dan is dat gewoon zijn
  wachtwoord: geen fout, verder.
- **Je komt niet stil in de app zonder nieuw wachtwoord**: herladen (ook door
  een nieuwe versie), het tabblad sluiten en de app later weer openen (ook
  na een tijd zonder bereik), of een nieuw tabblad: het venster komt terug, tot je een wachtwoord kiest of
  ‹Niet nu› kiest. (Dat geldt per browser; de app op het beginscherm van een
  iPhone heeft een eigen opslag en is via de link niet ingelogd.) Het
  verplicht bijwerken wacht ook liever even zolang het venster openstaat.
- **Niet nu: uitloggen**: voor wie de link per ongeluk opende. Werkt ook
  zonder bereik. Het wachtwoord blijft het oude. (Kwam er net een poging
  zonder antwoord, dan zegt de app dat die misschien toch aankwam.)
- **Een link die al gebruikt of te oud is**: "Deze herstellink werkt niet
  meer: hij is al gebruikt of verlopen. Een herstellink werkt één keer en is
  een uur geldig. Vraag julian om een nieuwe herstellink." Daarna het
  inlogscherm (of, als er op dat apparaat al iemand ingelogd was, de app
  zoals altijd).
- **Tijdens het verwerken van de link** staat het venster er al, met
  "Herstellink verwerken…".
- **Geen bereik bij het openen van de link** (of half bereik: na 20 seconden
  zonder antwoord): "De herstellink kon niet verwerkt worden: er is geen
  verbinding" met ‹Opnieuw proberen› (laat de pagina open; de link in de mail
  werkt niet nog een keer).
- **Was er op dat apparaat al iemand anders ingelogd** (bijv. Julian op de
  iPad) en lukt het verwerken van Barts link niet: dan komt het venster
  níet (anders zou het Julians wachtwoord wijzigen). Het venster komt alleen
  voor de persoon van wie de link is.
- **De herstelcode verdwijnt meteen uit het adres**, ook uit de terug-knop.
- **Nooit gegevens kwijt**: werk dat op dat apparaat nog omhoog moest, blijft
  onaangeroerd staan (ook bij "Niet nu: uitloggen") en gaat daarna op de
  gewone manier omhoog.

**Waarom 🔴:** het raakt het inloggen. Wie er mag inloggen, verandert niet:
alleen wie de herstellink uit jouw mail heeft, kan een nieuw wachtwoord
kiezen, en die link stuur alleen jij.

**Wat jij nog moet doen, anders werkt de link niet:** in Supabase de *Site
URL* instellen (`BEHEER.md` §3.2). Zonder dat wijst de link naar
`localhost`. Je zei dat je dat gaat doen; tot je het bevestigt, ga ik ervan
uit dat het nog niet gebeurd is.

**Outlook op de iPhone** opent links vaak in zijn eigen browservenster. Het
venster werkt daar ook, maar de vraag om het wachtwoord te bewaren komt daar
misschien niet. Daarna gewoon inloggen in de app met het nieuwe wachtwoord.
Probeer het bij je proef ook één keer via de Outlook-app.

**Een risico om te kennen (Microsoft 365):** sommige mailbeveiliging
(bijvoorbeeld *Safe Links* van Microsoft Defender) "opent" links in een
mail al vóór de ontvanger erop tikt, om ze te controleren. Een herstellink
werkt maar één keer, en is dan al gebruikt: je collega krijgt meteen "werkt
niet meer". Gebeurt dat, zeg het dan: er is een oplossing (de mail van
Supabase anders laten opbouwen, en een extra knop in de app), maar die bouw
ik pas als het nodig blijkt.

## 4. Kleine punten

- **Script 25** (🔴 database, klein): "Figuurglas — Canale mat blank" alsnog
  in de keuzelijst Glasbewerking in de database. Script 12 (v76) vergat hem.
  Daardoor gebruikte de app zijn eigen lijst, en zou een wijziging van de
  bewerkingen in de database genegeerd worden. Na het script haalt de app de
  lijst weer uit de database. Je ziet geen verschil: de lijst is daarna
  precies dezelfde. Het script mag vaker gedraaid worden en raakt niets
  anders. Na het draaien toont het: `aantal_opties 43, plek_canale_mat 5`.
- **Commentaar bijgewerkt** in `pdf.js`, `cloud.js` en
  `supabase/functions/mail/index.ts`: daar stond nog dat alleen de bestelmail
  een project op 'besteld' zet. Sinds v104 doet ‹Ja, verstuurd› dat ook.
  Alleen commentaar; de app doet niets anders.
- **Uit de repo**: `OVERDRACHT.md` (stand v65) en `LEES-DIT-EERST.md`
  (v74→v78). Ook de oude `LEES-MIJ-EERST-v94.md` en `LEES-MIJ-EERST-v106.md`
  staan nog in de repo; die horen ook niet meer bij de app. Slepen kan geen
  bestanden weghalen, dus die vier gooi je zelf weg (stappen in
  `LEES-MIJ-EERST-v109.md`). Een kopie zit in de tweede zip.
- **Voortaan twee zips** (jouw wens): de gewone, die precies is wat in de repo
  hoort, en een tweede, `glasopname-v109-niet-in-repo.zip`, met wat bewust
  níet in de openbare repo mag: de bijgewerkte handover (met de zwakke plekken
  in de beveiliging) en het archief van verwijderde bestanden.

## Bestanden

| bestand | wat |
|---|---|
| `25_canale_mat.sql` | **nieuw**: Canale mat blank in de database |
| `leeg.html` | **nieuw**: het lege pagina'tje waar de formulieren heen "versturen" |
| `index.html` | inlogformulier naar `leeg.html`, velden zonder naam, kader afgeschermd; knop "Wachtwoord vergeten?"; venster "Kies een nieuw wachtwoord"; versie v109 |
| `cloud.js` | wachtwoord aanbieden (ook het nieuwe); de herstellink zelf lezen en uit het adres halen, de sessie zetten (met ‹Opnieuw proberen›); het venster, opslaan, uitloggen, verlopen link; bijwerken wacht als het venster openstaat; commentaar |
| `pdf.js` | commentaar; versie v109 |
| `sw.js` | versie v109 |
| `supabase/functions/mail/index.ts` | alleen commentaar (de functie staat nog niet in Supabase) |
| `test-v109.js` | **nieuw**: de tests hieronder |
| `test-v106.js` | twee mutaties aangepast aan de nieuwe naam in de code |
| `test-overgang.js`, `test-rook.js`, `test-v93/98/99/102/103/104/105/106.js` | alleen: meldingen uit het afgeschermde kader genegeerd (zie "Getest") |
| `test-sql.sql` | §22: script 25 tegen een echte PostgreSQL |
| `OVERDRACHT.md`, `LEES-DIT-EERST.md` | **weg** (en de oude `LEES-MIJ-EERST-v94/v106.md`) |
| handleidingen | zie onderaan |

## Hoe je het zelf controleert

1. **Script 25**: na *Run* staat er `43 | 5`.
2. **Wachtwoord bewaren (Mac, Safari).** Laat Safari je wachtwoord voor de
   app eerst vergeten: in de app **Wachtwoorden** (macOS 15 en nieuwer), of
   anders Systeeminstellingen → Wachtwoorden; zoek
   `m98cc4m6bg-sketch.github.io` en verwijder het. Log uit in de app en weer in.
   - Verwacht: **geen** waarschuwing over een onveilig formulier, direct de
     vraag "Wachtwoord bewaren?", met je e-mailadres al ingevuld.
   - Een fout wachtwoord: geen vraag.
   - Zelfde proef op de iPhone (de app Wachtwoorden, of Instellingen →
     Wachtwoorden). En als je kunt op een Android-telefoon of Windows-pc.
3. **Wachtwoord vergeten?** Tik op het inlogscherm op de knop: de melding met
   jouw tekst, verder niets.
4. **Herstellink** (pas na het instellen van de Site URL): Supabase →
   Authentication → Users → je eigen account (of een testaccount) → *Send
   password recovery*. Open de mail op je iPhone, tik op de link.
   - Verwacht: het venster "Kies een nieuw wachtwoord" met je e-mailadres.
   - Kies een nieuw wachtwoord: de vraag om het te bewaren, "Wachtwoord
     opgeslagen", het startscherm.
   - Log daarna op de Mac in met het nieuwe wachtwoord.
   - Tik daarna nog een keer op dezelfde link: "werkt niet meer".
   - Doe het ook één keer met de mail in de Outlook-app.
   - Komt die melding al bij de eerste tik: dan heeft je mailbeveiliging de
     link al geopend (zie het risico hierboven). Zeg het even.

## Getest

- **`test-v109.js`** (Chromium), met de **échte** bibliotheek van Supabase
  tegen een nagebootste Supabase-server. Zo is getest hoe die bibliotheek
  zich werkelijk gedraagt bij inloggen, de sessie uit de link en het wijzigen
  van het wachtwoord.
  - §1 "Wachtwoord vergeten?" op iPhone-breedte: de knop staat onder
    ‹Inloggen›, de melding met precies jouw tekst, en verder gebeurt niets
    (geen inlog, geen verzending, geen verzoek aan Supabase), ook met alles
    ingevuld. Enter logt daarna gewoon in.
  - §2 inloggen als Safari (Mac) en als Edge (Windows): het formulier gaat
    naar `leeg.html` van de app zelf, zonder e-mail of wachtwoord in het
    adres, het kader is afgeschermd; bij Edge `credentials.store`; bij een
    fout wachtwoord hoort de browser niets; het wachtwoord ging alleen naar
    Supabase.
  - §3 Barts herstellink op de iPhone: het venster met zijn adres, de
    herstelcode weg uit het adres, nog geen projecten opgehaald, het werk op
    het apparaat onaangeroerd; te kort, niet gelijk; **geen bereik** bij
    opslaan (venster blijft); bereik terug → opgeslagen, de browser hoort het
    nieuwe wachtwoord, startscherm; op een Windows-pc daarna met het oude
    wachtwoord niet en met het nieuwe wel ingelogd.
  - §4 een verlopen link: de melding, het inlogscherm, de foutcode weg uit het
    adres, na herladen geen melding meer.
  - §5 herladen terwijl het venster openstaat: het venster komt terug; Enter
    slaat op.
  - §6 "Niet nu: uitloggen" zonder bereik: uitgelogd, wachtwoord ongewijzigd,
    het werk op het apparaat (de kopie van het project, de vlag "moet nog
    omhoog", apart te bewaren werk) onaangeroerd, na herladen niet stiekem
    ingelogd.
  - §8 tabblad dicht zonder te kiezen en later een nieuw tabblad: het venster
    komt terug; de terug-knop brengt de herstelcode niet terug; en na meer
    dan een uur zonder bereik (de sessie lijkt even weg) komt het venster
    met bereik alsnog terug.
  - §9 Supabase sloeg op maar het antwoord ging verloren: de tweede poging
    gaat gewoon door; "Niet nu" zegt dan dat de poging misschien aankwam; het
    oude wachtwoord kiezen geeft geen fout.
  - §10 Julian al ingelogd, Barts link zonder bereik: ‹Opnieuw proberen›,
    géén venster met Julians adres; ‹Stoppen› laat Julian gewoon verder
    werken; ‹Opnieuw proberen› met bereik geeft Barts venster. Een ongeldige
    link terwijl Julian ingelogd is: "werkt niet meer", Julian werkt door.
  - §12 half bereik (de verbinding blijft hangen): eerst "Herstellink
    verwerken…", na de tijdsgrens ‹Opnieuw proberen›; ‹Stoppen› terwijl de
    link op de achtergrond toch lukte: het venster komt (niet stil in de
    app); "Niet nu" terwijl het uitloggen blijft hangen: inlogscherm, en wie
    dan het tabblad sluit, komt de volgende keer niet stil in de app.
  - §11 script 25: vóór het script houdt de app zijn eigen lijst; de lijst die
    het script maakt is precies die van de app; daarna neemt de app de lijst
    uit de database over (getoetst met een extra optie die alleen in de
    database staat).
  - Schermafdrukken bekeken: inlogscherm en venster op iPhone-breedte, de
    melding bij een verlopen link.
- **Mutaties** (`node test-v109.js --mutaties`): 22 keer iets expres
  teruggedraaid of stukgemaakt, alle 22 gevangen. Onder meer: de knop
  "vergeten" als gewone formulierknop (die logde dan in), een andere tekst,
  terug naar `about:blank`, het wachtwoordveld mét naam (dan stond het in het
  adres), het kader zonder afscherming, de link niet herkennen (dan was Bart
  stil ingelogd, zoals in v108), het venster voor de verkeerde gebruiker, de
  herstelcode terug via de terug-knop, de vlag per tabblad, geen vlag, niet
  opnieuw kunnen proberen, geen melding bij een verlopen link, te kort of
  niet gelijk toegestaan, het nieuwe wachtwoord niet aanbieden, "opgeslagen"
  zonder bereik, het verloren antwoord niet herkennen, en "Niet nu" dat het
  wachtende werk weggooit; en uit de tweede controle: de vlag wissen als er
  even geen sessie is, de vlag wissen vóór het uitloggen klaar is, en geen
  tijdsgrens.
- **`test-sql.sql` §22** tegen PostgreSQL 16, twee keer: uitgaande van precies
  de lijst van script 12 geeft script 25 precies de lijst van de app, ook na
  twee keer draaien, en verandert het niets anders; zonder Canale blank komt
  hij achteraan; zonder lijst gebeurt er niets. Het script expres stukgemaakt:
  de test stopt met een fout.
- **De hele batterij twee keer**, met de overgang vanaf wat nu live staat
  (**v108**, commit a69a6b6) en vanaf v98. Ronde 2 helemaal groen. In ronde 1
  viel één controle van `test-v104.js` om ("Alles exporteren: twee
  bestanden" gaf er één), op het moment dat er een losse test naast draaide
  (deze omgeving heeft twee processorkernen). Aan het exporteren is niets
  veranderd; los opnieuw gedraaid: groen. Daarbij: Playwright probeert zijn
  eigen hulpscripts in élk kader te zetten, ook in het afgeschermde inlogkader,
  en dat geeft daar een melding ("sandboxed"). In een echte browser draait in
  dat kader niets. De tests negeren alleen die meldingen.
- **Een onafhankelijke controle** (een aparte beoordelaar die het werk niet
  zag) op de code, de beveiliging, script 25 en de handleidingen. Die vond
  onder meer: een nieuw tabblad zat stil ingelogd; de herstelcode kwam via de
  terug-knop terug; een verloren antwoord kon iemand buitensluiten; bij een
  mislukte link kon het venster voor wie er al ingelogd was verschijnen; en
  een paar onjuistheden in de handleidingen. Cijfers: gegevens 8,5, werking
  op de systemen 7, handleidingen 7,5.
  Daarna een **tweede, verse controle** op de reparaties: die vond nog dat
  zonder bereik de vlag te vroeg gewist kon worden (dan zat je later met
  bereik toch stil in de app), dat "Niet nu" de vlag te vroeg wiste, en dat
  een hangende verbinding niets liet zien. Cijfers: reparaties 7,
  documenten 7. Alles hersteld en hierboven getest (§8, §10, §12).

## Niet getest

- **De echte vragen van Safari** (macOS, iOS): of de waarschuwing echt weg is
  en het e-mailadres meteen goed staat. Chromium toont die niet. Jouw proef
  (stap 2) beslist.
- **De echte Supabase**: de echte herstelmail, de omweg via Supabase, de
  echte foutmeldingen (die heb ik nagebootst zoals Supabase ze documenteert).
  Daarom is stap 4 belangrijk.
- **Mailbeveiliging** die de link vooraf opent (Microsoft 365), en de
  browser van de Outlook-app.
- **Het wachten van het verplicht bijwerken** zolang het venster openstaat
  (één regel; als het toch herlaadt, komt het venster terug, en dat is wel
  getest).
- Echte iPhone, iPad, Android en Windows; Samsung Internet; Firefox.

## Handleidingen

- `BEHEER.md`: §3.2 "Wachtwoord vergeten" herschreven (de knop, de
  herstelmail, het venster, de Site URL nog te doen, het risico van
  mailbeveiliging); §2 de twee zips en bestanden zelf weggooien; §4 script 25.
- `OVERZICHT.md`: route "Inloggen" (naar `leeg.html`), nieuwe routes
  "Wachtwoord vergeten" en "Nieuw wachtwoord via herstellink"; `leeg.html` bij
  de bestanden; begrip "herstellink"; bij "Zelf onderhouden" de tekst van de
  knop als voorbeeld.
- `DATAMODEL.md`: script 25 in de lijst; de opmerking over script 12
  bijgewerkt.
- `STATUS.md`, `CLAUDE.md` (twee zips, `test-v109.js`, valkuilen voor het
  inlogformulier), `TESTEN.md` (de echte bibliotheek tegen een nagebootste
  server).
