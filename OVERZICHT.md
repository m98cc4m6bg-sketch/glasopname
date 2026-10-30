# Glasopname — overzicht: hoe de app in elkaar zit

*Voor wie wil begrijpen hoe de app werkt, en hem zonder AI wil kunnen
onderhouden. Bijgewerkt op 27 oktober 2026, bij v125 (gevonden door Jan
na v124 en zijn keuzes: "Verder met" na de prullenbak, de naam van een
project in de prullenbak vrij met script 31, de werkvloer zet de leverfoto
en vinkt taken zonder eigenaar af, spacer zwart weg bij glas zonder spouw en
op de werkvloer-pdf, een verhuisde ruit houdt zijn glasmaat, de onderlat met
plaatjes). Daarvoor v124 (wensen van Jan:
rollen en het tabblad Beheer met script 30, "Onlangs verwijderd" en ↶ na
herladen, ruiten aanwijzen op meer tekeningen, projectnaam bovenaan, max
glaspakket uit de import, spacer, Toebehoren in drie stappen met een
latkiezer). Daarvoor v123: de bekende punten uit de controles van v90 en
v103; script 28 en 29.*

Wordt bij elke nieuwe versie bijgewerkt, net als `BEHEER.md` en
`DATAMODEL.md` (zie "Handleidingen" in de nota per versie, `WIJZIGINGEN-vNN.md`; die staat sinds v111 in de zip "niet-in-repo" en in de projectkennis, niet in de openbare repo).

**Waar staat wat** (elk soort informatie op één plek):

| wat | waar |
|---|---|
| hoe de app werkt | dit document |
| database en rechten | `DATAMODEL.md` |
| wat je doet (publiceren, gebruikers, back-up, klachten) | `BEHEER.md` |
| waar we nu staan, wat er openstaat | `STATUS.md` |
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` (zip "niet-in-repo" en projectkennis) |
| hoe we testen | `TESTEN.md` |
| regels voor Claude | `CLAUDE.md` |
| valkuilen per onderdeel (voor Claude) | `docs/<onderdeel>.md` |
| beslissingen, bugboek, beveiliging | `claude/BESLISSINGEN.md`, `claude/BUGBOEK.md`, `claude/BEVEILIGING.md` in de projectkennis op claude.ai (niet in de openbare repo; tot 27-10-2026 samen `HANDOVER.md`) |

---

## 1. Wat de app doet

Glas inmeten op de bouwplaats, met meerdere mensen en apparaten (iPad,
iPhone, Mac, Android, Windows), ook zonder bereik. Uit de opname komen:
- een **bestellijst als pdf** voor de glasleverancier (Van Noordenne);
- een **overzicht als pdf** voor het archief (⬇ Exporteren → *PDF invoer*,
  bestand `Inmeting_….pdf`): de projectgegevens en per foto een pagina met de
  merkletters erop en de maten eronder;
- een **pdf voor de werkvloer** (⬇ Exporteren → *🔨 PDF werkvloer*, v118):
  per foto de ruiten met latten en stuklengtes, plus het zaagplan; geen
  prijzen, niet voor de leverancier.

| | |
|---|---|
| Live | https://m98cc4m6bg-sketch.github.io/glasopname/ |
| Repo | github.com/m98cc4m6bg-sketch/glasopname (openbaar) |
| Database, inloggen, foto's | Supabase, gratis plan |
| Bron van waarheid | de database in Supabase. Het apparaat heeft een kopie, en werk dat nog omhoog moet |

## 2. Hoe het in elkaar zit

```
 ┌──────────── apparaat (iPad, iPhone, Mac, …) ────────────┐
 │                                                          │
 │  de app: index.html + losse .js-bestanden                │
 │     │                                                    │
 │     ├── kopie van het open project  (localStorage)       │
 │     ├── foto's die nog omhoog moeten (IndexedDB)         │
 │     │                                                    │
 │  service worker (sw.js): bewaart de app zelf,            │
 │  zodat hij zonder bereik opent; regelt nieuwe versies    │
 └──────────────────────┬───────────────────────────────────┘
                        │ internet (als er bereik is)
        ┌───────────────┴────────────────┐
        │                                │
  GitHub Pages                       Supabase
  (de bestanden van de app)          inloggen · database · foto's (Storage)
                                     · live doorgeven aan andere apparaten
