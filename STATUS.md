# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 24 oktober 2026,
bij v122.*

## Live

- **v117** staat live (met v116 erin): commit `fdd003e` (21-10). Nagekeken:
  gelijk aan het pakket, behalve **`.gitignore`**: weer niet mee (de repo
  heeft nog de oude, zonder `Claude outputs/`). Jan herinneren bij elke
  oplevering zolang hij er niet in staat: in GitHub Desktop Repository →
  Repository Settings → Ignored Files, de regel `Claude outputs/`, Save,
  meecommitten (Jans verzoek, 21-10).
- **v120 opgeleverd** (22-10), nog niet gepusht; **v118 en v119 zitten
  erin** (Jan: v119 niet pushen, alles herstellen in v120). **SQL: script
  26** (rechten en telefoon), eerst de controlevraag. Nieuw: `backup.js`,
  `26_rechten_en_telefoon.sql`, `test-v118.js`, `test-v119.js`,
  `test-v120.js`; niets weggooien.
- **`.gitignore` staat goed** (commit `1ecf1fb`, 23/24-10: `Claude outputs/`). De herinnering is niet meer nodig.
- **v121 staat live** (commit `97aa1d4`, 22-10, rechtstreeks vanaf v117; nagekeken: alle 39 bestanden gelijk aan het pakket; `.gitignore` met `Claude outputs/` stond toen nog klaar om te committen). **Bevat v120**: Jans antwoorden na v120
  (neuslat recht + 20 mm, rustige melding bij "beide", P3 de actiebalk
  met voorbeeld op Toebehoren). Geen nieuwe SQL. Nieuw: `test-v121.js`.
- **v122 staat live** (commit `e5ac52e`, 26-10; nagekeken: gelijk aan het
  pakket): **script 27** (alleen lezen + nummering, 🔴 akkoord Jan), het
  back-upaccount niet in de keuzelijsten, kleine tekstfixes. Plus **los**:
  de privé repository `glasopname-backup` (automatische back-up, niet
  versleuteld), met `INSTELLEN.md`. **26-10: van Dropbox naar OneDrive**
  (keuze Jan): de map `Glasopname-backup` in zijn zakelijke OneDrive, via
  een Microsoft-app met alleen `Files.SelectedOperations.Selected`. Of Jan
  beheerder is, blijkt bij stap 2.5 (knop "Beheerderstoestemming").
- In de repo staat nog een oud **`.DS_Store`** (al vóór de `.gitignore`
  meegecommit; alleen mapnamen). Weghalen staat in het docs-pakket van
  26-10.
- Alle SQL-scripts t/m **25** horen gedraaid te zijn; **26** hoort bij v120
  (en dus ook bij v121).
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (20–22 oktober 2026)

- **Na v120 (22-10)**: Jan koos P3 (actiebalk; **later nog eens laten
  herbeoordelen**), C1 blijft onzeker tot hij nameet, de neuslat: tekening
  klopt (S + 9), kleinste met ≥ 5 mm ventilatie, in het zaagplan recht +
  20 mm (scharniersponning), bij "beide" zo laten met een subtiele melding.
  Alles in **v121**. Volgende grote stappen (Jan): tests bij elke push,
  handleidingen nalezen, automatische back-up.

- **Grote proef van v119** (22-10): zeven agents (gebruikers op Mac en
  iPad/iPhone, twee storingzoekers, UI, Toebehoren, beveiliging). Verslag:
  `claude/REVIEW-v119.md` (projectkennis, niet openbaar). Jan koos per punt
  (6 vragenrondes); alles is in **v120** verwerkt:
  - invoer: komma in een maat → naar beneden + melding; aantal alleen 1–999;
    vóór de bestellijst "Klopt dit?" bij glas < 100 mm, > 3210 × 6000,
    aantal > 99, rooster/glasdikte;
  - werk zonder bereik met twee tabbladen bleef niet altijd bewaard →
    hersteld (🔴, akkoord Jan); dubbel besteld (twee apparaten vanaf
    dezelfde stand) → luid gemeld + rode balk (🔴, akkoord Jan);
    ingetrokken lijst telt niet mee in de nummering;
  - import: kolomkoppen beter herkend, merk bestaat al → zelf kiezen
    (1a/1b, bolletjes mee), Alles vervangen telt niet door, max pakket met
    halve mm of tekst, lege cellen aan het eind, ✕;
  - latten: vlak ook onderin buiten oranje (met neuslat-advies), A5 1 mm
    te krap = nood, strook "vlak", **zaagplan + 1 reserve**, ⧉ neemt de
    keuzes mee, ruiten aanvinken + vraag + Terugzetten, Enter, lengte < 1 m;
  - pdf: kop met besteller + telefoon, contact op het werk, referentie;
    opmerking en "na de laatste bestelling gewijzigd" op werkvloer/PDF invoer;
  - scherm: 📷 Foto toevoegen, rood alleen hoofdknop/fouten, 44 px op een
    aanraakscherm, ✕ met Terugzetten, selectie alleen op Invoer, en meer;
  - beveiliging in de app en **script 26** (7 punten, akkoord Jan, met
    controlevraag); **💾 Back-up maken** (handmatig, tijdelijk) en een
    plan voor OneDrive (`BEHEER.md` §8).
