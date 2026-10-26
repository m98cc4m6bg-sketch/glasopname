# Glasopname — datamodel

*Wat er in Supabase staat, wie wat mag, en welk script wat deed. Bijgewerkt
op 24 oktober 2026, bij v122 (script 27: alleen lezen en nummering). Bron: de SQL-scripts 01 t/m 26 zelf.*

Zie ook `OVERZICHT.md` (hoe de app werkt) en `BEHEER.md` (wat je doet).
Wordt bij elke nieuwe versie bijgewerkt; elk nieuw SQL-script komt in de lijst
onderaan.

---

## In één alinea

Eén project = **één rij** in `projecten`. De hele opname (alle ruiten, foto's,
klant, levering, bestellingen) staat als één JSON-blok in de kolom `data`.
De losse kolommen ernaast (`naam`, `status`, `aantal_ruiten`, `adres`, …) zijn
een samenvatting voor de projectenlijst; de app vult ze bij elke opslag.
Daaromheen staan kleinere tabellen: taken, het logboek, gebruikers,
mailadressen, het bewerkslot. Foto's staan niet in de database maar in
Storage (de opslagmap `projectfotos`), in een map per project.

Een paar controles zitten **in de database zelf** (triggers): een oud apparaat
kan geen nieuwere stand overschrijven, een bestelling gaat nooit verloren, en
alleen het apparaat dat het project "heeft", mag opslaan. Ze gelden ook voor
een oude versie die nog ergens draait; een te oude versie houdt het
versieslot tegen. Ze zijn er om vergissingen te voorkomen. Sinds script 26 (v120) kan alleen een
**actieve collega** (tabel `gebruikers`, `actief`) bij de projecten, en zet de
database zelf wie iets wijzigde.

## Tabellen

### `projecten` — één rij per opname

| veld | betekenis | verplicht | voorbeeld |
|---|---|---|---|
| `id` | interne code van het project | ja | `3f2a…` |
| `naam` | projectnaam | ja (leeg mag) | `Kerkstraat 12` |
| `datum` | inmeetdatum, als **tekst** | — | `16-10-2026` |
| `status` | waar het project staat | ja | `aangemaakt`, `bezig met inmeten/verwerken`, `besteld`, `geleverd`, `gemonteerd`, `afgerond` |
| `data` | **de hele opname** (JSON, zie hieronder) | ja | |
| `aantal_ruiten` | som van `aantal` over de ruiten (sinds 15) | ja | `14` |
| `adres` | werkadres voor de lijst | ja | `Dorpsstraat 1, 3311 AB Dordrecht` |
| `open_taken` | aantal open taken (trigger) | ja | `2` |
| `samenvatting` | wat er bij deze opslag veranderde, in gewone taal; de database zet het in het logboek (per werkgang) | ja | |
| `gewijzigd_door` / `gewijzigd_naam` | wie de projectrij het laatst wijzigde (opslaan, prullenbak, of een taak toevoegen of afvinken: die werkt de rij ook bij) (code / naam); sinds script 26 gezet door de database (naam uit `gebruikers`, anders het stuk vóór de @) | — | `julian` |
| `besteld_op` / `besteld_door` | wanneer en door wie besteld. Alleen gevuld door de bestelmail (nog niet ingesteld); ‹Ja, verstuurd› in de app vult ze niet, die bestelling staat in `data.info.bestellingen` | — | meestal leeg |
| `spoor_vervolg` | hoort deze opslag bij dezelfde werkgang (voor het logboek) | ja | |
| `verwijderd_op` / `verwijderd_door` / `verwijderd_naam` | prullenbak: wanneer en door wie | — | leeg = niet weggegooid |
| `created_at` / `updated_at` | aangemaakt / laatst gewijzigd (server) | ja | |

**Wat er in `data` staat** (de belangrijkste onderdelen):

