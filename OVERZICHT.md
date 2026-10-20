# Glasopname — overzicht: hoe de app in elkaar zit

*Voor wie wil begrijpen hoe de app werkt, en hem zonder AI wil kunnen
onderhouden. Bijgewerkt op 19 oktober 2026, bij v113.*

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
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` in de projectkennis op claude.ai (niet in de openbare repo) |

---

## 1. Wat de app doet

Glas inmeten op de bouwplaats, met meerdere mensen en apparaten (iPad,
iPhone, Mac, Android, Windows), ook zonder bereik. Uit de opname komen:
- een **bestellijst als pdf** voor de glasleverancier (Van Noordenne);
- een **overzicht als pdf** voor het archief (⬇ Exporteren → *PDF invoer*,
  bestand `Inmeting_….pdf`): de projectgegevens en per foto een pagina met de
  merkletters erop en de maten eronder.

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
  afspraken overschrijven twee apparaten elkaar. Daarom het bewerkslot (§5).
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

## 4. Hoe het werkt, per handeling

Van wat je ziet naar wat de code doet. Bestand en functienaam, zodat je het
terugvindt (Cmd+F).

| handeling | route |
|---|---|
| **Inloggen** | inlogscherm (`index.html`, `#cloudLoginForm`) → `cloud.js` `cloudLoginVerstuur` → `login()` → Supabase. Pas na een geslaagde inlog biedt de app het wachtwoord aan de browser aan (`wachtwoordAanbieden`): Chrome/Edge/Android via `PasswordCredential`; Safari/Firefox doordat het formulier "verstuurt" naar `leeg.html` in een verborgen, afgeschermd kader. De velden hebben geen `name`, dus er gaat niets mee (v109) |
| **Wachtwoord vergeten?** | knop op het inlogscherm → `cloud.js` `cloudWachtwoordVergeten` → alleen een melding: bewust geen herstelfunctie in de app (v109) |
| **Nieuw wachtwoord via een herstellink** | Jan stuurt vanuit Supabase een herstelmail → de link opent de app met `#access_token=…&type=recovery` → `cloud.js` `init` → `leesHerstelLink()` leest het adres en haalt het meteen leeg (vóór de verbinding; de bibliotheek leest het adres bewust niet zelf: `detectSessionInUrl: false`) → `herstelSessie()` zet de sessie (`setSession`, met ‹Opnieuw proberen› zonder bereik) → venster `#cloudHerstel` (`toonHerstel`) → `herstelOpslaan()` → Supabase `updateUser` → `wachtwoordAanbieden` met het nieuwe wachtwoord → startscherm. Verlopen link: `herstelLinkFout`. Herladen of nieuw tabblad: vlag `glasopname_herstel` (id van de gebruiker) in localStorage (v109) |
| **Startscherm, projectenlijst** | `start.js` → eerst `prullenbak_opruimbaar` (wat er langer dan 30 dagen in de prullenbak staat), dan `cloud.js` `glasProjecten()` → tabel `projecten` (alleen de samenvattingskolommen, niet de hele inhoud) |
| **Project openen** | `cloud.js` `cloudOpen(id)` → `zetStaat()` → `index.html` `renderTabel()`. Tegelijk `bewerkslot.js` `glasBewerkslotStart()`: mag ik bewerken, of kijk ik mee? (tabel `bewerkslot`, functie `glas_bewerken`) |
| **Maat invullen** | invoerveld → `index.html` `herbereken()` / `berekenGlasMaat()` → `opslaan()` (in `cloud.js`; die in `index.html` is alleen de terugval zonder cloud): eerst op het apparaat (`glasopname_v2`) met de vlag "moet nog omhoog" (`glasopname_pending`), dan `synchroniseer()` → `projecten.data`. De database controleert (versieslot, bewerkslot, bestellingen) en schrijft het logboek |
| **Geen bereik** | `synchroniseer()` ziet dat er geen verbinding is → het werk blijft met de vlag op het apparaat, status "⚠ Offline — lokaal". Bereik terug: eerst status en bestellingen van de server lezen en samenvoegen (`voorlezenEnVersturen`), dan versturen |
| **Een collega wijzigt** | Supabase stuurt de nieuwe rij live → `cloud.js` `vanElders()` → scherm bijgewerkt ("↻ Bijgewerkt door collega") |
| **Meekijken / overnemen** | `bewerkslot.js`: balk "… heeft dit project open" met ‹Toch bewerken› → vraag aan de bewerker (10 s aftellen) → `geefVrij()`; reageert die niet: ‹Overnemen› |
| **Foto of tekening** | `fotos.js` `bewaarBestand()` → `wachtrij.js` (eerst op het apparaat, IndexedDB) → op de achtergrond naar Storage `projectfotos/<project>/…`. Ophalen: `fotoBlob()` |
| **Tekenen op een foto** | `teken.js` (pen, vormen, tekst); de merkbolletjes in `fotos.js` |
| **Ruit op de foto aanwijzen** | tik op de foto → `fotos.js` `fotoTik`: een nieuwe ruit met de volgende letter, of (na ‹🎯 Ruiten aanwijzen›, `fotoAanwijzen`) een bolletje voor een bestaande regel die er nog niet genoeg heeft. Het aanwijzen verandert nooit het aantal: een ingelezen maatstaat is de waarheid |
| **Het aantal in een fotoblok** (v110, keuze Jan) | heeft een regel minstens één bolletje, dan staat het aantal-vak vast (`index.html` `aantalCel`, `aantalVolgtBolletjes`; `setVal` weigert). Een ruit erbij: tik op een bolletje → ‹＋ Nog een ruit met deze letter› (`markErbij`) → de volgende tik op de foto zet het bolletje én het aantal +1, in één stap (één Cmd+Z). Eraf: ‹Één ruit minder› (`markEenMinder`). Doorvoeren (⤓, `bulk.js`) en gelijktrekken (`kopie.js`) slaan het aantal van zulke regels over en zeggen dat. Een regel zonder bolletjes houdt een vrij aantal |
| **Aantal en bolletjes kloppen niet** (oud project, of half aangewezen) | strook onder de foto (`fotos.js` `scheefHTML`), per regel een keuze: ‹Er zijn er N› (`markAantalNaarBollen`), ‹… het gestreepte bolletje weg› (`markTeveelWeg`), ‹Aanwijzen› (`markAanwijzenRij`). Niets gaat vanzelf; een lager aantal vraagt eerst even (het kan uit een maatstaat komen); tijdens het aanwijzen blijven de regels die nog aangewezen worden uit de strook. Een bolletje te veel (rode stippelrand) heeft in zijn menu alleen "weghalen" |
| **Bestellijst** | ⬇ Exporteren → `pdf.js` `exportBestellijstPdf()` → `voorControles()` (oudere stand? annuleren? en sinds v110 als laatste `aantalControle`: "Klopt het aantal?" als aantal en bolletjes niet gelijk zijn) → pdf → `afleveren()` (opslaan/delen) → vraag "Naar de leverancier?" (`vraagVerstuurd`) → Ja: bestelling vastgelegd in `info.bestellingen`, status besteld, invoer op slot |
| **Volgende bestellijst** | altijd een **aanvulling**: alleen nieuw en gewijzigd, VERVANGT, ANNULEREN (`teBestellen()` in index.html, `bestelModus()` in pdf.js). Alleen een ander aantal (v110, `aantalVerschil()`): meer = **EXTRA** in de tabel met alleen het verschil als aantal; minder = niet in de tabel, wel onder ANNULEREN ("1 annuleren, de andere 2 blijven"). Alleen de bediening anders (v112, `bedieningVerschil()`): niet in de tabel, maar in een eigen blok **ALLEEN BEDIENING – glas NIET opnieuw maken en NIET annuleren** (`bedieningTabel` in pdf.js), ook naast een EXTRA of "N annuleren". Verandert er ook iets aan het glas of het rooster (maat, glas, RAL, Duco, opmerking), dan blijft het VERVANGT. Na een EXTRA noemt de app bij elke ruit alle lijsten waar hij in zit ("uit de 1e en 2e", `besteldInTekst()`) |
| **Ontgrendelen na bestellen** | `index.html` `slotOntgrendel()` → eigen wachtwoord (`melding.js` `appWachtwoord`) → `cloud.js` `glasWachtwoordKlopt()` → logboek |
| **Bediening bij een rooster** (v111) | kolom Bediening op Invoer (alleen zichtbaar als er een rooster is): `index.html` `bedieningCel` → `setBediening` (1× of 2× stang of koord) en `setBedieningLengte` (mm; leeg = standaardlengte). Bewaard op de ruit als `bediening`, `bedieningAantal`, `bedieningLengte`. Gaat mee naar de leverancier: kolom op de bestellijst, en een regel "Extra bediening: …" in het LET OP-kader. Rooster op Nee (ook via ⤓ doorvoeren) haalt de bediening weg. Het gewone knopje op het rooster zit er altijd; dit is een aanvulling |
| **Toebehoren** (v111) | tabblad 🧰 Toebehoren → `toebehoren.js` `renderToebehoren()` → `bereken()`: glaslatten per type (A4, B5, N30 …; v113), in lengtes van 4 m, glasband, glaskit, wienersprossen-tape. Aantal lengtes (v113, Jan: "één waarheid"): totale lengte + 10 % ÷ 4 m, of meer als het zaagplan meer nodig heeft. Neuslat automatisch per ruit (`neuslatVoor`). Instellingen per project (inklapbaar blok) en per ruit (onderlat, latten aan twee kanten) in `info.toebehoren`. Mag ook na een bestelling (gaat niet naar de leverancier); niet bij alleen kijken (`kijkWeigert`) |
| **Sponning en glaslat** (v113) | Invoer, groep Sponning: kolom **Diepte** (`latten.js` `pakketCelHTML`: vak + oordeel-chip) en **Glaslat** (`latCelHTML`). Vak → `latDiepte` (`zetDiepte`); chip → `latPakket` (`pakketVenster`: tekening, band binnen, uitfrezen, advies); latknop → `latKiezen` (`kiezer`, met foto of tekening, groot via `groot`). Rekenen: `pakket()`, `adviezen()`, `neuslatVoor()`. Bewaard in `info.toebehoren.perRuit` (`toebehorenZetRuit`), niet op de ruit. Mag ook na een bestelling; niet bij alleen kijken. Kennis en bronnen: `GLASLATTEN.md` |
| **Past het in de sponning? bij de bestellijst** (v113) | `pdf.js` `voorControles()` → als laatste `pakketControle()`: "Past het in de sponning?" bij "past niet" of "te ruim" (Stoppen / Toch doorgaan). De leverancier ziet geen latten |
| **Overzicht (PDF invoer)** | `pdf.js` `exportFotoPdf()`; sinds v111 achteraan een pagina "Toebehoren - intern" (`toebehorenPagina`), sinds v113 in de tabel per foto de kolommen Spon. en Lat/pakket. Ook bij "Alles exporteren"; **nooit** op de bestellijst |
| **Importeren (maten uit pdf, Excel, csv)** | `import.js`, ⬆ Importeren |
| **Naslag (catalogus, roosters)** | `naslag.js`; foto's in `catalogus/` en `roosters/` |
| **Taken, logboek, klant, levering** | `project.js` (klantblok en levering staan op Invoer; Project info toont ze) → tabellen `taken`, `projectgeschiedenis` |
| **Prullenbak** | `cloud.js` `cloudVerwijder()` → `verwijderd_op` gevuld; terugzetten of na 30 dagen definitief (`definitiefVerwijderen`, ook de foto's) |
| **Ongedaan maken** | `undo.js` (Cmd/Ctrl+Z, Ctrl+Y); per tabel ↶ en ↷ in de balk boven de tabel (`blokbalk.js` `blokOngedaan`; ziet sinds v110 ook een wijziging van alleen de bolletjes) |
| **Nieuwe versie** | `sw.js` haalt de nieuwe bestanden op (alleen als **alle** binnen zijn: `allesInCache`) → `cloud.js` `zoekUpdate()` → eerst het werk opslaan en wachten (`veiligBijwerken`), dan pas herladen |
| **Keuzelijsten** | `DATA` bovenin `index.html`, overschreven door `app_data.glas_data` uit de database (`cloud.js` `pasDataToe()`) |

## 5. De bestanden

| bestand | regels | wat erin staat |
|---|---|---|
| `index.html` | 6.077 | de schermen, alle opmaak (CSS), de keuzelijsten (`DATA`, één regel van ±80.000 tekens), de invoertabel, het rekenwerk (glasmaat, dikte, gewicht), het slot na bestellen |
| `cloud.js` | 4.020 | inloggen, nieuw wachtwoord via een herstellink, projecten openen/opslaan/synchroniseren, live bijwerken, nieuwe versies, prullenbak, apart bewaren, taken en logboek ophalen |
| `pdf.js` | 2.529 | de bestellijst en het overzicht (PDF invoer), bestellingen vastleggen, de bestelmail |
| `teken.js` | 1.777 | tekenlaag op foto's |
| `toebehoren.js` | 644 | tabblad Toebehoren (v111): de rekenwaarden bovenin (`INSTELLINGEN`), het rekenen, het tabblad; sinds v113 ook de opslag van de keuzes per ruit voor `latten.js` |
| `latten.js` | 684 | glaslatten (v113): de lijst van Jongeneel bovenin (`LATTEN`), "past het in de sponning?", neuslat, de vensters en de twee kolommen op Invoer. Uitleg: `GLASLATTEN.md` |
| `fotos.js` | 1.794 | foto's en tekeningen, merkbolletjes, tabel per foto, het aantal samen met de bolletjes (v110) |
| `project.js` | 1.168 | klant, werkadres, levering, taken, logboek, Opgenomen door |
| `naslag.js` | 1.071 | glascatalogus, leverbaarheid, roeden, roosters |
| `import.js` | 1.042 | maten inlezen uit pdf, Excel, csv, geplakte tekst |
| `bewerkslot.js` | 755 | wie bewerkt, meekijken, overnemen |
| `start.js` | 489 | het startscherm |
| `wachtrij.js` | 437 | foto's eerst op het apparaat, dan naar de server |
| `bulk.js` | 420 | waarden doorvoeren, selecteren |
| `sw.js` | 298 | service worker: offline, nieuwe versies (lijst `SHELL`) |
| `undo.js` | 260 | ongedaan maken |
| `melding.js` | 226 | vensters en vragen in de huisstijl |
| `originelen.js` | 222 | originele foto's als zip |
| `merken.js` | 208 | merkletters uniek houden |
| `blokbalk.js` | 211 | per tabel: ongedaan, leegmaken, speling |
| `kopie.js` | 198 | regels kopiëren |
| `config.js` | — | adres van Supabase + openbare sleutel. **Niet wijzigen** |
| `leeg.html` | — | bewust leeg pagina'tje: de inlogformulieren "versturen" hierheen, zodat Safari en Firefox meteen vragen het wachtwoord te bewaren (v109). Niet weghalen; hoeft niet offline (inloggen kan toch alleen met bereik) |
| `lib/` | — | de bibliotheken (Supabase, pdf, Excel, zip), met versienummer in de mapnaam |
| `catalogus/`, `roosters/` | — | foto's voor de naslag |
| `latten/` | — | foto's van de glaslatten (v113), op te halen met `latfotos-ophalen.sh` (lijst: `latfotos.txt`). Mag ontbreken: dan tekent de app de doorsnede |
| `NN_*.sql` | — | de databasewijzigingen, genummerd (zie `DATAMODEL.md`) |
| `test-*.js`, `test-*.py` | — | de automatische tests (zie §9) |
| `.github/workflows/` | — | Supabase wakker houden |

**De volgorde van de scripts onderaan `index.html` doet ertoe**: melding →
cloud → bewerkslot → wachtrij → start → import → bulk → project → blokbalk →
fotos → kopie → latten → toebehoren → teken → merken → naslag → pdf → originelen →
undo. Niet omgooien.

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
| Toebehoren per ruit bij het project, niet op de ruit (v111) | een wijziging op de ruit geeft hem een nieuw stempel; dan werkte de vraag "Oudere stand?" na een bestelling niet meer | kopieer je een ruit, dan gaat zijn onderlat niet mee |
| Lengtes latten: totaal + 10 % zaagverlies, of meer als het zaagplan meer nodig heeft (v113, keuze Jan) | Jan: "er is toch maar 1 waarheid? grote getal en kleine getal moeten gelijk zijn incl 10% zaag verlies". Tot v112 stond er groot 9 (zaagplan) en klein 10 | Jan stelt de 10 % zelf bij als het niet klopt |
| Sponningdiepte en glaslat bij het project, niet op de ruit (v113) | zelfde reden als de onderlat (v111): geen nieuw stempel; en het mag ook na een bestelling (niet voor de leverancier) | kopieer je een ruit, dan gaan diepte en lat niet mee |
| Tot 1 mm te krap of te ruim past nog, wel "krap"/"ruim" (v113, keuze Jan) | het band vangt 1 mm op | meer dan 1 mm te ruim heet "te ruim" (de lat ligt terug, of bij een opdeklat klemt het glas niet) |
| Band buiten 3 of 4 mm, nooit 2 (v113, Jan) | "werking": de buitenkant werkt het meest | |
| Kleuren met een naam, chips en het systeemlettertype, gelijk aan de offerte-app (v113, keuze Jan) | de apps van Jelier Bouw zien er hetzelfde uit; het rood is dat van het logo (#C1121C) | de kleuren staan bovenin `index.html` (`:root`: `--accent`, `--ink`, `--ok`, `--warn`, `--err`); de oude namen (`--merk`, `--blauw`, `--rood`, `--groen`) wijzen ernaar. Een donker thema komt later |
| Alles in het Nederlands, ook de code | Jan moet het kunnen lezen | |
| Openbare repo | gratis GitHub Pages | de opzet is zichtbaar (de sleutel in `config.js` is toch al openbaar) |
| Gebruikers nooit verwijderen, behalve bij vertrek | koppelingen (taken, besteld door, logboek) raken anders los | zie `BEHEER.md` |

## 7. Begrippen

| begrip | uitleg |
|---|---|
| **Supabase** | de online dienst met de database, het inloggen en de foto-opslag |
| **RLS** (Row Level Security) | regels in de database over wie welke rij mag zien of wijzigen. Hier, kort: wie ingelogd is, mag vrijwel alles; niet ingelogd niets. Uitzonderingen (logboek niet wijzigen, keuzelijsten alleen lezen): `DATAMODEL.md` |
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
| **zaagplan** | de latten echt verdeeld over lengtes van 4 m (langste eerst, met een zaagsnede per lat). Sinds v113 is het aantal lengtes: totale lengte + 10 %, gedeeld door 4 m; alleen als het zaagplan er meer nodig heeft (lange latten), het zaagplan |
| **sponningdiepte** (v113) | de ruimte loodrecht op het glas, van de aanslag tot de buitenkant van het kozijn. In NPR 3577 heet dat sponningbreedte |
| **pakket** (v113) | wat er in de sponning moet: band binnen + glas + band buiten + glaslat. Oordeel: past, krap, ruim, te ruim, past niet |
| **neuslat** (v113) | onderlat bij buitenbeglazing met een neus die vóór het kozijn uitsteekt. Neemt níet zijn hele breedte in de sponning in: de kleinste die past heeft "ruimte vóór het glas + 5 mm ≤ modelnummer" (`GLASLATTEN.md` §6) |
| **opdeklat** (v113) | lat óp het kozijn of de deur; zijn eigen sponning maakt de ruimte voor het glas groter |
| **verstek** | de schuine hoek waarin twee glaslatten in de hoek samenkomen; daarom is een lat 20 mm langer dan de sponning |
| **onderlat** | de onderste lat van een ruit: vaak een ander type (neuslat of ventilatielat). Per project een standaard, per ruit aan te passen |
| **APP_VERSIE / PDF_VERSIE / VERSIE** | het versienummer, op drie plekken, altijd gelijk (zie §8) |

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
   - `index.html`: `const APP_VERSIE = 'v113';`
   - `pdf.js`: `var PDF_VERSIE = 'v113';`
   - `sw.js`: `const VERSIE = 'v113';`
   (Bij een wijziging maak je er alle drie het volgende nummer van, bijvoorbeeld
   `v114`.)
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

**De rekenwaarden van Toebehoren aanpassen** (v111; kitvoeg, zaagverlies,
lengte van een lat, meters op een rol, …)
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
  `LAT_FOTOS` in `sw.js` (de foto), versienummers ophogen.
- *De foto's van de latten ophalen*: op de Mac, in de map van de repo,
  `bash latfotos-ophalen.sh`. Het zet de foto's in `latten/` en schrijft de
  titels van de pagina's in `/tmp/latten-specs.txt` (vergelijk de maten met
  `latten.js`). Daarna `latten/` meecommitten.

**Een vaste geadresseerde voor de bestelmail**: Supabase → Table Editor →
`mailadressen` → *Insert row* (`naam`, `adres`, `soort` = `leverancier`).
In de app kan dat (nog) niet; het venster van de bestelmail heeft alleen een
veld voor een eenmalig extra adres. Geen code.

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
hem `OVERZICHT.md`, `DATAMODEL.md` en de handover.

## 9. De automatische tests

Bij elke versie draait Claude een reeks tests (in de repo: `test-*.js`),
twee keer. Ze bootsen de echte situatie na: meerdere apparaten, geen bereik,
een oude versie naast een nieuwe. Van elke nieuwe test wordt bewezen dat hij
rood wordt als je de reparatie terugdraait (`--mutaties` in test-v103 t/m
test-v106, test-v109, test-v110, test-v111, test-v112 en test-v113).

**Zelf draaien kan nu nog niet zomaar**: de tests verwachten de hulpmiddelen
op een vaste plek in de werkomgeving van Claude (`/home/claude/node_modules`)
en Chromium in `/opt/pw-browsers`. Op je Mac vraagt dat Node.js, het
installeren van een paar pakketten en het aanpassen van die paden. Dat is
een verbeterpunt (handover §11d: "tests automatisch bij elke push").

## 10. Risico's en kwetsbare plekken

| risico | wat je dan doet |
|---|---|
| **Geen back-up** van de database (gratis plan) | van elk afgerond project het totaaloverzicht als pdf apart bewaren; back-up/export staat op de lijst (`BEHEER.md` §8) |
| **Foto-opslag vol** (1 GB, met originelen snel) | startscherm waarschuwt bij 80/95%; dan Supabase Pro of originelen opruimen (`BEHEER.md` §9). Na een overstap op Pro rekent de waarschuwing nog met de gratis grenzen, tot de app is aangepast |
| **Supabase op pauze** (na 7 dagen zonder gebruik) | GitHub-taak houdt hem wakker; die gaat uit na 60 dagen zonder commit (`BEHEER.md` §7) |
| **Werk alleen op een apparaat** (geen bereik, iPad stuk of gewist) | zo snel mogelijk met bereik openen; nooit websitegegevens wissen met werk erop |
| **Eén gelekt wachtwoord = toegang tot alles** | sterke eigen wachtwoorden; bij vertrek meteen verwijderen (`BEHEER.md` §3.3) |
| **Herstellink al "gebruikt"** voordat de collega erop tikt (mailbeveiliging zoals Safe Links opent links vooraf) | nieuwe sturen; gebeurt het steeds, dan aan Claude melden (`BEHEER.md` §3.2) |
| **Toebehoren is een schatting** (v111) | de uitkomst hangt af van de instellingen; eerst in de praktijk vergelijken en bijstellen (§8) |
| **Maten van de latten niet allemaal nagemeten** (v113) | wat "maat nog niet nagemeten" heeft (opdeklatten, neuslatten, A5, ventilatielatten): nameten en in `latten.js` aanpassen (`GLASLATTEN.md` §11) |
| **Nooit getest in echte Safari** door Claude | Jan test elke versie op iPad/iPhone/Mac; meld afwijkingen met versie en apparaat |

## 11. Noodplan

1. **Nieuwe versie geeft problemen** → vorige versie terugzetten
   (`BEHEER.md` §2). De apparaten nemen hem over.
2. **Niemand kan inloggen of opslaan** → Supabase-dashboard: staat het project
   op pauze? *Restore*. Werk blijft intussen op de apparaten staan.
3. **Een project is weg** → prullenbak (30 dagen). Is het definitief
   verwijderd, dan is het weg, inclusief logboek en foto's: er is geen
   back-up (§10).
4. **Een verkeerde wijziging in een project** → het logboek (Project info)
   laat zien wie wat deed; de momentopnames (`projectgeschiedenis.data`, de
   laatste 20) bevatten de stand van daarvoor. Terugzetten daaruit kan nog
   niet in de app; vraag hulp.
5. **Hulp nodig** → een nieuwe Claude-sessie in het project "Glas inmeet web
   app" (die leest de handover en dit document), of een programmeur met
   `OVERZICHT.md`, `DATAMODEL.md` en de handover. De app gebruikt geen
   bijzondere techniek: HTML, JavaScript, en Supabase (Postgres).