```

- **Geen bouwstap, geen framework.** De bestanden in de repo zijn precies wat
  de browser inleest. Wat je in de repo ziet, draait.
- **Eén project = één JSON-blok** in de database (`projecten.data`). Opslaan
  stuurt het hele project. Simpel en robuust, met één nadeel: zonder
  afspraken overschrijven twee apparaten elkaar. Daarom het bewerkslot (§4 en §6).
- **Offline eerst.** Alles wat je doet, staat eerst op het apparaat en gaat
  daarna naar de server. Zonder bereik werk je gewoon door.

## 3. Waar staat het werk? (het belangrijkste begrip)

Op elk moment staat het werk op een van deze twee plekken:
1. **op de server** (Supabase): veilig, iedereen ziet het;
2. **op het apparaat, met de vlag "moet nog omhoog"**: zodra er bereik is,
   gaat het vanzelf naar de server.

Een derde plek bestaat niet. Daar is de app op gebouwd en getest. Gevolg voor
beheer: **wis nooit websitegegevens, en verwijder de app niet van het
beginscherm, zolang er misschien nog werk zonder bereik klaarstaat** (bovenin
staat dan "⚠ Offline — lokaal" of een rode teller bij de foto's).

Werk dat niet bij het open project hoort (bijvoorbeeld van een iPad die
offline doorwerkte terwijl een ander het project had), wordt nooit
weggegooid. Het gaat als **apart project** naar de server: *Klaver (apart
bewaard 16-10 15:56 - julian, iPhone)*.

Twee tabbladen op één apparaat delen één kopie. Werk van een ander project
dat nog omhoog moet, gaat eerst als apart project naar de server. Staat
hetzelfde project in twee tabbladen open, dan zegt de app dat onderin
(BroadcastChannel; v120).

## 4. Hoe het werkt, per handeling

Van wat je ziet naar wat de code doet. Bestand en functienaam, zodat je het
terugvindt (Cmd+F).

| handeling | route |
|---|---|
| **Inloggen** | inlogscherm (`index.html`, `#cloudLoginForm`) → `cloud.js` `cloudLoginVerstuur` → `login()` → Supabase. Pas na een geslaagde inlog biedt de app het wachtwoord aan de browser aan (`wachtwoordAanbieden`): Chrome/Edge/Android via `PasswordCredential`; Safari/Firefox doordat het formulier "verstuurt" naar `leeg.html` in een verborgen, afgeschermd kader. De velden hebben geen `name`, dus er gaat niets mee (v109) |
| **Wachtwoord vergeten?** | knop op het inlogscherm → `cloud.js` `cloudWachtwoordVergeten` → alleen een melding: bewust geen herstelfunctie in de app (v109) |
| **Nieuw wachtwoord via een herstellink** | Jan stuurt vanuit Supabase een herstelmail → de link opent de app met `#access_token=…&type=recovery` → `cloud.js` `init` → `leesHerstelLink()` leest het adres en haalt het meteen leeg (vóór de verbinding; de bibliotheek leest het adres bewust niet zelf: `detectSessionInUrl: false`) → `herstelSessie()` zet de sessie (`setSession`, met ‹Opnieuw proberen› zonder bereik) → venster `#cloudHerstel` (`toonHerstel`) → `herstelOpslaan()` → Supabase `updateUser` → `wachtwoordAanbieden` met het nieuwe wachtwoord → startscherm. Verlopen link: `herstelLinkFout`. Herladen of nieuw tabblad: vlag `glasopname_herstel` (id van de gebruiker) in localStorage (v109) |
| **Startscherm, projectenlijst** | `start.js` → `cloud.js` `glasProjecten()` → tabel `projecten` (alleen de samenvattingskolommen, niet de hele inhoud); tegelijk eerst opruimen (`prullenbak_opruimbaar`: wat langer dan 30 dagen in de prullenbak staat), dan prullenbak en taken. Knop 📞 (telefoon); 💾 (back-up) sinds v124 alleen voor een beheerder |
| **Rollen en rechten** (v124, script 30) | `rechten.js`: bij het startscherm haalt `glasMijnLaden` de eigen rij uit `gebruikers` (rol `beheerder`/`collega`/`werkvloer` en vier rechten `mag_bestellen`, `mag_ontgrendelen`, `mag_nieuw`, `mag_weggooien`), onthoudt die per gebruiker op het apparaat (`glasopname_rechten_<id>`, ook zonder bereik) en zet klassen op `<body>` (`rol-…`, `geen-…`). `glasRol()`, `glasMag(recht)`, `glasWerkvloer()`, `glasIsBeheerder()`. Vóór bestaande functies staat een controle met een duidelijke reden (nieuw project, weggooien, ontgrendelen, intrekken, ‹Ja, verstuurd›, bestelmail, definitief verwijderen, 💾). Vóór ontgrendelen, intrekken, de bestellijst voor de leverancier, de mail en ‹Ja, verstuurd› haalt de app de rechten eerst vers op (hoogstens 3 s). Zonder bestelrecht geen bestellijst voor de leverancier (wel overzicht en werkvloer-pdf). **De database beslist** (script 30); weigert hij met "Geen recht: …", dan gaat bij een bestelling alleen het bestel-deel terug naar de stand van de server en wordt de rest opgeslagen, anders gaat het werk apart (nooit weg). Zonder script 30: alles werkt als in v123 |
| **Werkvloer** (v124, keuze Jan) | kijkt altijd alleen (`bewerkslot.js` claimt niet), maar mag foto's toevoegen en eigen taken afvinken. Een foto: `rechten.js` `glasWerkvloerFoto` → eigen wachtrij `glasopname_erbij` → database-functie `glas_foto_erbij` (zet één foto in het project zonder het werk van wie bewerkt te overschrijven) → op de andere apparaten via `glasErbijFotosErbij`. ↶ haalt zo'n foto nooit weg (`_erbij`-merk, undo.js `herstel`). Bij uitloggen met wachtende werkvloer-foto's eerst versturen, anders vragen. **v125 (keuze Jan, script 31):** ook de leverfoto (knop 📍 Leverfoto in de balk, `glasWerkvloerLeverKies` → `leverFotoWerkvloer` in fotos.js → dezelfde wachtrij met `soort: 'lever'`; de nieuwe vervangt de oude, ook in de database) en taken zonder eigenaar afvinken (`renderTaken` in project.js). Niet: ruiten aanwijzen. Zonder script 31 zoals v124. **v126 (gevonden door Jan):** zo'n foto op het scherm telt niet als "gewijzigd tijdens meekijken" (`alleenWerkvloerFotos` in cloud.js), dus geen venster "Werk apart bewaard" en geen kopie als kantoor het project opent |
| **Tabblad Beheer** (v124, alleen beheerder) | startscherm → `rechten.js`: gebruikers (rol, de vier rechten, blokkeren = `actief` uit, laatst ingelogd, laatst actief, app-versie, bezig in) via `glas_beheer_gebruikers` / `glas_beheer_zet`; 💾 back-up; prullenbak nu legen; **Opslag nakijken** (`glas_beheer_opslag`: foto's per soort; "zonder project" = geen enkel project noemt het pad, ook geen apart bewaarde kopie; opruimen via de Storage-API). Een geblokkeerde collega ziet op het startscherm dat zijn account geblokkeerd is (`glas_mijn_status`), niet een lege lijst |
| **Zoeken** (v123) | zoekvak op het startscherm (en in het oude projectenvenster) → `cloud.js` `zoekVerzoek()`. Met script 29: de zoekfunctie `glas_zoek_projecten` in de database (naam, klantnaam, adres en datum; zonder accenten en hoofdletters; elk woord los, in willekeurige volgorde). Zonder script 29 (de functie bestaat niet: dan wordt het één keer geprobeerd, `zoekFunctie = false`): de gewone vraag met `or()` op naam, datum, adres én klantnaam (`data->info->>klant`), mét accenten |
| **Mijn telefoonnummer** (v120) | startscherm 📞 → `cloud.js` `glasMijnTelefoon` → tabel `gebruikers`, kolom `telefoon` (script 26); op de bestellijst bij "Besteld door" |
| **Back-up** (v120) | startscherm 💾 (sinds v124 alleen voor een beheerder, ook op het tabblad Beheer) → `backup.js` `glasBackup` → één zip met projecten, taken, gebruikers, app_data (en desgewenst alle foto's); geen logboek. De knop valt op als er op dít apparaat 30 dagen geen back-up is gemaakt (`BEHEER.md` §8) |
| **Automatische back-up** (v122) | **buiten deze repo**: de privé repository `glasopname-backup` (`backup.py`, GitHub Actions, elke nacht) → Supabase met een account op alleen lezen (script 27) → Dropbox (eigen app-map): `gegevens/…zip`, `fotos/` (alleen nieuwe), `LAATSTE-BACKUP.txt`. Een nieuwe tabel in de database: ook daar in `TABELLEN`/`EXTRA` zetten. Het back-upaccount staat niet in de keuzelijsten (`glasGebruikers` filtert `alleen_lezen`) |
| **Project openen** | `cloud.js` `cloudOpen(id)` → `zetStaat()` → `index.html` `renderTabel()`. Tegelijk `bewerkslot.js` `glasBewerkslotStart()`: mag ik bewerken, of kijk ik mee? (tabel `bewerkslot`, functie `glas_bewerken`) |
| **Maat invullen** | tekstvak → `leesMaat` (komma mag, een halve mm naar beneden; v120) → `setVal` → `index.html` `herbereken()` / `berekenGlasMaat()` → `opslaan()`; na het typen `maatNaTypen` (melding bij afronden); het aantal via `zetAantal` (heel getal 1–999). Opslaan: (in `cloud.js`; die in `index.html` is alleen de terugval zonder cloud): eerst op het apparaat (`glasopname_v2`) met de vlag "moet nog omhoog" (`glasopname_pending`), dan `synchroniseer()` → `projecten.data`. De database controleert (versieslot, bewerkslot, bestellingen, sinds script 26 ook geldige nummers) en schrijft het logboek |
| **Geen bereik** | `synchroniseer()` ziet dat er geen verbinding is → het werk blijft met de vlag op het apparaat, status "⚠ Offline — lokaal". Bereik terug: eerst status en bestellingen van de server lezen en samenvoegen (`voorlezenEnVersturen`), dan versturen |
| **Een collega wijzigt** | Supabase stuurt de nieuwe rij live → `cloud.js` `vanElders()` → scherm bijgewerkt ("↻ Bijgewerkt door collega") |
| **Meekijken / overnemen** | `bewerkslot.js`: balk "… heeft dit project open" met ‹Toch bewerken› → vraag aan de bewerker (10 s aftellen) → `geefVrij()`; reageert die niet: ‹Overnemen› |
| **Foto of tekening** | (v123) eerst verkleinen (`verklein`); tot het bewaren klaar is telt `glasFotoBezig()` (hoogstens 2 minuten per foto), en `cloud.js` `magVerlaten` wacht daarop vóór er een ander project opent. Elke stap kijkt of het nog hetzelfde project is (`bijProject(pid)`); zo niet, dan stopt hij met een melding en komt de foto nergens anders in. Dan `fotos.js` `bewaarBestand()` → `wachtrij.js` (eerst op het apparaat, IndexedDB) → op de achtergrond naar Storage `projectfotos/<project>/…`. Ophalen: `fotoBlob()`. Sinds v116 bewaart de wachtrij van een bestand uit de camera of bestandskiezer de inhoud zelf (`alsKopie`), en verstuurt hij altijd een kopie in het geheugen (`kopie` in `uploadEen`): Safari stuurde een bestand uit IndexedDB als 0 bytes ("No content provided"). Een leeg bestand (of minder gelezen dan bewaard) gaat nooit omhoog en wordt nooit weggegooid; een leesfout of een leesactie langer dan een minuut houdt de andere foto's niet tegen; lukt iets 3 keer niet, dan zegt het venster het (`VAST_NA`) |
| **Tekenen op een foto** | `teken.js` (pen, vormen, tekst); de merkbolletjes in `fotos.js`. Sinds v123 is elke streek, elke gumbeweging, het weghalen van het laatste onderdeel en een andere kleur/dikte/grootte één stap voor ↶ (Cmd/Ctrl+Z): de stap wordt bewaard vóór de wijziging (`bewaarStap`); een tik zonder streek neemt zijn stap terug (`stapTerugnemen` in undo.js). De gum pakt ook tekst (`closest('[data-streek]')`). Foto draaien (`fotoDraaien`): een tweede tik wacht tot de eerste klaar is (`draaitNu`); een tekstvak blijft rechtop, zijn midden draait mee (`draaiCoordinaten`) |
| **Ruit op de foto aanwijzen** | tik op de foto → `fotos.js` `fotoTik`: een nieuwe ruit met de volgende letter, of (na ‹🎯 Ruiten aanwijzen›, `fotoAanwijzen`) een bolletje voor een bestaande regel die er nog niet genoeg heeft. Het aanwijzen verandert nooit het aantal: een ingelezen maatstaat is de waarheid. **Sinds v124 (keuze Jan: "één ruit, bolletjes verdeeld")** werkt aanwijzen op elke tekening en kies je uit álle ruiten van het project (gele balk met knoppen per ruit, ‹Alle 3 op één plek›, ‹Volgende tekening →›). Een ruit staat in het blok van de tekening met de meeste bolletjes (gelijk = de eerste; `thuisVan`, `naarBolletjes`, in dezelfde ↶-stap); in de andere blokken een verwijzing ("A2 ×1 hier, staat bij tekening 1 →"). Na een import met 2 of meer tekeningen bovenaan de route "🎯 Wijs de ruiten aan op de tekeningen" (`aanwijsRouteNaImport`). Verhuizen verandert het kenmerk niet (geen "gewijzigd" na een bestelling). **v125 (keuze Jan):** heeft het nieuwe blok een andere speling of bijtelling, dan houdt de ruit zijn glasmaat: zijn oude waarde wordt zijn eigen correctie (`verhuisRuit` in index.html, `correctieMee`; geel in de kolom Corr., met uitleg "wijkt af van de algemene blokspeling", en een kort bericht `verhuisMelding`). Zo'n correctie telt niet in het kenmerk; zelf een speling kiezen (`setCorrectie`, ⤓ doorvoeren) wel. Ook bij ‹Ruiten bewaren› als een groep weg gaat (`groepVerwijder`) |
| **Het aantal in een fotoblok** (v110, keuze Jan) | heeft een regel minstens één bolletje, dan staat het aantal-vak vast (`index.html` `aantalCel`, `aantalVolgtBolletjes`; `setVal` weigert). Een ruit erbij: tik op een bolletje → ‹＋ Nog een ruit met deze letter› (`markErbij`) → de volgende tik op de foto zet het bolletje én het aantal +1, in één stap (één Cmd+Z). Eraf: ‹Één ruit minder› (`markEenMinder`). Doorvoeren (⤓, `bulk.js`) en gelijktrekken (`kopie.js`) slaan het aantal van zulke regels over en zeggen dat. Een regel zonder bolletjes houdt een vrij aantal |
| **Aantal en bolletjes kloppen niet** (oud project, of half aangewezen) | strook onder de foto (`fotos.js` `scheefHTML`), per regel een keuze: ‹Er zijn er N› (`markAantalNaarBollen`), ‹… het gestreepte bolletje weg› (`markTeveelWeg`), ‹Aanwijzen› (`markAanwijzenRij`). Niets gaat vanzelf; een lager aantal vraagt eerst even (het kan uit een maatstaat komen); tijdens het aanwijzen blijven de regels die nog aangewezen worden uit de strook. Een bolletje te veel (rode stippelrand) heeft in zijn menu alleen "weghalen" |
| **Bestellijst** | ⬇ Exporteren → `pdf.js` `exportBestellijstPdf()` → levergegevens (`exportMetControle`) → `voorControles()`: oudere stand? annuleren?, `aantalControle` ("Klopt het aantal?", v110), `pakketControle` (ook A5-nood, v119), `kleurControle`, `vreemdeControle` ("Klopt dit?", v120: glas < 100 mm, > 3210 × 6000, aantal > 99, rooster/glasdikte) → pdf → `afleveren()` (opslaan/delen) → vraag "Naar de leverancier?" (`vraagVerstuurd`) → Ja: bestelling vastgelegd in `info.bestellingen`, status besteld, invoer op slot |
| **Volgende bestellijst** | altijd een **aanvulling**: alleen nieuw en gewijzigd, VERVANGT, ANNULEREN (`teBestellen()` in index.html, `bestelModus()` in pdf.js). Alleen een ander aantal (v110, `aantalVerschil()`): meer = **EXTRA** in de tabel met alleen het verschil als aantal; minder = niet in de tabel, wel onder ANNULEREN ("1 annuleren, de andere 2 blijven"). Alleen de bediening anders (v112, `bedieningVerschil()`): niet in de tabel, maar in een eigen blok **ALLEEN BEDIENING – glas NIET opnieuw maken en NIET annuleren** (`bedieningTabel` in pdf.js), ook naast een EXTRA of "N annuleren". Alleen het rooster anders (v114, keuze Jan: RAL, bi-color, of een Duco type met dezelfde glasaftrek, `ducoWisselMag`): idem, blok **ALLEEN ROOSTER – glas NIET opnieuw maken** (`roosterTabel`, `teBestellen().rooster`, `roosterInTekst`). Verandert er ook iets aan het glas (maat, glas, opmerking, rooster aan/uit, Duco type met een andere aftrek), dan blijft het VERVANGT. Bovenaan elke aanvulling staat (v114, keuze Jan) "Graag bevestigen dat u deze aanvulling verwerkt, met name VERVANGT en ANNULEREN." Na een EXTRA noemt de app bij elke ruit alle lijsten waar hij in zit ("uit de 1e en 2e", `besteldInTekst()`) |
| **Dubbel besteld / intrekken** (v120) | elke bestelling heeft `basis`; twee geldige met dezelfde basis → venster + rode balk op Bestellijst (`dubbelBestelMelding`, `.bestel-dubbel`) → ‹Intrekken…› bij de laatste (`bestellingIntrekken`, eigen wachtwoord). Het nummer voor de leverancier telt ingetrokken lijsten niet mee (`volgendBestelNr`) |
| **Ontgrendelen na bestellen** | `index.html` `slotOntgrendel()` → eigen wachtwoord (`melding.js` `appWachtwoord`) → `cloud.js` `glasWachtwoordKlopt()` → logboek |
| **Bediening bij een rooster** (v111) | kolom Bediening op Invoer (alleen zichtbaar als er een rooster is): `index.html` `bedieningCel` → `setBediening` (1× of 2× stang of koord) en `setBedieningLengte` (mm; leeg = standaardlengte). Bewaard op de ruit als `bediening`, `bedieningAantal`, `bedieningLengte`. Gaat mee naar de leverancier: kolom op de bestellijst, en een regel "Extra bediening: …" in het LET OP-kader. Rooster op Nee (ook via ⤓ doorvoeren) haalt de bediening weg. Het gewone knopje op het rooster zit er altijd; dit is een aanvulling |
| **Toebehoren** (v111) | tabblad 🧰 Toebehoren → `toebehoren.js` `renderToebehoren()` (sinds v124 in drie stappen: 1 voor het hele project, 2 per ruit, 3 wat bestellen en zagen; bovenaan "Zo werkt dit tabblad" en "Nog te regelen"; rekenregels standaard dicht, open/dicht onthouden op het apparaat) → `bereken()`: glaslatten per type (A4, B5, N30 …; v113), in de lengte waarin de lat verkocht wordt (meestal 4 m, grenen 2,7 m), glasband, glaskit, wienersprossen-tape. Aantal lengtes (v120, keuze Jan): het zaagplan + `RESERVE_LENGTES` (standaard 1) per lattype; een lat langer dan de lengte gaat apart. Onderlat per ruit volgens de latzijde (`onderlatVoorRuit`: buiten = passende neuslat, binnen en beide = dezelfde lat (v115), geen = geen latten), per ruit aan te passen. Melding bij ruiten zonder zijde. **Sinds v115 kies je hier de latten** (wens Jan): per foto een kopje met de foto en de merkletters (`fotoVoorbeeldHTML` in fotos.js, `inktSVGHTML` in teken.js) en "latzijde hier"; per ruit glastype, opbouw (via `wijzigGlasType`/`wijzigOpbouw`, gelijk met Invoer), dikte, diepte, onder, latzijde, glaslat (`latKiezen`), onderlat (`latOnderKiezen`), band, oordeel (`latPakket`) en wat er nodig is; bovenaan "Alle ruiten" (`toebehorenAlles`). Opnieuw tekenen via `later()` en `zetInhoud` (alleen wat anders is; de focus blijft). Schermbreedte (v118): ≤ 640 px per ruit een kaartje (dicht één regel, tik = open); 641–1260 px twee regels per ruit; vanaf 1261 px een tabel met vaste kolommen, per foto een eigen tabel. **v117:** kolom Pakket (`pakketDikte`: glas + band; met lat; max uit de maatstaat), een voorbeeld van de glaslat bij "Alle ruiten" (`alleVoorbeeldHTML`, keuzes onthouden in `alleKeuze`), "Alle ruiten" slaat een neus/ventilatielat over bij binnen en zegt welke (`onderMagBij`), en per lattype een uitklapbaar zaagplan (`zaagHTML`, HTML-balken; open/dicht onthouden in `zaagOpen`). **v120:** ruiten aanvinken (`gekozen`). **v121:** bij aangevinkte ruiten een actiebalk onderin (`balkHTML`: diepte, latzijde, glaslat, onderlat, band binnen) met vóór het toepassen per ruit nu → na (`balkVoorbeeld`, rekent via `proef` in `perRuitVan`; `keuzeOp` past een keuze toe), dan `toebehorenBalkToepassen` + ↶ Terugzetten; het blok bovenin is dan één regel en werkt anders op alle ruiten. De neuslat in het zaagplan recht: de sponningmaat in de breedte (glasbreedte + 2 × speling) + `NEUSLAT_TOESLAG_MM`. Latzijde beide: een rustige melding (`tb-zacht`) en "beide kanten" in de onderlatknop. Instellingen per project (inklapbaar blok) in `info.toebehoren`. Na een bestelling gaan alle keuzes per ruit op slot (zijde, diepte, glaslat, onderlat, band per ruit, montage, de actiebalk; v114, `latSlot`); de instellingen van het project (band, kit, reserve) blijven vrij; niets bij alleen kijken |
| **Sponning en glaslat** (v113, v115) | Invoer, groep Sponning: alleen **Diepte** (zij en boven) en **Onder** (`latten.js` `sponCellenHTML`; v115, wens Jan). Vak → `latDiepte` / `latOnderDiepte`. Op Toebehoren: oordeel → `latPakket` (`pakketVenster`: boven en onderin met tekening (`pakketSVG`, `neusSVG`), diepten, latzijde, glaslat, montage normaal/omgekeerd, onderlat, band binnen en (v118) band buiten, uitfrezen, advies per plek om aan te tikken → `pasAdviesToe`); latknop → `latKiezen` (`kiezer`, met foto en montage-tekening (`montageSVG`); opdeklatten normaal en omgekeerd); onderlatknop → `latOnderKiezen` (`onderKiezer`: automatisch, zelfde, alleen de neuslatten die passen met ventilatie en uitsteek, ventilatielatten, andere). Bovenin elk venster de ruit met de foto (`ruitKop`). Rekenen: `pakket()`, `oordeelRuit()` (het slechtste van boven, onder en sinds v117 het max glaspakket `maxOordeel`), `adviezenMet()`, `neuslatVoor()`. v117: bij latzijde binnen geen neus- of ventilatielat (`onderMagBij`; een oude keuze wordt rood via `alleenBuiten`, niet stil veranderd); de opbouw-keuzelijst (`opbouwKeuzeHTML` in naslag.js) zet te dikke opbouwen apart (`opbouwTeDik`). Bewaard in `info.toebehoren.perRuit` (`toebehorenZetRuit`), niet op de ruit. Na een bestelling op slot (v114, `magKiezen` + `SLOT_FUNCTIES`). Kennis en bronnen: `GLASLATTEN.md` |
| **Merk in beeld bij zijwaarts vegen** (v114) | het merk staat ook in de vaste eerste kolom (`.rijnr-merk`, `merkInRijnr`). Die kolom blijft staan doordat `table.invoer` géén `overflow: hidden` heeft (dat brak `position: sticky`) |
| **Bi-color rooster** (v114) | kolommen **Bi-color** (Nee/Ja, `zetBiColor`) en **RAL binnen** (`zetRalBinnen`, `ralBinnenCel`) naast RAL; de kop RAL heet "RAL buiten" zodra er in die tabel een bi-color is (`roosterKolommen`). Op ruit: `biColor` ('Ja' of afwezig), `ralBinnen`. Op papier `ralTekst()`: "Bi-color buiten: … / binnen: …". Vóór de bestellijst `kleurControle` ("Bi-color zonder kleur"). Rooster op Nee haalt bi-color weg |
| **Past het in de sponning? bij de bestellijst** (v113) | `pdf.js` `voorControles()` → `pakketControle()`: "Past het in de sponning?" bij "past niet" of "te ruim" (sinds v115 alleen nog bij een opdeklat; sponning in zicht is goed), bij een A5 die alleen in nood past (v119), en (v114) de ruiten zonder latzijde ("Latzijde nog niet gekozen" als alleen dat ontbreekt). Daarna `kleurControle()` (v114). Stoppen / Toch doorgaan. De leverancier ziet geen latten |
| **Overzicht (PDF invoer)** | `pdf.js` `exportFotoPdf()`; sinds v111 achteraan een pagina "Toebehoren - intern" (`toebehorenPagina`, v115 met diepte, montage, "geen (meegeleverd)" en oordeel), sinds v113 in de tabel per foto de kolommen Spon. ("40/48" als onder anders is) en Lat/pakket; sinds v117 het zaagplan als tekening (balken per lengte). Sinds v123 staat de roedenopmerking in de kolom Opmerking ("roeden: …"), en staat bij een foto die niet op te halen was (geen bereik, of nog op een ander apparaat) in rood "De foto kon niet worden opgehaald", met na het opslaan een venster (`fotosMisluktMelding`; ook bij de PDF werkvloer). Ook bij "Alles exporteren"; **nooit** op de bestellijst |
| **Tabblad Bestellijst = de pdf** (v118, wens Jan) | `index.html` `renderBestellijst()` tekent `bestellijstModel()` uit pdf.js: dezelfde kolommen (lege weg), regels, kader (aanvulling/overzicht), blokken (ANNULEREN, ALLEEN BEDIENING, ALLEEN ROOSTER), rooster-noot en totaal als de pdf (`kopTeksten`, `annulerenLijst`, `totaalTekst`, `bedieningRegel`). Glasbewerking staat er altijd, ook "Helder (standaard)" |
| **Alles exporteren** (sinds v119 met de PDF werkvloer) | `pdf.js` `exportVerderNu('alles')`: bestellijst, PDF invoer en PDF werkvloer, als losse bestanden (`leverMeerdere`), daarna "Naar de leverancier?" |
| **PDF werkvloer** (v118, wens Jan) | ⬇ Exporteren → 🔨 PDF werkvloer → `pdf.js` `exportWerkvloerPdf()` → `startExport('werkvloer')` (geen levercontrole, legt niets vast) → `bouwWerkvloerPdf()`: per foto of tekening `tekenFoto` (bolletjes) + tabel (`werkvloerRegels`: glasmaat, opbouw, latzijde, glaslat, onderlat, band, latten met stuklengtes uit `toebehorenBerekenen().perRuit[].stukken` (een neuslat als "N30 recht", v121), kolom "Let op": latzijde ontbreekt, past niet/te ruim/krap, NOOD (A5), vlak met kozijn, plus de opmerking van de ruit (v119/v120)); losse regels onder de laatste foto als ze passen; dan `toebehorenPagina(doc, 'Werkvloer - benodigdheden en zaagplan')`. Geen prijzen |
| **Kruisje op alles wat openklapt** (v118, wens Jan) | `index.html` `sluitKruis(el, sluit, label)` (ook Escape) voor menu's (Exporteren, datum, uitleg (i), adres, leverkalender, bolletje, doorvoeren ⤓); `button.sluit-x` in `<details>` (zaagplan, lattengroep), instellingen, Naslag-onderdeel, foto en lat groot |
| **Lege kolommen** (v115, Jan) | op de bestellijst en de PDF invoer komt een kolom alleen als er iets in staat (`leegWaarde` in pdf.js; een streepje telt als leeg). Bestellijst altijd: positie, aantal, glasmaat en (v118) glasbewerking. PDF invoer altijd: merk, aantal, maatsoort, maten, correctie, glasmaat |
| **Naslag: glaslatten en glasaftrek** (v115) | `naslag.js` `lattenTabel()` leest `GlasLatten.LATTEN` (één bron); de rooster-tabel heeft een kolom Glasaftrek uit `ducoAftrek()` |
| **Import: latten meegeleverd** (v115, keuze Jan) | `import.js` `geenLatten()`: ingelezen ruiten (elke import van een maatstaat) krijgen latzijde "geen (meegeleverd)" |
| **Importeren (maten uit pdf, Excel, csv)** | `import.js`, ⬆ Importeren. Kolomkoppen herkennen (`kopScore`, `raadMapping`); max glaspakket met `pakketLees`; staat een merk al in het project, dan eerst kiezen (‹Merk bestaat al›; 1 → 1a, A → A1; bolletjes gaan mee; v120). Sinds v123: uit een **pdf** gaat elke cel naar de kolomkop waar hij onder staat (`uitPdf` bewaart de plek per cel, `opKolom`), zodat een lege cel de rest niet naar links schuift. Staan er twee waarden onder één kop (koppen die aan elkaar vastzitten, of een kolom zonder kop), dan blijft de regel zoals hij was en weigert stap 3 hem ("mogelijk verschoven"): samenvoegen zou "2 1000" als 21000 lezen. Een regel met alleen tekst (geen getal) staat in stap 3 bij "niet overgenomen" (`zonderGetal`) |
| **Dubbele merkletters** (v123) | `merken.js`: rode balk → ‹Oplossen› (`merkDialoog`) toont per ruit wat ‹Automatisch hernoemen› doet ("wordt A1", of "behoudt de letter"); dezelfde berekening (`merkPlan`, `pasRegelToe`). Een al bestelde ruit (`besteldeStand().nr`) houdt altijd zijn merk; de andere tellen door |
| **Naslag (catalogus, roosters)** | `naslag.js`; foto's in `catalogus/` en `roosters/` |
| **Taken, logboek, klant, levering** | `project.js` (klantblok en levering staan op Invoer; Project info toont ze) → tabellen `taken`, `projectgeschiedenis`. Sinds v123 krijgt een open taak zonder eigenaar of van een oud-collega (niet actief) een label (`weesTaak`), en noemt de keuzelijst de oud-collega bij naam ("… (niet meer actief)") |
| **Nog niet opgeslagen** (bij een ander project openen, terug naar het startscherm, uitloggen) | `cloud.js` `magVerlaten()`: eerst wachten op een foto die nog verwerkt wordt (`fotoKlaar`), dan proberen op te slaan; lukt dat niet (geen bereik), dan het venster met ‹Apart bewaren en doorgaan› → `reddingBewaar()` → `reddingenUploaden()` (een apart project, zodra er bereik is). Sinds v123; tot v122 gooide ‹Toch doorgaan› het werk weg. Lukt zelfs apart bewaren niet (geheugen vol), dan gaat het niet door |
| **Uitloggen** (v123) | `cloud.js` `uitloggen()` → `magVerlaten('uitloggen')` → Supabase `signOut` → `wisKopieNaUitloggen()`: de kopie van het project (`glasopname_v2`) en "laatst geopend" gaan van het apparaat, alleen als er niets meer omhoog moet. Apart bewaard werk (`glasopname_redding`) en foto's in de wachtrij blijven |
| **Prullenbak** | `cloud.js` `cloudVerwijder()` → `verwijderd_op` gevuld; **v125:** ook "↩ Verder met …" vergeten (`glasVergeetLaatste`); het startscherm vergeet hem ook als het project niet in de volledige lijst staat (`lijstVolledig` in start.js: niet gezocht, niet afgekapt; dan is het weg, ook als een collega het weggooide). Met script 31 is de naam meteen vrij voor een nieuw project (`naamVrijInPrullenbak` → rpc `glas_naam_vrij_in_prullenbak`, ook `window.glasScript31`); terugzetten terwijl de naam bezet is → de database maakt er "Naam (2)" van, de app zegt het (`glasTerugzetten`) en neemt de naam bij het openen over in het project (`naamNaTerugzetten`, bij `cloudOpen` en het openen via een link). Twee mensen tegelijk dezelfde naam: de database weigert (23505), de app vraagt opnieuw (`maakProject`); terugzetten of na 30 dagen definitief (`definitiefVerwijderen`, ook de foto's). Sinds v124: definitief verwijderen vóór 30 dagen alleen een beheerder; het opruimen na 30 dagen doet elke app (de serverklok beslist). `fotosOpruimen` haalt alleen foto's weg die geen enkel project meer noemt (`glas_foto_nog_nodig`; een apart bewaarde kopie gebruikt de paden van het origineel) |
| **Onlangs verwijderd** (v124, wens Jan) | alles wat iemand in een project weggooit (groep/blok met ruiten, foto, losse ruiten, een selectie, een leeggemaakte tabel, de leverfoto, taken) komt in `info.onlangsVerwijderd` (`herstel.js`): wat, wie, wanneer; 30 dagen, hoogstens 60 items. Knop "🗑 Onlangs verwijderd (n)" op Invoer en een blok in Project info → Terugzetten (voor iedereen die mag bewerken): de ruit houdt zijn nummer en plek, de bolletjes komen terug op elke tekening waar ze stonden, een taak wordt opnieuw aangemaakt. Na een bestelling sluit het aan op de bestellijst (een teruggezette ruit hoeft niet meer geannuleerd te worden). De foto van de leverlocatie blijft sinds v124 in de opslag tot het project weg is (om terug te kunnen) |
| **Ongedaan maken** | `undo.js` (Cmd/Ctrl+Z, Ctrl+Y); per tabel ↶ en ↷ in de balk boven de tabel (`blokbalk.js` `blokOngedaan`; ziet sinds v110 ook een wijziging van alleen de bolletjes; sinds v123 ook speling en bijtelling, `maatVan`/`zetMaat`). **v124:** (1) de fout "haalt een bolletje weg en zet het de tweede keer terug" (Jan, Safari): ↶ per tabel herschrijft nu de stapel (`deelVan`/`zetDeelIn`), en wat in een vak getypt was wordt eerst een eigen stap (`undoVeldAfsluiten`; in Safari krijgt een knop bij een klik geen focus). (2) Een ruit die verhuisde en daarna niet meer veranderde gaat helemaal terug (regel en bolletjes op elke foto); is hij daarna nog gewijzigd, dan blijft hij staan, en ↶ slaat die stap over. (3) De stapel blijft per apparaat en project bewaard in IndexedDB (`glasopname_ongedaan`; 40 stappen, 10 projecten) en werkt na herladen, maar alleen als de stand precies dezelfde is; is het project intussen elders veranderd, dan vervalt hij ("↶ kan niet verder terug dan nu…"). (4) Staat er een nieuwere stand klaar (‹… versie laden›), dan geen ↶ maar eerst laden. (5) Uitloggen wist de stapel (`undoWisAlles`). Een werkvloer-foto (`_erbij`) en bestellingen draai je nooit terug |
| **Nieuwe versie** | `sw.js` haalt de nieuwe bestanden op (alleen als **alle** binnen zijn: `allesInCache`) → `cloud.js` `zoekUpdate()` → eerst het werk opslaan en wachten (`veiligBijwerken`), dan pas herladen |
| **Keuzelijsten** | `DATA` bovenin `index.html`, overschreven door `app_data.glas_data` uit de database (`cloud.js` `pasDataToe()`) |
| **Projectnaam bovenaan** (v124) | `start.js` `zetProjectKop` vult `#vasteProjectNaam` in de vaste balk met de tabbladen (`#vasteKop`): altijd zichtbaar, ingekort met …, een tik toont de hele naam (`projectNaamUitklap`); onder 1100 px een dunne regel boven de tabbladen, vanaf 1100 px rechts ernaast. Volgt typen, live wijzigingen en ↶ (`volgNaamVak`) |
| **Max glaspakket bij het kiezen** (v124, wens Jan) | uit een import (`r.maxPakket`, kop bijv. "Max incl. band": `import.js` `pakketKopScore`; stap 3 zegt wat er past, `maxPastHtml`). Opbouwen die met band niet passen staan grijs apart (v117, `opbouwTeDik`); sinds v124 ook **glastypes** zonder één passende opbouw: grijs en niet te kiezen (`naslag.js` `glasTypeKeuzeHTML`, `latten.js` `maxType`). Wat er al stond wordt niet veranderd maar rood (`glasTypeTeDik`); ⤓ doorvoeren en gelijktrekken slaan te dik glas over met een melding |
| **Spacer** (v124, keuze Jan) | kolom Spacer op Invoer (na Dikte): standaard zilver of zwart, alleen bij glas met een spouw (`heeftSpouw`). Op de ruit `spacer: 'zwart'` (zilver = afwezig). Op de bestellijst en pdf's alleen een kolom als er zwart is; in het kenmerk alleen bij zwart (oude bestellingen tellen niet als gewijzigd); zwart ↔ zilver na een bestelling = VERVANGT. **v125 (keuze Jan):** gaat een ruit met zwart naar glas zonder spouw (ander glastype of opbouw, op Invoer, Toebehoren of ⤓ doorvoeren), dan gaat zwart weg met een kort bericht (`spacerNaWissel`; niet bij een leeg glastype, niet bij openen); op de werkvloer-pdf staat "spacer zwart" in de kolom Opbouw |
| **Glaslat kiezen met plaatjes** (v124, wens Jan) | `toebehoren.js` `toebehorenLatKiezer`: een eigen kiezer (de keuzelijst van Safari kan geen plaatjes) met per lat foto, montage, maat en uitleg; muis, toetsenbord (↑↓, Enter, Esc), vinger en pen; op de telefoon van onderen. Op drie plekken: Alle ruiten, de actiebalk, de standaardlat. Per ruit blijft het venster `latKiezen` (dat zegt per lat of hij past). Staat de latzijde op "geen (meegeleverd)", dan zegt het venster bij Toepassen dat de lat daar niet telt en biedt het binnen/buiten aan |

## 5. De bestanden

| bestand | regels | wat erin staat |
|---|---|---|
| `index.html` | 7.469 | de schermen, alle opmaak (CSS), de keuzelijsten (`DATA`, één regel van ±80.000 tekens), de invoertabel, het rekenwerk (glasmaat, dikte, gewicht), maten als tekst (`leesMaat`), het slot na bestellen, dubbel besteld, `kortBericht`, twee tabbladen |
| `cloud.js` | 4.465 | inloggen, nieuw wachtwoord via een herstellink, projecten openen/opslaan/synchroniseren, live bijwerken, nieuwe versies, prullenbak, apart bewaren, taken en logboek ophalen, eigen telefoonnummer |
| `pdf.js` | 3.251 | de bestellijst (`bestellijstModel`, ook voor het tabblad), de PDF invoer en de PDF werkvloer, de vragen vooraf, bestellingen vastleggen, de bestelmail |
| `teken.js` | 1.818 | tekenlaag op foto's |
| `toebehoren.js` | 1.766 | tabblad Toebehoren (v111): de rekenwaarden bovenin (`INSTELLINGEN`), het rekenen, zaagplan + reserve, het tabblad, de actiebalk (v121); sinds v113 ook de opslag van de keuzes per ruit voor `latten.js` |
| `latten.js` | 1.488 | glaslatten (v113): de lijst van Jongeneel bovenin (`LATTEN`, ook de bron van de Naslag), "past het in de sponning?", neuslat (ventilatie en uitsteek), opdeklat omgekeerd, latzijde en onderdorpel, de vensters en kiezers, en de twee vakken op Invoer (v115). Uitleg: `GLASLATTEN.md` |
| `fotos.js` | 2.294 | foto's en tekeningen, merkbolletjes, tabel per foto, het aantal samen met de bolletjes (v110) |
| `project.js` | 1.240 | klant, werkadres, levering, taken, logboek, Opgenomen door |
| `naslag.js` | 1.192 | glascatalogus, leverbaarheid, roeden, roosters, glaslatten (v115) |
| `import.js` | 1.370 | maten inlezen uit pdf, Excel, csv, geplakte tekst |
| `bewerkslot.js` | 775 | wie bewerkt, meekijken, overnemen |
| `start.js` | 553 | het startscherm (met 📞 en 💾) |
| `wachtrij.js` | 663 | foto's eerst op het apparaat, dan naar de server |
| `bulk.js` | 501 | waarden doorvoeren, selecteren |
| `sw.js` | 324 | service worker: offline, nieuwe versies (lijst `SHELL`) |
| `undo.js` | 778 | ongedaan maken; sinds v124 ook bewaard op het apparaat (IndexedDB) |
| `herstel.js` | 556 | "Onlangs verwijderd" (v124) |
| `rechten.js` | 676 | rollen en rechten, het tabblad Beheer, werkvloer-foto's (v124, script 30) |
| `melding.js` | 228 | vensters en vragen in de huisstijl |
| `originelen.js` | 222 | originele foto's als zip |
| `backup.js` | 196 | 💾 Back-up maken (v120): alle projecten, taken en gebruikers (en desgewenst alle foto's) in één zip |
| `merken.js` | 244 | merkletters uniek houden |
| `blokbalk.js` | 583 | per tabel: ongedaan, leegmaken, speling |
| `kopie.js` | 238 | regels kopiëren (⧉, sinds v120 met de keuzes van Toebehoren), gelijktrekken |
| `config.js` | — | adres van Supabase + openbare sleutel. **Niet wijzigen** |
| `leeg.html` | — | bewust leeg pagina'tje: de inlogformulieren "versturen" hierheen, zodat Safari en Firefox meteen vragen het wachtwoord te bewaren (v109). Niet weghalen; hoeft niet offline (inloggen kan toch alleen met bereik) |
| `lib/` | — | de bibliotheken (Supabase, pdf, Excel, zip), met versienummer in de mapnaam |
| `catalogus/`, `roosters/` | — | foto's voor de naslag |
| `latten/` | — | foto's (`<id>.jpg`) en maattekeningen (`<id>-tek.jpg`) van de glaslatten, 51 bestanden (v114; bronpagina's in `latfotos.txt`). Opgehaald door Claude via de browser in de Claude-app: Jongeneel blokkeert scripts, daarom is `latfotos-ophalen.sh` weg. Mag ontbreken: dan tekent de app de doorsnede |
| `NN_*.sql` | — | de databasewijzigingen, genummerd (zie `DATAMODEL.md`) |
| `test-*.js`, `test-*.py`, `test-mailfunctie.ts`, `test-gevel.jpg` | — | de automatische tests en een testfoto (zie §9) |
| `test-sql.sql` | — | alleen voor de tests tegen een lokale database; begint met alles weggooien: **nooit in Supabase draaien** |
| `manifest.webmanifest`, `favicon-v3.*`, `icon-*.png`, `apple-touch-icon.png`, `icoon-bron.svg` | — | de app op het beginscherm en het icoon (met versie in de naam, ook in `SHELL`) |
| `catalogus-fotos.txt`, `roosterfotos.txt`, `latfotos.txt`, `fotos-ophalen.sh`, `roosterfotos-ophalen.sh` | — | waar de foto's van de naslag vandaan komen (`BEHEER.md` §6) |
| `supabase/functions/mail/` | — | de bestelmail (Edge Function); **nog niet uitgerold** |
| `.github/workflows/` | — | taken op GitHub: Supabase wakker houden, de snelle kern bij elke pull request (`tests.yml`), de batterij elke nacht (`batterij.yml`); `BEHEER.md` §12 |
| `test/draai.sh` | — | draait de snelle kern of de hele batterij in één keer, met een overzicht (`docs/testen.md`) |

**De volgorde van de scripts onderaan `index.html` doet ertoe**: melding →
cloud → bewerkslot → wachtrij → start → import → bulk → project → blokbalk →
fotos → kopie → latten → toebehoren → teken → merken → naslag → pdf → originelen →
backup → rechten → herstel → undo (v124: rechten na backup, omdat hij `glasBackup`
omhult; herstel vóór undo). Niet omgooien.

## 6. Belangrijke keuzes, en waarom

| keuze | waarom | wat het kost |
|---|---|---|
| Platte bestanden, geen framework of bouwstap | wat in de repo staat, draait; niets om te installeren of te laten verouderen | grote bestanden (`index.html`) |
| Eén JSON-blok per project | eenvoudig, één opslag = het hele project | zonder bewerkslot overschrijven apparaten elkaar |
| Offline eerst | op de bouwplaats is vaak geen bereik | meer logica rond "waar staat het werk" |
| Bibliotheken in de repo (`lib/`), niet van internet | werken offline vanaf de eerste keer; versie verandert niet ongemerkt | handmatig bijwerken (`lib/LEESMIJ.md`) |
| Versieslot in de database (v99) | een oud apparaat mag een nieuwere stand nooit overschrijven | wie niet bijwerkt, kan niet opslaan tot hij bijwerkt |
| Bewerkslot: één bewerkt, de rest kijkt mee (v106) | samenvoegen van gelijktijdig werk is foutgevoelig; Jan: "tegelijk bewerken is niet nodig, tegelijk kijken wel" | soms eerst ‹Toch bewerken› |
| Nooit weggooien: apart bewaren (v103) | harde eis: nooit gegevens kwijt | soms een apart project dat iemand moet opruimen |
| Bestellingen in de database samenvoegen (v104) | een bestelling mag nooit verdwijnen, ook niet door een oud apparaat | |
| Volgende bestellijst = aanvulling (v105, keuze Jan) | de leverancier krijgt alleen wat nieuw of anders is | |
| In een fotoblok volgt het aantal de bolletjes (v110, keuze Jan: optie A) | de bestelling en de foto zeggen altijd hetzelfde; tot v109 kon je het aantal typen en liepen ze stil uit elkaar (te veel of te weinig besteld, monteur zoekt) | een ruit erbij gaat via het bolletje, niet via het vak; een oud project met een verschil vraagt één keuze per regel |
| Alleen een ander aantal = EXTRA of "N annuleren" (v110, keuze Jan) | bij VERVANGT annuleerde de leverancier alle bestelde en maakte hij alles opnieuw | |
| Bediening telt pas mee in het kenmerk als hij gekozen is (v111) | een nieuw veld in het kenmerk zou na een bestelling álle ruiten "gewijzigd" maken | |
| Alleen een andere bediening na een bestelling = eigen blok, nooit VERVANGT (v112, keuze Jan) | Jan: "nooit glas vervangen alleen om de bediening toe te voegen; dat levert zeker fouten op met dubbele leveringen en onduidelijkheid" | een extra blok op de aanvulling; de app houdt bij in welke lijst het glas en in welke de bediening besteld is (`bedieningInTekst`) |
| Toebehoren is alleen voor onszelf (v111, keuze Jan) | de leverancier hoeft het niet te zien; het mag dus ook na een bestelling veranderen | staat in de PDF invoer, niet op de bestellijst |
| Toebehoren per ruit bij het project, niet op de ruit (v111) | een wijziging op de ruit geeft hem een nieuw stempel; dan werkte de vraag "Oudere stand?" na een bestelling niet meer | ⧉ dupliceren kopieert de keuzes sinds v120 wel mee, met "Controleer …" |
| Lengtes latten: het zaagplan + 1 reserve per lattype (v120, keuze Jan; v113–v119: totaal + 10 %) | het zaagplan is de echte waarheid; één reserve vangt een zaagfout op. Een lat langer dan de lengte gaat apart en telt niet dubbel | de reserve staat bij de instellingen op Toebehoren |
| Neuslat recht, 20 mm langer dan de sponning breed is (v121, Jan) | hij loopt aan beide kanten door in de scharniersponning; geen verstek | eigen instelling "Neuslat (recht): langer dan sponning", los van de verstektoeslag |
| Aangevinkte ruiten: een actiebalk met voorbeeld (v121, P3, keuze Jan) | eerst zien wat het wordt, dan pas toepassen; geen extra vraag (het voorbeeld is de controle), wel ↶ Terugzetten | Jan wil deze keuze later nog eens herbeoordelen |
| Sponningdiepte en glaslat bij het project, niet op de ruit (v113) | zelfde reden als de onderlat (v111): geen nieuw stempel | ⧉ dupliceren kopieert ze sinds v120 wel mee (met "Controleer …") |
| Geen standaard latzijde (v114, keuze Jan) | "dit wisselt continu, en binnen een project, of zelfs binnen een kozijn" | een nieuwe ruit staat op "?"; meldingen op Toebehoren en vóór de bestellijst; de oude projectinstellingen "glaslatten zitten" en "standaard onderlat" gelden niet meer |
| Latkeuzes mee op slot na een bestelling (v114, keuze Jan; v113 was vrij) | wat besteld is, ligt vast; ook de latten | ontgrendelen met wachtwoord om ze te wijzigen |
| Max glaspakket uit de maatstaat: controleren en grijs maken, niet automatisch kiezen (v117, keuze Jan) | de kozijnfabriek weet wat erin past; het glas kies je zelf | een te dikke opbouw blijft te kiezen (grijs, onder een eigen kopje); het oordeel wordt rood |
| Latzijde binnen: nooit een neus- of ventilatielat; een oude keuze rood, niet stil veranderd (v117, keuze Jan) | die latten zijn voor buitenbeglazing | "Alle ruiten" slaat die ruiten over en zegt welke |
| Latten nooit laten uitsteken; liever niet precies vlak (v119, Jan) | A5 met sponninkje over de rand = noodmaatregel; vlak oogt niet | oranje "nood" (ook vóór de bestellijst en op de werkvloer) en "vlak met kozijn", sinds v120 ook onderin buiten (dan eerst een neuslat in het advies) en met een strook op Toebehoren |
| Een maat met een komma: naar beneden afronden en melden (v120, keuze Jan) | Chrome liet de komma weg (10× te groot op de bestellijst); glas mag nooit te groot zijn | een halve mm minder |
| Tikfouten vóór de bestellijst vragen, niet blokkeren (v120, keuze Jan) | glas < 100 mm, > 3210 × 6000 of > 99 stuks is bijna altijd een tikfout, maar niet altijd | één vraag meer; een aantal van 0, negatief of met decimalen kan helemaal niet |
| Dubbel besteld luid melden (v120, akkoord Jan) | zonder bereik kan het niet voorkomen worden; wel meteen gezien | een rode balk tot de verkeerde is ingetrokken |
| Ingetrokken lijst telt niet mee in de nummering (v120, keuze Jan) | de leverancier kent alleen de lijsten die hij kreeg | |
| Import: bestaat een merk al, dan zelf kiezen (v120, keuze Jan) | stil doornummeren gaf "11" en "12" die botsten met echte merken | merk op een cijfer → letter erachter (1a), anders een cijfer (A1) |
| Rood alleen voor de hoofdknop en fouten; 44 px op een aanraakscherm (v120, keuze Jan) | rood betekent "fout"; op de bouw met handschoenen | de tabellen blijven compact |
| Alleen actieve collega's (script 26, v120, akkoord Jan) | wie uit dienst gaat, mag niets meer zien; iemand weghalen = actief op false, nooit verwijderen | iedereen die actief is, heeft dezelfde rechten |
| Handmatige back-up in de app (v120, keuze Jan) | het grootste risico | iemand moet eraan denken (de knop herinnert na 30 dagen); sinds v122 naast de automatische |
| Automatische back-up via een privé GitHub-repo naar een eigen Dropbox, niet versleuteld (v122, keuze Jan; 26-10 OneDrive geprobeerd, maar daarvoor moest een Microsoft 365-beheerder toestemming geven, dus terug naar Dropbox) | Jan wilde zijn Mac er niet bij betrekken; Jan kan alles zelf instellen; geen geheime hoofdsleutel nodig (account op alleen lezen); de Dropbox-sleutel kan alleen in zijn eigen map | de back-up staat bij Dropbox; zonder versleuteling is terugzetten eenvoudiger, maar wie het Dropbox-account heeft, kan de gegevens lezen; gratis 2 GB, groeit (foto's blijven altijd staan) |
| "Beide" in oude projecten: een strook, niets stil veranderd (v119, keuze Jan) | tot v114 kwam er buiten onderin een neuslat | Begrepen per ruit bewaard (`toebehoren.beideGezien`); sinds v121 rustig grijs (Jan: "duidelijk, subtiel") en "beide kanten" in de onderlatknop |
| Max glaspakket ook op Invoer rood, maar kiesbaar (v118, keuze Jan) | op Invoer kies je het glas; daar moet je het zien | gerekend met band binnen + buiten (standaard 3 + 3, per ruit op Toebehoren) |
| Band van 5 mm = een rol 2 mm en een rol 3 mm (v118, keuze Jan) | er bestaat geen rol van 5 mm | telt op twee rollen en dubbel in "m band" |
| Werkvloer: een eigen pdf per foto, zonder prijzen (v118, keuze Jan) | de werkplaats moet weten welke ruit waar komt en wat er gezaagd wordt | niet naar de leverancier, geen levercontrole |
| Tabblad Bestellijst = de pdf, één model (v118, keuze Jan) | wat je op het scherm ziet, is wat de leverancier krijgt | wijzigen in `bestellijstModel`, nooit los in het tabblad |
| Latten op Toebehoren, op Invoer alleen de diepten (v115, keuze Jan) | Invoer compact houden; bij nieuwe kozijnen (csv) zijn latten niet nodig | glastype en opbouw zijn op beide tabbladen te wijzigen (dezelfde gegevens) |
| Neuslat: alleen die passen, de kleinste automatisch (v115, keuze Jan) | te groot bestaat niet (hij steekt alleen verder uit); te klein wel | ventilatie en uitsteek staan erbij, zodat je bestaande latten kunt volgen |
| Alleen het rooster anders = eigen blok, geen VERVANGT (v114, keuze Jan) | net als de bediening (v112): geen dubbel glas | een ander Duco type alleen bij dezelfde glasaftrek; anders is het glas al verkeerd besteld en wordt het VERVANGT |
| Tot 1 mm te krap past nog ("krap") (v113, keuze Jan) | het band vangt 1 mm op | een gewone glaslat met ruimte over schuift verder in: "past · N mm in zicht", geen waarschuwing (v115, Jan); alleen een opdeklat kan "ruim" (≤ 1 mm) of "te ruim" zijn (het glas klemt niet) |
| Band buiten 3 of 4 mm, nooit 2 (v113, Jan) | "werking": de buitenkant werkt het meest | |
| Kleuren met een naam, chips en het systeemlettertype, gelijk aan de offerte-app (v113, keuze Jan) | de apps van Jelier Bouw zien er hetzelfde uit; het rood is dat van het logo (#C1121C) | de kleuren staan bovenin `index.html` (`:root`: `--accent`, `--ink`, `--ok`, `--warn`, `--err`); de oude namen (`--merk`, `--blauw`, `--rood`, `--groen`) wijzen ernaar. Een donker thema komt later |
| Alles in het Nederlands, ook de code | Jan moet het kunnen lezen | |
| Openbare repo | gratis GitHub Pages | de opzet is zichtbaar (de sleutel in `config.js` is toch al openbaar) |
| Gebruikers nooit verwijderen; bij vertrek op niet-actief (v120) | koppelingen (taken, besteld door, logboek) raken anders los | zie `BEHEER.md` §3.3 |

## 7. Begrippen

| begrip | uitleg |
|---|---|
| **Supabase** | de online dienst met de database, het inloggen en de foto-opslag |
| **RLS** (Row Level Security) | regels in de database over wie welke rij mag zien of wijzigen. Kort: alleen collega's die actief zijn (script 26). Details: `DATAMODEL.md` |
| **kortBericht** (v120) | berichtje onderin met hoogstens één knop (bijv. ↶ Terugzetten), verdwijnt vanzelf. Voor wat alleen informeert; een venster (`appMelding`) houdt het bewerkslot op |
| **trigger** | een stukje code in de database dat vanzelf draait bij een wijziging, bijvoorbeeld het logboek schrijven |
| **migratie / SQL-script** | een genummerd bestand (`NN_….sql`) dat de database verandert; je draait het in Supabase → SQL Editor |
| **service worker** | een onzichtbaar hulpje in de browser dat de app bewaart voor gebruik zonder bereik, en nieuwe versies ophaalt |
| **`SHELL`** | de lijst in `sw.js` met alle bestanden die offline beschikbaar moeten zijn. Een nieuw bestand dat daar niet in staat, werkt niet zonder bereik |
| **localStorage / IndexedDB** | opslag in de browser op het apparaat zelf: de kopie van het project, en foto's die nog omhoog moeten |
| **realtime** | Supabase geeft een wijziging meteen door aan de andere open apparaten |
| **versieslot** | de database weigert een opslag van een oudere app-versie |
| **bewerkslot** | één apparaat tegelijk mag een project bewerken |
| **apart bewaard** | werk dat niet over het project heen mocht, als eigen project bewaard |
| **publishable / anon key** | de openbare sleutel in `config.js`; een naamplaatje, geen wachtwoord |
| **service_role / sb_secret** | de geheime sleutel van Supabase; mag nooit in de repo |
| **herstellink** | de link in de mail die Jan vanuit Supabase stuurt als iemand zijn wachtwoord kwijt is. Werkt één keer, een uur lang; opent de app met het venster "Kies een nieuw wachtwoord" |
| **PasswordCredential** | de manier van Chrome, Edge en Android om een wachtwoord aan de wachtwoordbeheerder aan te bieden |
| **bolletje (merkbolletje)** | het gele rondje met de merkletter op een foto of tekening: waar die ruit zit. Een regel ×3 heeft drie bolletjes met dezelfde letter |
| **het aantal volgt de bolletjes** (v110) | heeft een regel bolletjes, dan gaan het aantal en de bolletjes alleen samen omhoog of omlaag (via het bolletje). Een **open plek**: minder bolletjes dan het aantal (nog aan te wijzen, gele rand). **Te veel**: meer bolletjes dan het aantal (gestreepte rand) |
| **EXTRA** (v110) | op een aanvulling: maak er zoveel bij van een eerder bestelde ruit; de bestelde blijven |
| **ALLEEN BEDIENING** (v112) | op een aanvulling: bij een ruit die al besteld is verandert alleen de stang of het koord. Het glas wordt niet opnieuw gemaakt en niet geannuleerd |
| **bediening** (v111) | een extra bedieningsstang of -koord bij een ventilatierooster, 1 of 2 per rooster, met een lengte (leeg = standaard). Het gewone knopje zit er altijd |
| **Toebehoren** (v111) | wat er naast het glas nodig is: glaslatten, glasband, glaskit, wienersprossen-tape. Een schatting voor onszelf |
| **zaagplan** | de latten echt verdeeld over lengtes (meestal 4 m; langste eerst, met een zaagsnede per lat). Het aantal lengtes = het zaagplan + 1 reserve per lattype (v120; v113–v119: totale lengte + 10 %) |
| **sponningdiepte** (v113) | de ruimte loodrecht op het glas, van de aanslag tot de buitenkant van het kozijn. In NPR 3577 heet dat sponningbreedte |
| **pakket** (v113) | wat er in de sponning moet: band binnen + glas + band buiten + glaslat. Oordeel: past, past · N mm in zicht (v115), krap, vlak met kozijn (oranje, v119), nood (A5 steekt uit, v119), ruim/te ruim (alleen opdeklat), past niet, meegeleverd |
| **sponning in zicht** (v115) | een gewone glaslat met ruimte over schuift verder in; er blijft een randje sponning zichtbaar. Normaal, geen fout |
| **omgekeerd** (v115) | een opdeklat met eigen sponning andersom gemonteerd: het dikke deel steekt de sponning in, hij neemt zijn eigen sponning in in plaats van ruimte te geven |
| **ventilatie / uitsteek** (v115) | bij een neuslat: de ruimte tussen kozijn en neus (min. 5 mm), en hoe ver de lat in totaal voor het kozijn uitsteekt (ventilatie + 9) |
| **scharniersponning** (v115) | het uitgefreesde hol in de stijl waar de knoop van het scharnier in valt; daarom is de bruikbare diepte zij/boven vaak kleiner dan onder |
| **neuslat** (v113) | onderlat bij buitenbeglazing met een neus die vóór het kozijn uitsteekt. Neemt níet zijn hele breedte in de sponning in: past als ventilatie = modelnummer − ruimte vóór het glas ≥ 5 mm (`GLASLATTEN.md` §6) |
| **latzijde** (v114) | aan welke kant de glaslatten zitten: binnen, buiten, beide (glas tussen twee latten, zonder aanslag) of geen (meegeleverd, v115). Per ruit, geen standaard |
| **onderdorpel** (v114) | de onderkant van het kozijn; de sponning is daar vaak dieper (geen scharniersponning). Op Invoer de kolom Onder (v115) |
| **bi-color** (v114) | een Duco rooster met binnen een andere kleur dan buiten |
| **glasaftrek** (v114) | hoeveel het glas korter wordt voor een rooster (DucoTon 10: 80 mm, DucoTon 18: 120 mm). Staat in de beschrijving van het rooster; sinds v115 ook als kolom in de Naslag |
| **opdeklat** (v113) | lat óp het kozijn of de deur; zijn eigen sponning maakt de ruimte voor het glas groter, of (omgekeerd, v115) kleiner |
| **verstek** | de schuine hoek waarin twee glaslatten in de hoek samenkomen; daarom is een lat 20 mm langer dan de sponning (de neuslat niet: die is recht, en 20 mm langer voor de scharniersponning; v121) |
| **onderlat** | de onderste lat van een ruit: vaak een ander type (neuslat of ventilatielat). Volgt de latzijde, per ruit aan te passen op Toebehoren |
| **APP_VERSIE / PDF_VERSIE / VERSIE** | het versienummer, op drie plekken, altijd gelijk (zie §8) |
| **zoekfunctie** (v123, script 29) | een functie in de database die de app aanroept (`rpc`): `glas_zoek_projecten`. Hij ziet alleen wat de zoeker mag zien (dezelfde regels als de lijst) |
| **unaccent** (v123, script 29) | een standaard-uitbreiding van PostgreSQL die accenten weghaalt (é → e); Supabase levert hem mee |
| **beheerder / collega / werkvloer** (v124, script 30) | de drie rollen. Beheerder: alles, plus het tabblad Beheer. Collega: werkt zoals altijd; de beheerder kan per persoon bestellen, ontgrendelen, nieuw project en weggooien uitzetten. Werkvloer: kijken, foto's toevoegen, eigen taken afvinken. Een nieuw account begint als werkvloer |
| **Onlangs verwijderd** (v124) | per project de lijst van wat er is weggegooid, 30 dagen terug te zetten (`herstel.js`) |
| **spacer** (v124) | de afstandhouder tussen de glasbladen in de spouw: standaard zilver of zwart |
| **alles of niets** (begin … commit) | een SQL-script dat als één geheel draait: lukt één stap niet, dan verandert er helemaal niets (script 28) |

## 8. Zelf onderhouden, zonder AI

### Gereedschap

- **GitHub Desktop** (heb je al): bestanden naar de repo, en terug naar een
  vorige versie.
- **Een teksteditor**, bijvoorbeeld *Visual Studio Code* (gratis). In GitHub
  Desktop: Repository → **Open in Visual Studio Code**. Gebruik geen
  TextEdit of Word: die kunnen aanhalingstekens "slim" maken, en dan werkt de
  code niet meer.
- **Supabase-dashboard**: Table Editor (bekijken), SQL Editor (scripts).

### De gouden regels

1. **Bij elke wijziging aan de code: de drie versienummers ophogen**, alle
   drie hetzelfde. Anders krijgen de apparaten de wijziging niet (de service
   worker denkt dat er niets nieuws is):
   - `index.html`: `const APP_VERSIE = 'v121';`
   - `pdf.js`: `var PDF_VERSIE = 'v121';`
   - `sw.js`: `const VERSIE = 'v121';`
   (Bij een wijziging maak je er alle drie het volgende nummer van, bijvoorbeeld
   `v122`.)
2. **Eén kleine wijziging per keer**, dan publiceren en op een apparaat
   controleren.
3. **Nooit `config.js`** wijzigen.
4. **Een nieuw bestand** moet ook in `index.html` (`<script src>`) én in de
   lijst `SHELL` in `sw.js`. Anders werkt het niet zonder bereik. Liever niet
   zelf doen.
5. **Ging het mis: terugzetten.** GitHub Desktop → History → rechtsklik →
   *Revert changes in commit* → push (zie `BEHEER.md` §2). Daarna gerust
   opnieuw proberen.
6. **Schrijf het op** in een nieuwe `WIJZIGINGEN-vNN.md` (bewaren bij de andere nota's, buiten de repo): wat, waarom, wat je
   controleerde.

### Wat je zelf kunt doen

**Een tekst op het scherm of in een melding aanpassen**
1. Zoek de tekst in de hele map: in Visual Studio Code **Cmd+Shift+F**.
   Bijvoorbeeld `Je kunt dit project nu bewerken` staat in `bewerkslot.js`.
2. Pas alleen de tekst **tussen de aanhalingstekens** aan. Een `'` in je
   tekst? Schrijf `\'`, of gebruik ’ (een "krul").
3. Versienummers ophogen (regel 1), commit, push.

   Voorbeeld: de melding achter **Wachtwoord vergeten?** noemt julian. Gaat
   iemand anders de herstelmails sturen, zoek dan in `cloud.js` naar
   `vraag julian om een herstel link` en pas de naam aan. Dezelfde naam staat
   ook in de meldingen over de herstellink (`Vraag julian om een nieuwe
   herstellink`, drie keer).
4. Controleer op een apparaat: ↻ Bijwerken, en kijk op het startscherm of
   het versienummer klopt.

**De rekenwaarden van Toebehoren aanpassen** (v111; kitvoeg, reserve per
lattype, toeslag verstek, toeslag neuslat, lengte van een lat, meters op een
rol, …)
- *Eerst proberen, voor één project*: tabblad Toebehoren → ▸ "instellingen
  voor dit project" → waarde typen (een komma mag: `4,5`). Een afwijkende
  waarde wordt oranje; ↺ zet hem terug. Geen code, geen nieuwe versie. Het
  geldt alleen voor dat project en staat in de pdf ("Gerekend met: …").
- *Voor alle projecten de standaard veranderen*: open `toebehoren.js`;
  bovenin staat het blok `INSTELLINGEN` met bij elke waarde uitleg.
  Verander alleen het getal (bijvoorbeeld `KITVOEG_BREEDTE_MM: 4,` →
  `5,`; een punt als decimaalteken: `4.5`). Versienummers ophogen
  (regel 1), commit, push. Projecten waarin je de waarde al apart had
  gezet, houden die.
- *Een glaslat erbij, of een maat verbeteren* (v113): open `latten.js`;
  bovenin staat de lijst `LATTEN`, één regel per lat. Kopieer een regel van
  dezelfde soort en pas id, maat, `inSponning` (mm in de sponning) of
  `eigenSponning` (opdeklat) en het artikelnummer aan. Heb je een maat
  nagemeten, zet dan `zeker: true`. Uitleg van elk veld staat erboven;
  de achtergrond in `GLASLATTEN.md`. Daarna: de regel in `latfotos.txt` en
  `LAT_FOTOS` in `sw.js` (de foto en de tekening), versienummers ophogen.
- *Een foto of tekening van een lat*: een script werkt niet (Jongeneel
  blokkeert dat). Vraag het Claude in de Claude-app op de Mac (eigen
  browser), of sla hem in Safari op als `latten/<id>.jpg` (±600 px breed).
  Daarna `latten/` meecommitten (`BEHEER.md` §6).

**Een vaste geadresseerde voor de bestelmail**: Supabase → Table Editor →
`mailadressen` → *Insert row* (`naam`, `adres`, `soort` = `leverancier`).
In de app kan dat (nog) niet; het venster van de bestelmail heeft alleen een
veld voor een eenmalig extra adres. Geen code. Let op: de bestelmail zelf is nog niet ingesteld, en
vóór het instellen komt eerst de vraag of hij alleen naar deze vaste adressen
(plus `@jelierbouw.nl`) mag (`BEHEER.md` §7b).

**Een gebruiker toevoegen, wachtwoord, vertrek**: `BEHEER.md` §3. Geen code.

**Zoeken over alle projecten heen** (alleen lezen, kan geen kwaad):
Supabase → SQL Editor:
```sql
-- alle ruiten van projecten met 'Kerkstraat' in de naam
select project, merk, breedte, hoogte, "glasType", opbouw
from ruiten where project ilike '%Kerkstraat%';

-- hoe vaak elk glastype voorkomt
select "glasType", count(*) from ruiten group by 1 order by 2 desc;

-- projecten in de prullenbak
select naam, verwijderd_op, verwijderd_naam from projecten
where verwijderd_op is not null order by verwijderd_op desc;
```

**Een project uit de prullenbak terugzetten**: in de app, startscherm →
prullenbak. Geen code.

**Een SQL-script draaien dat je gekregen hebt**: `BEHEER.md` §4.

**Controleren of alles draait**: is Supabase niet op pauze, loopt de
GitHub-taak, hoe vol is de opslag: `BEHEER.md` §7 en §9.

### Wat je níet zelf moet doen, en waarom

| klus | waarom niet |
|---|---|
| **Een glastype, opbouw of bewerking toevoegen** | staat op twee plekken: in `index.html` (één regel van ±80.000 tekens) én in de database. De database wint. Mis je er één, dan verdwijnt het weer of klopt de dikte/het gewicht op de bestellijst niet. Er staat een beheerscherm hiervoor op de lijst |
| **Iets aan opslaan, synchroniseren, offline, apart bewaren** (`cloud.js`) | hier zit de belofte "nooit gegevens kwijt". Een kleine fout kan werk laten verdwijnen, en dat zie je pas later |
| **Het bewerkslot** (`bewerkslot.js`, script 24) | werkt samen met regels in de database; fouten geven geweigerde opslag of twee mensen die elkaar overschrijven |
| **Nieuwe versies, offline** (`sw.js`) | een fout hier kan apparaten op een oude versie laten hangen, of de app zonder bereik onbruikbaar maken. Dat is lastig terug te draaien op een iPad met de app op het beginscherm |
| **Bestellingen en de bestellijst** (`pdf.js`, `teBestellen` in index.html, script 23) | een fout kost geld: verkeerd of dubbel glas besteld |
| **Een SQL-script schrijven, of iets in de database met de hand wijzigen** | de database bevat controles (triggers) die samenhangen met de app; een losse wijziging kan die omzeilen of breken |
| **De bibliotheken in `lib/` vervangen** | moet ook in `SHELL`; een nieuwe versie kan anders werken |

Dat zijn ook de plekken waar de app nu het moeilijkst te onderhouden is. Wil
je daar iets veranderen zonder AI, haal er dan een programmeur bij en geef
hem `OVERZICHT.md`, `DATAMODEL.md` en de documenten uit de projectkennis
(beslissingen, bugboek, beveiliging).

## 9. De automatische tests

Bij elke versie draait Claude tests (in de repo: `test-*.js`), naar het
niveau van de wijziging (afspraak 20-10-2026: snelle kern altijd, de hele
reeks één keer bij een functie, de mutatieproef bij database, opslag op het
apparaat en dergelijke). Ze bootsen de echte situatie na: meerdere apparaten, geen bereik,
een oude versie naast een nieuwe. Van elke nieuwe test wordt bewezen dat hij
rood wordt als je de reparatie terugdraait (`--mutaties` in test-v103 t/m
test-v106, test-v109, test-v110, test-v111, test-v112, test-v113, test-v114, test-v115, test-v116, test-v117, test-v118, test-v119, test-v120 en test-v121; die van v104 en v105 werken nu niet, en van v110 passen er 9 niet meer: zie `TESTEN.md`, "Onderhoud van de batterij").

**Zelf draaien kan nu nog niet zomaar**: de tests verwachten de hulpmiddelen
op een vaste plek in de werkomgeving van Claude (`/home/claude/node_modules`)
en Chromium in `/opt/pw-browsers`. Op je Mac vraagt dat Node.js, het
installeren van een paar pakketten en het aanpassen van die paden. Dat is
een verbeterpunt. Tests automatisch bij elke push (GitHub): bewust nog niet
(Jan, 22-10-2026), zolang de app nog veel verandert.

## 10. Risico's en kwetsbare plekken

| risico | wat je dan doet |
|---|---|
| **Geen back-up van Supabase zelf** (gratis plan) | de automatische back-up naar Dropbox (v122) en 💾 (`BEHEER.md` §8); maandelijks `LAATSTE-BACKUP.txt` nakijken |
| **Foto-opslag vol** (1 GB, met originelen snel) | startscherm waarschuwt bij 80/95%; dan Supabase Pro, de prullenbak legen of originelen opruimen (`BEHEER.md` §9). Na een overstap op Pro de grenzen in `config.js` aanpassen (`limieten`) |
| **Supabase op pauze** (na 7 dagen zonder gebruik) | GitHub-taak houdt hem wakker; die gaat uit na 60 dagen zonder commit (`BEHEER.md` §7) |
| **Werk alleen op een apparaat** (geen bereik, iPad stuk of gewist) | zo snel mogelijk met bereik openen; nooit websitegegevens wissen met werk erop |
| **Wachtwoorden** | sterke eigen wachtwoorden; bij vertrek meteen op niet-actief (`BEHEER.md` §3.3) |
| **Herstellink al "gebruikt"** voordat de collega erop tikt (mailbeveiliging zoals Safe Links opent links vooraf) | nieuwe sturen; gebeurt het steeds, dan aan Claude melden (`BEHEER.md` §3.2) |
| **Toebehoren is een schatting** (v111) | de uitkomst hangt af van de instellingen; eerst in de praktijk vergelijken en bijstellen (§8) |
| **Maten van de latten** (v113; v114 nagekeken op de tekeningen van Jongeneel; neuslat bevestigd v121) | wijkt een lat in de praktijk af (bijv. de C1, `GLASLATTEN.md` §11): in `latten.js` aanpassen |
| **Toebehoren tekent de hele tabel opnieuw na een wijziging** (v115) | alleen wat anders is wordt vervangen en de focus blijft staan; op een echte iPad nog niet door Claude nagekeken (toetsenbord na Tab). Merk je dat het toetsenbord wegvalt, meld het met versie en apparaat |
| **Rechten verkeerd ingesteld** (v124) | iemand kan iets niet wat hij wel moet kunnen (of andersom): Beheer → de persoon → rol en rechten nakijken. De app weet het na het volgende startscherm; de database direct. Er blijft altijd minstens één beheerder |
| **Script 24 of 26 opnieuw gedraaid** | die zetten hun eigen regels terug (bewerkslot, definitief verwijderen); daarna 26, 27, 28 en 30 opnieuw, in die volgorde (`DATAMODEL.md`) |
| **↶ na herladen** (v124) | werkt alleen als het project op dit apparaat precies zo is als bij de laatste stap; anders vervalt de stapel (dan "Onlangs verwijderd" voor wat weggegooid is) |
| **Nooit getest in echte Safari** door Claude | Jan test elke versie op iPad/iPhone/Mac; meld afwijkingen met versie en apparaat. Voorbeeld (v116): Safari stuurde originele foto's leeg mee, Chrome niet; de tests (Chromium) zagen het niet. Jans console-melding ("No content provided") wees het aan |

## 11. Noodplan

1. **Nieuwe versie geeft problemen** → vorige versie terugzetten
   (`BEHEER.md` §2). De apparaten nemen hem over.
2. **Niemand kan inloggen of opslaan** → Supabase-dashboard: staat het project
   op pauze? *Restore*. Werk blijft intussen op de apparaten staan.
3. **Een project is weg** → prullenbak (30 dagen). Is het definitief
   verwijderd, dan staat het alleen nog in een back-up (💾, `BEHEER.md` §8);
   terugzetten samen met Claude.
4. **Een verkeerde wijziging in een project** → het logboek (Project info)
   laat zien wie wat deed; de momentopnames (`projectgeschiedenis.data`, de
   laatste 20) bevatten de stand van daarvoor. Terugzetten daaruit kan nog
   niet in de app; vraag hulp.
5. **Hulp nodig** → een nieuwe Claude-sessie in het project "Glas inmeet web
   app" (die leest `START-HIER.md` en dit document), of een programmeur met
   `OVERZICHT.md`, `DATAMODEL.md` en de documenten uit de projectkennis. De app gebruikt geen
   bijzondere techniek: HTML, JavaScript, en Supabase (Postgres).
