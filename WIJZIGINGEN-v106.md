# Glasopname v106: één tegelijk bewerken, de rest kijkt mee

*14 oktober 2026. Jans vraag: "tegelijk bewerken is eigenlijk niet nodig,
hooguit tegelijk bekijken. Kunnen we het niet beter afvangen met een soort
slotje?"* Zijn antwoorden op de drie ontwerpvragen:
1. Eén keer ‹Toch bewerken› = overgenomen. Wil Bart later weer, dan ziet hij
   "Julian heeft het project overgenomen" en weer ‹Toch bewerken›.
2. Iedereen mag overnemen.
3. Aftellen: 10 seconden.

v106 bevat alles van v104 en v105. Staan die nog niet online, lees dan ook
`WIJZIGINGEN-v104.md` en `WIJZIGINGEN-v105.md`, en draai eerst script 23.

## Installeren

**Eerst SQL, dan de bestanden.**

1. **Supabase → SQL Editor**:
   1. Heb je `23_bestellingen.sql` (v104/v105) nog niet gedraaid? Doe dat dan
      eerst: plakken, *Run*.
   2. Plak `24_bewerkslot.sql` en kies *Run*. Er moet *Success* staan.
2. Dan de bestanden: zie `LEES-MIJ-EERST-v106.md`.

Draai je script 24 niet, dan werkt de app zoals v105 (iedereen kan tegelijk
bewerken, wie het laatst opslaat, wint). Het startscherm zegt dan "Voor Jan:
SQL-script 24 is nog niet gedraaid".

## Wat er verandert

### Wat je ziet (🟠)

- **Wie een project als eerste opent, bewerkt het.** Opent een collega het
  ook, dan ziet die bovenaan Invoer een balk:

  > 👁 **julian (Mac) heeft dit project open** (nu actief). Je kunt alleen
  > kijken. ‹Toch bewerken›

  Alle velden staan dan op slot, ook de projectnaam, de status, de notities,
  ontgrendelen en "Ja, verstuurd". De pdf's maken mag wel. Wat de bewerker
  verandert, zie je live.
- **‹Toch bewerken›**:
  1. Bij Julian komt een venster: "bart wil dit project bewerken. Je werk
     wordt opgeslagen en het project gaat over 10 seconden op slot." Een
     balk loopt in 10 seconden leeg. Met ‹Nu vrijgeven› gaat het meteen.
  2. Julians app slaat op (en wacht tot de server het heeft), geeft het
     project vrij en gaat op slot: "bart bewerkt dit project nu. Je kunt
     meekijken."
  3. Pas daarna laadt Barts app de laatste stand en kan Bart bewerken. In het
     logboek komt "project overgenomen van julian".
- **Reageert Julian niet** (geen bereik, app dicht, iPad leeg), dan ziet
  Bart na het aftellen:

  > julian reageert niet (laatst actief 14:32), mogelijk zonder bereik of met
  > de app dicht. Neem je het over, dan kan julian niets meer in dit project
  > opslaan. Wat julian intussen deed, gaat niet verloren: dat wordt op dat
  > apparaat apart bewaard.
  > ‹Annuleren› ‹Overnemen›

  Was Julian al meer dan 15 minuten niet actief, dan komt deze vraag
  meteen, zonder eerst 10 seconden te wachten. (Niet korter: een iPad
  waarvan alleen het scherm even uit staat, geeft ook geen teken van leven.)
- **Is Julian net bezig met een bestellijst of staat er een vraag open**
  (het opslagvenster, de pdf, "Naar de leverancier?"), dan gaat het project
  niet midden daarin op slot. Het seintje staat er bovenaan bij, zonder knop
  ("Rond eerst af waar je mee bezig bent"); een tik erop beantwoordt de vraag
  eronder niet. Pas als hij klaar is, begint het aftellen.
  Bart ziet "julian heeft het seintje gekregen en rondt eerst iets af". Na
  anderhalve minuut mag Bart het toch overnemen (misschien liep Julian weg
  met de vraag nog open).
- **Op elk tabblad** staat bovenin "👁 Alleen kijken — julian" met
  ‹Toch bewerken›, niet alleen op Invoer.
