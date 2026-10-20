# Glasopname — datamodel

*Wat er in Supabase staat, wie wat mag, en welk script wat deed. Bijgewerkt
op 19 oktober 2026, bij v113. Bron: de SQL-scripts 01 t/m 25 zelf.*

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
alleen het apparaat dat het project "heeft", mag opslaan. Ze gelden voor elke
versie van de app, ook een oude die nog ergens draait. Ze zijn **geen
beveiliging** tegen iemand die met opzet om de app heen gaat: de controles
kijken naar wat de app zelf meestuurt (versienummer, apparaatcode), en wie
ingelogd is, mag volgens de rechten alles in `projecten` wijzigen.

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
| `samenvatting` | korte tekst voor de lijst | ja | |
| `gewijzigd_door` / `gewijzigd_naam` | wie het laatst opsloeg (code / naam) | — | `julian` |
| `besteld_op` / `besteld_door` | wanneer en door wie besteld. Alleen gevuld door de bestelmail (nog niet ingesteld); ‹Ja, verstuurd› in de app vult ze niet, die bestelling staat in `data.info.bestellingen` | — | meestal leeg |
| `spoor_vervolg` | hoort deze opslag bij dezelfde werkgang (voor het logboek) | ja | |
| `verwijderd_op` / `verwijderd_door` / `verwijderd_naam` | prullenbak: wanneer en door wie | — | leeg = niet weggegooid |
| `created_at` / `updated_at` | aangemaakt / laatst gewijzigd (server) | ja | |

**Wat er in `data` staat** (de belangrijkste onderdelen):