| onderdeel | wat |
|---|---|
| `rijen[]` | de ruiten: `merk`, `aantal`, `maatsoort`, `breedte`, `hoogte`, `glasType`, `opbouw`, `rooster`, `glasbewerking`, roeden, `opmerking`, en de berekende `glasBreedte`, `glasHoogte`, `totaalDikte`, `kgM2`; per ruit ook wie hem het laatst wijzigde (`gewDoor`, `gewOp`). Sinds v111 bij een rooster eventueel `bediening` (`'stang'` of `'koord'`), `bedieningAantal` (1 of 2) en `bedieningLengte` (mm; ontbreekt = standaardlengte); geen bediening = de drie velden ontbreken. Ze gaan mee in de momentopname van een bestelling, en in het kenmerk `k` alleen als er een bediening is (anders bleven de kenmerken van bestaande bestellingen gelijk). Sinds v114 bij een rooster eventueel `biColor` (`'Ja'`; ontbreekt = Nee) en `ralBinnen` (de kleur binnen; alleen bij bi-color); `ralKleur` is dan de kleur buiten. Op dezelfde manier alleen in het kenmerk als bi-color gekozen is. Uit een maatstaat-import eventueel `maxPakket` (mm, max glaspakket incl. band; v117: de app controleert ertegen, niets aan de database veranderd; v120: tekst met één getal in mm, een halve mm naar beneden; onleesbaar = leeg met een melding). Verder: `fotoId` (bij welk fotoblok de ruit hoort), `correctie` (eigen speling of bijtelling), `tochBestellen` (het `op` van de bestelling waarna "toch zo bestellen" gekozen is), `ducoType`, `roedenverdeling`, `roedenbreedte`, `roedenopmerking`. `id` is een heel getal van hoogstens 9 cijfers (de app deelt ze uit vanaf 1; sinds script 26 gecontroleerd door de database, en door de app bij het laden) |
| `fotos[]` | foto's en tekeningen (`id`: letters, cijfers, - en _, max. 64; sinds script 26 gecontroleerd), met de merkbolletjes (`markeringen[]`: `{rijId, x, y}`; `rijId` een heel getal, x en y als deel van de breedte/hoogte, 0–1) en het pad in Storage. Verder `titel`, `bron` ('foto'/'tekening'), `inkt` (de getekende lijnen), `origineel` (`{pad, naam, type, grootte, datum}`, v93), `breedte`, `hoogte`, `zoom`, per blok `speling` en `bijtelling`; `soort: 'lever'` = de foto van de leverlocatie; een blok zonder `pad` is een groep zonder foto. Een regel ×3 heeft drie bolletjes met dezelfde `rijId`. Sinds v110 houdt de app het `aantal` van een regel met bolletjes gelijk aan het aantal bolletjes (alleen samen te wijzigen); de database controleert dat niet, en een oud project kan nog verschillen |
| `info` | klant en werk (`contact` en `telefoon` = contact **op het werk**, niet de besteller; `referentie`, `bereikbaar`, `notities`, `straat`, `postcode`, `plaats`), levering (`leverAdres`, `leverSoort`, `leverDatum`, `leverWeek`, `leverWeekTekst`, `leverInstructie`), `bestelmail` (`{op, door, aan}`), `status`, `opnemer` (opgenomen door), `slot` (leeg = normaal; `{open:true, door, op}` = na bestellen met wachtwoord **ontgrendeld**. Het slot zelf volgt uit de status: vanaf 'besteld' staat de invoer vast), `bestellingen[]` (elke bestelling met momentopname), `besteld` (samenvatting daarvan), en sinds v111 `toebehoren` (zie hieronder) |
| `info.toebehoren` (v111) | alleen wat in dit project anders is dan de standaard op het tabblad Toebehoren: `latPositie` ('binnen'/'buiten'; sinds v114 niet meer gebruikt), `standaardLat`, `standaardOnderlat` (sinds v114 niet meer gebruikt: de onderlat volgt de latzijde per ruit; het veld blijft bewaard), `binnen` en `buiten` (`{kleur: 'wit'|'grijs', dikte}`), `beideGezien` (v119: ids van ruiten op latzijde "beide" zonder eigen onderlat waarvoor op Toebehoren op Begrepen is getikt; dan staan ze niet meer in de melding), `afwijkingen` (`{INSTELLING: getal}`, bijv. `{KITVOEG_BREEDTE_MM: 5}`; de namen zijn die uit `INSTELLINGEN` in `toebehoren.js`; v121 nieuw: `NEUSLAT_TOESLAG_MM`, oude projecten zonder krijgen de standaard 20), en `perRuit` (`{<id van de ruit>: {…}}`, zie hieronder). Bewust niet op de ruit zelf: dat gaf de ruit een nieuw stempel (`gewOp`). Ontbreekt het, dan geldt overal de standaard. Gaat niet naar de leverancier; de database kijkt er niet naar (geen SQL nodig) |
| — lattypen (v113) | `standaardLat` en `onderlat` zijn een id uit `LATTEN` in `latten.js` ('A4', 'B5', 'E7', 'C1', 'N35' …) of voor de onderlat `'NEUS'` (passende neuslat, de app kiest de maat) of sinds v115 `'ZELFDE'` (dezelfde lat als boven, ook bij latzijde buiten). Oude namen uit v111/v112 worden bij het lezen omgezet (niet in de database): 'Glaslat' → 'A4' als standaardlat, maar als onderlat 'ZELFDE' (v115; tot v114 werd dat '' = automatisch); 'Neuslat' → 'NEUS'; 'Ventilatielat' → 'C1' (als standaardlat → 'A4'). Pas bij een nieuwe keuze komt het nieuwe id in het project |
| — band (v113, v118) | `binnen.dikte` 2, 3, 4 of 5; `buiten.dikte` 3, 4 of 5 (Jan: nooit 2; een oude 2 telt als 3). 5 = een rol 2 + een rol 3 |
| — `perRuit` (v111, v113, v114, v118) | per ruit: `onderlat` (eigen keuze; gaat altijd voor), `tweeKanten` (true; van v111–v113, telt sinds v114 als latzijde 'beide' en wordt bij een nieuwe keuze gewist), sinds v113 `sponningDiepte` (mm, getal), `glaslat` (id uit `LATTEN`; leeg = projectstandaard; oude 'GL13' → B13, 'B2' → B1 bij het lezen), `bandBinnen` (2/3/4, sinds v118 ook 5 = rol 2 + rol 3; leeg = projectstandaard), sinds v118 `bandBuiten` (3/4/5; leeg = projectstandaard), `uitfrezen` (true), en sinds v114 `latZijde` ('binnen', 'buiten' of 'beide', sinds v115 ook 'geen' = latten meegeleverd; ontbreekt = nog niet gekozen; een import van een maatstaat zet 'geen') en `diepteOnder` (mm; ontbreekt = gelijk aan `sponningDiepte`). Sinds v115 `latOmgekeerd` (true: een opdeklat met eigen sponning omgekeerd gemonteerd, neemt dan de eigen sponning in; alleen bij E7/E22/GLD1/GLD2) en kan `onderlat` 'ZELFDE' zijn. `sponningDiepte` is sinds v115 de bruikbare diepte van zij en boven (Invoer: Diepte), `diepteOnder` die van de onderdorpel (Invoer: Onder). Een lege keuze staat er niet in. Kopieer je een ruit met ⧉, dan gaat dit sinds v120 mee (de kopie krijgt een eigen regel onder haar id); tot v119 niet. Na een bestelling op slot (v114), net als de maten |
| `info.bestellingen[]` | elke bestelling: `nr`, `op`, `door`, `soort`, `via` ('pdf'/'mail'), `moment`, `aantal`, `stuks`, `ruiten`, eventueel `vervallen` (de ruiten die deze lijst annuleert, ingekort, met `nr` en sinds v110 `nrTekst`), `kort: true`, `ingetrokken` (`{op, door}`), en sinds v120 `basis`: het tijdstip (`op`) van de laatst bekende geldige bestelling waarop hij voortbouwt ('' = de eerste). Twee geldige met dezelfde `basis` = dubbel besteld (de app meldt het). Het nummer voor de leverancier telt een ingetrokken lijst niet mee: in de app (v120) en sinds script 27 ook als de database samenvoegt (alleen als een apparaat een bestelling miste). Een ingetrokken lijst houdt zijn eigen nummer; een geldige krijgt het volgende, maar nooit lager dan wat hij al had |
| `info.bestellingen[].ruiten` | per ruit de momentopname: de velden, kenmerk `k`, `opLijst` (stond op deze lijst), `g` (stempel). Op een aanvulling ook: `vervangt` (nummer van de laatste bestelling met deze ruit), en sinds v110 `vervangtUit` (tekst: uit welke lijsten de vervangen ruiten komen, bijv. "1e en 2e"), `extra` + `extraBij` (alleen meer van dezelfde ruit: het eerder bestelde aantal, en de tekst van de lijsten) of `minder` + `minderUit` (alleen een lager aantal: het eerder bestelde aantal; staat met `opLijst` = waar, maar op papier onder ANNULEREN). Sinds v112: `bedieningVan` (de bediening zoals die besteld was, `{}` = geen) en `bedieningUit` (de lijsten van het glas) bij een ruit waarvan op deze lijst alleen de bediening veranderde (ook naast `extra`/`minder`); zo'n ruit staat met `opLijst` = waar, zonder `vervangt`, en zijn glas blijft "uit" de eerdere lijsten. Sinds v114 op dezelfde manier `roosterVan` (Duco type, RAL, bi-color en RAL binnen zoals besteld) en `roosterUit` bij alleen een ander rooster. Een oudere bestelling wordt ingekort (`kort`): sinds v114 met `kort: 2` en ook `rooster`, `ducoType`, `ralKleur`, `biColor`, `ralBinnen`; een ingekorte van daarvoor (`kort: 1`) kent die niet (de app behandelt ze daar als onbekend). Een vervallen ruit (`vervallen`) krijgt sinds v110 ook `nrTekst`. Uit welke lijsten de ruiten komen die nu gelden, rekent de app uit de hele reeks (`standVan`: `herkomst`, `minderIn`, sinds v112 `bedieningIn`: de lijst van de bediening die nu geldt, en sinds v114 `roosterIn`: idem voor het rooster). Script 23 herkent een bestelling aan `op`, kijkt naar `ingetrokken`, `soort`, `vervallen`, `k` en `opLijst`, en zet `nr`, `info.besteld`, en zo nodig de status en het slot. Een nieuw veld dat niets hiervan verandert, vraagt geen SQL |
| `project`, `datum`, `speling`, `bijtelling` | kop van het project |
| `volgendId` | het volgende vrije ruitnummer |
| `taken` | oude plek van de taken (sinds script 13 leeg; de app schrijft hem nog mee) |
| `_versieNr` | het versienummer van de app die opsloeg (versieslot, script 21) |
| `_rev` | volgnummer, verhoogd door de database bij elke opslag (script 24) |
| `_basis`, `_apparaat`, `_sessie`, `_apparaatNaam`, `_apparaatSoort` | stuurt de app mee voor het bewerkslot (script 24) |
| `_projectId` | alleen in de kopie op het apparaat: van welk project dit werk is |

