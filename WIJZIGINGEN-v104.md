# Glasopname v104: bestellingen die kloppen, en Android en Windows

*14 oktober 2026. Gevraagd door Jan:*
- *"Bouw v104 met deze drie punten gecombineerd, en zorg dat bij de keuze Ja verstuurd het project direct op besteld gaat."*
- *De vijf punten voor Android en Windows ook.*
- *Goed testen, agents laten meekijken en cijferen, opleveren bij een 8 of hoger.*

## Eerst: twee keuzes voor jou

1. **🔴 SQL-script 23 (database).** `23_bestellingen.sql` voegt een regel aan
   de database toe die een bestelling beschermt. Zie hieronder bij
   "Installeren". Draai je hem niet, dan werkt alles, maar mist de tweede
   verdediging; het startscherm zegt het dan.
2. **Open vraag aan jou: is een tweede bestellijst een vervanging of een
   aanvulling?** Zo staat het nu op de pdf:
   - bovenaan: "2e BESTELLIJST, VERVOLG op de 1e bestellijst van 14-10-2026
     10:15";
   - in de kolom Wijz.:
     - **NIEUW**: stond niet op die lijst;
     - **GEWIJZIGD (was …)**: anders dan op die lijst;
     - **leeg**: ongewijzigd ten opzichte van die lijst.

   Er staat niet bij of de leverancier de ongewijzigde regels opnieuw moet
   maken. Bij "Aantal 2, GEWIJZIGD (was 1x)" kan hij dus 1 of 2 maken.
   Spreek met de leverancier af hoe hij een vervolglijst leest. Dan zet ik
   dat in één zin in de balk, bijvoorbeeld "Maak alleen de regels met NIEUW
   of GEWIJZIGD; de rest is al besteld".

## Installeren

**Eerst SQL, dan de bestanden.**

1. **Supabase → SQL Editor:** plak `23_bestellingen.sql` en kies *Run*. Het
   script mag vaker gedraaid worden. Staat `22_gebruik_en_prullenbak.sql`
   (van v103) er nog niet in, draai die dan eerst.
2. De bestanden zoals altijd:
   1. Open de map uit de zip en druk op **Cmd+Shift+.**
   2. Selecteer alles wat erín staat, sleep het naar je repomap en kies
      *Vervang*.
   3. Commit en push.

**Wat script 23 doet, in gewone taal.** Stel: een iPad werkt zonder bereik
aan de Kerkstraat. Intussen bestel je op kantoor. Daarna krijgt de iPad weer
bereik en stuurt hij het hele project op, maar hij weet nog niet van de
bestelling. Zonder script 23 was de bestelling dan weg, net als de status
'besteld' en het slot. Met script 23 houdt de database de bestelling vast:
- de bestelling, de status en het slot blijven zoals ze in de database
  stonden;
- wat de iPad aan de ruiten veranderde, komt er gewoon bij, en die ruiten
  worden in de app geel (anders dan besteld).

De app doet hetzelfde zelf ook. Het script is de tweede verdediging.
**Terugdraaien:** in de SQL Editor
`drop trigger projecten_bestellingen_samenvoegen on public.projecten;`.
Er gaat dan geen data verloren.

## 1. Bestellingen (🟠, en 🔴 voor script 23)

### Wat er tot v103 misging
- **Elke bestellijst-pdf gold als bestelling**, ook een pdf die alleen
  bekeken werd. De gele markeringen bij ruiten die na de echte bestelling
  veranderd waren, verdwenen dan, terwijl de leverancier nog de eerste lijst
  had.
- **Een ruit die na het bestellen verwijderd werd, stond nergens.**
- **Zonder bestelmail ging het project niet vanzelf op slot.**

### Wat er nu gebeurt
- **Na de bestellijst-pdf vraagt de app:** *"Is deze bestellijst de
  bestelling (opdracht) aan de leverancier, en stuur je hem nu of heb je hem
  al gestuurd?"*
  - **Ja, verstuurd:**
    - de app legt vast wat er **op die pdf** staat;
    - het project gaat **direct op 'besteld' en op slot**, ook als het
      ontgrendeld was;
    - het logboek zegt het ("2e bestellijst verstuurd naar de leverancier").
  - **Nee, alleen bekeken** (of een prijsaanvraag): er verandert niets.
  - De vraag komt alleen als de pdf echt is opgeslagen of gedeeld.
    Wegklikken of het deelvenster sluiten telt niet.
  - Staat er precies wat al besteld is, dan komt er geen vraag.
