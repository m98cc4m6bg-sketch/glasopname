# Glasopname — beheerhandleiding

*Voor wie de app draaiende houdt: Jan, of wie het van hem overneemt.
Gewone taal, geen programmeerkennis nodig. Bijgewerkt op 17 oktober 2026,
bij v108.*

Dit document zegt **wat je doet**, en waarom. Erbij horen:
- `OVERZICHT.md`: hoe de app in elkaar zit, en wat je zonder AI zelf kunt
  onderhouden (en wat niet);
- `DATAMODEL.md`: wat er in de database staat en wie wat mag.

Waar we nu staan en wat er openstaat: `STATUS.md`. De volledige
ontwikkelgeschiedenis staat in `HANDOVER.md` (projectkennis op claude.ai), de
vaste afspraken voor Claude in `CLAUDE.md`.

**Deze documenten (en `STATUS.md`) worden bij elke nieuwe versie bijgewerkt** (afspraak
met Claude, 17 oktober 2026). Wat er veranderde, staat per versie in
`WIJZIGINGEN-vNN.md` onder "Handleidingen". Klopt er iets niet meer met de
app, meld het: dan is dat een fout, net als een fout in de app.

---

## ⚠️ Eerst dit: verwijder nooit een gebruiker

**Een gebruiker wordt in Supabase NOOIT verwijderd, behalve als iemand
definitief uit dienst gaat.** Ook niet om een wachtwoord te herstellen, en
ook niet om "even opnieuw aan te maken".

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
| het versienummer | op het startscherm ("Startscherm · v108"), het inlogscherm en de projectenlijst. In een project alleen op een breed scherm (onder "Glasopname"); op iPad en iPhone: even naar het startscherm |
| uitleg per versie | `WIJZIGINGEN-vNN.md` in de repo |

`config.js` bevat het adres van Supabase en de openbare sleutel. Die mag
openbaar zijn. **Nooit** een `service_role`- of `sb_secret_…`-sleutel in de
repo zetten: daarmee kan iedereen alles.

## 2. Een nieuwe versie zetten

1. **Staat er een SQL-script bij?** Dat eerst: Supabase → SQL Editor →
   script plakken → Run. Pas daarna de bestanden.
2. Pak de zip uit. Open de map `glasopname`, druk op **Cmd+Shift+.** (dan zie
   je ook de verborgen bestanden), selecteer alles (Cmd+A) en sleep het naar
   je repomap. Kies overal **Vervang**.
3. Kijk in **GitHub Desktop** of de bestanden uit `LEES-MIJ-EERST-vNN.md`
   erbij staan. Commit en push.
4. Zeg tegen Claude dat je gepusht hebt: die kijkt de repo na tegen het
   pakket. (Bij v106 ontbraken vier bestanden; daardoor deed een hele functie
   niets.)
5. De apparaten krijgen de nieuwe versie vanzelf: de app zoekt ernaar en
   werkt eerst het open werk weg naar de server. Op een iPhone/iPad met de app
   op het beginscherm kan dat even duren; de knop **↻ Bijwerken** versnelt het.

**Nooit** `config.js` vervangen, en **nooit** `test-sql.sql` in Supabase
draaien (dat script begint met alles weggooien; het is alleen voor de tests).

### Een vorige versie terugzetten

GitHub Desktop → **History** → rechtsklik op de commit van de versie die
problemen geeft → **Revert changes in commit** → push. De apparaten krijgen
dan de vorige versie. Let op: een SQL-script wordt daarmee **niet**
teruggedraaid. Vraag Claude eerst of dat nodig is.

## 3. Gebruikers

### 3.1 Iemand toevoegen

Supabase → **Authentication → Users → Add user** → e-mailadres en wachtwoord
(vink *Auto Confirm User* aan). De app maakt van alles vóór de @ de naam:
`bart@jelierbouw.nl` wordt **bart**. Zelf aanmelden staat uit, en zo moet het
blijven: anders kan iedereen met de openbare sleutel een account maken.

