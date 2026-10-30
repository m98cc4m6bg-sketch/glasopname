# Opslaan, offline werk en samenwerken

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Hoe werk op de server komt zonder dat er iets verloren gaat: de kopie op het apparaat, "moet nog omhoog", apart bewaren, het versieslot (script 21) en het bewerkslot (script 24).

**Bestanden.** `cloud.js` (opslaan, synchroniseren, apart bewaren), `bewerkslot.js`, `index.html` (`slotWeigert`, `kijkWeigert`).

## Valkuilen

* Nooit gegevens kwijt. Na elke stap staat het werk op de server, óf op het
  apparaat met de vlag "moet nog omhoog" (`glasopname_pending`).

* **`magVerlaten` gooit nooit werk weg** (v123, keuze Jan): ‹Apart bewaren en
  doorgaan› = `reddingBewaar` + `reddingenUploaden`; lukt dat bewaren niet,
  dan niet doorgaan. Een nieuwe weg uit een project (zoals een nieuwe knop
  "sluiten") loopt via `magVerlaten`. Uitloggen wist daarna de kopie
  (`wisKopieNaUitloggen`), nooit de redding of de fotowachtrij.

* **Van wie is de inhoud?** `basisVan` / `_projectId` (v103). Werk dat niet bij
  het open project hoort, gaat als apart project naar de server
  (`reddingBewaar` → `reddingenUploaden`), nooit weg, nooit over een ander
  project heen.

* **Mislukt is niet leeg** (`lijstOf()`); elke `limit()` telt mee
  (`count: 'exact'`). **0 rijen bij opslaan** kan "niet ingelogd" zijn:
  eerst `sessieCheck()`.

* Iets weggooien op tijd: met de klok van de server (`prullenbak_opruimbaar`).

* Elke opslag draagt `data._versieNr` (versieslot, script 21),
  `glasBewerkslotVelden()` en `_basis` (bewerkslot, script 24). Een nieuwe
  manier van opslaan moet ze allemaal meesturen: zonder `_versieNr` weigert de
  database, zonder `_apparaat` werkt de slotcontrole niet, zonder
  `_basis` weigert hij zodra een ander intussen opsloeg. Alleen
  `synchroniseer` doet een `update` van `data`; apart gaat via `insert`.

* Nieuw veld bovenin `data`: neem het mee in `inhoudVan` (cloud.js).

* Nieuwe functie die iets wijzigt: begin met `kijkWeigert()` (bewerkslot)
  en, voor de invoer, `slotWeigert()` / `SLOT_FUNCTIES` / `opSlot()`
  (slot na bestellen, vanaf status 'besteld'; dekt ook foto's en tekenen).

* Na offline/fout/achtergrond eerst lezen (`naOffline`,
  `voorlezenEnVersturen`).

* **Eén kopie per apparaat** (`glasopname_v2`): twee tabbladen delen hem.
  `opslaanLokaal` bewaart werk van een ánder project dat nog omhoog moet
  eerst apart (`reddingBewaar`); `start()` gooit "moet nog omhoog" niet weg
  als de kopie bij een bekend project hoort. Hetzelfde project in twee
  tabbladen: een `kortBericht` (BroadcastChannel), **geen venster**.

* **Alleen kijken en toch iets veranderd** (`kijkWijziging`): gaat apart
  vóór de volgende stand op het scherm komt. Een foto of leverfoto van de
  werkvloer telt daarbij **niet** (v126, gevonden door Jan): die gaat langs
  `glas_foto_erbij` het project in, en anders kwam bij de eerste stand van
  kantoor het venster "Werk apart bewaard" met een kopie
  (`alleenWerkvloerFotos` in cloud.js: vergelijkt zonder nieuwe foto's,
  leverfoto's, `origineel` en `_erbij`). Een nieuwe handeling van de
  werkvloer die de stand op het scherm verandert, hoort daar ook bij.
  Test: test-v125 §7.

* **Een open venster (`.melding-laag`) houdt het bewerkslot op**
  (`anderVenster()` in bewerkslot.js): een collega die wil overnemen, wacht
  tot het dicht is. Iets wat alleen informeert en vanzelf kan komen: een
  `kortBericht`, geen `appMelding` (v120, gevonden met test-v106 §11).

## Het verhaal erbij

* **Nieuw veld bovenin `data`** (bugboek, valkuil 13): geweigerd werk gaat alleen apart als het echt iets anders bevat; een veld dat `inhoudVan` niet kent, telt daarbij niet mee en zou dus stil wegvallen.
