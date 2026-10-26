# Glasopname — beheerhandleiding

*Voor wie de app draaiende houdt: Jan, of wie het van hem overneemt.
Gewone taal, geen programmeerkennis nodig. Bijgewerkt op 22 oktober 2026,
bij v122 (automatische back-up, script 27).*

Dit document zegt **wat je doet**, en waarom. Erbij horen:
- `OVERZICHT.md`: hoe de app in elkaar zit, en wat je zonder AI zelf kunt
  onderhouden (en wat niet);
- `DATAMODEL.md`: wat er in de database staat en wie wat mag.

Waar we nu staan en wat er openstaat: `STATUS.md`. De volledige
ontwikkelgeschiedenis staat in `HANDOVER.md` (projectkennis op claude.ai), de
vaste afspraken voor Claude in `CLAUDE.md`.

**Deze documenten (en `STATUS.md`) worden bij elke nieuwe versie bijgewerkt** (afspraak
met Claude, 17 oktober 2026). Wat er veranderde, staat per versie in
de nota per versie (`WIJZIGINGEN-vNN.md`, sinds v111 in de zip "niet-in-repo", niet meer in de repo) onder "Handleidingen". Klopt er iets niet meer met de
app, meld het: dan is dat een fout, net als een fout in de app.

---

## ⚠️ Eerst dit: verwijder nooit een gebruiker

**Een gebruiker wordt in Supabase NOOIT verwijderd, ook niet bij vertrek.**
Wie vertrekt, zet je op "niet actief" (§3.3). Ook niet verwijderen om een
wachtwoord te herstellen, en ook niet om "even opnieuw aan te maken".

Waarom: de app herkent iemand aan een interne code, niet aan zijn
e-mailadres. Maak je iemand opnieuw aan met hetzelfde adres en wachtwoord,
dan krijgt hij een **nieuwe** code. Alles wat aan de oude code hing, raakt
uit het zicht:

- **zijn open taken** staan niet meer onder "Mijn taken" op zijn startscherm
  (in het project zelf staan ze nog, met zijn naam erbij, maar niemand krijgt
  ze meer te zien als eigen taak);
- de koppeling bij **"gewijzigd door"**, **"verwijderd door"**, **"besteld
  door"** en in het **logboek** wordt leeg. Waar de naam als tekst naast staat
  (logboek, taken, gewijzigd door, verwijderd door), blijft die naam wel
  zichtbaar; bij "besteld door" niet;
- en alles wat later nog aan een gebruiker gekoppeld wordt, raakt op
  dezelfde manier los.

Wat wél blijft: de projecten, de maten, de foto's, en de namen die als tekst
bewaard zijn. Er gaat dus geen werk verloren, maar de
koppelingen wel, en die komen niet terug.

