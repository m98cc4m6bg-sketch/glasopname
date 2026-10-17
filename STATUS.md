# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 17 oktober 2026.*

## Live

- **v108** staat live (commit `a69a6b6`, 17 oktober 2026 09:24, door Jan
  gepusht en door Claude nagekeken tegen het pakket).
- Daarna, nog **niet** gepusht (alleen documenten, geen code):
  `BEHEER.md`, `OVERZICHT.md`, `DATAMODEL.md`, `STATUS.md`, `CLAUDE.md`,
  `WIJZIGINGEN-v108.md` (kopje "Handleidingen"). Zitten in
  `glasopname-v108-handleidingen-compleet.zip`.
- Alle SQL-scripts t/m **24** horen gedraaid te zijn. Het startscherm meldt het
  als 23 of 24 ontbreekt.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (15–17 oktober 2026)

- v107: venster "Project overgenomen" op het apparaat dat het project
  kwijtraakte.
- v108: apart project met wie en apparaat in de naam; berichtjes onderin weg
  na 8 s; "Alleen kijken" niet meer dubbel (strook onder de tabbladen, alleen
  buiten Invoer); inloggen als echt formulier zodat de browser direct na de
  inlog vraagt het wachtwoord te bewaren.
- Handleidingen geschreven (`BEHEER`, `OVERZICHT`, `DATAMODEL`) en de afspraak
  dat ze met elke versie meegaan. Gebruikers worden nooit verwijderd, behalve
  bij vertrek.

## Wacht op Jan

1. **Proef 4 van v108**: komt "Wachtwoord bewaren?" nu direct na het inloggen,
   op Mac, iPhone, en zo mogelijk Android/Windows? (Niet te testen in
   Chromium.)
2. **Akkoord op v109**: venster "Kies een nieuw wachtwoord" als de app via een
   herstellink uit Supabase opent. Geen openbare knop "Wachtwoord vergeten"
   (Jan verstuurt de herstelmail zelf). 🔴 inloggen.
3. **Site URL instellen** in Supabase (Authentication → URL Configuration),
   anders wijst de herstelmail naar localhost.
4. **Nalezen** van `OVERZICHT.md` §8 ("Zelf onderhouden") en `DATAMODEL.md`.
5. Vragen bij de vervolglijst (v105): ander aantal = VERVANGT of "+1 extra";
   merk van een vervanging; annulering laten bevestigen.
6. Aangeboden, geen antwoord: de bestelmail (als die ooit ingesteld wordt)
   alleen laten versturen naar `mailadressen` plus `@jelierbouw.nl`.

## Klein, kan mee in de volgende versie

- Script 25: "Figuurglas — Canale mat blank" (zonder accent, zo staat het in
  de code) in `app_data.glas_data.glasbewerking`; script 12 vergat hem. De app
  vangt het op met zijn eigen lijst.
- Verouderd commentaar: `pdf.js` (rond `vraagVerstuurd`) en
  `supabase/functions/mail/index.ts` zeggen nog dat alleen de mail 'besteld'
  zet; sinds v104 doet ‹Ja, verstuurd› dat ook.
- `OVERDRACHT.md` (v65) en `LEES-DIT-EERST.md` (v74→v78) zijn verouderd en
  kunnen uit de repo.

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
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` in de projectkennis op claude.ai (bewust **niet** in de openbare repo) |