- **Een bestellijst maken terwijl je meekijkt:** de app zegt vóóraf dat hij
  die niet als bestelling kan vastleggen (‹Stoppen› ‹Toch bewerken›
  ‹Alleen bekijken›), niet pas als hij al verstuurd is.
- **‹Annuleren›** trekt de vraag in. Kreeg Julian het seintje al, dan
  verdwijnt het weer ("bart heeft het toch niet overgenomen").
- **Een project sluiten** (terug naar het startscherm, een ander project,
  uitloggen) geeft het vrij. Wie op dat moment meekijkt, kan dan meteen
  verder, zonder klik. De app dichtdoen geeft het níet vrij (dat kan de app
  niet betrouwbaar melden); dan geldt "reageert niet".

### Het eigenlijke slot zit in de database (🔴, script 24)

Het venster en de balk zijn het gemak. Het slot zelf zit in de database,
zodat het ook werkt als een apparaat geen bereik heeft:

- Een nieuwe tabel `bewerkslot`: per project welk apparaat het bewerkt, met
  naam, soort apparaat ("iPad", "Mac", "Windows-pc", "Android", …) en
  "laatst actief". Plus wie het wil overnemen.
- Elke opslag stuurt een vaste code van het apparaat mee. **De database
  weigert een opslag van een apparaat dat het project niet op zijn naam
  heeft.**
- **En een opslag die voortbouwt op een oudere stand**, ook als het project
  vrij is (gevonden bij de beoordeling). Elke opslag krijgt een volgnummer
  (`data._rev`); de app stuurt mee op welk volgnummer zijn werk voortbouwt
  (`data._basis`). Heeft intussen een ánder apparaat opgeslagen, dan weigert
  de database het. Voorbeeld: de iPad werkte offline, Julian nam het over,
  werkte en ging terug naar het startscherm (dan is het project vrij).
  Zonder deze controle zette de iPad bij terugkomst zijn oude stand over
  Julians werk; nu gaat het werk van de iPad apart.
  (Een apparaat dat bewerkte en bij terugkomst het project vrij aantreft,
  neemt het gewoon terug; de database beslist dan op het volgnummer. Wie
  overnam, heeft altijd iets opgeslagen (minstens "overgenomen" in het
  logboek), dus het werk van daarna gaat apart, zoals het venster
  "reageert niet" ook zegt.)
- Dat is de oplossing voor de collega die offline gaat: zijn iPad kan bij
  terugkomst niets meer overschrijven. Zijn app krijgt de weigering, bewaart
  zijn werk als **apart project** ("… apart bewaard", zoals sinds v103) en
  laat de stand van de server zien. Er gaat niets verloren, en er wordt niets
  overschreven.
- Apps van vóór v106 sturen geen apparaatcode mee. Die laat het slot door;
  het versieslot (script 21) houdt ze tegen zodra er met v106 is
  opgeslagen, en ze werken zelf binnen een paar minuten bij.

- **Een bestelling raakt niet zoek.** Kiest Bart op de bouw zonder bereik
  "Ja, verstuurd", en neemt Kees intussen het project over, dan wordt Barts
  werk bij terugkomst geweigerd (en apart bewaard). Zijn bestelling gaat
  dan tóch in het project, via een smalle weg in de database
  (`glas_bestellingen_erbij`) die alleen de bestel-gegevens mag zetten: de
  lijst met bestellingen, wat er besteld is, en de status. Bart ziet "Je
  bestelling … is alsnog in het project gezet"; Kees ziet hem meteen, en de
  maten gaan voor hem op slot zoals na elke bestelling. Zo bestelt niemand
  alles nog een keer. Lukt dat niet, dan zegt de app met nadruk dat de
  bestelling alleen in het aparte project staat.
- **Script 24 heeft script 23 nodig** (`glas_status_rang`). Draai dus eerst
  23 als dat nog niet gebeurd is.

**Terugdraaien** (er gaan geen gegevens verloren):

```sql
drop trigger if exists projecten_bewerkslot on public.projecten;
drop function if exists public.glas_bewerken(uuid, text, text, text, text);
drop function if exists public.glas_bestellingen_erbij(uuid, jsonb, jsonb, text, jsonb);
```

Dan werkt het weer zoals in v105 (iedereen kan bewerken, wie het laatst
opslaat, wint), en het startscherm zegt "SQL-script 24 is nog niet
gedraaid". De tabel `bewerkslot` en de volgnummers in de projecten mogen
blijven staan. Alleen de trigger weghalen is níet genoeg: dan zet de app
meekijkers nog op slot, maar houdt de database niets meer tegen.