- **Bestellingen worden nooit overschreven.** Elke "Ja" komt erbij: 1e, 2e,
  3e bestellijst. Op het tabblad Bestellijst staat het rijtje met datum,
  wie en hoeveel posities.
- **Wat er anders is dan de laatst verstuurde lijst**, zie je:
  - **op Invoer:**
    - een geel bolletje bij de ruit; met de muis erop zie je wat er anders
      is ("breedte 1200 → 1210");
    - een balk "Anders dan besteld: 1 gewijzigd, 1 vervallen" met een knop
      naar Bestellijst;
  - **op Bestellijst:**
    - **Gewijzigd** (oud → nieuw, ook de glasmaat als de speling anders is);
    - **Nieuw**;
    - **Niet meer compleet**: een bestelde ruit die je onvolledig maakte;
    - **Vervallen**: verwijderd, met de maat die besteld was;
  - **op de volgende bestellijst-pdf:**
    - een gele balk bovenaan ("2e BESTELLIJST, VERVOLG op de 1e …");
    - een kolom **Wijz.** met NIEUW of GEWIJZIGD (was 1x, was 1192x592);
    - onder de tabel **VERVALLEN** en **NIET OP DEZE LIJST**;
    - in de totalen "waarvan NIEUW of GEWIJZIGD";
    - de bestandsnaam krijgt `_2e`, ook in het opslagvenster op de pc.
- **Een verkeerde "Ja" intrekken.** Op Bestellijst staat bij de laatste
  bestelling **Intrekken…**:
  - daarvoor is je eigen wachtwoord nodig;
  - de bestelling blijft in het rijtje staan, doorgestreept, met wie en
    wanneer;
  - is er geen geldige bestelling meer, dan gaat het project terug naar
    'bezig' en weer open.
- **Ctrl+Z / Cmd+Z** haalt een bestelling nooit weg, en doet niets zolang de
  vraag openstaat.
- **Een tweede apparaat kan een bestelling niet wissen.** Dat geldt voor een
  iPad die offline was, een tabblad dat op de achtergrond stond en een
  apparaat met een verkeerde klok. De app voegt samen, en script 23 in de
  database ook. Zonder script 23 waarschuwt het startscherm: "Voor Jan:
  SQL-script 23 is nog niet gedraaid".
- **Projecten met een bestellijst van vóór v104** tellen als 1e bestelling.
  Wat daar precies in stond, bewaarde de app toen niet; dan staat er eerlijk
  "(wat precies is van vóór v104 niet bewaard)".
- **Oudere apparaten** (nog op v103 tot ze bijgewerkt zijn) lezen de laatste
  bestelling gewoon in de oude vorm.

## 2. Android en Windows (🟢/🟠)

| | Wat er misging | Nu |
|---|---|---|
| 1 | **Een csv uit de app** opende in Excel op Windows met rommel in é, × en —. Getallen als 12.5 werden tekst of een datum, en van opbouw 4-12-4 maakte Excel een datum. | **Nieuw: "Excel-bestand (.xlsx)"** in het exportmenu. Merk, opbouw en opmerking blijven daarin tekst, maten en gewicht zijn getallen, met filter en kolombreedte. Werkt ook zonder bereik. De csv blijft voor andere programma's, nu met BOM, Windows-regeleinden, decimale komma, bescherming tegen formules (= + - @) en een veilige bestandsnaam. |
| 2 | **Een csv uit Excel op Windows** (Windows-1252) kwam met rommel binnen. | De app herkent zelf UTF-8, UTF-16 ("Unicode-tekst"), Windows en **Excel voor Mac** (MacRoman), en zegt bij het inlezen hoe hij het las. |
| 3 | **"Adres in kaarten"** opende altijd Apple Kaarten, ook op Android en Windows. | Op iPhone, iPad en Mac: Apple Kaarten. Elders: Google Maps (op Android de app). |
| 4 | **Een HEIC-foto van een iPhone** gaf in Chrome alleen "Mislukt". | Een duidelijke uitleg, met tips voor de iPhone en Samsung. De foto wordt ook herkend zonder naam of type. Er komt geen kapotte foto in het project. |
| 5 | **Ctrl+Y** deed niets. | Ctrl+Y en Ctrl+Shift+Z zijn "opnieuw". In een tekstveld blijft het van het veld, en AltGr doet niets. |

**Verder:**
- **Een Windows-laptop met aanraakscherm** werd als tablet behandeld: geen
  opslagvenster, maar het deelvenster. Nu krijgt hij weer het opslagvenster.
