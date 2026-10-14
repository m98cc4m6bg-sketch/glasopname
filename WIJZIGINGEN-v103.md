# Glasopname v103: niets stilzwijgend kwijt

*13 oktober 2026. Jans vraag: "Komt er ook iets van een melding bij bereiken
van 1000 projecten, of andere limieten? Zodat iets nooit stilzwijgend
kwijtraakt in de database", en "check de complete app ook op andere zulk
soort problemen van data of andere dingen die opeens stilzwijgend
weg/onvindbaar worden".*

> **v102 staat nog niet live** (live is v101). v103 bevat v102 (sorteren van
> de projectenlijst) gewoon mee; je hoeft v102 niet eerst te plaatsen.

## Installeren

**Eerst SQL, dan de bestanden.**

1. **Supabase → SQL Editor:** plak `22_gebruik_en_prullenbak.sql` en kies
   *Run*. Het script mag vaker gedraaid worden.
2. Dan de bestanden:
   1. Open de map `glasopname` uit de zip en druk op **Cmd+Shift+.**
   2. Selecteer alles wat erín staat, sleep het naar je repomap en kies
      *Vervang*.
   3. Commit en push.

Draai je de SQL niet, dan werkt de app gewoon. Alleen twee dingen vallen dan
weg:
- de waarschuwing voor ruimte;
- het automatisch opruimen van de prullenbak na 30 dagen. Dat gebeurt dan
  niet: liever te laat dan te vroeg.

## Wat er misging, en wat er nu gebeurt

Ik heb de hele app doorgelopen op één vraag: *kan hier iets weg of
onvindbaar raken zonder dat iemand het ziet?* Dit kwam eruit.

### Kon werk kosten

| # | Wat er tot v102 kon gebeuren | Nu |
|---|---|---|
| 1 | **Een link opende een ander project terwijl je eigen werk nog niet op de server stond.** Denk aan een link uit een taakmail, getikt in een kelder zonder bereik. Het werk van het eerste project ging daarna nooit meer omhoog. | Eerst je eigen werk. Met bereik gaat dat binnen een seconde, en daarna opent de link vanzelf. Zonder bereik blijft je project open, met de melding **"Eerst je eigen werk"**. Zodra het werk opgeslagen is, vraagt de app of je door wilt naar de link. |
| 2 | **Een project overschreven met de inhoud van een ander.** Je opent zonder bereik project B; de app kan B niet ophalen en toont nog project A. Wie dan typte, stuurde bij bereik **A's ruiten naar B**. | De app weet van welk project de inhoud op het scherm is. Inhoud van A gaat nooit naar B. Wat je zo typte, wordt niet weggegooid: het komt als **apart project** op de server (*"Kerkstraat 1 (apart bewaard 13-10 14:05)"*), en de app zegt dat. |
| 3 | **Twee tabbladen zonder bereik:** de opslag van het ene tabblad kon bij de volgende start in het project van het andere terechtkomen. | Zelfde regel: dat werk gaat apart, met een melding. |
| 4 | **Een project dat een collega definitief verwijderde, terwijl jij er nog werk in had.** Dat werk stond alleen op je scherm. Opende je daarna een ander project, dan was het weg. | Je werk gaat als apart project naar de server en je komt op het startscherm. |
| 5 | **Verlopen inlog werd "Dit project bestaat niet meer".** Supabase geeft dan geen foutmelding, het laat gewoon niets zien. Wie daarna een ander project opende, was het werk kwijt. | De app kijkt of je nog ingelogd bent. Zo niet, dan krijg je het inlogscherm: *"Je bent niet meer ingelogd… je werk staat nog op dit apparaat"*. Na het inloggen gaat het werk alsnog omhoog. |
| 6 | **Het apparaat kon niets meer bewaren** (iPad vol, privémodus) en niemand merkte het. De oude kopie bleef staan, en na een herstart zonder bereik kon die als "werk van nu" naar de server. | Eén duidelijke melding **"Niet bewaard op dit apparaat"**. De oude kopie gaat weg. Het werk gaat gewoon naar de server zolang er bereik is. |
| 7 | **De prullenbak rekende met de klok van het apparaat.** Stond die een maand vooruit, dan werd bij het openen van het startscherm de hele prullenbak definitief geleegd, met foto's. | De database bepaalt met zijn eigen klok wat ouder is dan 30 dagen (SQL 22), en zet zelf het tijdstip van verwijderen. Een project dat intussen is teruggezet, blijft staan. |
| 8 | **Importeren met *Toevoegen* gooide regels weg** die bij een foto hoorden, of die alleen een opmerking of een rooster hadden. Ze stonden aan het eind van de lijst en telden als "leeg". | Alleen écht lege regels worden opgeruimd. |
| 9 | **Een taak toevoegen zonder bereik:** hij verscheen even en verdween dan zonder melding. Afvinken of verwijderen dat mislukte: ook geen melding. | Melding; de tekst staat weer in het invoerveld. Afvinken dat mislukt: melding, en de lijst toont weer wat er echt staat. |