### `taken` — taken per project (sinds 13)

| veld | betekenis |
|---|---|
| `project_id` | bij welk project (project weg = taken weg) |
| `tekst`, `klaar`, `volgorde` | de taak |
| `eigenaar` + `eigenaar_naam` | op wiens naam (code + naam als tekst) |
| `aangemaakt_op/_door`, `afgerond_op/_door`, `updated_at` | wie en wanneer |

### `projectgeschiedenis` — het logboek (sinds 13)

| veld | betekenis |
|---|---|
| `project_id`, `moment` | welk project, wanneer |
| `wie` + `wie_naam` | wie (code + naam als tekst) |
| `samenvatting` | wat er veranderde, in gewone taal |
| `data` | de stand van vlak vóór de wijziging (momentopname), of leeg |

Per project worden 200 regels bewaard, waarvan 20 met een momentopname. De
database schrijft dit zelf (trigger), de app niet.

### `gebruikers` — leesbare kopie van de accounts (sinds 14)

`id` (= de code van het account in Supabase), `naam` (standaard het stuk vóór
de @), `email`, `actief`, sinds script 27 `alleen_lezen` (true = kan alles lezen, niets
veranderen; voor het back-upaccount; standaard false), sinds script 26 `telefoon` (max. 30 tekens; zet
ieder zelf met 📞 op het startscherm, voor op de bestellijst). Een trigger
zet er iedereen in die je in Supabase aanmaakt (de naam uit "naam" bij het
aanmaken, anders het stuk vóór de @), meteen op **actief**: een nieuw
account kan dus direct bij de projecten. Let op: de namen in het project
zelf (`gewDoor`, bestelling `door`) blijven het stuk vóór de @; `naam` in
`gebruikers` geldt voor de kolommen en het logboek, en wijzigen kan alleen
in de SQL Editor (de app kent alleen 📞). Sinds script 26 bepaalt
`actief` wie bij de projecten kan (`is_lid()`); iemand die uit dienst gaat:
`actief = false`, niet verwijderen. De echte accounts (`auth.users`, met wachtwoorden) kan de app niet
lezen, en dat hoort zo.

