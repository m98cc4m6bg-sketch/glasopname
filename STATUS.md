# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 19 oktober 2026,
bij v111.*

## Live

- **v109** staat live: commit `b306e16` (19-10). Nagekeken: gelijk aan het
  pakket.
- **v110 en v111 zijn klaar en wachten op Jan** (v111 bevat v110): geen
  SQL. Bij v111 gooit Jan ook bestanden weg: alle `WIJZIGINGEN-v*.md` en
  `favicon.ico`/`favicon.png` (`LEES-MIJ-EERST-v111.md`). Pas na Jans push en
  het nakijken van de repo geldt v111 als live.
- Alle SQL-scripts t/m **25** horen gedraaid te zijn.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (19 oktober 2026)

- v110: in een fotoblok volgt het aantal de bolletjes; "EXTRA +1" en "1
  annuleren" na een bestelling (zie de handover).
- v111 (Jan: "alles samen in v111"):
  - de nota's uit de openbare repo (nu in de zip "niet-in-repo" en de
    projectkennis), verzonnen e-mailadressen in tests, en de afspraak dat
    zwakke plekken alleen in de handover staan;
  - de favicon heet `favicon-v3.*` (Safari hield de oude vast);
  - **bediening bij een rooster**: 1× of 2× stang of koord, met lengte;
    gaat naar de leverancier;
  - **tabblad Toebehoren**: glaslatten (zaagplan), glasband, glaskit,
    wienersprossen-tape; alleen in de PDF invoer.
- Een onafhankelijke controle vond onder meer: rooster Nee via ⤓ liet de
  bediening staan, en keuzes op Toebehoren gaven de ruit een nieuw stempel.
  Alles hersteld en getest.

## Wacht op Jan

1. **v111 plaatsen** (met het weggooien) en zeggen dat hij gepusht heeft.
2. **Op de iPad proberen**: stap 1–5 in `WIJZIGINGEN-v110.md` (aantal en
   bolletjes) en in `WIJZIGINGEN-v111.md` (favicon, bediening, Toebehoren).
   Daarna: **welke rekenwaarden van Toebehoren moeten anders** (265 ml per
   koker is een aanname).
2b. **Vraag uit v111**: een ruit die na bestellen alleen een bediening
   krijgt (of een andere RAL/Duco), als eigen soort "alleen bediening erbij,
   glas niet opnieuw" in plaats van VERVANGT? Nu: VERVANGT met "zonder
   bediening" erbij.
3. **Site URL in Supabase** (Authentication → URL Configuration). Jan gaat
   dit doen. **Tot hij het bevestigt: uitgaan van "nog niet gedaan"**, en
   het nergens als klaar opschrijven. Steeds navragen.
4. **De herstellink proberen** (na 3): stap 4 in `WIJZIGINGEN-v109.md`.
   Let op mailbeveiliging (Safe Links) die de link vooraf "gebruikt".
5. **De wachtwoordproef in Safari** (v109, stap 2 in `WIJZIGINGEN-v109.md`),
   als die nog niet gedaan is.
6. **Nalezen** van `OVERZICHT.md` §8 en `DATAMODEL.md` (Jan gaat dit doen).
7. **Instructievideo**: hoofdstukken over aanwijzen en het aantal (h03, h04,
   h05, h07) kloppen niet meer met v110; opnieuw opnemen
   (`claude/INSTRUCTIEVIDEO.md`). Toebehoren en de bediening (v111) zitten er
   nog niet in.

## In de volgende ronde aan Jan voorleggen (zijn verzoek, 17-10)

- **Herinneren aan de overige vragen bij de vervolglijst** (v105), **met
  meer uitleg en de mogelijkheden per vraag**: (b) het merk van een
  vervanging ("K1" of "K1 (2e)"); (c) vastleggen of de leverancier een
  annulering bevestigde; (d) Van Noordenne de eerste aanvulling laten
  bevestigen. ((a) is beslist en gebouwd in v110.)
- **Herinneren aan het aanbod over de bestelmail**: alleen versturen naar
  `mailadressen` plus `@jelierbouw.nl` (handover §11e), met uitleg.
- **Alle punten van "Groter, op de lijst" hieronder, elk met betere uitleg
  en onderbouwing** (wat het risico is, wat het oplevert, wat het kost, de
  keuzes).
- **Navragen of de Site URL is ingesteld** (punt 3 hierboven).
- Klein ontwerppunt uit v110: wie een aantal terugzet naar een eerder
  besteld aantal (B 3 → 4, later weer 3), krijgt eerst de vraag "Oudere
  stand?" (bewaking uit v105 tegen een oud apparaat). Veilig, maar een
  extra klik; wil Jan dat zo houden?

## Klein, kan mee in de volgende versie

- (niets openstaand)

## Groter, op de lijst (handover §11)

Back-up/export (grootste risico) · beheerscherm keuzelijsten (geparkeerd) ·
tests draaibaar buiten Claudes omgeving / bij elke push · bestelmail
instellen (Jan, later) · rest van de controles van v90 en v103.

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
