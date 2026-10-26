# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens twee
pagina's. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 26 oktober
2026, na v122 (alles live en nagekeken).*

## Live (26-10-2026)

- **v122 staat live** en is nagekeken (repo gelijk aan het pakket):
  app `e5ac52e`, handleidingen `7784ad3` en `03376f4`. Alle SQL-scripts
  **t/m 27** zijn gedraaid (26 en 27 bevestigd door Jan).
- **De automatische back-up draait** sinds 26-10 (privé repo
  `glasopname-backup`, taak v3, elke nacht 01:17 UTC naar de app-map in Jans
  Dropbox; mail bij mislukken staat aan). Back-upaccount in Supabase:
  `backup@glasopname.invalid` (alleen lezen; bewust een adres dat niet
  bestaat). Wachtwoord wijzigen: `BEHEER.md` §8.
- **Ingesteld door Jan (26-10)**: Site URL in Supabase (de herstellink
  werkt), tweestapsverificatie op Dropbox en GitHub (met passkey),
  `.gitignore` met `Claude outputs/` (sinds 24-10).
- **Niet ingesteld**: de bestelmail (Edge Function `mail` + Resend). De
  knop meldt dat de mailfunctie niet bereikbaar is; ‹Ja, verstuurd› legt
  de bestelling wel vast.
- Klein restje in de repo: een oud **`.DS_Store`** (alleen mapnamen, al vóór
  de `.gitignore` gecommit). Jan mag hem weghalen (github.com → `.DS_Store` →
  ⋯ → Delete file); geen haast.

## Wacht op Jan / navragen

1. **De wachtwoordproef in Safari** (v109): logt Jan op de Mac in, vraagt
   Safari dan meteen "Wachtwoord bewaren?", zonder waarschuwing over een
   onveilig formulier en met het e-mailadres al ingevuld? (Stap 2 in
   `WIJZIGINGEN-v109.md`.) Ook op de iPhone.
2. **P3 herbeoordelen** (Jan vroeg erom, 22-10): na een tijdje werken met
   de actiebalk op Toebehoren vragen of die bevalt, en of P3b (hetzelfde bij
   andere ruiten) of P1/P2/P4/P5 alsnog moet.
3. **C1** (een glaslat): Jan meet na; dan `zeker: true` en de maat in
   `latten.js`.
4. **Op de iPad proberen**: "Hoe je het zelf controleert" in de nota's van
   v120 en v121 (komma, 44 px, Terugzetten, back-up delen, de actiebalk).
5. **Handleidingen**: op 22-10 door Claude nagelezen; Jan mag ze zelf
   lezen en zeggen wat onduidelijk is.
6. **Het webadres en het GitHub-account** (handover §9): herinneren zodra er
   een site bijkomt op het account, bij een eigen domein of het
   klantportaal, en als het lang blijft liggen.

## Volgende ronde (keuzes van Jan)

- **De rest van de controles** van v90 en v103 (handover §11d punt 15 en 16).
- **Kleine verbeteringen aan de back-uptaak** (bij de eerstvolgende keer dat
  die repo toch open gaat): bij een geweigerde Dropbox-koppeling de uitleg
  van Dropbox tonen (`error_description`), `actions/checkout@v5` (melding
  over Node 20), en in `INSTELLEN.md` stap 3 nadrukkelijker "eerst Submit,
  dan Allow". Komt er een tabel bij in de database: ook `backup.py`.
- **Tests bij elke push (GitHub Actions): bewust nog niet** (Jan, 22-10):
  pushen moet snel blijven zolang de app veel verandert. Opnieuw voorstellen
  als de app stabiel is.
- **Instructievideo** bijwerken: h03, h04, h05, h07 kloppen niet meer met
  v110; Toebehoren, bediening, latten en bi-color ontbreken
  (`claude/INSTRUCTIEVIDEO.md`).

## Groter, op de lijst (handover §11)

Beheerscherm keuzelijsten (geparkeerd; herinneren als Jan een keuzelijst wil
wijzigen) · bestelmail instellen (Jan, later; dan éérst de vraag over de
adressen, handover §0 en §11e) · tests draaibaar buiten Claudes omgeving.

## Vorige sessie (24–26 oktober 2026)

- v121 en v122 gepusht en nagekeken; script 26 en 27 gedraaid.
- Handleidingen nagelezen (22-10) en meegenomen in v122.
- **Automatische back-up** gebouwd en ingericht. Eerst Dropbox (24-10), op
  26-10 OneDrive geprobeerd (Jan is geen beheerder in Microsoft 365; de
  knop "Beheerderstoestemming verlenen" was grijs), terug naar Dropbox
  (taak v3, met de verbeteringen uit de OneDrive-versie). Bij het instellen
  twee hobbels (verkeerde refresh_token; rechten nog niet gezet bij Allow),
  opgelost. Details: handover §2 en §9.

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