### `mailadressen` en `mailverzonden` — bestelmail (sinds 14)

`mailadressen`: vaste geadresseerden (`soort`, `naam`, `adres`, `standaard`,
`actief`). `mailverzonden`: het maillogboek; alleen de mailfunctie schrijft
erin. **De mailfunctie is nog niet ingesteld** (zie `BEHEER.md`).

### `bewerkslot` — wie bewerkt welk project (sinds 24)

Eén rij per project: welk apparaat het project heeft (`apparaat`, `naam`,
`omschrijving`), sinds wanneer (`sinds`), de hartslag (`gezien`), en een
lopende vraag om over te nemen (`overname_…`). Live gedeeld met alle
apparaten.

### `app_data` — de keuzelijsten

Eén rij met sleutel `glas_data`: alle glastypes, opbouwen per type,
bewerkingen, roosters, RAL-kleuren, roeden, spelingen, en de tabel met dikte
en gewicht per opbouw (`lookup`). **Deze rij wint van de lijst in
`index.html`**, behalve als de app een onderdeel als verouderd herkent
(`pasDataToe` in cloud.js); dan houdt hij zijn eigen lijst. Alleen lezen voor
de app; wijzigen gaat met een SQL-script.

### Storage: opslagmap `projectfotos` (privé)

- `<project-id>/<tijd>-<code>.jpg` — foto's en tekeningen (verkleind)
- `<project-id>/origineel/…` — de originele foto's (sinds v93)
- `<project-id>/lever-….jpg` — foto van de leverlocatie

