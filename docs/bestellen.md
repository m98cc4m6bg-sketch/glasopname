# Bestellen, bestellijst en pdf

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Bestellingen vastleggen, aanvullingen (VERVANGT, EXTRA, annuleren, alleen bediening/rooster), het model van de bestellijst en de pdf's.

**Bestanden.** `index.html` (`besteldeStand`, `teBestellen`, `bestellingVastleggen`, `ruitKenmerk`), `pdf.js`, script 23 en 27.

## Valkuilen

* Alles wat `projectInfo` vervangt (zetStaat, undo, samenvoegen) behoudt
  `bestellingen` (undo.js, `bestellingenErbij`, script 23).

* Bestellingen: alleen ‹Ja, verstuurd› of een gelukte bestelmail legt vast
  (`projectInfo.bestellingen`, nooit overschrijven). Vergelijken altijd met
  `besteldeStand()`. Een oudere stand gaat nooit stil mee (`voorControles`).
  Script 23 rekent `info.besteld` zoals `besteldBijwerken()`: verander ze
  samen.

* Alleen een ander aantal na een bestelling = EXTRA / "N annuleren"
  (`aantalVerschil`, v110), anders VERVANGT. `teBestellen()` deelt in;
  `bestelMomentopname()` en de pdf volgen die indeling: verander ze samen.
  Na een EXTRA zit een ruit in méér lijsten: noem ze met `besteldInTekst()`
  ("1e en 2e"), nooit alleen `st.nr` (dat is de laatste lijst; de leverancier
  liet dan de rest staan en maakte te veel).
  Een EXTRA/minder is een verschil: `standVan` rekent het totaal vanaf wat
  er dán geldt (`andereBasis`), niet vanaf `o.aantal`.

* **Spacer** (v124): `spacer: 'zwart'` of afwezig; in `ruitKenmerk` alleen
  bij zwart (`|sp:zwart`), net als bi-color; op de bestellijst alleen een
  kolom als er zwart is (`bestellijstModel`).

* **Bediening** (v111): `bediening`/`bedieningAantal`/`bedieningLengte` op de
  ruit; telt in `ruitKenmerk` alleen mee als hij gekozen is, met de kale
  velden (nooit de schermtekst). Rooster op Nee (ook doorvoeren in bulk.js)
  haalt hem weg; `bedieningTekst` toont niets zonder rooster.
  Na een bestelling alleen de bediening anders (v112, keuze Jan) = nooit
  VERVANGT: `bedieningVerschil` → blok ALLEEN BEDIENING (`teBestellen().bediening`,
  `bedieningVan` in de momentopname, `bedieningTabel`). Glas en bediening
  kunnen uit verschillende lijsten komen: noem ze met `besteldInTekst` en
  `bedieningInTekst`. Op papier en scherm `bedieningOpPapier` (v117: bij een
  rooster zonder extra bediening "standaard"); vergelijken en het kenmerk
  blijven op de kale velden.

* **Bi-color en ALLEEN ROOSTER** (v114, keuze Jan): `biColor` ('Ja' of
  afwezig) en `ralBinnen` op de ruit; in het kenmerk alleen als bi-color
  gekozen is (anders "gewijzigd" bij elke bestelde ruit). Op papier altijd
  `ralTekst(r)` / `roosterTekst(r)`, nooit `r.ralKleur` rauw.

* **Bestellijst: één bron** (v118, wens Jan): `bestellijstModel()` in pdf.js
  bepaalt kolommen (lege weg, `leegWaarde`), regels, kader, blokken
  (annuleren, bediening, rooster) en totaal, voor de pdf **én** het tabblad
  (`renderBestellijst`). Iets veranderen aan de lijst = in het model, nooit
  alleen in één van de twee. Zonder pdf.js (test-index, test-herstel in
  jsdom) een eenvoudig model in `renderBestellijst`.