**Wat er mis kan gaan:**
- **Iemand heeft een project "op slot" en is er niet.** Dat is geen
  probleem: ‹Toch bewerken› → ‹Overnemen›. Er blijft nooit iets vastzitten.
- **De klok:** "laatst actief" en "reageert niet" rekenen met de klok van de
  server, niet van het apparaat.
- **Live bijwerken valt weg** (Supabase realtime): dan merkt de app het
  seintje bij de volgende hartslag (elke 20 seconden). Bart ziet dan
  misschien even "reageert niet". Komt het seintje alsnog aan, dan gaat
  zijn venster vanzelf terug naar wachten, en krijgt hij het project zonder
  te klikken.

### Twee dingen die al fout gingen vóór v106 (🟢)

- Werd er werk apart bewaard (sinds v103), dan haalde de app het
  startscherm óver het project heen dat nog open stond. Met v106 gebeurt
  apart bewaren ook midden in het werk, en dan stond je ineens op het
  startscherm. Nu ververst de app alleen de lijst als het startscherm al in
  beeld is (cloud.js, `reddingenUploaden`).
- Na elke wijziging stuurde de app alles nog een keer naar de server: de
  stempels (wie wijzigde wat, sinds v105) die bij het versturen in de ruiten
  komen, zag de volgende ronde als een nieuwe wijziging. Onschuldig, maar
  overbodig (cloud.js, na een gelukte opslag).

## Bestanden

| bestand | wat |
|---|---|
| `24_bewerkslot.sql` | **nieuw** (🔴): tabel `bewerkslot`, functies `glas_bewerken` en `glas_bestellingen_erbij`, de bewaking (trigger, met het volgnummer) |
| `bewerkslot.js` | **nieuw**: wie bewerkt, de balk-tekst, het seintje met aftellen, overnemen |
| `cloud.js` | apparaatcode en volgnummer (`basisRev`) bij elke opslag; geweigerd → apart bewaren; kijken verstuurt nooit; vrijgeven bij sluiten; de twee oude fouten hierboven |
| `index.html` | `<script>` erbij; de balk "… heeft dit project open" en het label bovenin; kijken = op slot (`invoerOpSlot`, `kijkWeigert`); ontgrendelen en bestellingen geweigerd bij kijken |
| `project.js` | projectgegevens, notities en "opgenomen door" geweigerd bij kijken |
| `pdf.js` | bij kijken vooraf de vraag bij een bestellijst; "Ja, verstuurd" niet bij kijken (de pdf maken wel) |
| `start.js` | waarschuwing als script 24 ontbreekt |
| `sw.js` | `bewerkslot.js` in de lijst voor offline; versie v106 |
| `test-v106.js` | **nieuw**: de tests hieronder |
| `test-sql.sql` | §21: het script tegen een echte PostgreSQL |

## Hoe je het zelf controleert (5 minuten, twee apparaten)

1. Open een project op de Mac. Open hetzelfde project op de iPad. Op de iPad
   staat de balk "julian (Mac) heeft dit project open"; de velden zijn grijs.
2. Wijzig op de Mac een maat. Die verschijnt binnen een paar seconden op de
   iPad.
3. Tik op de iPad op ‹Toch bewerken›. Op de Mac komt het venster met de
   aflopende balk. Na 10 seconden gaat de Mac op slot en kan de iPad
   bewerken.
4. **Offline:** zet de iPad in vliegtuigmodus, wijzig iets. Kies op de Mac
   ‹Toch bewerken›, wacht op "reageert niet" en kies ‹Overnemen›. Wijzig iets
   op de Mac en ga **terug naar het startscherm** (dan is het project vrij).
   Zet de iPad weer online: daar staat "Je werk staat apart", en in de
   projectenlijst een project "… apart bewaard" met de wijziging van de iPad.
   Het project zelf heeft de stand van de Mac.
5. In Supabase → Table Editor → `bewerkslot` zie je per project wie het
   bewerkt.

## Getest

