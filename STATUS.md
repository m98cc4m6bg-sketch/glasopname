# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens één
pagina. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 21 oktober 2026,
bij v117.*

## Live

- **v115** staat live: commit `d0e094a` (20-10). Nagekeken: gelijk aan het
  pakket, behalve `.gitignore` (verborgen bestand, niet mee gesleept; zit
  weer in v116).
- **v117 opgeleverd** (21-10), nog niet gepusht; **v116 zit erin** (v116 is
  niet apart gezet). Geen SQL, nieuw: `test-v116.js` en `test-v117.js`,
  niets weggooien.
- Alle SQL-scripts t/m **25** horen gedraaid te zijn.
- De bestelmail (Edge Function `mail` + Resend) is **niet ingesteld**.

## Vorige sessie (20–21 oktober 2026)

- v117 (Jans to-do-lijstje, keuzes in vier vragen): kolom **Pakket** op
  Toebehoren; **max glaspakket** uit een maatstaat controleren en te dikke
  opbouwen grijs; **binnen = nooit neus/ventilatielat** (oude keuze rood);
  uitsteek in de onderlatknop; voorbeeld bij "Alle ruiten → glaslat";
  **zaagplan als tekening** (Toebehoren en PDF invoer); bediening
  **"standaard" op de bestellijst**; Naslag: je bestelt de totale glasmaat incl. rooster, de leverancier trekt de speling eraf (tekst Jan).
  De rest van het lijstje was al klaar (v113–v115).

- v116 (🔴, akkoord Jan): **originele foto's bleven in Safari hangen**
  ("No content provided", code 400; Jan zag het op zijn Mac). Safari stuurt
  een bestand uit IndexedDB als 0 bytes mee. Nu: altijd een kopie in het
  geheugen uploaden, een nieuw origineel als kopie bewaren, een leeg
  bestand nooit uploaden of weggooien, een leesfout houdt de rest niet
  tegen, en na 3 mislukte pogingen zegt het venster het (teller rood).
  Waarschijnlijk zit dit er al in sinds v93: op elk apparaat met Safari
  kunnen originelen hangen; die gaan na het bijwerken vanzelf omhoog.
- v115 (wens Jan, keuzes in vier vragen):
  - **latten op Toebehoren**, op Invoer alleen **Diepte** en **Onder**
    (scharniersponning zij/boven: onder vaak dieper);
  - Toebehoren per foto met de foto en merkletters; glastype/opbouw daar
    ook te wijzigen (zelfde gegevens als Invoer);
  - **opdeklat omgekeerd** (−c); gewone glaslat met ruimte over =
    **"past · N mm in zicht"**, nooit "te ruim";
  - **neuslat**: ventilatie (S − rest ≥ 5) en uitsteek (+9), alleen die
    passen, de kleinste automatisch; **beide** = onderin dezelfde lat;
  - latzijde **geen (meegeleverd)**, standaard na csv-import;
  - advies per zijde en onderin; lege kolommen niet op de bestellijst;
    bediening "standaard"; Naslag: glasaftrek + Glaslatten (één bron);
    `.gitignore` `Claude outputs/`.
- Codebeoordeling: o.a. klik na typen ging verloren, ↶ per tabel zag de
  diepte niet, iOS-inzoomen; hersteld.

## Wacht op Jan

1. **v117 pushen** (`LEES-MIJ-EERST-v117.md`, ook `.gitignore`) en alle
   apparaten bijwerken (↻). Daarna op de Mac en elke iPad: verdwijnt de
   teller "te uploaden" vanzelf? (v116 stap 1–2 in `WIJZIGINGEN-v117.md`)
2. **Vragen bij v115** (nota): A5 3 mm speling; buiten geen rechte latten in
   het advies; melden welke bestaande ruiten bij "beide" nu onderin dezelfde
   lat krijgen?
3. **Op de iPad proberen**: "Hoe je het zelf controleert" in
   `WIJZIGINGEN-v110.md` t/m `-v115.md`, vooral het toetsenbord na Tab op
   Toebehoren (v115 stap 7). De rekenwaarden van Toebehoren test Jan zelf.
4. **Site URL in Supabase** (Authentication → URL Configuration). Jan gaat
   dit doen. **Tot hij het bevestigt: uitgaan van "nog niet gedaan"**, en
   het nergens als klaar opschrijven. Steeds navragen. (20-10: nog niet.)
5. **De herstellink proberen** (na 4): stap 4 in `WIJZIGINGEN-v109.md`.
   Let op mailbeveiliging (Safe Links) die de link vooraf "gebruikt".
6. **De wachtwoordproef in Safari** (v109, stap 2 in `WIJZIGINGEN-v109.md`).
   20-10: nog niet gedaan.
7. **Nalezen** van `OVERZICHT.md` §8 en `DATAMODEL.md` (Jan gaat dit doen).
8. **Instructievideo**: h03, h04, h05, h07 kloppen niet meer met v110;
   Toebehoren, de bediening, de latten (v115: op Toebehoren) en bi-color
   zitten er nog niet in (`claude/INSTRUCTIEVIDEO.md`).

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
