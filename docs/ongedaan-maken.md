# Ongedaan maken en herstellen

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Cmd/Ctrl+Z over het hele project (`undo.js`), ↶ per tabel (`blokbalk.js`), ↶ na herladen (IndexedDB) en "Onlangs verwijderd" (`herstel.js`).

**Bestanden.** `undo.js`, `blokbalk.js`, `herstel.js`, `index.html` (`zetStaat`).

## Valkuilen

* `zetStaat()` ruimt undo en selectie op; elke nieuwe weg waarlangs andere
  inhoud binnenkomt, loopt via `zetStaat`.

* **Een stap voor ↶ bewaar je vóór de wijziging** (`bewaarStap` legt de stand
  van nú vast). Erna = ↶ doet niets (de fout van `tekenKies` tot v122). Een
  handeling die achteraf niets deed: `stapTerugnemen(label)` (undo.js).

* **↶ per tabel** (`blokbalk.js`) vergelijkt regels, bolletjes, diepten én
  (v123) speling/bijtelling (`maatVan`), en zet nooit een ruit terug die
  elders staat. **Sinds v124 herschrijft hij de stapel** (`deelVan`/
  `zetDeelIn`: alle stappen erboven krijgen het deel van die tabel zoals het
  nu is; `waarGebleven` en `blokKenmerk` zijn weg). Een verhuisde ruit staat
  in twee tabellen: `zetDeelIn` neemt hem in zijn geheel mee en laat een ruit
  die de tabel verliet in de oude stap staan (anders verdween hij na Cmd+Z).
  Iets nieuws dat per tabel geldt: ook in `deelVan`/`zetDeelIn`.

* **↶ blijft bewaard** (v124, IndexedDB `glasopname_ongedaan`) en wordt na
  herladen alleen overgenomen als de stand precies gelijk is. Elke nieuwe weg
  waarlangs andere inhoud binnenkomt zonder `zetStaat` (zoals een
  werkvloer-foto) moet zorgen dat ↶ hem niet weghaalt (`_erbij` in
  `herstel`). Een nieuwe weg uit het project of uitloggen: `undoWisAlles`.
  undo.js herkent een wachtende nieuwere stand aan de knop "… versie laden"
  (cloud.js): knoptekst veranderen = ook daar. Wat in een vak getypt was,
  wordt eerst een eigen stap (`undoVeldAfsluiten`): Safari geeft een knop bij
  een klik geen focus.

* **Iets weggooien in een project** (v124): eerst `bewaarStap`, dan
  `glasVerwijderd…` (herstel.js, "Onlangs verwijderd"), dan pas weg. Een
  foto-bestand gaat bij weggooien nooit uit de opslag (terugzetten moet
  kunnen); dat doet alleen het opruimen van een heel project.

## Het verhaal erbij

* **`omhul()` in undo.js alleen voor functies die hun eigen vak vervangen** (v111). Een gewoon invoervak krijgt zijn stap al via focusin/focusout; omhullen geeft dan twee stappen (de eerste Cmd+Z doet niets zichtbaars). `setBediening` vervangt de keuzelijst → wel omhullen; `setBedieningLengte` niet.

* **Waarom `zetStaat` undo leegmaakt** (v91): anders zet Cmd+Z na een projectwissel het vorige project in het huidige. Een weg die niet via `zetStaat` loopt, roept zelf `undoLeeg()` en `bulkSelectieLeeg()`.