### Onvindbaar of verkeerd getoond

| # | Wat er tot v102 kon gebeuren | Nu |
|---|---|---|
| 10 | **Meer dan 1000 projecten:** de rest viel stil uit de lijst. | Bovenaan de lijst staat dan *"1000 van 1205 projecten getoond. Zoek op naam of adres om de andere te vinden"*, en de teller noemt het echte aantal. Hetzelfde in het oude projectenvenster; daar was de grens 200. |
| 11 | **Ophalen mislukt leek op leeg.** Stond er "Geen openstaande taken", "Nog geen taken" of "Nog geen wijzigingen", dan kon dat ook betekenen dat er geen bereik was. | Er staat nu *"konden niet opgehaald worden"*, met een knop **Opnieuw proberen**. |
| 12 | **Mijn taken: alleen de oudste 100**, zonder dat te zeggen. | Grens 500, en daarboven een melding met het echte aantal. |
| 13 | **Logboek: alleen de laatste 30 regels**, zonder dat te zeggen. | *"De laatste 30 van 87 regels"*, met een knop **Alles tonen** (tot 200, zoveel bewaart de database). De pdf zegt het ook. |
| 14 | **"Is er al besteld?"** keek alleen in de laatste 10 mails. Na tien taakberichten viel een eerdere bestelling daarbuiten, en kwam er geen waarschuwing voor een dubbele bestelling. | De app kijkt nu alleen naar bestelmails. |

### Grenzen van het gratis plan: nu zie je ze aankomen

| # | Wat er tot v102 kon gebeuren | Nu |
|---|---|---|
| 15 | **Database vol (500 MB).** Supabase zet hem dan op alleen-lezen: elke opslag werd geweigerd, met een technische foutmelding. | Melding **"Database vol"**: je werk is niet weg, het staat op het apparaat en gaat vanzelf omhoog zodra er ruimte is. De melding zegt ook wat Jan moet doen. |
| 16 | **Geen waarschuwing vooraf.** | Een blok **⚠ Let op** op het startscherm: oranje vanaf **80%** van de database of de foto-opslag, rood vanaf **95%**, met advies. De app meet hooguit eens per tien minuten. Heb je een betaald plan, zet dan de echte grenzen in config.js: `limieten: { databaseMB: 8000, opslagMB: 100000 }`. |
| 17 | **Foto's in de wachtrij: één bestand dat niet lukte, hield alle andere tegen.** Elke ronde stopte bij dat ene bestand. | Alleen bij geen bereik stopt de ronde; een fout over één bestand houdt de rest niet meer tegen. |
| 18 | **Cloudopslag vol (1 GB) gaf de verkeerde raad**: "is 19_originelen.sql gedraaid?". | De uitleg zegt nu dat de opslag vol is en wat je dan doet. |
| 19 | **Foto's die dagen bleven wachten, vielen niet op.** | Wacht er iets langer dan een dag, dan wordt de teller rood en staat het op het startscherm. De uitleg noemt ook hoe lang het oudste al wacht. |

## Getest

Twee keer de hele batterij, alles groen. Verder:
- `test-overgang.js` vanaf **v101 (wat nu live staat)** en vanaf **v98**;
- `test-sql.sql` tegen een echte PostgreSQL 16, met nieuw §19 voor SQL 22.

**Nieuwe reeks `test-v103.js`** (Chromium). Elk onderdeel begint met de echte
situatie (TESTEN.md). Getest:
1. een link in een kelder zonder bereik;
1b. zelfde, maar met bereik;
2. een project openen zonder bereik en toch typen;
2b. zelfde, bij wisselvallig bereik: de telefoon merkt niet dat het
    bereik terug is, en een opslag komt wél door terwijl het ophalen van het
    project nog mislukt;
3. twee tabbladen;
4. apart bewaren dat nog niet lukt;
5. het geheugen van het apparaat vol;
6. verlopen inlog, met echt opnieuw inloggen;
7. een definitief verwijderd project;
8. taken bij geen bereik, en 521 open taken;
9. logboek: 45 regels, *Alles tonen* met een echte klik, ophalen dat
   mislukt, tabel die nog niet bestaat, en een bestelling achter twaalf
   taakberichten;
10. 1205 projecten;
11. de prullenbak met de klok van de iPad 60 dagen vooruit;
12. de database vol;
13. ruimte bij 85%, 97% en 20%, en zonder SQL 22;
14. de wachtrij: een geweigerd bestand, de opslag vol, twee dagen oud;
15. een gewone werkdag: geen meldingen, niets apart bewaard.

In `test-import.js` staat een nieuw onderdeel 19 (punt 8 hierboven).