- **csv en xlsx** gaan op iPad, iPhone en Android via het deelvenster.

## Bij het bouwen en beoordelen gevonden en opgelost

- **Ctrl+Z vanaf een aangevinkt vakje wiste het opnieuw-doen.** Dit zat al
  vóór v104 in de app.
- **Een andere speling veranderde de glasmaat zonder dat de app het als
  wijziging zag.**
- **Een bestelde ruit die onvolledig werd, viel stil van de volgende lijst.**
- **Vastgelegd werd de stand op het moment van "Ja", niet die van de pdf.**
  Wat een collega intussen veranderde, gold dan als besteld.

## Beoordeling

Drie onafhankelijke beoordelaars keken mee: één op gegevensveiligheid en
synchronisatie, één op Android/Windows/Excel, en één op het bestelproces en
de tests. Elk ronde gaf een cijfer en een lijst met bevindingen.

| ronde | gegevens | Android/Windows | bestelproces en tests |
|---|---|---|---|
| 1 | 6 | 7 | 6 |
| 2 | 8 | 8 | 7,5 |
| 3 | 8,5 | 8,5 | 8 |

Na ronde 3 heb ik hun laatste kleine punten nog opgelost: de volgorde bij
een verkeerde klok, typografische tekens in een Mac-csv, altijd een nummer
in de bestandsnaam zodra er besteld is, en "overige gegevens gewijzigd" na
een intrekking.

## Getest

- **`test-v104.js`** (Chromium): 26 onderdelen, elk met de echte situatie
  bovenaan. Twee keer achter elkaar groen. Echte kliks op ⬇ Exporteren,
  Bestellijst als PDF, Ja/Nee, Ontgrendelen, Intrekken, Bekijk op
  Bestellijst. Ook getest:
  - twee apparaten waarvan één offline, met en zonder script 23;
  - een wijziging tussen de pdf en "Ja";
  - de deelroute op de iPad (gelukt en weggetikt);
  - het opslagvenster op de pc;
  - Alles exporteren;
  - een achterlopende klok;
  - de xlsx teruggelezen;
  - Windows-, Mac- en UTF-16-bestanden;
  - HEIC zonder naam;
  - Ctrl+Y en AltGr.
- **Mutatieproef:** `node test-v104.js --mutaties` zet 34 reparaties één voor
  één terug. Elke keer werd de reeks rood.
- **`test-sql.sql`** tegen een echte PostgreSQL 16: §20a–h voor script 23
  (offline apparaat, twee bestellingen tegelijk, intrekking, slot,
  volgorde, gewone opslag).
- **De hele batterij** twee keer, en de overgang vanaf **v103 (live)** en
  vanaf v98.

## Niet getest

- **De echte Supabase.** Vooral of het terugvragen van
  `data->info->bestellingen` na het opslaan daar precies zo werkt; de
  syntax is die van PostgREST.
- **Echte apparaten:**
  - Safari op iPad/iPhone (deelvenster, terugkomen in de app);
  - Android met Samsung Internet;
  - een Windows-laptop met aanraakscherm.
- **Excel op Windows en Mac zelf.** Getest is wat Excel nodig heeft; dat
  het bestand opent, niet.
- **De Maps-app op Android** (alleen de link is getest).
- **Een echte leverancier** die een vervolglijst leest (zie de open vraag
  bovenaan).

## Bekend, voor later

- De inhoud van een eerdere bestelling bekijken (de gegevens zijn er, het
  scherm nog niet).
- Positienummers die vast blijven tussen lijsten (nu tellen ze per lijst
  opnieuw).
- Een "pdf met alleen de wijzigingen".
- Twee apparaten die **tegelijk dezelfde ruiten** wijzigen, overschrijven
  elkaar nog steeds. Dat geldt alleen voor de ruiten, niet meer voor de
  bestellingen.

## Nieuwe begrippen

- **Trigger:** een regel in de database die bij elke opslag meekijkt. Hier
  zorgt hij dat een bestelling er niet uit kan verdwijnen.
- **BOM:** een onzichtbaar teken vooraan een tekstbestand. Daaraan ziet
  Excel dat het bestand in UTF-8 is.
- **Tekenset (UTF-8, Windows-1252, MacRoman):** hoe letters als é in bytes
  staan. Elk systeem doet het anders.
- **HEIC:** het zuinige fotoformaat van iPhones (en sommige Samsungs).
  Chrome en Edge kunnen het niet lezen.