Wachtwoord vergeten? Zie [§3.2](#32-wachtwoord-vergeten). Iemand gaat uit
dienst? Zie [§3.3](#33-iemand-gaat-uit-dienst).

---

## 1. Waar alles staat

| wat | waar |
|---|---|
| de app (live) | https://m98cc4m6bg-sketch.github.io/glasopname/ |
| de code | GitHub, repo `m98cc4m6bg-sketch/glasopname` (openbaar), op je Mac via **GitHub Desktop** |
| gegevens, inloggen, foto's | **Supabase** (gratis plan): projecten, gebruikers, foto's |
| het versienummer | op het startscherm ("Startscherm · v121"), het inlogscherm en de projectenlijst. In een project alleen op een breed scherm (onder "Glasopname"); op iPad en iPhone: even naar het startscherm |
| uitleg per versie | `WIJZIGINGEN-vNN.md` in de zip "niet-in-repo" (map `archief-uit-repo/notas/` voor v63 t/m v110) en in de projectkennis; sinds v111 niet meer in de openbare repo |

`config.js` bevat het adres van Supabase en de openbare sleutel. Die mag
openbaar zijn. **Nooit** een `service_role`- of `sb_secret_…`-sleutel in de
repo zetten: daarmee kan iedereen alles.

## 2. Een nieuwe versie zetten

1. **Staat er een SQL-script bij?** Dat eerst: Supabase → SQL Editor →
   script plakken → Run. Pas daarna de bestanden.
2. Pak de zip uit. Open de map `glasopname`, druk op **Cmd+Shift+.** (dan zie
   je ook de verborgen bestanden), selecteer alles (Cmd+A) en sleep het naar
   je repomap. Kies overal **Vervang**. Let op: een **map** vervangen haalt
   weg wat niet in de zip zit. Zette je zelf een foto in `latten/`,
   `catalogus/` of `roosters/`, zeg dat dan vooraf tegen Claude, zodat hij
   in de zip komt.
3. Moeten er bestanden **uit** de repo (dat staat in `LEES-MIJ-EERST-vNN.md`),
   gooi die dan zelf weg in de repomap: slepen kan alleen toevoegen en
   vervangen, niet weghalen.
4. Kijk in **GitHub Desktop** of de bestanden uit `LEES-MIJ-EERST-vNN.md`
   erbij staan (weggegooide staan er rood bij). Commit en push.
   Staat `.gitignore` er niet bij en mist daarin de regel `Claude outputs/`
   (verborgen bestanden komen bij slepen vaak niet mee): menubalk bovenaan
   het scherm → **Repository → Repository Settings… → Ignored Files**, de
   regel `Claude outputs/` onderaan, **Save**, en meecommitten.
5. Zeg tegen Claude dat je gepusht hebt: die kijkt de repo na tegen het
   pakket. (Bij v106 ontbraken vier bestanden; daardoor deed een hele functie
   niets.)
6. De apparaten krijgen de nieuwe versie vanzelf: de app zoekt ernaar en
   werkt eerst het open werk weg naar de server. Op een iPhone/iPad met de app
   op het beginscherm kan dat even duren; de knop **↻** (startscherm) of
   **↻ Bijwerken** (in een project) versnelt het.

**Nooit** `config.js` vervangen, en **nooit** `test-sql.sql` in Supabase
draaien (dat script begint met alles weggooien; het is alleen voor de tests).

**Twee zips** (sinds v109, jouw wens): `glasopname-vNN.zip` is precies wat
in de repo hoort. `glasopname-vNN-niet-in-repo.zip` hoort er bewust **niet**
in: de handover (met de zwakke plekken in de beveiliging; de repo is
openbaar) en een archief van bestanden die uit de repo gehaald zijn. Bewaar
die op een eigen plek, bijvoorbeeld in OneDrive. De handover staat ook in de
projectkennis op claude.ai.

### Een vorige versie terugzetten

**Liever niet.** Een oudere versie van de app mag niet opslaan in een
project dat een nieuwere versie al heeft opgeslagen (zo raakt er geen werk
kwijt). Zet je een oude versie terug, dan loopt het opslaan in die
projecten vast ("Verouderde app-versie"). Vraag Claude daarom liever om een
herstelversie met een **hoger** nummer.

Moet het toch meteen: GitHub Desktop → **History** → rechtsklik op de
commit van de versie die problemen geeft → **Revert changes in commit** →
push, en vraag Claude dezelfde dag om een nieuwe versie. Een SQL-script
wordt met een revert **niet** teruggedraaid.

## 3. Gebruikers

### 3.1 Iemand toevoegen

Supabase → **Authentication → Users → Add user** → e-mailadres en wachtwoord
(vink *Auto Confirm User* aan). De app maakt van alles vóór de @ de naam:
`bart@voorbeeld.nl` wordt **bart**. Zelf aanmelden staat uit, en zo moet het
blijven: anders kan iedereen met de openbare sleutel een account maken.

Geef het wachtwoord persoonlijk door. Bij de eerste keer inloggen biedt de
browser aan het te bewaren.

Een nieuwe gebruiker staat vanzelf op **actief** en kan dus meteen bij de
projecten. Laat hem op het startscherm één keer **📞 Telefoon toevoegen**
invullen. Op de bestellijst staat "Besteld door: <het stuk vóór de @>,
tel. …": dat ziet de leverancier, dus kies het e-mailadres met zorg.

### 3.2 Wachtwoord vergeten

**Bewust geen herstelfunctie in de app** (jouw keuze, 17 oktober 2026). Jij
houdt de controle: jij stuurt een herstelmail, de app stuurt er zelf geen.
De knop **Wachtwoord vergeten?** op het inlogscherm zegt alleen: "Deze
functie zit bewust niet in de app, vraag julian om een herstel link!"
(sinds v109).

**Eén keer instellen, anders werkt de link niet** — *stand 17-10-2026: nog
niet gedaan; Claude vraagt ernaar tot je het bevestigt*:
Supabase → **Authentication → URL Configuration**:
- *Site URL*: `https://m98cc4m6bg-sketch.github.io/glasopname/`
- *Redirect URLs*: hetzelfde adres. Geen `*` erin.

Zonder dit wijst de link in de mail naar `localhost`.

**Een herstelmail sturen**: Authentication → Users → de collega → **Send
password recovery**. De link werkt één keer en is een uur geldig. Wat je
collega ziet (sinds v109):
1. Hij tikt op de link. Op een iPhone opent die in Safari (of, met de
   Outlook-app, in het browservenster van Outlook), niet in de app op het
   beginscherm; dat is goed zo.
2. De app opent met het venster **Kies een nieuw wachtwoord**, met zijn
   e-mailadres erbij. Hij typt het nieuwe wachtwoord twee keer (minstens 8
   tekens) en tikt ‹Wachtwoord opslaan›. De browser vraagt of hij het mag
   bewaren.
3. Daarna logt hij overal in met het nieuwe wachtwoord, ook in de app op
   zijn beginscherm en op zijn andere apparaten.

Opende hij de link per ongeluk: ‹Niet nu: uitloggen›; het oude wachtwoord
blijft dan gewoon gelden. Sluit hij het venster zonder te kiezen, dan komt
het in die browser terug zodra hij de app weer opent.

Geen bereik op het moment dat hij de link opent: de app vraagt om het
opnieuw te proberen; laat de pagina dan open (de link zelf werkt maar één
keer).

**Zegt de app "Deze herstellink werkt niet meer"**: de link is al gebruikt
of ouder dan een uur. Stuur een nieuwe. Komt die melding **al bij de eerste
tik**, dan heeft de mailbeveiliging (bij Microsoft 365 bijvoorbeeld *Safe
Links*) de link vooraf "geopend" om hem te controleren, en is hij daardoor
al gebruikt. Meld dat aan Claude: daar is een oplossing voor, maar die is
pas nodig als het echt gebeurt.

Let op: de mail komt van Supabase zelf, in het Engels, en het gratis plan
mag maar een paar van zulke mails per uur sturen.

En dus: **niet verwijderen en opnieuw aanmaken** (zie bovenaan).

### 3.3 Iemand gaat uit dienst

**Niet verwijderen, maar op "niet actief" zetten** (sinds script 26, v120).
In deze volgorde:

1. **Zijn open taken overzetten** op een collega: open het project, kies bij
   de taak een andere eigenaar. Doe je dit niet, dan ziet niemand die taken
   nog als eigen taak.
2. Staat hij bij de vaste geadresseerden voor de bestelmail? Supabase →
   SQL Editor:
   ```sql
   update public.mailadressen set actief = false where adres = 'naam@jelierbouw.nl';
   ```
3. Gebruikte hij een eigen apparaat dat nog werk had klaarstaan zonder
   bereik? Laat hem de app eerst één keer met bereik openen, tot er
   "✓ Opgeslagen" staat.
4. Dan pas, in de SQL Editor:
   ```sql
   update public.gebruikers set actief = false where email = 'naam@jelierbouw.nl';
   ```

Vanaf dat moment kan hij op de server niets meer zien of wijzigen. Wat al
op zijn apparaat staat, blijft daar: vraag een werkapparaat terug. Zijn
naam blijft bij zijn werk en taken staan. Terug in dienst: stap 4 met
`true`.

## 4. De SQL-scripts

Alle scripts staan genummerd in de repo (`09_…` t/m `26_…`; 01 t/m 08 alleen in
de projectkennis). **01 t/m 26 zijn gedraaid** (03 was optioneel; 26 op
22-10-2026). **27 hoort bij v122** (alleen lezen en nummering, hieronder).

Komt er een nieuw script bij, dan staat dat bovenaan de nota en in
`LEES-MIJ-EERST-vNN.md`. **Draai een oud script niet opnieuw** zonder het
Claude te vragen: een ouder script zet zijn eigen regels terug, en dan moet
script 26 daarna opnieuw.

Controle of script 26 gedraaid is (één regel = ja):

```sql
select column_name from information_schema.columns
 where table_name = 'gebruikers' and column_name = 'telefoon';
```

### Script 27: alleen lezen en nummering (v122)

Wat het doet staat bovenin het script. Kort: een account kan op **alleen
lezen** staan (voor de automatische back-up, §8), en de database nummert de
bestellingen na het samenvoegen net als de app (een ingetrokken lijst telt
niet mee). Gewone collega's merken niets. Mag vaker gedraaid worden.
Terugdraaien: `27_terug.sql` (zip "niet-in-repo" van v122 en de
projectkennis).

### Script 26: rechten en telefoon (v120)

Wat het doet staat bovenin het script, in gewone taal. Kort: strengere
rechten in de database (alleen collega's die op **actief** staan), en de
kolom `gebruikers.telefoon` (📞 op het startscherm).

**Vooraf** (de controlevraag): kijk of iedereen die met de app werkt op
actief staat:

```sql
select email, naam, actief from public.gebruikers order by email;
```

Staat er niemand op actief, dan stopt het script zelf zonder iets te
veranderen. Na het script laat het dezelfde lijst zien, met wie er
toegang heeft.

**Script 26 terugdraaien** (alleen als iemand er na het script niet meer
in kan en het niet aan "actief" ligt): `26_terug.sql` (in de zip
"niet-in-repo" van v120 en v121) in de SQL Editor draaien. Het zet de
regels terug zoals ze na script 25 waren. De kolom telefoon blijft staan
(die doet geen kwaad).

Een wijziging aan de database gebeurt **altijd** met zo'n genummerd script,
nooit door in het dashboard te klikken: dan weet niemand later meer wat er is
veranderd.

## 5. Keuzelijsten (glastypes, opbouwen, bewerkingen, roosters)

De keuzelijsten staan **twee keer**: in `index.html` én in de database
(`app_data`, sleutel `glas_data`). De database wint. Een glastype toevoegen
kan daarom nu alleen via Claude, met een SQL-script erbij. Een
beheerscherm hiervoor staat op de lijst (handover §11c).

### 5a. Rekenwaarden van Toebehoren (v111)

Lengte van een glaslat, zaagsnede, toeslag verstek, neuslat (recht): langer
dan sponning, reserve per lattype, meters op een rol glasband of tape,
kitvoeg, inhoud van een koker: dat zijn **geen** keuzelijsten uit
de database. Ze staan bovenin `toebehoren.js` (blok `INSTELLINGEN`, met
uitleg bij elke waarde) en zijn zonder SQL aan te passen:

- **Eerst proberen**: tabblad Toebehoren → ▸ "instellingen voor dit
  project". Geldt alleen voor dat project, staat in de pdf, ↺ zet terug.
- **Klopt het in de praktijk, de standaard aanpassen**: in `toebehoren.js`
  het getal veranderen, de drie versienummers ophogen, publiceren (zie
  `OVERZICHT.md` §8, "De rekenwaarden van Toebehoren aanpassen"). Of vraag
  het Claude.

De uitkomst is een **schatting voor onszelf**; Toebehoren gaat nooit naar de
leverancier (niet op de bestellijst, niet in de bestelmail).

## 6. Foto's van de glascatalogus, de roosters en de glaslatten

Die staan in `catalogus/` en `roosters/` en komen uit de online showroom van
Van Noordenne. Ophalen op de Mac, vanuit de repomap:

```
bash fotos-ophalen.sh
bash fotos-ophalen.sh roosterfotos.txt roosters
```

Het script slaat over wat er al staat. Wil je één foto vervangen, gooi dat
bestand eerst weg.

**De glaslatten** staan in `latten/`: per lat een foto (`<id>.jpg`) en,
waar Jongeneel die heeft, de maattekening (`<id>-tek.jpg`). De pagina's
staan in `latfotos.txt`.

**Geen script meer** (v114). Jongeneel blokkeert scripts: een script krijgt
alleen een controlepagina ("Challenge Validation"). Daarom is
`latfotos-ophalen.sh` weggehaald. Een nieuwe of betere foto:
1. **Vraag het Claude** in de Claude-app op de Mac (die heeft een eigen
   browser waarin de site gewoon laadt): "haal de foto en tekening van lat
   X van jongeneel.nl". Claude zet ze in `latten/` en in de offline-lijst.
2. **Of zelf**: open de pagina in Safari, sla de foto op als
   `latten/<id>.jpg` (bijv. `latten/A4.jpg`, ±600 px breed), en vraag
   Claude de foto bij de volgende versie in de offline-lijst te zetten
   (`LAT_FOTOS` in `sw.js`).
3. **Commit `latten/` mee** in GitHub Desktop. Zonder versie omhoog vraagt
   de app een ontbrekende foto vanzelf opnieuw; offline zie je hem pas na
   de volgende versie.
4. **Een maat anders?** Pas `latten.js` aan (en `GLASLATTEN.md`), of vraag
   het Claude.

Zonder foto tekent de app de doorsnede van de lat. Dat werkt ook.

## 7. Supabase wakker houden

Een gratis Supabase-project gaat na 7 dagen zonder gebruik op pauze. Een
GitHub-taak (`.github/workflows/supabase-wakker-houden.yml`) doet daarom elke
maandag en donderdag een kleine opvraging.

**Let op:** GitHub zet zo'n geplande taak uit als er 60 dagen niets in de repo
is veranderd. Kijk na een lange stille periode op GitHub → **Actions** of hij
nog loopt. Daar staat ook een knop **Run workflow** om hem met de hand te
starten.

Een groen vinkje en "HTTP-status: 200" = goed. Dat er `[]` (een lege
lijst) onder staat, hoort zo sinds script 26.

Staat Supabase toch op pauze, dan kan niemand inloggen of opslaan. Werk
blijft dan op de apparaten staan. Supabase → het project → **Restore**; daarna
gaat het werk vanzelf omhoog.

## 7b. De bestelmail (nog niet ingesteld)

De knop *✉️ Bestelmail versturen* werkt pas als de mailfunctie in Supabase
ingesteld is (een maildienst, een eigen afzenderdomein en de functie
`mail`). Dat is nog niet gebeurd; Jan pakt dit later op met Claude. De
stappen staan in de handover (niet in deze openbare repo).

**Eerst één vraag beantwoorden** (afspraak van Jan, 20-10-2026): mag de
bestelmail naar **elk** adres, of **alleen** naar de vaste adressen
(tabel `mailadressen`) plus adressen op `@jelierbouw.nl`? Jan koos "later
beslissen". Claude legt die vraag opnieuw voor, met de onderbouwing en de
keuzes, zodra de mail ingesteld wordt. Zonder antwoord niet instellen.

## 8. Back-up

Het gratis plan van Supabase heeft **geen back-ups die je kunt terugzetten**.
Gaat de database verloren, dan is alles weg. Dat is het grootste risico van
de hele app (handover §9). Sinds v120 is er een **handmatige back-up**:

**💾 Back-up maken** (startscherm, rechtsboven). Kies *Alleen gegevens*
(klein, snel) of *Met foto's* (alle foto's en originelen; groot, doe het op
wifi). Je krijgt één zip-bestand, bijvoorbeeld
`Glasopname-backup_2026-10-22_1430_met-fotos.zip`, met:

| in de zip | wat |
|---|---|
| `projecten.json` | alle projecten (ook uit de prullenbak), met ruiten, bestellingen en toebehoren |
| `taken.json`, `gebruikers.json`, `app_data.json` | taken, wie er werkt, de gedeelde lijsten |
| `fotos/<project>/…` | (met foto's) alle foto's en originelen, zoals ze in de opslag staan |
| `LEESMIJ.txt` | wat erin zit, en welke foto's niet lukten |

**Niet** in de zip: het logboek per project en de vaste mailadressen voor
de bestelmail.

Zet de zip in **OneDrive** (bijvoorbeeld een map *Glasopname back-ups*).
Advies: **elke week** alleen gegevens, **elke maand** met foto's, en altijd
vóór je iets groots doet (een SQL-script, een nieuwe versie). De knop zegt
"💾 Back-up maken" zolang er op **dat apparaat** nog geen back-up van de
laatste 30 dagen is; daarna alleen 💾. *Met foto's* liefst op de Mac (de
hele zip wordt in het geheugen gemaakt; op een iPhone kan dat vastlopen).
Op een iPad: in het deelvenster "Bewaar in Bestanden" → OneDrive.

### Back-up terugzetten

Alleen samen met Claude; nooit zelf over bestaande projecten heen. Eén
project zit in `projecten.json` als één regel, met de kolom `data` als het
hele project. Claude maakt daar een SQL-opdracht van om dat project (of
alles) terug te zetten in de tabel `projecten`; foto's gaan terug in
Storage, map `projectfotos`, onder dezelfde naam. Is de database helemaal
weg, dan eerst samen met Claude alle scripts opnieuw draaien (01–08 staan
in de projectkennis) en de gebruikers opnieuw aanmaken, en pas daarna de
zip terugzetten.

### Automatische back-up naar Dropbox (v122, keuze Jan)

Elke nacht maakt een GitHub-taak in een **aparte, privé repository**
(`glasopname-backup`, niet deze openbare) een back-up in een eigen,
gratis **Dropbox**-account:
- `gegevens/JJJJ-MM-DD_gegevens.zip`: dezelfde bestanden als de knop 💾,
  plus `logboek.json` en `mailadressen.json`. Bewaard: 30 dagen elke dag,
  tot ±3 maanden één per week, daarna één per maand;
- `fotos/`: elke nacht alleen de nieuwe foto's; daar wordt nooit iets
  weggegooid (ook niet als een foto in de app verdwijnt);
- `LAATSTE-BACKUP.txt`: wanneer, en wat erin zat.

De taak logt in met een **back-upaccount dat alleen kan lezen** (script 27;
in Supabase `backup@jelierbouw.nl`, `alleen_lezen = true`). Het staat niet
in de keuzelijsten van de app; log er nooit mee in de app in. De
Dropbox-koppeling kan alleen in zijn eigen app-map. De sleutels staan als
*secrets* in de privé-repository, niet in bestanden en niet versleuteld
(keuze Jan: de zips zelf zijn niet versleuteld).

Mislukt een nacht, dan mailt GitHub je. **Eén keer per maand**: kijk in
Dropbox naar de datum in `LAATSTE-BACKUP.txt`. Log minstens één keer per
jaar in op het gratis Dropbox-account. Instellen, onderhoud en stoppen:
`INSTELLEN.md` in de repository `glasopname-backup`.

De knop 💾 in de app blijft, voor een extra kopie in OneDrive of vóór iets
groots.

Wat er wél is, en wat het níet is:

| wat | vangt op | vangt niet op |
|---|---|---|
| **prullenbak** (30 dagen) | een project per ongeluk weggegooid | een verloren database |
| **logboek** (momentopnames per project) | een verkeerde wijziging terugzoeken | foto's; een verloren database |
| **apart bewaard** (zie §9) | werk dat niet over een ander heen mocht | — |
| **automatische back-up** (Dropbox, elke nacht) | een verloren database of opslag; ook oudere standen (bewaarschema) | wat er sinds vannacht veranderde |
| **💾 back-up** (zip) | een verloren database, als de zip recent is | wat er na de laatste back-up veranderde; het logboek |
| **de pdf's** (bestellijst, PDF invoer, PDF werkvloer) | wat je zelf bewaart, op papier of in OneDrive | alles daarna |

Bewaar daarnaast van elk afgerond project de **PDF invoer** (⬇ Exporteren
→ *PDF invoer*: de projectgegevens en per foto een pagina met de maten) en
eventueel de originele foto's (⬇ Exporteren) in OneDrive.

## 9. Ruimte en "apart bewaard"

**Ruimte.** De gratis opslag is 500 MB voor de database en 1 GB voor alle
foto's samen. Het startscherm waarschuwt vanaf 80% (oranje) en 95% (rood).
De foto's (met de originelen sinds v93) zijn het eerste wat vol raakt. Dan is
er een keuze: Supabase Pro (ongeveer $25 per maand; prijs nakijken) of
originelen na export opruimen (nog niet gebouwd). Ruimte maken kan ook
door de prullenbak definitief te legen: startscherm → prullenbak → per
project ‹Nu definitief verwijderen› (ook de foto's; niet terug te draaien,
maak eerst een 💾 back-up met foto's). Stap je over op Pro, vraag Claude
dan de grenzen in `config.js` aan te passen; anders blijven de
waarschuwingen rekenen met 500 MB en 1 GB.

**Apart bewaard.** Werkte iemand verder terwijl een ander het project had
(bijvoorbeeld een iPad zonder bereik), dan komt dat werk als apart project in
de lijst: *Klaver (apart bewaard 16-10 15:56 - julian, iPhone)*. De app voegt
het niet zelf samen. Iemand moet het openen, vergelijken, wat nodig is
overnemen, en het daarna weggooien (🗑 in de projectenlijst).

## 10. Bij een klacht of storing

Vraag eerst:

1. **welke versie** (op het startscherm, bijv. *v121*);
2. **welk apparaat en welke browser** (iPad, iPhone, Mac, Android, Windows;
   Safari of Chrome; als app op het beginscherm of niet);
3. **wanneer**, en of er **bereik** was;
4. een **schermafdruk** van wat je zag.

Daarna:

- Oudere versie? Eerst **↻** (startscherm) of **↻ Bijwerken** (in een
  project).
- *"Ik zie geen projecten meer"* of *"Project bestaat niet meer"*, terwijl
  een collega het wel ziet: kijk of hij op actief staat
  (`select email, actief from public.gebruikers;`). Het werk op zijn
  apparaat blijft bewaard.
- **Nooit** "websitegegevens wissen" of de app van het beginscherm
  verwijderen als er misschien nog werk zonder bereik klaarstaat: dat werk
  staat dan alleen op dat apparaat, en is daarna weg. Eerst met bereik openen
  en wachten tot er "Opgeslagen" staat.
- Geef de antwoorden aan Claude, met de versie erbij.

**Vragen die je kunt verwachten na v122**

- *"Mail van GitHub: Back-up naar Dropbox failed."* Open de mail →
  de run → *Back-up maken*: daar staat in gewone woorden wat er misging
  (bijv. "Inloggen bij Supabase mislukt"). Één foto die niet lukte, komt de
  nacht erna vanzelf. Blijft het mislukken: stuur het Claude.
- *"Wie is 'backup' in Supabase?"* Het back-upaccount (alleen lezen, §8).
  Niet verwijderen; uitzetten = de workflow uitzetten (`INSTELLEN.md`).
- *"De lijst van leverancier heette '2e', in de app nu ook."* Klopt sinds
  script 27: ook na het samenvoegen in de database telt een ingetrokken
  lijst niet meer mee.

**Vragen die je kunt verwachten na v120 en v121**

- *"Ik typte 1212,5 en er staat 1212."* Een halve mm gaat naar beneden (het
  glas wordt nooit te groot); de app zegt het onderin. Tot v119 liet Chrome
  de komma weg en werd het 12125.
- *"Het aantal 0 (of −2, of 2,5) wil niet."* Het aantal is een heel getal
  van 1 tot 999.
- *"Klopt dit? Het lijkt op een tikfout."* Vóór de bestellijst: glas kleiner
  dan 100 mm, groter dan de grootste plaat (3210 × 6000), meer dan 99
  stuks, of een rooster dat niet bij de glasdikte past. Stoppen en
  aanpassen, of *Toch doorgaan* als het echt zo moet.
- *"DUBBEL BESTELD."* Twee apparaten bestelden vanaf dezelfde stand (meestal
  een iPad zonder bereik en een collega die het project overnam). Bel de
  leverancier en laat één van de twee annuleren. Trek daarna in de app de
  **laatste** in: tabblad Bestellijst → blok Bestellingen → ‹Intrekken…›,
  met je eigen wachtwoord. De app vraagt dan of hij níet verstuurd is: hier
  klopt dat niet helemaal (hij is net geannuleerd), ga gewoon door. Liet de
  leverancier juist de andere vervallen, vraag dan Claude. Op Bestellijst
  staat een rode balk tot het opgelost is.
- *"Dit project staat ook open in een ander tabblad."* Werk in één tabblad;
  sluit het andere.
- *"Merk bestaat al"* bij importeren: kies of alleen de nieuwe regels een
  nummer krijgen (1a, 1b of A1, A2) of ook de bestaande. De bolletjes op de
  foto gaan mee.
- *"Waarom zoveel lengtes glaslat?"* Het zaagplan + 1 reserve per lattype.
  De reserve staat bij de instellingen op Toebehoren.
- *"De neuslat is te lang/te kort in het zaagplan."* Hij is recht afgekort,
  20 mm langer dan de sponning breed is (de scharniersponning). Aan te passen
  bij de instellingen op Toebehoren: "Neuslat (recht): langer dan sponning"
  (v121).
- *"Onderin het scherm staat een balk met 'gekozen'."* Je hebt ruiten
  aangevinkt (☐ bij het merk). Kies in de balk wat er moet veranderen; je
  ziet per ruit wat het wordt, en pas bij Toepassen gebeurt het. ✕ =
  niets meer gekozen (v121).
- *"Rode regel onderaan de werkvloer-pdf (en de PDF invoer): LET OP: na de
  laatste bestelling gewijzigd, nog niet besteld."* Er is iets veranderd
  dat nog niet besteld is: eerst de aanvulling bestellen, of weten dat de
  werkplaats met de nieuwe maat werkt.
- *"Ik zie ✕ … verwijderd, ↶ Terugzetten."* Binnen 12 seconden zet
  Terugzetten de regel terug, met zijn bolletjes.
- *"📞 Telefoon toevoegen"* (daarna alleen 📞). Je eigen nummer, voor op
  de bestellijst (de leverancier belt je bij vragen).
- *"Wat is 'Contact op het werk' en 'Ons ref.' op de bestellijst?"* Die
  komen uit de projectgegevens (tabblad Project info).

**Vragen die je kunt verwachten na v119**

- *"Oranje: 'past · vlak met kozijn'."* De lat komt precies gelijk met het
  kozijn. Dat past, maar oogt niet. Tik op het oordeel: het advies noemt een
  lat waarbij een randje sponning in zicht blijft. Sinds v120 ook onderin
  aan de buitenkant (daar raadt de app eerst een neuslat aan).
- *"Oranje: 'nood: steekt 2 mm uit'."* Een A5 past alleen omdat zijn
  sponninkje over de rand van het kozijn valt; hij steekt dan uit. Dat is
  een noodmaatregel. Liever een andere lat, dunner band of uitfrezen. Vóór
  de bestellijst vraagt de app ernaar; op de werkvloer-pdf staat "NOOD".
- *"Latzijde beide: onderin aan beide kanten dezelfde lat als boven."*
  Een rustige grijze melding (sinds v121; daarvoor geel). Wil je buiten
  een neuslat, kies die als onderlat; anders op **Begrepen**.
- *"Alles exporteren geeft drie bestanden."* Klopt: bestellijst, PDF invoer
  en PDF werkvloer.

**Vragen die je kunt verwachten na v118**

- *"Waar is de pdf voor de werkplaats?"* ⬇ Exporteren → **🔨 PDF
  werkvloer**. Per foto de foto met de letters en per ruit wat erin moet;
  achteraan benodigdheden en zaagplan. Geen prijzen, gaat niet naar de
  leverancier.
- *"In de werkvloer-pdf staat rood 'LATZIJDE NOG KIEZEN' of 'past niet'."*
  Dan is op Toebehoren nog iets niet in orde voor die ruit. Eerst daar
  oplossen, dan de pdf opnieuw maken.
- *"Op Invoer is de dikte rood: '23 · te dik'."* Het max glaspakket uit de
  maatstaat is kleiner dan glas + band (band binnen en buiten, standaard 3 +
  3; per ruit op Toebehoren). Kies een dunnere opbouw of een dunnere band;
  kiezen mag, het blijft rood.
- *"Band 5 mm: welke rol?"* Er bestaat geen rol van 5 mm: de app telt een
  rol 2 mm en een rol 3 mm (op elkaar), dus ook twee keer de meters.
- *"Het tabblad Bestellijst ziet er anders uit."* Klopt: sinds v118
  hetzelfde als de pdf (dezelfde kolommen, blokken en teksten).

**Vragen die je kunt verwachten na v117**

- *"Een ruit is rood: 'te dik −1 (max 28)'."* De maatstaat gaf een max
  glaspakket (incl. band), en glas + band is dikker. Kies een dunnere
  opbouw: in de keuzelijst staan de te dikke onder "Te dik voor max
  glaspakket". Of controleer bij de kozijnfabriek of het max klopt.
- *"'onder: N30 alleen buiten'."* De latzijde staat op binnen, maar onderin
  staat een neuslat of ventilatielat (die zijn voor buiten). Kies onderin
  een andere lat, of zet de latzijde op buiten. De app verandert het niet
  zelf.
- *"Op de bestellijst staat bij Bediening 'standaard'."* Klopt: een rooster
  zonder extra stang of koord heeft de gewone bediening (het knopje).
- *"Waar is het zaagplan?"* Op Toebehoren, onder elk lattype: "Zaagplan: …"
  (tik om open te klappen). En in de PDF invoer.

**Vragen die je kunt verwachten na v116**

- *"Bovenin staat een gele of rode teller '⇡ 2 te uploaden'."* Er staan nog
  foto's alleen op dat apparaat. Tik op de teller: het venster zegt hoeveel,
  hoe lang al, en sinds v116 meteen (na 3 mislukte pogingen) welke
  foutmelding er komt. Geef die foutmelding door. **Niet** de
  websitegegevens wissen zolang de teller er staat.
- *"Er staat 'leeg op dit apparaat'."* Dat bestand is op dat apparaat
  echt leeg; het gaat niet als leeg bestand naar de cloud en wordt niet
  weggegooid. Heb je de foto nog (camera, fotobibliotheek), zet hem dan
  opnieuw in het project.
- *"Op de Mac of iPad (Safari) bleven originele foto's hangen."* Opgelost in
  v116: Safari stuurde ze leeg mee ("No content provided"). Na ↻ Bijwerken
  gaan ze vanzelf omhoog.

**Vragen die je kunt verwachten na v115**

- *"Waar zijn de kolommen Glaslat en Latzijde op Invoer?"* Verhuisd naar
  **Toebehoren** (wens van Jan: Invoer compact). Op Invoer staan alleen nog
  Diepte en Onder.
- *"Er staat 'past · 4 mm in zicht'. Moet ik iets doen?"* Nee. De lat schuift
  verder de sponning in, tegen het glas, en er blijft 4 mm sponning in het
  zicht. Wil je dat niet, kies dan een bredere lat (de kiezer zet die met
  weinig zicht bovenaan).
- *"Wat betekent 'omgekeerd' bij een opdeklat?"* Een opdeklat met een eigen
  sponning (E7, E22, GLD1, GLD2) kun je twee kanten op monteren. Normaal
  geeft hij extra ruimte (+3, +5 …); omgekeerd steekt het dikke deel de
  sponning in en neemt hij die ruimte juist in (−3, −5 …). De kiezer toont
  beide, met een tekentje.
- *"Welke neuslat?"* De app toont alleen de neuslatten die passen, met de
  **ventilatie** (ruimte tussen kozijn en neus, minstens 5 mm) en de
  **uitsteek** (hoe ver de lat voor het kozijn uitsteekt; handig als je
  bestaande latten wilt volgen). Automatisch de kleinste die past.
- *"Bij nieuwe kozijnen zitten de latten erbij."* Kies latzijde **geen
  (meegeleverd)**. Na een csv-import staat dat er al. Toebehoren telt dan
  alleen band, kit en tape.
- *"Kan ik op Toebehoren ook het glas veranderen?"* Ja, glastype en opbouw.
  Dat zijn dezelfde gegevens als op Invoer (het verandert overal, ook op de
  bestellijst).
- *"Er staat 'standaard' bij Bediening."* Dat is het gewone knopje (geen
  extra stang of koord). Op de bestellijst komt dan niets.
- *"Waar is de kolom Merk op de bestellijst?"* Een kolom zonder waarden
  komt er sinds v115 niet meer op (bijv. als geen enkele ruit een merk heeft).

**Vragen die je kunt verwachten na v114**

- *"Wat moet ik invullen bij Latzijde?"* Per ruit: **binnen** (latten
  binnen; onderin dezelfde lat), **buiten** (latten buiten; onderin de
  passende neuslat) of **beide** (glas tussen twee latten, zonder aanslag).
  Er is bewust geen standaard: een nieuwe ruit staat op **?**, en
  Toebehoren en de bestellijst melden welke ruiten nog geen keuze hebben.
  Sinds v115 kies je het op Toebehoren (per ruit, per foto, of voor alle
  ruiten); beide = onderin dezelfde lat.
- *"De sponning is onderin anders."* Vul op Invoer de kolom **Onder** in.
  Het oordeel op Toebehoren toont het slechtste van boven en onder
  ("onder: past niet −4").
- *"Kan ik het advies overnemen?"* Ja: tik in het venster op een advies
  (bijv. "Lat A5 …"). Eén keer ongedaan maken zet het terug.
- *"Ik zie bij het zijwaarts schuiven niet meer welke ruit het is."* Het
  merk staat ook in de eerste kolom (onder het nummer), en die blijft staan.
- *"Op de telefoon is Toebehoren per ruit maar één regel."* Tik erop voor
  de onderlat, de zijde en de getallen (v114, ingeklapt).
- *"Hoe bestel ik een rooster dat binnen een andere kleur heeft?"* Kolom
  **Bi-color** op Ja (staat er zodra er een rooster is). Dan heet de kolom
  RAL voortaan **RAL buiten**, en komt de kolom **RAL binnen** erbij. Op de
  bestellijst staat "Bi-color buiten: … / binnen: …". Vergeten de kleur
  binnen te kiezen? Dan vraagt de app het vóór de bestellijst.
- *"Na de bestelling is alleen de kleur van een rooster anders. Wordt het
  glas nu opnieuw gemaakt?"* Nee (v114, keuze van Jan). De aanvulling heeft
  dan het blok **ALLEEN ROOSTER – glas NIET opnieuw maken**, met wat het was
  en wat het wordt. Dat geldt voor de kleur, bi-color, en een ander Duco
  type **met dezelfde glasaftrek** waar het glas in past. Een type met een
  andere aftrek (DucoTon 10: 80 mm, DucoTon 18: 120 mm) of rooster aan/uit
  verandert het glas: dat blijft VERVANGT.
- *"Wat is die rode zin bovenaan de aanvulling?"* "Graag bevestigen dat u
  deze aanvulling verwerkt, met name VERVANGT en ANNULEREN." Die staat op
  elke aanvulling (keuze van Jan), niet op de 1e bestelling en niet op het
  overzicht.
- *"De favicon in Safari is nog het oude icoon."* Sinds v111 heeft het
  icoon een nieuwe bestandsnaam. Eén keer herladen (↻ Bijwerken) is genoeg;
  helpt dat niet, Safari afsluiten en opnieuw openen.

**Vragen die je kunt verwachten na v111**

- *"Waar vul ik een bedieningsstang in?"* Op Invoer, kolom **Bediening**
  (naast RAL kleur). Die kolom is er alleen als minstens één ruit een
  rooster heeft. Kies 1× of 2× stang of koord; de lengte in mm, of leeg
  voor de standaardlengte. Het gewone knopje op het rooster hoef je niet in
  te vullen.
- *"Na de bestelling heb ik een stang toegevoegd; waar staat die op de
  aanvulling?"* Sinds v112 niet in de glastabel, maar onder de tabel in het
  blok **ALLEEN BEDIENING – glas NIET opnieuw maken en NIET annuleren**, met
  het totaal aantal stangen of koorden. Is er tegelijk iets aan het glas of
  het glas veranderd (maat, glastype), dan blijft het VERVANGT. Alleen het
  rooster anders: zie hieronder (v114).
- *"Ik kan op Toebehoren niets kiezen."* Dan kijk je mee (een collega
  bewerkt het project), of het project is besteld: sinds v114 gaan de
  latkeuzes (zijde, onderlat, standaardlat) dan op slot, net als de maten.
  Ontgrendelen via de balk bovenaan Invoer. De instellingen van het
  project (band, kit, reserve) blijven vrij.
- *"Waar vul ik de sponningdiepte in?"* Op Invoer, groep Sponning: kolom
  **Diepte** (zij en boven: de bruikbare maat loodrecht op het glas, van de
  aanslag tot de buitenkant van het kozijn) en **Onder** (de onderdorpel;
  leeg = gelijk, het grijze getal). Sinds v115 kies je **de latten op
  Toebehoren**: per foto, met de foto en de merkletters erbij. Daar zie je
  ook of het past (kolom Oordeel; tik erop voor de tekening en wat wel
  past). Na een bestelling op slot (v114).
- *"Er staat 'krap −1'. Is dat erg?"* Nee: tot 1 mm te krap vangt het band
  op. Bij "past niet" (of bij een opdeklat "te ruim") vraagt de app bij de
  bestellijst of je door wilt.
- *"Er staat 'maat nog niet nagemeten'."* Sinds v114 zijn alle latten
  nagekeken op de tekeningen van Jongeneel, behalve de **C1** (v120:
  Jongeneel noemt 26 én 23; meet er één na). Zie je het bij een andere lat,
  dan is er een lat bijgekomen met `zeker: false` (`GLASLATTEN.md` §8).
- *"Waarom staat er een neuslat maat N30?"* De app kiest de kleinste
  neuslat die past bij de sponningdiepte (`GLASLATTEN.md` §6). Zonder
  diepte staat er "maat nog onbekend".

**Vragen die je kunt verwachten na v110**

- *"Ik kan het aantal niet meer typen."* Klopt, bewust: zodra een regel een
  bolletje op de foto heeft, gaat het aantal samen met de bolletjes. Een
  ruit erbij: tik op een bolletje van die letter → ‹＋ Nog een ruit met deze
  letter› en tik waar hij zit. Eraf: tik op het bolletje → ‹Één ruit minder›.
  Tikken op het grijze vak geeft dezelfde uitleg. Een regel zonder bolletje
  (los, of uit een ingelezen maatstaat) is gewoon te typen.
- *"Onder de foto staat een gele strook 'aantal 2, maar 3 bolletjes'."* Dat
  is een project van vóór v110 (of een ruit die nog half is aangewezen). De
  app verandert daar zelf niets aan; kies per regel wat klopt.
- *"De bestellijst vraagt 'Klopt het aantal?'."* Zelfde oorzaak. Stoppen,
  onder de foto rechtzetten, en de lijst opnieuw maken. Of ‹Toch bestellen
  zoals de aantallen› als het aantal klopt en alleen de foto niet af is.

## 11. Beveiliging in het kort

- Zelf aanmelden staat **uit** (Authentication → Sign In / Providers). Zo
  laten.
- Alleen wie in `gebruikers` op actief staat, kan bij de projecten
  (script 26). Iedereen die actief is, heeft dezelfde rechten. Komen er
  ooit onderaannemers bij: eerst Claude vragen.
- Ieder een eigen, sterk wachtwoord; deel nooit een wachtwoord. Wie
  vertrekt, meteen op niet actief (§3.3).
- Een eigen domein voor de app (in plaats van `github.io`)? Dan eerst Claude
  vragen: daar horen voorzorgen bij tegen domeinovername, en de Site URL in
  Supabase moet mee.
