# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 17 oktober 2026,
bij v109.*

## Live

- **v108** staat live: de code sinds commit `a69a6b6` (17-10, 09:24), de
  handleidingen sinds `2279fe2` "V108.1". Nagekeken: gelijk aan het pakket.
- **v109 is klaar en wacht op Jan**: eerst `25_canale_mat.sql` in Supabase,
  dan de bestanden, en vier oude bestanden zelf weggooien
  (`LEES-MIJ-EERST-v109.md`). Pas na Jans push en het nakijken van de repo
  geldt v109 als live.
- Alle SQL-scripts t/m **24** horen gedraaid te zijn; **25** hoort bij v109.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (17 oktober 2026)

- v109: wachtwoord bewaren in Safari zonder de waarschuwing "niet beveiligd"
  (formulier naar `leeg.html` i.p.v. `about:blank`); knop "Wachtwoord
  vergeten?" die alleen een melding geeft; venster "Kies een nieuw
  wachtwoord" bij een herstellink; script 25 (Canale mat blank in de
  database); verouderd commentaar over 'besteld'; `OVERDRACHT.md` en
  `LEES-DIT-EERST.md` (en de oude `LEES-MIJ-EERST-v94/v106`) uit de repo.
- Nieuwe afspraak: **twee zips** per oplevering (repo / niet-in-repo).

## Wacht op Jan

1. **v109 plaatsen** (SQL eerst) en zeggen dat hij gepusht heeft.
2. **De wachtwoordproef in Safari opnieuw** (Mac en iPhone; zo mogelijk
   Android/Windows): geen waarschuwing meer, het e-mailadres meteen goed,
   bij een fout wachtwoord geen vraag. Stap 2 in `WIJZIGINGEN-v109.md`.
3. **Site URL in Supabase** (Authentication → URL Configuration). Jan gaat
   dit doen. **Tot hij het bevestigt: uitgaan van "nog niet gedaan"**, en
   het nergens als klaar opschrijven. In een volgende ronde navragen.
4. **De herstellink proberen** (na 3): stap 4 in `WIJZIGINGEN-v109.md`.
   Let op mailbeveiliging (Safe Links) die de link vooraf "gebruikt".
5. **Nalezen** van `OVERZICHT.md` §8 en `DATAMODEL.md` (Jan gaat dit doen).

## In de volgende ronde aan Jan voorleggen (zijn verzoek, 17-10)

- **Herinneren aan de vragen bij de vervolglijst** (v105), **met meer uitleg
  en de mogelijkheden per vraag**: (a) alleen een ander aantal: "VERVANGT"
  of "+1 extra"; (b) het merk van een vervanging ("K1" of "K1 (2e)");
  (c) vastleggen of de leverancier een annulering bevestigde; (d) Van
  Noordenne de eerste aanvulling laten bevestigen.
- **Herinneren aan het aanbod over de bestelmail**: alleen versturen naar
  `mailadressen` plus `@jelierbouw.nl` (handover §11e), met uitleg.
- **Alle punten van "Groter, op de lijst" hieronder, elk met betere uitleg
  en onderbouwing** (wat het risico is, wat het oplevert, wat het kost, de
  keuzes).
- **Navragen of de Site URL is ingesteld** (punt 3 hierboven).

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