- **`test-v106.js`** (Chromium): 26 situaties, elk met de echte situatie
  bovenaan. Getest zijn twee en drie apparaten tegelijk (Mac, iPad,
  Windows-pc, Android-telefoon), elk met een eigen gebruiker en eigen
  bereik, met echte kliks en echt typen. Onder meer:
  - meekijken, en ‹Toch bewerken› met de echte 10 s aftellen;
  - de volgorde op de server: eerst opslaan, dan vrijgeven, dan pas de
    ander;
  - typen tijdens het aftellen, en vlak voor ‹Nu vrijgeven›;
  - de bewerker zonder bereik (de server echt weg én de browser offline);
    de app dicht; al lang niet actief;
  - het project **vrij** en een iPad met een oude stand, met en zonder
    herstart;
  - het gewone geval: offline, app dicht en weer open, niemand anders deed
    iets (gewoon opgeslagen);
  - geen live verbinding (het seintje bij de hartslag), Annuleren, een oude
    vraag van gisteren, drie apparaten;
  - opslaan of vrijgeven mislukt; zelf geen verbinding;
  - iOS legt de app stil (tellers stilgezet, twee uur later verder);
  - een open vraag en een opslagvenster bij de bewerker;
  - "Ja, verstuurd" offline en intussen overgenomen;
  - twee tabbladen; de apparaatcode kwijt;
  - een iPad die nog op v105 staat en daarna bijwerkt (de echte v105);
  - script 24 nog niet gedraaid;
  - de telefoonbreedte (Pixel 7);
  - geen fouten in de console.
- **Mutatieproef:** `test-v106.js --mutaties` zet 38 reparaties één voor
  één terug, en elke keer werd de reeks rood, op een regel die erover
  gaat. Eén geplande mutatie is weggehaald (de rem op twee keer apart
  bewaren), omdat de vergelijking van de inhoud dat nu al voorkomt.
- **`test-sql.sql` §21a–s** tegen een echte PostgreSQL 16: het slot, de
  weigering, het volgnummer (vrij project, tabbladen, de overgang vanaf
  v105) en de bestelling die alsnog in het project gaat. Daarbij vier keer
  het script zelf stukgemaakt (volgnummer, tabblad, de weg voor de
  bestelling, het volgnummer bij die weg); de uitkomst veranderde elke
  keer. De rest gelijk aan v105.
- **De hele batterij** twee keer, met de overgang vanaf **v103 (live)** en
  vanaf v98.
- **Zelf bekeken** op schermafdrukken: het seintje met de aflopende balk,
  de smalle balk boven "Naar de leverancier?" (daar zat eerst een fout:
  het seintje stond er midden overheen), en de balk en het seintje op de
  telefoon.
- **Drie beoordelaars**, vier rondes:

  | ronde | gegevens | iPad/Android/Windows | testen en werkwijze |
  |---|---|---|---|
  | 1 | 6 | 7,5 | 7 |
  | 2 | 9 | 8 | 7,5 |
  | 3 | 8,5 | 8,5 | 8,5 |
  | 4 | 9,5 (na de laatste reparatie) | 9 | 9 |

  Ronde 1 vond het belangrijkste gat: het vrije project (zie boven). Ronde 2
  vond de tik op het seintje die "Nee" kon worden, en ronde 3 de bestelling
  die alleen apart belandde. Ronde 4 vond nog dat de bewerker daarna
  onterecht geweigerd kon worden; ook dat is gerepareerd en getest. In de laatste
  batterij bleek één controle van een wedloop af te hangen (welke weg de
  iPad bij terugkomst nam); dat is nu vast geregeld (zie boven).

## Niet getest

- **De echte Supabase**, en vooral het live bijwerken (realtime) van de nieuwe
  tabel. In de tests is dat nagebootst. Script 24 zet de tabel in de
  publicatie `supabase_realtime`. Werkt dat bij jou niet, dan werkt alles
  nog, alleen trager (hartslag elke 20 s).
- **Echte apparaten**: Safari op iPad/iPhone (de app op het beginscherm die
  op de achtergrond stil wordt gelegd), Android, Windows. Getest in Chromium
  met de schermmaat en herkenning van iPad, Pixel 7 (Android) en een
  Windows-pc.
- **De smalle balk op een heel smalle telefoon** (375 px, iPhone SE) met
  een lange naam: de app meet de hoogte van de balk en schuift de vraag zo
  ver op; bekeken op 412 px (Pixel 7) en op de pc, niet op 375 px.