Grens 50 MB per bestand; jpg, png, webp, heic, heif, avif, gif, tiff (script 19).
Niet openbaar: de app haalt foto's op met een tijdelijke link.

## Relaties

```
auth.users (Supabase-accounts)
   │  1 ──── 1  gebruikers            (naam + mail, leesbaar)
   │
   └── verwijzingen: projecten.gewijzigd_door / besteld_door / verwijderd_door,
       taken.eigenaar / aangemaakt_door / afgerond_door,
       projectgeschiedenis.wie, mailverzonden.wie
       → bij verwijderen van een account: LEEG gezet (scripts 16 en 18)

projecten 1 ──── n  taken                 (project weg → taken weg)
projecten 1 ──── n  projectgeschiedenis   (project weg → logboek weg)
projecten 1 ──── 1  bewerkslot            (project weg → slot weg)
projecten 1 ──── n  mailverzonden         (project weg → verwijzing leeg)
projecten 1 ──── n  bestanden in Storage  (de app ruimt ze op bij definitief verwijderen)
```

**Daarom wordt een gebruiker nooit verwijderd.** Sinds script 26 zet je
iemand die vertrekt op `actief = false`. Verwijderen (de oude manier) maakt
alle verwijzingen hierboven leeg. Een opnieuw aangemaakt account met
hetzelfde adres krijgt een nieuwe code en hoort er niet meer bij. Zie
`BEHEER.md` bovenaan.

