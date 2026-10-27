# Database, rechten, scripts en back-up

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** De SQL-scripts, rollen en rechten (script 30), de controles die op twee plekken staan, en de automatische back-up. Volledig: `DATAMODEL.md`.

**Bestanden.** `NN_*.sql`, `rechten.js`, `cloud.js` (`pasDataToe`, `zoekVerzoek`), `index.html` (`veiligeIds`, `bestellingenSamenvoegen`).

## Valkuilen

* **Rechten** (v124, script 30, `rechten.js`): de knoppen volgen `glasMag`/
  `glasWerkvloer`, maar **de database beslist**. Een nieuwe handeling die
  bestellen, ontgrendelen, een nieuw project of weggooien raakt: ook een
  controle in `rechten.js` (met reden) én in `rechten_bewaken` (SQL), en
  vóór de handeling de rechten vers ophalen. ‹Apart bewaren› (`_apart`) moet
  altijd blijven werken. Zonder script 30 werkt alles als in v123.

* **Gebruikers nooit verwijderen**, behalve bij vertrek: verwijzingen worden
  `null`. Nieuwe kolom naar `auth.users`: de naam als tekst ernaast.

* `pasDataToe()` laat `app_data.glas_data` winnen van `DATA` in index.html:
  een keuzelijst wijzigen vraagt óók een SQL-script.

* **De automatische back-up** (v122) staat in een **aparte privé repository**
  `glasopname-backup` (`backup.py`, `test_backup.py`, workflow), niet in
  deze. Komt er een tabel bij in de database, of een nieuwe opslagmap:
  ook `TABELLEN`/`EXTRA` in `backup.py` bijwerken en `test_backup.py`
  draaien; lever die repo dan apart aan (zip `glasopname-backup.zip`). Het
  back-upaccount staat op `alleen_lezen` (script 27): nooit in de app
  gebruiken; `glasGebruikers` laat het weg. Wachtwoord van dat account
  wijzigen: SQL (`BEHEER.md` §8), **nooit** het account verwijderen. Doel:
  Dropbox (app-map in Jans bestaande account; draait sinds 26-10-2026). Een
  OneDrive-versie bestaat (v2, in het archief bij Jan), maar vraagt
  een Microsoft 365-beheerder; daar kan Jan zelf niet bij (26-10).

* **Nummers van ruiten en foto's** op twee plekken: `veiligeIds` (index.html,
  zet recht bij het laden) en `glas_ids_fout` (script 28, weigert). Wat de
  database weigert, moet de app eerst rechtzetten: verander ze samen (v123).

* **Een oud script opnieuw draaien** zet zijn eigen regels terug: daarna 26,
  27, 28, 30 en 31 opnieuw, in die volgorde (proef28 §7 en proef30 §9 laten
  zien dat dat klopt). Script 30 vervangt `glas_bewerken`/`bewerkslot_bewaken`
  (24) en de regel voor definitief verwijderen (26); script 31 vervangt
  `taken_rechten` en `glas_foto_erbij` (30) en de naamindex (03). Script 31
  opnieuw na 30: anders mag de werkvloer de leverfoto weer niet.

* **Script 31 (v125)**: de app vraagt `glas_naam_vrij_in_prullenbak`
  (`window.glasScript31`); zonder werkt alles als in v124. Een nieuwe route
  die een project van de server laadt: ook `naamNaTerugzetten(rij)` (de
  "(2)" van de database in het project overnemen; anders weigert de
  volgende opslag met "naam al in gebruik"). Scripts voortaan zonder iets
  in te vullen en zonder tijdelijke tabel (keuze Jan).

* **Script 30 en het e-mailadres**: bovenaan staat `VUL-HIER-JE-EMAILADRES-IN`
  (de repo is openbaar); een ingevulde kopie gaat in de zip "niet-in-repo".
  De tabel `glas_foto_pad` is afgeleid (hoeft niet in `backup.py`).

* **Zoeken** (v123): `zoekVerzoek` in cloud.js, met script 29 via
  `glas_zoek_projecten` (rpc), anders `or()` met `data->info->>klant`. Een
  nieuw zoekveld: in beide. De namaak in de tests kent sinds test-v123 het
  JSON-pad in `or()` en de rpc (`S.zoek29`).

* De Edge Function `mail` is **niet uitgerold** (geen functie, geen Resend,
  geen geheimen). Schrijf niets alsof hij bestaat.

## Het verhaal erbij

* **`pasDataToe()` overschrijft `DATA`** (bugboek, valkuil 1): wijzig je een keuzelijst alleen in `index.html`, dan is die wijziging na de eerstvolgende synchronisatie weg, zonder melding. In `cloud.js` zitten guards die een herkenbaar verouderde lijst negeren, als vangnet (sinds v96 ook voor de opbouwlijst; de diktetabel wordt aangevuld met regels die alleen de app kent).

* **Taken en logboek werken niet live bij**: alleen `projecten` en `bewerkslot` zitten in de realtime-publicatie.