- **VoiceOver en Verteller** (schermlezers).
- **Een iPad die de app op de achtergrond heeft** terwijl een ander overneemt:
  iOS legt de app stil, dus het seintje komt pas als hij terugkomt. Hij
  "reageert niet", het overnemen gaat via ‹Overnemen›, en zijn werk dat nog
  niet op de server stond gaat apart. Nagebootst, niet op een echte iPad.

## Bekend, voor later

- **Twee tabbladen op hetzelfde apparaat** tellen voor het slot als één
  apparaat: ze kunnen allebei bewerken. Ze overschrijven elkaar niet (het
  volgnummer telt per tabblad): wat het ene tabblad niet had gezien, gaat
  apart. Bij het openen zet de app soms zelf lege regels klaar en slaat die
  op; met twee tabbladen open kan daardoor werk van het andere tabblad apart
  gaan. Niets kwijt, wel een apart project om op te ruimen.
- **Delen op iPhone/iPad** (het deelvenster van iOS): dan ligt de app stil
  en kan hij niet laten weten dat hij nog bezig is. Wie wil overnemen, ziet
  na ruim 20 seconden "kreeg het seintje, maar gaf het project nog niet
  vrij" en kan overnemen. Doet hij dat, dan zegt de app bij "Ja, verstuurd"
  dat de bestelling niet vastgelegd kon worden en wat je dan doet.
- **Het slot en de prullenbak:** een project in de prullenbak houdt zijn
  slot. Na terugzetten staat het nog op naam van wie het laatst bewerkte;
  ‹Toch bewerken› lost dat op. Niet apart getest.
- **De overgang:** een apparaat dat nog op v105 staat, wordt door het
  versieslot (script 21) tegengehouden zodra het project één keer met v106
  is opgeslagen. Een project dat met v106 alleen geopend is, maar nog niet
  opgeslagen, kan in die paar minuten nog door v105 gewijzigd worden (zoals
  vandaag). Na het bijwerken gaat het openstaande werk van zo'n apparaat
  apart als een ander het project intussen had (getest, §22).
- **De app dichtdoen geeft het project niet vrij.** Na een dag op de
  bouwplaats is het voor kantoor dus ‹Toch bewerken› → "reageert niet" →
  ‹Overnemen› (twee tikken). Bewust: overnemen moet een keuze zijn.
- **Taken** (aparte tabel) kan wie meekijkt wel toevoegen en afvinken. Die
  horen niet bij de opname zelf en hebben dit probleem niet.
- **Project info** laat de velden bij kijken niet grijs zien; wijzigen wordt
  geweigerd met een melding.
- **Een apparaat dat de code kwijt is** (websitegegevens gewist, Safari
  na 7 dagen zonder bezoek, of Safari naast de app op het beginscherm: die
  hebben elk hun eigen opslag): dat is voor de database een ander apparaat.
  De balk zegt dan "Je hebt dit project open op een ander apparaat of in een
  andere app (iPad)", en met ‹Toch bewerken› → ‹Overnemen› neem je het van
  jezelf over (getest, §20).

## Nieuwe begrippen

- **Bewerkslot:** per project het ene apparaat dat het mag bewerken. Wie
  het niet heeft, kijkt mee.
- **Apparaatcode:** een vaste, willekeurige code per apparaat (in de opslag
  van de browser), die bij elke opslag meegaat. Daaraan herkent de database
  wie het project heeft.
- **Hartslag:** elke 20 seconden laat de app aan de server weten "ik heb dit
  project nog open". Daaruit komt "laatst actief".
- **Volgnummer (revisie):** elke opslag van een project krijgt een nummer
  dat één hoger is dan het vorige. Daaraan ziet de database of een apparaat
  voortbouwt op de stand van nu, of op een oudere.
- **Apart bewaard:** werk dat niet in het project kon, komt als eigen
  project "… (apart bewaard dd-mm uu:mm)" in de lijst (sinds v103). Sinds
  v106 alleen als er echt iets anders in staat dan in het project.
- **Overnemen (forceren):** het project naar je toe halen zonder dat de
  ander het vrijgaf. Wat de ander daarna nog wil opslaan, weigert de
  database; zijn app bewaart het apart.