- v119 (Jans antwoorden, 22-10): vlak met kozijn (oranje), A5 = nood,
  strook "beide", Alles exporteren met werkvloer-pdf.
- v118 (Jans lijst na v117): PDF werkvloer, Bestellijst = de pdf, max
  glaspakket ook op Invoer rood, Toebehoren per foto, ✕ op alles, band
  buiten per ruit, 5 mm = 2 + 3.
- v116/v117: originele foto's in Safari (🔴), max glaspakket, zaagplan als
  tekening, bediening "standaard".

## Wacht op Jan

1. **v122 pushen** (`LEES-MIJ-EERST-v122.md`): eerst **script 27** in de
   SQL Editor, dan de bestanden. Daarna de **automatische back-up**
   instellen volgens `INSTELLEN.md` (privé repo `glasopname-backup`,
   back-upaccount, Microsoft-app + beheerderstoestemming, map delen via
   de Graph Explorer, 9 secrets, proefrun). Na de proefrun navragen of
   het groen was en wat er in de map staat. **Nooit getest tegen de echte
   Microsoft**: het delen van één map met een app
   (`Files.SelectedOperations.Selected`) is gedocumenteerd, maar de
   proefrun is de eerste echte keer.
2. **Vragen**:
   (a) **P3 herbeoordelen** (Jan vroeg erom, 22-10): na een tijdje werken
   met de actiebalk vragen of het bevalt, en of P3b (zelfde probleem bij
   andere ruiten) of P1/P2/P4/P5 alsnog moet;
   (b) **C1**: Jan meet na; dan `zeker` en de maat in `latten.js`;
   (c) het **webadres/account** (handover §9): herinneren bij een nieuwe
   site op het account, een eigen domein of het klantportaal, en als het
   lang blijft liggen.
3. **Op de iPad proberen**: "Hoe je het zelf controleert" in de nota's van
   v120 en v121 (komma, 44 px, Terugzetten, back-up delen, de balk).
4. **Site URL in Supabase** (Authentication → URL Configuration). **Tot Jan
   het bevestigt: uitgaan van "nog niet gedaan"**. Steeds navragen.
5. **De herstellink proberen** (na 4): stap 4 in `WIJZIGINGEN-v109.md`.
6. **De wachtwoordproef in Safari** (v109, stap 2 in `WIJZIGINGEN-v109.md`).
7. **Handleidingen**: op 22-10 door Claude nagelezen tegen de code van v121 (BEHEER, OVERZICHT, DATAMODEL, ±90 punten verbeterd; Jan koos dit als stap). Jan mag ze nog zelf lezen; vragen welke onduidelijk zijn.
8. **Instructievideo**: h03, h04, h05, h07 kloppen niet meer met v110;
   Toebehoren, bediening, latten en bi-color zitten er nog niet in
   (`claude/INSTRUCTIEVIDEO.md`).

## Volgende ronde (keuze van Jan, 20-10)

- **De rest van de controles** (v90 en v103; handover §11d punt 15 en 16).
- **Jans antwoorden 22-10 (na het nalezen)**: **script 27 (🔴) akkoord**
  voor (a) de nummering na samenvoegen gelijk aan de app en (b) een
  **alleen-lezen** back-upaccount. Back-up: Jan wil eerst weten hoe de
  Mac-route (of een andere pc) precies werkt; Mac staat vaak in slaap,
  bijna nooit uit, meestal met wifi.
- **Gekozen (22-10), na de push**: handleidingen nalezen (gedaan 22-10) ·
  **automatische back-up** (gebouwd in v122 via een privé repo; 26-10
  omgezet naar OneDrive). **Tests bij elke push (GitHub
  Actions): bewust nog niet** (Jan, 22-10): de app verandert nog veel en
  pushen moet snel blijven; testen gebeurt bij Claude. Opnieuw voorstellen
  als de app stabiel is (dan alleen af en toe onderhoud of een bugfix). Het beheerscherm
  keuzelijsten blijft op de lijst. Elke ronde noemen, met de stand.
- **Bestelmail: de vraag over de adressen** komt terug zodra de mail
  ingesteld wordt (handover §0 en §11e).
- **Navragen**: Site URL (punt 4), wachtwoordproef (6), nalezen (7).

## Klein, kan mee in de volgende versie

- (niets openstaand)

## Groter, op de lijst (handover §11)

Automatische back-up naar OneDrive (handmatig 💾 is er sinds v120) · beheerscherm keuzelijsten (geparkeerd) ·
tests draaibaar buiten Claudes omgeving / bij elke push · bestelmail
instellen (Jan, later; dan eerst de vraag over de adressen) · rest van de
controles van v90 en v103.

## Waar staat wat

| wat | waar |
|---|---|
| regels voor Claude | `CLAUDE.md` |
| hoe de app werkt | `OVERZICHT.md` |
| database en rechten | `DATAMODEL.md` |
| wat Jan doet | `BEHEER.md` |
| hoe we testen | `TESTEN.md` |
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` (zip "niet-in-repo" en projectkennis, niet in de repo) |
| waar we nu staan | dit bestand |
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` in de projectkennis op claude.ai, en in de zip "niet-in-repo" (bewust **niet** in de openbare repo) |