| onderdeel | wat |
|---|---|
| `rijen[]` | de ruiten: `merk`, `aantal`, `maatsoort`, `breedte`, `hoogte`, `glasType`, `opbouw`, `rooster`, `glasbewerking`, roeden, `opmerking`, en de berekende `glasBreedte`, `glasHoogte`, `totaalDikte`, `kgM2`; per ruit ook wie hem het laatst wijzigde (`gewDoor`, `gewOp`). Sinds v111 bij een rooster eventueel `bediening` (`'stang'` of `'koord'`), `bedieningAantal` (1 of 2) en `bedieningLengte` (mm; ontbreekt = standaardlengte); geen bediening = de drie velden ontbreken. Ze gaan mee in de momentopname van een bestelling, en in het kenmerk `k` alleen als er een bediening is (anders bleven de kenmerken van bestaande bestellingen gelijk) |
| `fotos[]` | foto's en tekeningen, met de merkbolletjes (`markeringen[]`: `{rijId, x, y}`, x en y als deel van de breedte/hoogte, 0–1) en het pad in Storage. Een regel ×3 heeft drie bolletjes met dezelfde `rijId`. Sinds v110 houdt de app het `aantal` van een regel met bolletjes gelijk aan het aantal bolletjes (alleen samen te wijzigen); de database controleert dat niet, en een oud project kan nog verschillen |
| `info` | klant, werkadres, levering, `status`, `opnemer` (opgenomen door), `slot` (leeg = normaal; `{open:true, door, op}` = na bestellen met wachtwoord **ontgrendeld**. Het slot zelf volgt uit de status: vanaf 'besteld' staat de invoer vast), `bestellingen[]` (elke bestelling met momentopname), `besteld` (samenvatting daarvan), en sinds v111 `toebehoren` (zie hieronder) |
| `info.toebehoren` (v111) | alleen wat in dit project anders is dan de standaard op het tabblad Toebehoren: `latPositie` ('binnen'/'buiten', ter info), `standaardLat`, `standaardOnderlat` ('' = zelfde als de standaardlat), `binnen` en `buiten` (`{kleur: 'wit'|'grijs', dikte}`), `afwijkingen` (`{INSTELLING: getal}`, bijv. `{KITVOEG_BREEDTE_MM: 5}`; de namen zijn die uit `INSTELLINGEN` in `toebehoren.js`), en `perRuit` (`{<id van de ruit>: {…}}`, zie hieronder). Bewust niet op de ruit zelf: dat gaf de ruit een nieuw stempel (`gewOp`). Ontbreekt het, dan geldt overal de standaard. Gaat niet naar de leverancier; de database kijkt er niet naar (geen SQL nodig) |
| — lattypen (v113) | `standaardLat` en `onderlat` zijn een id uit `LATTEN` in `latten.js` ('A4', 'B5', 'E7', 'C1', 'N35' …) of voor de onderlat `'NEUS'` (passende neuslat, de app kiest de maat). Oude namen uit v111/v112 worden bij het lezen omgezet (niet in de database): 'Glaslat' → 'A4' als standaardlat, maar als onderlat '' (zelfde als boven); 'Neuslat' → 'NEUS'; 'Ventilatielat' → 'C1' (als standaardlat → 'A4'). Pas bij een nieuwe keuze komt het nieuwe id in het project |
| — band (v113) | `binnen.dikte` 2, 3 of 4; `buiten.dikte` alleen 3 of 4 (Jan: nooit 2; een oude 2 telt als 3) |
| — `perRuit` (v111, v113) | per ruit: `onderlat`, `tweeKanten` (true; latten aan twee kanten, binnen en buiten), en sinds v113 `sponningDiepte` (mm, getal), `glaslat` (id uit `LATTEN`; leeg = projectstandaard), `bandBinnen` (2/3/4; leeg = projectstandaard), `uitfrezen` (true). Een lege keuze staat er niet in. Kopieer je een ruit, dan gaat dit niet mee (de kopie heeft een ander id) |
| `info.bestellingen[].ruiten` | per ruit de momentopname: de velden, kenmerk `k`, `opLijst` (stond op deze lijst), `g` (stempel). Op een aanvulling ook: `vervangt` (nummer van de laatste bestelling met deze ruit), en sinds v110 `vervangtUit` (tekst: uit welke lijsten de vervangen ruiten komen, bijv. "1e en 2e"), `extra` + `extraBij` (alleen meer van dezelfde ruit: het eerder bestelde aantal, en de tekst van de lijsten) of `minder` + `minderUit` (alleen een lager aantal: het eerder bestelde aantal; staat met `opLijst` = waar, maar op papier onder ANNULEREN). Sinds v112: `bedieningVan` (de bediening zoals die besteld was, `{}` = geen) en `bedieningUit` (de lijsten van het glas) bij een ruit waarvan op deze lijst alleen de bediening veranderde (ook naast `extra`/`minder`); zo'n ruit staat met `opLijst` = waar, zonder `vervangt`, en zijn glas blijft "uit" de eerdere lijsten. Een vervallen ruit (`vervallen`) krijgt sinds v110 ook `nrTekst`. Uit welke lijsten de ruiten komen die nu gelden, rekent de app uit de hele reeks (`standVan`: `herkomst`, `minderIn`, en sinds v112 `bedieningIn`: de lijst van de bediening die nu geldt). Script 23 kijkt alleen naar `k` en `opLijst`, dus de nieuwe velden vroegen geen SQL |
| `project`, `datum`, `speling`, `bijtelling` | kop van het project |
| `_versieNr` | het versienummer van de app die opsloeg (versieslot, script 21) |
| `_rev`, `_basis`, `_apparaat`, `_sessie`, `_apparaatNaam`, `_apparaatSoort` | voor het bewerkslot (script 24) |
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
de @), `email`, `actief`. Een trigger zet er iedereen in die je in Supabase
aanmaakt. De echte accounts (`auth.users`, met wachtwoorden) kan de app niet
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
projecten 1 ──── n  bestanden in Storage  (de app ruimt ze op bij definitief verwijderen)
```

**Daarom wordt een gebruiker nooit verwijderd, behalve bij vertrek**: alle
verwijzingen hierboven worden dan leeg. Een opnieuw aangemaakt account met
hetzelfde adres krijgt een nieuwe code en hoort er niet meer bij. Zie
`BEHEER.md` bovenaan.

## Wie mag wat

Het model is eenvoudig: **wie is ingelogd, hoort bij Jelier Bouw en mag alles
zien; zonder inloggen niets.** Er zijn geen rollen.

| tabel | lezen | toevoegen | wijzigen | verwijderen |
|---|---|---|---|---|
| `projecten` | ingelogd | ingelogd | ingelogd (met de controles hieronder) | ingelogd |
| `app_data` | ingelogd | — | — (alleen via SQL) | — |
| `taken` | ingelogd | ingelogd | ingelogd | ingelogd |
| `projectgeschiedenis` | ingelogd | ingelogd | **niemand** | **niemand** (de database ruimt zelf op) |
| `gebruikers` | ingelogd | — (automatisch) | ingelogd (naam) | — (gaat mee met het account) |
| `mailadressen` | ingelogd | ingelogd | ingelogd | ingelogd |
| `mailverzonden` | ingelogd | alleen de mailfunctie | — | — |
| `bewerkslot` | ingelogd | ingelogd | ingelogd | ingelogd |
| Storage `projectfotos` | ingelogd | ingelogd | ingelogd | ingelogd |

Zelf een account aanmaken staat **uit**; accounts maakt Jan in Supabase.

**Controles in de database bij het opslaan van een project** (triggers op
`projecten`, ze gelden voor iedereen):

| controle | script | wat |
|---|---|---|
| versieslot | 21 | een app met een lager versienummer dan de laatste opslag wordt geweigerd ("tik op ↻ Bijwerken") |
| bestellingen samenvoegen | 23 | een bestelling gaat nooit verloren; de status zakt niet terug; het slot na bestellen blijft |
| bewerkslot | 24 | alleen het apparaat dat het project heeft, mag opslaan; werk op een oudere stand wordt geweigerd |
| logboek | 13/14 | elke wijziging komt in `projectgeschiedenis` |
| prullenbak op serverklok | 22 | het moment van weggooien kan niet verschoven worden |

## Functies in de database

| functie | wat |
|---|---|
| `glas_bewerken(project, apparaat, naam, omschrijving, actie)` | het bewerkslot: nemen, hartslag, vragen, overnemen, vrijgeven, intrekken |
| `glas_bestellingen_erbij(…)` | een bestelling alsnog in het project zetten, buiten het bewerkslot om |
| `glas_gebruik()` | hoeveel ruimte database en foto's innemen (voor de waarschuwing op het startscherm) |
| `prullenbak_opruimbaar(dagen)` | welke projecten langer dan 30 dagen in de prullenbak staan |
| `glas_status_rang(status)` | volgorde van de statussen (besteld < geleverd < gemonteerd < afgerond) |

Realtime (live bijwerken) staat aan voor `projecten` (script 07) en
`bewerkslot` (24). Taken en het logboek werken niet live bij.

## Migraties (de SQL-scripts)

Voor zover bekend zijn 01 t/m 24 gedraaid (03 was optioneel); 25 hoort bij v109.
01 t/m 08 staan alleen in de projectkennis op claude.ai; 09 t/m 25 ook in de
repo. **`test-sql.sql` nooit in Supabase
draaien**: dat is voor de tests en begint met alles weggooien.

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