## Wie mag wat

Het model is eenvoudig: **een actieve collega (ingelogd, en in `gebruikers`
op actief; geen anonieme aanmelding) mag alles zien; verder niemand iets.**
Er zijn geen rollen. ("collega" hieronder = `is_lid()`, sinds script 26;
daarvoor: iedereen die ingelogd is.) **Alleen lezen** (script 27): een
account met `alleen_lezen = true` (het back-upaccount) mag lezen wat een
collega mag, maar niets toevoegen, wijzigen of weggooien, ook niet in de
foto's. Dat zijn drie "restrictive" regels per tabel
(`alleen_lezen_toevoegen`/`_wijzigen`/`_weggooien`, en
`projectfotos_alleen_lezen_…` op de opslag) bovenop de regels hieronder;
die blijven zelf ongewijzigd.

| tabel | lezen | toevoegen | wijzigen | verwijderen |
|---|---|---|---|---|
| `projecten` | collega | collega | collega (met de controles hieronder) | collega, **alleen vanuit de prullenbak** (26) |
| `app_data` | collega | — | — (alleen via SQL) | — |
| `taken` | collega | collega | collega | collega |
| `projectgeschiedenis` | collega | **alleen de database** (26) | alleen de database (werkgang, opruimen) | **niemand** (de database ruimt zelf op) |
| `gebruikers` | collega | — (automatisch) | **alleen je eigen** naam en telefoon (26; de app kent alleen 📞) | — (gaat mee met het account) |
| `mailadressen` | collega | collega | collega | collega |
| `mailverzonden` | collega | alleen de mailfunctie | — | — |
| `bewerkslot` | collega | collega | collega | collega |
| Storage `projectfotos` | collega | collega | **niemand** (26: niet overschrijven) | collega |

Zelf een account aanmaken staat **uit**; accounts maakt Jan in Supabase.

**Controles in de database bij het opslaan van een project** (triggers op
`projecten`, ze gelden voor iedereen):

| controle | script | wat |
|---|---|---|
| versieslot | 21 | een app met een lager versienummer dan de laatste opslag wordt geweigerd ("tik op ↻ Bijwerken") |
| bestellingen samenvoegen | 23 | een bestelling gaat nooit verloren; mist een apparaat een bestelling, dan zakt de status niet terug en blijft het slot van de database |
| bewerkslot | 24 | alleen het apparaat dat het project heeft, mag opslaan; werk op een oudere stand wordt geweigerd |
| logboek | 13/14/18 | elke wijziging van inhoud of status komt in `projectgeschiedenis`, per werkgang één regel (dezelfde persoon, korter dan 30 minuten: de laatste regel wordt bijgewerkt); ook naar en uit de prullenbak (18) |
| prullenbak op serverklok | 22 | het moment van weggooien kan niet verschoven worden |
| wie wijzigde | 26 | `gewijzigd_door`/`_naam` en `verwijderd_door`/`_naam` zet de database; een nieuw project begint nooit in de prullenbak |
| nummers | 26 | ruit-nummers hele getallen, foto-nummers letters/cijfers/-/_, bolletjes wijzen naar een getal |
| versie niet absurd | 26 | bij het bijwerken van een project wordt een versienummer van 5 cijfers of meer geweigerd |