**Bewezen dat de tests kunnen falen.** `node test-v103.js --mutaties` zet
elke reparatie één voor één terug en kijkt of de reeks dan rood wordt. Dat
gebeurde bij alle 15. De reparatie van de import heb ik op dezelfde manier met
de hand teruggedraaid; ook toen werd `test-import.js` rood.

**Gevonden bij het testen:**
- **De controle tegen "inhoud van A naar B" werd eerst niet bewezen.** Met
  een gewone *online*-melding laadt de app eerst project B, en dan komt die
  controle niet aan bod. Ze doet ertoe bij een zwak signaal: de telefoon
  merkt dan niet dat het bereik terug is, en opslaan gaat vóór het laden.
  Daarvoor is 2b toegevoegd. Daar wordt de reeks rood zonder de controle.
  De eerste versie van 2b ving het maar soms: dan hing het ervan af welke
  klok het eerst afging. Nu is de volgorde vastgelegd.
- **Een link met bereik:** in de eerste versie vroeg de app ook dan "Verder
  naar de link?", terwijl het werk binnen een seconde opgeslagen was. Nu
  opent de link dan vanzelf. De vraag komt alleen als het lang duurde of als
  je intussen verder werkte.

**De oude reeksen zijn aangepast:**
- `test-v91.js` kent nu de databasefunctie voor de prullenbak.
- `test-v93.js` en `test-v98.js` zijn ongewijzigd. Die gingen eerst mis
  omdat ze met eigen werk nog onderweg een ander project openden. Nu slaat de
  app dat werk eerst op en opent daarna het project vanzelf.

**Niet getest:**
- **Echte Supabase.**
  - Vooral de precieze tekst van de foutmelding bij "database vol" en
    "opslag vol". Ik herken meerdere varianten (`25006`, `read-only
    transaction`, `quota`, `507`).
  - Of `glas_gebruik()` exact hetzelfde getal geeft als het dashboard van
    Supabase. Het is de grootte van de database zoals Postgres die meet;
    Supabase rekent er vrijwel hetzelfde mee.
- **Echte Safari, Android en Windows.** De logica is gelijk. Alleen de
  meldingen en het waarschuwingsblok zijn niet op die schermen bekeken.

## Wat nog openstaat uit de controle (niet in v103)

Gevonden, maar groter of met een keuze die bij jou ligt:

1. **Twee apparaten die tegelijk hetzelfde project bewerken overschrijven
   elkaar nog steeds.** Wie het laatst opslaat, wint. Via het logboek is het
   terug te halen, maar niet met een knop.
   - Voorstel: bij opslaan meesturen welke stand je had, en bij verschil laten
     kiezen.
   - Dit is het grootste dat nog openstaat.
2. **Het logboek bewaart per project 200 regels en 20 volledige standen.**
   - Bij twee mensen die een hele dag aan één project werken, kan de oudste
     stand van die ochtend al weg zijn.
   - Ruimer bewaren kost databaseruimte.
3. **De bolletjes van de bestellijst** worden gewist als iemand opnieuw een
   bestellijst-pdf maakt. Ruiten die ná het bestellen verwijderd zijn, worden
   nergens apart getoond.
4. **Zoeken** vindt niet op klantnaam, en niet met een komma of zonder accent
   ("Eenhoorn" vindt "Éénhoorn" niet).
5. **Taken van een collega die uit Supabase verwijderd is**, staan op niemands
   naam en dus in niemands lijst.
6. **De pdf kort lange teksten stil in**:
   - merk, opmerking en roedenopmerking (die laatste staat er niet in);
   - tekens buiten het West-Europese alfabet vallen weg.
7. Kleiner:
   - leverweek zonder jaar;
   - importregels zonder cijfers;
   - en een paar meldingen.

**Nog steeds onbeantwoord: de vijf punten voor Android en Windows** uit mijn
vorige bericht:
1. de csv zonder BOM, zodat Excel op Windows é, × en — verkeerd toont;
2. een csv uit Windows Excel (Windows-1252) inlezen;
3. de Apple Maps-link;
4. HEIC-foto's op Windows en Android;
5. Ctrl+Y voor opnieuw.

Zeg het als ik die in v104 mag doen.

## Voor wie verder bouwt

- `basisVan` in cloud.js: van welk project de inhoud op het scherm is. Alleen
  als dat het open project is, mag er opgeslagen worden.
  - De kopie op het apparaat draagt het mee als `_projectId`.
  - `kopieVan(id)` leest het.
- Werk dat nergens bij hoort: `reddenEnLaden()` → `reddingBewaar()` (lijst in
  `glasopname_redding`) → `reddingenUploaden()`. Dat probeert het bij de
  start, bij *online* en direct.
- Een lijst ophalen: een fout geeft `null` of een afgewezen belofte, nooit
  `[]`. `lijstOf(res)` regelt dat en zet `.totaal` uit `count: 'exact'`.
  Ontbreekt de tabel (script niet gedraaid), dan wél `[]`.
