# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens twee
pagina's. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 26 oktober
2026, bij v123 (opgeleverd, nog niet live).*

## Live (26-10-2026)

- **v122 staat live** en is nagekeken (repo gelijk aan het pakket):
  app `e5ac52e`, handleidingen `7784ad3`, `03376f4` en `f8d3a30`. Alle
  SQL-scripts **t/m 27** zijn gedraaid.
- **v123 is opgeleverd** (26-10), nog niet gepusht. Volgorde voor Jan: eerst
  **script 28**, dan **script 29** in Supabase → SQL Editor, dan de bestanden
  van v123 in GitHub Desktop (`LEES-MIJ-EERST-v123.md`). Daarna de repo
  nakijken (clone + `diff -rq`).
- **De automatische back-up draait** sinds 26-10 (privé repo
  `glasopname-backup`, elke nacht 01:17 UTC naar de app-map in Jans Dropbox;
  mail bij mislukken staat aan). Bij v123 hoort **taak v4**
  (`glasopname-backup.zip`: duidelijkere melding als Dropbox de koppeling
  weigert, `actions/checkout@v5`, "eerst Submit, dan Allow" in
  `INSTELLEN.md`). Back-upaccount: `backup@glasopname.invalid` (alleen
  lezen). Wachtwoord wijzigen: `BEHEER.md` §8.
- **Ingesteld door Jan (26-10)**: Site URL in Supabase (de herstellink
  werkt), tweestapsverificatie op Dropbox en GitHub (met passkey),
  `.gitignore` met `Claude outputs/`.
- **Niet ingesteld**: de bestelmail (Edge Function `mail` + Resend). De
  knop meldt dat de mailfunctie niet bereikbaar is; ‹Ja, verstuurd› legt
  de bestelling wel vast.
- Klein restje in de repo: een oud **`.DS_Store`** (alleen mapnamen). Jan mag
  hem weghalen (github.com → `.DS_Store` → ⋯ → Delete file); geen haast.

## v123 in het kort (keuzes Jan, 26-10-2026)

De bekende punten uit de controles van v90 en v103. Eigen wensen van Jan
komen in een volgende ronde.
- Zoeken: ook op klantnaam; met script 29 zonder accenten en met meer woorden.
- ‹Toch doorgaan› bij werk dat niet op de server staat heet nu ‹Apart
  bewaren en doorgaan›: het werk gaat als apart project naar de server (keuze
  Jan). Na uitloggen gaat de kopie van het project van het apparaat (alleen
  als alles op de server staat; keuze Jan).
- Een foto die nog verwerkt wordt, komt nooit in een ander project.
- Import: een regel met alleen tekst wordt genoemd; uit een pdf komt een
  maat onder de goede kop (twijfel = regel geweigerd).
- Dubbele merkletters: het venster zegt wat er gebeurt; een bestelde ruit
  houdt zijn letter.
- Tekenen, foto draaien, ↶ per tabel: de bekende fouten opgelost.
- Taken van een oud-collega of zonder eigenaar: label in het project
  (keuze Jan: alleen in het project).
- PDF invoer: roedenopmerking; ontbrekende foto in rood met melding.
  Leverweek met jaartal. ✕ op de laatste twee vensters. Spoor ("Laatst
  gewijzigd door") ook met een tik.
- Script 28 (🔴, akkoord Jan): controles op nummers en versie, ruimtemeter
  alleen voor collega's. Script 29: zoeken.

## Wacht op Jan / navragen

1. **v123 plaatsen**: script 28, script 29, dan de bestanden; de back-uptaak
   v4 in de privé repo zetten en één keer ‹Run workflow›.
2. **De wachtwoordproef in Safari** (v109): vraagt Safari na het inloggen
   meteen "Wachtwoord bewaren?", zonder waarschuwing en met het e-mailadres
   ingevuld? (Stap 2 in `WIJZIGINGEN-v109.md`.) Ook op de iPhone.
3. **P3 herbeoordelen** (Jan vroeg erom, 22-10): bevalt de actiebalk op
   Toebehoren, of moet P3b of P1/P2/P4/P5 alsnog?
4. **C1** (een glaslat): Jan meet na; dan `zeker: true` en de maat in
   `latten.js`.
5. **Op de iPad proberen**: "Hoe je het zelf controleert" in de nota's van
   v120, v121 en nu v123 (tik op het ruitnummer, foto draaien, tekenen en ↶).
6. **Handleidingen**: Jan mag ze lezen en zeggen wat onduidelijk is.
7. **Het webadres en het GitHub-account** (handover §9): herinneren zodra er
   een site bijkomt op het account, bij een eigen domein of het
   klantportaal, en als het lang blijft liggen.
8. **Eigen wensen van Jan**: volgende ronde (zijn keuze, 26-10).

## Volgende ronde (keuzes van Jan)

- **Eigen wensen van Jan** (hij levert ze aan).
- **Tests bij elke push (GitHub Actions): bewust nog niet** (Jan, 22-10).
- **Instructievideo** bijwerken: h03, h04, h05, h07 kloppen niet meer met
  v110; Toebehoren, bediening, latten en bi-color ontbreken
  (`claude/INSTRUCTIEVIDEO.md`).
- Nog open uit de controles (niet in v123, met reden in de nota): taken en
  logboek live laten bijwerken (vraagt SQL en een ontwerp), de bibliotheken
  voor Excel en pdf bijwerken, tekens buiten het West-Europese alfabet in de
  pdf, de logboek-bewaartermijn (een keuze), CSP.

## Groter, op de lijst (handover §11)

Beheerscherm keuzelijsten (geparkeerd; herinneren als Jan een keuzelijst wil
wijzigen) · bestelmail instellen (Jan, later; dan éérst de vraag over de
adressen, handover §0 en §11e) · tests draaibaar buiten Claudes omgeving.

## Vorige sessie (26 oktober 2026)

- Ingelezen vanuit de sessie-zip van v122; repo = zip; snelle kern groen.
- v123 gebouwd: de bekende punten (zie hierboven), script 28 en 29, taak v4
  van de back-up. Een onafhankelijke controle (aparte agent) vond o.a. dat
  samenvoegen van pdf-cellen een maat kon veranderen ("2 1000" → 21000) en
  dat de app een te groot nummer niet goed rechtzette; beide gerepareerd en
  getest. Details: `WIJZIGINGEN-v123.md`.

## Waar staat wat

| wat | waar |
|---|---|
| regels voor Claude | `CLAUDE.md` |
| hoe de app werkt | `OVERZICHT.md` |
| database en rechten | `DATAMODEL.md` |
| wat Jan doet (ook de back-up) | `BEHEER.md` |
| hoe we testen | `TESTEN.md` |
| glaslatten en sponning | `GLASLATTEN.md` |
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` (projectkennis en zip "niet-in-repo", niet in de repo) |
| waar we nu staan | dit bestand |
| snel weer op gang in een nieuwe sessie | `START-HIER.md` (projectkennis, niet in de repo) |
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` (projectkennis en zip "niet-in-repo", bewust **niet** in de openbare repo) |
| de automatische back-up | privé repo `glasopname-backup` (`INSTELLEN.md`), bronkopie in de projectkennis `claude/backup/` |
