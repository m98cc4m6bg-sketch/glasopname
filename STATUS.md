# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 20 oktober 2026,
bij v114.*

## Live

- **v113** staat live: commit `d4fc364` (19-10). Nagekeken: gelijk aan het
  pakket. Daarna de foto's van de latten: commit `b0c1693` (28 foto's).
- **v114 is klaar en wacht op Jan**: geen SQL (`LEES-MIJ-EERST-v114.md`).
  Weggooien: `latfotos-ophalen.sh` en `latten/GL13.jpg`. Nieuw: `test-v114.js`
  en in `latten/` de foto's en maattekeningen (51 bestanden).
- Alle SQL-scripts t/m **25** horen gedraaid te zijn.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (20 oktober 2026)

- v114, keuzes van Jan (keuzelijst met alle open vragen):
  - **latzijde per ruit** (binnen/buiten/beide), **geen standaard**; "?" moet
    gekozen worden, meldingen op Toebehoren en vóór de bestellijst;
  - diepte onderdorpel apart; advies aantikken; merk blijft in beeld;
    Toebehoren op de telefoon ingeklapt;
  - na een bestelling gaan de **latkeuzes mee op slot** (v113: vrij);
  - **bi-color rooster** (RAL buiten / RAL binnen);
  - alleen het rooster anders na een bestelling = blok **ALLEEN ROOSTER**;
  - vaste zin bovenaan elke aanvulling ("Graag bevestigen …");
  - latmaten volgens de tekeningen van Jongeneel; fotoscript weg.
- Drie beoordelaars (code, bediening, vakinhoud). Belangrijkste herstel: de
  vaste eerste kolom bleef nooit staan (`overflow` op de tabel); een ander
  Duco type met een andere glasaftrek wordt VERVANGT, niet ALLEEN ROOSTER;
  bi-color zonder kleur wordt gevraagd; ook de standaardlat op slot.

## Wacht op Jan

1. **v114 plaatsen** en zeggen dat hij gepusht heeft. Daarna alle
   apparaten even bijwerken (↻).
2. **Vragen bij v114** (zie `WIJZIGINGEN-v114.md`, "Vragen"): onderlat bij
   latzijde "beide"; advies per zijde en voor de onderdorpel; ALLEEN ROOSTER
   alleen bij dezelfde glasaftrek; de deur 28 in 27 (uit v113).
3. **Op de iPad proberen**: "Hoe je het zelf controleert" in
   `WIJZIGINGEN-v110.md` t/m `-v114.md`. De rekenwaarden van Toebehoren test
   Jan zelf in de praktijk.
4. **Site URL in Supabase** (Authentication → URL Configuration). Jan gaat
   dit doen. **Tot hij het bevestigt: uitgaan van "nog niet gedaan"**, en
   het nergens als klaar opschrijven. Steeds navragen.
5. **De herstellink proberen** (na 4): stap 4 in `WIJZIGINGEN-v109.md`.
   Let op mailbeveiliging (Safe Links) die de link vooraf "gebruikt".
6. **De wachtwoordproef in Safari** (v109, stap 2 in `WIJZIGINGEN-v109.md`),
   als die nog niet gedaan is.
7. **Nalezen** van `OVERZICHT.md` §8 en `DATAMODEL.md` (Jan gaat dit doen).
8. **Instructievideo**: h03, h04, h05, h07 kloppen niet meer met v110;
   Toebehoren, de bediening, de latten en bi-color zitten er nog niet in
   (`claude/INSTRUCTIEVIDEO.md`).

## Volgende ronde (keuze van Jan, 20-10)

- **De rest van de controles** (v90 en v103; handover §11d punt 15 en 16).
- **De grote punten niet vergeten** (Jan: "zorg dat de andere punten NIET
  vergeten worden"): back-up/export (grootste risico) · tests bij elke push
  · beheerscherm keuzelijsten. Elke ronde noemen, met de stand.
- **Bestelmail: de vraag over de adressen** (alleen vaste adressen +
  `@jelierbouw.nl`, of elk adres) koos Jan "later beslissen". **Zodra de
  mail ingesteld wordt, komt die vraag terug, duidelijk en met
  onderbouwing** (zijn uitdrukkelijke wens; handover §0 en §11e).
- **Navragen**: Site URL (punt 4), wachtwoordproef (6), nalezen (7).

## Klein, kan mee in de volgende versie

- (niets openstaand)

## Groter, op de lijst (handover §11)

Back-up/export (grootste risico) · beheerscherm keuzelijsten (geparkeerd) ·
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