Geef het wachtwoord persoonlijk door. Bij de eerste keer inloggen biedt de
browser aan het te bewaren.

### 3.2 Wachtwoord vergeten

**Stand nu (v108):** de app heeft geen knop "Wachtwoord vergeten", en
wachtwoord wijzigen kan alleen via een herstelmail die jij vanuit Supabase
stuurt. In het dashboard zelf kun je geen nieuw wachtwoord intypen.

- **Eén keer instellen**: Supabase → **Authentication → URL Configuration**:
  - *Site URL*: `https://m98cc4m6bg-sketch.github.io/glasopname/`
  - *Redirect URLs*: hetzelfde adres. Geen `*` erin.

  Zonder dit wijst de link in de mail naar `localhost` en werkt hij niet.
- **Versturen**: Authentication → Users → de collega → **Send password
  recovery**. De link is één keer bruikbaar en een uur geldig.
- **Let op:** tot er een venster "Kies een nieuw wachtwoord" in de app zit
  (voorgesteld, nog niet gebouwd), logt de link de collega alleen in op dat
  ene apparaat, zonder dat hij een nieuw wachtwoord kiest. Op andere
  apparaten kan hij dan nog steeds niet inloggen.

En dus: **niet verwijderen en opnieuw aanmaken** (zie bovenaan).

### 3.3 Iemand gaat uit dienst

Dit is het enige moment waarop je een gebruiker verwijdert. In deze volgorde:

1. **Zijn open taken overzetten** op een collega: open het project, kies bij
   de taak een andere eigenaar. Doe je dit niet, dan ziet niemand die taken
   nog als eigen taak (zie bovenaan).
2. Staat hij bij de vaste geadresseerden voor de bestelmail (tabel
   `mailadressen`)? Haal hem daar weg.
3. Supabase → Authentication → Users → de gebruiker → **Delete user**.
   Zijn projecten, maten, foto's en logboek blijven staan (script 16, v89).
   Apparaten waarop hij nog ingelogd was, vragen binnen ongeveer een uur
   opnieuw om in te loggen.
4. Gebruikte hij een eigen apparaat dat nog werk had klaarstaan zonder
   bereik? Laat hem de app eerst één keer met bereik openen, zodat alles
   omhoog is, vóór je hem verwijdert.

## 4. De SQL-scripts

Alle scripts staan genummerd in de repo (`09_…` t/m `24_…`; 01 t/m 08 alleen in
de projectkennis). Voor zover bekend zijn ze allemaal gedraaid (03 was optioneel); een nieuwe versie zegt het
als er een bij komt. Draai een oud script niet opnieuw zonder het eerst aan
Claude te vragen.

Een wijziging aan de database gebeurt **altijd** met zo'n genummerd script,
nooit door in het dashboard te klikken: dan weet niemand later meer wat er is
veranderd.

## 5. Keuzelijsten (glastypes, opbouwen, bewerkingen, roosters)

De keuzelijsten staan **twee keer**: in `index.html` én in de database
(`app_data`, sleutel `glas_data`). De database wint. Een glastype toevoegen
kan daarom nu alleen via Claude, met een SQL-script erbij. Een
beheerscherm hiervoor staat op de lijst (handover §11c).

## 6. Foto's van de glascatalogus en de roosters

Die staan in `catalogus/` en `roosters/` en komen uit de online showroom van
Van Noordenne. Ophalen op de Mac, vanuit de repomap:

```
bash fotos-ophalen.sh
bash fotos-ophalen.sh roosterfotos.txt roosters
```

Het script slaat over wat er al staat. Wil je één foto vervangen, gooi dat
bestand eerst weg.

## 7. Supabase wakker houden

Een gratis Supabase-project gaat na 7 dagen zonder gebruik op pauze. Een
GitHub-taak (`.github/workflows/supabase-wakker-houden.yml`) doet daarom elke
maandag en donderdag een kleine opvraging.