* **PDF werkvloer** (v118): `bouwWerkvloerPdf` in pdf.js; niet voor de
  leverancier (geen levercontrole in `startExport`, niets vastgelegd);
  de laatste pagina's zijn `toebehorenPagina(doc, eigenTitel)`.
  `bedieningVerschil` kijkt naar bediening én rooster (`ROOSTER_VELDEN`) en
  geeft `roosterWas/roosterNu` → `teBestellen().rooster`, `roosterVan` in
  de momentopname, `roosterIn` in `standVan`, `roosterTabel`. Een ander
  Duco type alleen bij dezelfde glasaftrek (`ducoWisselMag`), anders
  VERVANGT. `KORT_VELDEN` bevat sinds v114 de roostervelden: een ingekorte
  bestelling van daarvoor (`kort: 1`) kent ze niet, dus altijd via
  `kortBewaard(oud, veld)`.

* `pdf.js` `schoon()`: een teken buiten het pdf-lettertype (emoji, →, ≥, ł)
  wordt in jsPDF rommel; nieuwe tekst in een pdf via `schoon` of `pdfTekst`
  (die zetten om, halen emoji weg en maken van de rest "?").

* Een ingekorte momentopname (`kort`) heeft alleen `KORT_VELDEN`. Een veld
  dat oude ingekorte standen niet hebben, lijkt daar "leeg" (en dan lijkt
  alles "gewijzigd"): zet er alleen iets bij met een nieuw `kort`-nummer en
  een bewaking (v114: `kort: 2` en `kortBewaard()` voor de roostervelden).
  Lees zo'n stand met een terugval (`bedieningTekst`).

* **Bestellingen** (v120): elke bestelling heeft `basis` (het tijdstip van
  de laatst bekende geldige; '' = de eerste). Twee geldige met dezelfde
  basis = dubbel besteld (`glasDubbelBestelMelding`, rode balk
  `.bestel-dubbel`). Het nummer voor de leverancier: `volgendBestelNr()`
  (ingetrokken telt niet mee).

* **Nummering van bestellingen** op twee plekken: `bestellingenSamenvoegen`
  (index.html) en `bestellingen_samenvoegen` (script 27). Verander ze samen.

## Het verhaal erbij

* **De kolom `status` en `data.info.status` kunnen verschillen** (v91, bugboek valkuil 7). De mailfunctie zet alleen de kolom op 'besteld'; ‹Ja, verstuurd› zet de status in de app (v104), en die gaat met de opslag naar de kolom. `serverStatus` in `cloud.js` onthoudt de kolom; `statusNietTerug()` zorgt dat de app die nooit terugzet, behalve na een bewuste keuze (`glasStatusHandmatig()`, na ontgrendelen). Haal je dat weg, dan komt het dubbel bestellen terug.

* **Een nieuw veld op de ruit verandert het kenmerk niet, tenzij het gevuld is** (v111, bugboek valkuil 27). `ruitKenmerk` hasht `KENMERK_VELDEN`; een veld daaraan toevoegen maakt na elke bestelling álle ruiten "gewijzigd". Plak het alleen achteraan als het er is, met de kale velden, nooit de schermtekst.

* **Na een EXTRA zit een ruit in meer dan één lijst** (v110, bugboek valkuil 26): de eerste bouw zei "VERVANGT B uit de 2e" terwijl er drie in de 1e zaten; de leverancier liet die staan en maakte er 4 bij. Noem altijd alle lijsten (`besteldInTekst()`, `herkomst` in `standVan`).

* **jsPDF (Helvetica, WinAnsi)** (bugboek, valkuil 29): – — … € • ™ Š Œ ƒ ‰ kan hij wel; emoji, →, ⌀, ł, ≥ niet. `pdfTekst` zet ✉ om vóór `schoon`. `\p{Extended_Pictographic}` omvat ook © ® ™; die zijn uitgezonderd.

* **De tekst in de pdf wordt één keer getekend** (`renderingMode: 'fillThenStroke'`): vijf keer tekenen maakte de tekstlaag onleesbaar bij zoeken en kopiëren.