## Functies in de database

| functie | wat |
|---|---|
| `glas_bewerken(project, apparaat, naam, omschrijving, actie)` | het bewerkslot: nemen, hartslag, vragen, overnemen, vrijgeven, intrekken |
| `glas_bestellingen_erbij(…)` | een bestelling alsnog in het project zetten, buiten het bewerkslot om |
| `glas_gebruik()` | hoeveel ruimte database en foto's innemen (voor de waarschuwing op het startscherm) |
| `prullenbak_opruimbaar(dagen)` | welke projecten langer dan 30 dagen in de prullenbak staan |
| `glas_status_rang(status)` | volgorde van de statussen (besteld < geleverd < gemonteerd < afgerond) |
| `is_lid()` (26) | is wie nu vraagt een actieve, niet-anonieme collega? Alle regels (policies) gebruiken hem |
| `wie_is_het()`, `ids_controleren()` (26) | triggers: wie wijzigde, en de nummers in een project |
| `versie_niet_terug()` (21, vervangen in 26) | het versieslot |
| `mag_schrijven()` (27) | staat wie nu vraagt níet op alleen lezen? De restrictive regels gebruiken hem |

**Triggers** (op dezelfde tabel lopen ze op alfabetische naam):

| trigger | op | functie | script |
|---|---|---|---|
| `projecten_a_wie` | projecten | `wie_is_het` | 26 |
| `projecten_bestellingen_samenvoegen` | projecten | `bestellingen_samenvoegen` | 23 (nummering 27) |
| `projecten_bewerkslot` | projecten | `bewerkslot_bewaken` | 24 |
| `projecten_ids` | projecten | `ids_controleren` | 26 |
| `projecten_logboek` | projecten | `log_project` | 13/14 |
| `projecten_prullenbak` | projecten | `log_prullenbak` | 18 |
| `projecten_prullenbak_servertijd` | projecten | `prullenbak_servertijd` | 22 |
| `projecten_updated_at` | projecten | `set_updated_at` | 01 |
| `projecten_versie_niet_terug` | projecten | `versie_niet_terug` | 21/26 |
| `taken_tellen` | taken | `tel_open_taken` | 13 |
| `taken_updated_at`, `gebruikers_updated_at` | taken, gebruikers | `set_updated_at` | 13/14 |
| `gebruikers_bijschrijven` | auth.users | `gebruiker_bijschrijven` | 14 |

`projecten_a_wie` moet vóór `projecten_logboek` lopen (anders komt de
verkeerde naam in het logboek); daarom de "a" in de naam. Een nieuwe
trigger: let op de naam.

Realtime (live bijwerken) staat aan voor `projecten` (script 07) en
`bewerkslot` (24). Taken en het logboek werken niet live bij.

## Migraties (de SQL-scripts)

01 t/m 26 zijn gedraaid (03 was optioneel; 26 op 22-10-2026); 27 hoort bij v122.
01 t/m 08 staan alleen in de projectkennis op claude.ai; 09 t/m 26 ook in de
repo. **`test-sql.sql` nooit in Supabase
draaien**: dat is voor de tests en begint met alles weggooien.

**Na script 26 geen ouder script opnieuw draaien.** Moet het toch, draai
daarna script 26 opnieuw: oudere scripts zetten hun eigen regels terug,
zonder de controle op actieve collega's (en na 27: draai dan ook 27
opnieuw).

