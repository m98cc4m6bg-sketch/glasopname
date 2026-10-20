# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 19 oktober 2026,
bij v113.*

## Live

- **v112** staat live: commit `132ec05` (19-10). Nagekeken: gelijk aan het
  pakket.
- **v113 is klaar en wacht op Jan**: geen SQL, niets weg te gooien
  (`LEES-MIJ-EERST-v113.md`). Nieuw: `latten.js`, `GLASLATTEN.md`,
  `latfotos-ophalen.sh`, `latfotos.txt`, `test-v113.js`.
- Alle SQL-scripts t/m **25** horen gedraaid te zijn.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (19 oktober 2026)

- v110 (aantal volgt de bolletjes, EXTRA) en v111 (nota's uit de repo,
  favicon, bediening bij een rooster, tabblad Toebehoren): zie de handover.
- v112, keuzes van Jan:
  - na een bestelling **alleen een andere bediening = nooit VERVANGT**, maar
    een eigen blok "ALLEEN BEDIENING – glas NIET opnieuw maken en NIET
    annuleren"; aantal én bediening = EXTRA/"N annuleren" plus het blok;
  - een koker glaskit van 290 ml is helemaal bruikbaar (de instelling
    "bruikbaar per koker" is weg).
- De controle vond o.a.: de bediening kan uit een andere lijst komen dan het
  glas (nu "1e; bediening: 2e"), en een bestelling van een collega tussen pdf
  en ‹Ja, verstuurd›. Hersteld en getest.
- v113, keuzes van Jan:
  - glaslatten van Jongeneel met maat, tekening en (later) foto;
  - per ruit sponningdiepte + glaslat op Invoer, met "past/krap/ruim/past
    niet" (marge 1 mm), uitfrezen, neuslat automatisch;
  - band buiten 3/4 (nooit 2), binnen 2/3/4 per ruit;
  - één getal voor de lengtes latten (incl. 10 %);
  - Toebehoren compact (kaartjes op de telefoon);
  - kleuren, chips en lettertype als de offerte-app (donker thema later).
- Drie beoordelaars (code, bediening, vakinhoud). Belangrijkste herstel: de
  keuzes per ruit staan bij het project (geen stempel, mag na bestellen),
  doorvoeren met een komma, ongedaan maken, inzoomen op iOS.

## Wacht op Jan

1. **v113 plaatsen** en zeggen dat hij gepusht heeft. Daarna alle
   apparaten even bijwerken (↻).
2. **Foto's van de glaslatten ophalen** op de Mac: `bash latfotos-ophalen.sh`,
   titels nalezen, `latten/` meecommitten (`BEHEER.md` §6).
3. **Vragen bij v113** (zie `WIJZIGINGEN-v113.md`, "Vragen"): de deur 28 in
   27 = "krap" of "past niet"; standaard onderlat neuslat terwijl de latten
   binnen staan; de opdeklatmaten nameten.
4. **Op de iPad proberen**: stap 1–5 in `WIJZIGINGEN-v110.md` t/m
   `-v113.md`. De rekenwaarden van Toebehoren test Jan zelf in de praktijk
   en past ze aan waar nodig (per project op het tabblad, of bovenin
   `toebehoren.js`).
5. **Site URL in Supabase** (Authentication → URL Configuration). Jan gaat
   dit doen. **Tot hij het bevestigt: uitgaan van "nog niet gedaan"**, en
   het nergens als klaar opschrijven. Steeds navragen.
6. **De herstellink proberen** (na 5): stap 4 in `WIJZIGINGEN-v109.md`.
   Let op mailbeveiliging (Safe Links) die de link vooraf "gebruikt".
7. **De wachtwoordproef in Safari** (v109, stap 2 in `WIJZIGINGEN-v109.md`),
   als die nog niet gedaan is.
8. **Nalezen** van `OVERZICHT.md` §8 en `DATAMODEL.md` (Jan gaat dit doen).
9. **Instructievideo**: hoofdstukken over aanwijzen en het aantal (h03, h04,
   h05, h07) kloppen niet meer met v110; opnieuw opnemen
   (`claude/INSTRUCTIEVIDEO.md`). Toebehoren en de bediening (v111/v112)
   zitten er nog niet in. Jan pakt dit binnenkort op (19-10).

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
- **Navragen of de Site URL is ingesteld** (punt 5 hierboven).
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
