# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 19 oktober 2026,
bij v110.*

## Live

- **v109** staat live: commit `b306e16` (19-10). Nagekeken: gelijk aan het
  pakket.
- **v110 is klaar en wacht op Jan**: geen SQL, alleen de bestanden
  (`LEES-MIJ-EERST-v110.md`). Pas na Jans push en het nakijken van de repo
  geldt v110 als live.
- Alle SQL-scripts t/m **25** horen gedraaid te zijn.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (19 oktober 2026)

- v110 (keuze van Jan: optie A uit `HANDOVER-aantal-bolletjes.md`): in een
  fotoblok volgt het aantal de bolletjes. Een ruit erbij gaat via het
  bolletje (‹＋ Nog een ruit met deze letter›); een project waar het niet
  klopt, krijgt per regel een keuze onder de foto (niets stil); vóór de
  bestellijst de vraag "Klopt het aantal?".
- Vraag (a) uit v105 is beslist en gebouwd: alleen een ander aantal na een
  bestelling = "EXTRA +1" op de aanvulling, of "1 annuleren" onder
  ANNULEREN; VERVANGT alleen als er meer verandert.
- Twee kleine fouten gevonden met de nieuwe test en hersteld: de telling in
  de balk van een fotoblok bij het openen, en op een telefoon schoof de
  pagina opzij door de omschrijving van een foto.

## Wacht op Jan

1. **v110 plaatsen** en zeggen dat hij gepusht heeft.
2. **Op de iPad proberen** (stap 2 in `WIJZIGINGEN-v110.md`): een ruit erbij
   via het bolletje, het vaste aantal-vak, de strook "klopt niet" bij een
   oud project.
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
   (`claude/INSTRUCTIEVIDEO.md`).

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
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` |
| waar we nu staan | dit bestand |
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` in de projectkennis op claude.ai, en in de zip "niet-in-repo" (bewust **niet** in de openbare repo) |