| nr | versie | wat |
|---|---|---|
| 01 | v1 | basis: `projecten`, `app_data`, rechten, overzicht `ruiten` (alle ruiten als platte tabel, om in de SQL Editor te zoeken) |
| 02 | | de keuzelijsten (`app_data.glas_data`) voor het eerst gevuld |
| 03 | | *optioneel*: projectnamen uniek (hoofdletters tellen niet). Of dit gedraaid is, is niet vastgelegd |
| 04 | | opslagmap `projectfotos` en de rechten daarop |
| 05 | | correctie op 04: foto's opruimen doet de app, niet de database |
| 06 | | kolom `aantal_ruiten` |
| 07 | | live bijwerken voor `projecten` |
| 08 | | kolommen `adres` en `open_taken` |
| 09 | v63 | glasbewerkingen (42 opties) |
| 10 | v68 | spelingen 2 t/m 25 mm |
| 11 | v73 | glasbewerkingen zonder maten in de naam |
| 12 | v76 | roedenverdeling en -breedtes |
| 13 | v87 | `taken`, `projectgeschiedenis` (logboek) |
| 14 | v88 | `gebruikers`, `mailadressen`, `mailverzonden`; nieuwe statussen; logboek met werkgangen |
| 15 | v89 | ruiten opnieuw tellen (som van `aantal`) |
| 16 | v89 | verwijzingen naar accounts: leeg bij verwijderen (vertrokken medewerker) |
| 17 | v91 | VSG 10.10.x: dikte en gewicht hersteld |
| 18 | v91 | prullenbak |
| 19 | v93 | opslagmap: 50 MB, ook HEIC e.d. (originele foto's) |
| 20 | v96 | opbouwlijsten opgeschoond (keuzes van Jan) |
| 21 | v99 | versieslot |
| 22 | v103 | ruimte meten; prullenbak op serverklok |
| 23 | v104/v105 | bestellingen samenvoegen in de database |
| 24 | v106 | bewerkslot |
| 25 | v109 | "Figuurglas — Canale mat blank" alsnog in de lijst Glasbewerking (script 12 vergat hem); daarna gebruikt de app de lijst uit de database weer. Mag vaker gedraaid worden |
| 26 | v120 | rechten: alleen actieve collega's (`is_lid()`); wie wijzigde zet de database; logboek alleen door de database; definitief verwijderen alleen uit de prullenbak; foto's niet overschrijven; in `gebruikers` alleen je eigen naam en telefoon; nummers en versienummer gecontroleerd; kolom `gebruikers.telefoon`. Stopt zelf als niemand actief is. Mag vaker gedraaid worden. Terugdraaien: `26_terug.sql` (niet in de repo) |
| 27 | v122 | alleen lezen: kolom `gebruikers.alleen_lezen`, `mag_schrijven()`, restrictive regels op alle tabellen en de foto's; nummering na samenvoegen gelijk aan de app (ingetrokken telt niet mee). Mag vaker gedraaid worden. Terugdraaien: `27_terug.sql` (niet in de repo) |

**Twee kleine onjuistheden in oude scripts** (gevonden bij het schrijven van
dit document; voor de gebruiker zonder gevolgen):
- Script 12 belooft in het commentaar "Figuurglas — Canale mat blank" (zonder accent, zo staat het in de code) als 43e bewerking,
  maar de lijst in het script heeft er 42, zonder die optie. De app vangt dat
  op: ontbreekt die optie in de database, dan gebruikt hij zijn eigen lijst
  uit `index.html` (43, mét Canale mat blank; `pasDataToe` in cloud.js). Gevolg:
  een wijziging van de bewerkingen in de database zou dan genegeerd worden.
  **Rechtgezet met script 25 (v109).** Controleren: `select
  jsonb_array_length(waarde->'glasbewerking') from app_data where
  key='glas_data';` (43 = in orde; 42 = script 25 nog niet gedraaid).
- Script 15 zegt dat er per project een logboekregel bijkomt; dat gebeurt niet
  (alleen `aantal_ruiten` verandert).