**Let op:** GitHub zet zo'n geplande taak uit als er 60 dagen niets in de repo
is veranderd. Kijk na een lange stille periode op GitHub → **Actions** of hij
nog loopt. Daar staat ook een knop **Run workflow** om hem met de hand te
starten.

Staat Supabase toch op pauze, dan kan niemand inloggen of opslaan. Werk
blijft dan op de apparaten staan. Supabase → het project → **Restore**; daarna
gaat het werk vanzelf omhoog.

## 8. Back-up: eerlijk gezegd, die is er niet

Het gratis plan van Supabase heeft **geen back-ups die je kunt terugzetten**.
Gaat de database verloren, dan is alles weg. Dat is het grootste risico van
de hele app (handover §9), en het staat nog open.

Wat er wél is, en wat het níet is:

| wat | vangt op | vangt niet op |
|---|---|---|
| **prullenbak** (30 dagen) | een project per ongeluk weggegooid | een verloren database |
| **logboek** (momentopnames per project) | een verkeerde wijziging terugzoeken | foto's; een verloren database |
| **apart bewaard** (zie §9) | werk dat niet over een ander heen mocht | — |
| **de pdf's** (bestellijst, overzicht) | wat je zelf bewaart, op papier of in OneDrive | alles daarna |

Tot er een echte back-up is: **bewaar van elk afgerond project het
overzicht als pdf** (⬇ Exporteren → *PDF invoer*: de projectgegevens en per
foto een pagina met de maten) (en eventueel de originele foto's als zip, ⬇
Exporteren) op een eigen plek, zoals OneDrive.

## 9. Ruimte en "apart bewaard"

**Ruimte.** De gratis opslag is 500 MB voor de database en 1 GB voor alle
foto's samen. Het startscherm waarschuwt vanaf 80% (oranje) en 95% (rood).
De foto's (met de originelen sinds v93) zijn het eerste wat vol raakt. Dan is
er een keuze: Supabase Pro (ongeveer $25 per maand; prijs nakijken) of
originelen na export opruimen (nog niet gebouwd). Let op: stap je over op Pro,
dan blijven de waarschuwingen op het startscherm rekenen met de grenzen van
het gratis plan, tot Claude dat aanpast.

**Apart bewaard.** Werkte iemand verder terwijl een ander het project had
(bijvoorbeeld een iPad zonder bereik), dan komt dat werk als apart project in
de lijst: *Klaver (apart bewaard 16-10 15:56 - julian, iPhone)*. De app voegt
het niet zelf samen. Iemand moet het openen, vergelijken, wat nodig is
overnemen, en het daarna weggooien (🗑 in de projectenlijst).

## 10. Bij een klacht of storing

Vraag eerst:

1. **welke versie** (op het startscherm, bijv. *v108*);
2. **welk apparaat en welke browser** (iPad, iPhone, Mac, Android, Windows;
   Safari of Chrome; als app op het beginscherm of niet);
3. **wanneer**, en of er **bereik** was;
4. een **schermafdruk** van wat je zag.

Daarna:

- Oudere versie? Eerst **↻ Bijwerken**.
- **Nooit** "websitegegevens wissen" of de app van het beginscherm
  verwijderen als er misschien nog werk zonder bereik klaarstaat: dat werk
  staat dan alleen op dat apparaat, en is daarna weg. Eerst met bereik openen
  en wachten tot er "Opgeslagen" staat.
- Geef de antwoorden aan Claude, met de versie erbij.

## 11. Beveiliging in het kort

- Zelf aanmelden staat **uit** (Authentication → Sign In / Providers). Zo
  laten.
- RLS staat op alle tabellen aan; iedereen die inlogt mag alle projecten zien
  en wijzigen. Komen er onderaannemers bij, dan is een rolmodel nodig.
- Geen tweestapsverificatie: één gelekt wachtwoord geeft toegang tot alles.
  Zorg dat ieder een eigen, sterk wachtwoord heeft.
- Een eigen domein voor de app (in plaats van `github.io`)? Dan eerst Claude
  vragen: daar horen voorzorgen bij tegen domeinovername, en de Site URL in
  Supabase moet mee.
