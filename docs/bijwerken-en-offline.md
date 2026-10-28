# Bijwerken, service worker en de fotowachtrij

*Onderdeel van Glasopname. Lees dit alleen als je wens dit onderdeel raakt. Verhuisd uit `CLAUDE.md` op 27-10-2026 (stap 1 van de strategie); het verhaal achter een fout staat in het bugboek in de projectkennis (`claude/BUGBOEK.md`).*

**Wat het doet.** Offline openen, verplicht en veilig bijwerken naar een nieuwe versie, en foto's die eerst op het apparaat staan.

**Bestanden.** `sw.js` (`SHELL`, `allesInCache`), `cloud.js` (`verplichtBijwerken`, `opslaanEnWachten`), `wachtrij.js`, `fotos.js` (`bewaarBestand`).

## Valkuilen

* Nooit `location.reload()` zonder `opslaanEnWachten()` (verplicht en veilig
  bijwerken, v99).

* Zet in `SHELL` nooit een bestand dat niet in de repo staat: dan komt er
  nooit meer een update (`allesInCache`, v100).

* Een update komt aan via de code van de **oude** versie: test de overgang
  vanaf wat live staat. De redding voor v98 en ouder in sw.js
  (`draaitOudeVersie`) pas weghalen als geen apparaat meer zo oud is.

* Iconen met versie in het adres (`?v=2`) in index.html, manifest én SHELL.

* Foto's via `bewaarBestand()` / `fotoBlob()` (wachtrij op het apparaat);
  nooit rechtstreeks `storage.upload`. Originelen in `<project>/origineel/`.

* **Een bestand uit IndexedDB nooit zelf uploaden** (v116): Safari stuurt
  het als 0 bytes mee ("No content provided", 400), Chrome niet. Altijd de
  inhoud inlezen en een nieuwe `Blob` versturen (`kopie()` in wachtrij.js);
  een `File` bewaart `zet()` als kopie (`alsKopie`). Een leeg bestand nooit
  uploaden of weggooien; gelezen ≠ bewaarde grootte = niet uploaden. Een
  fout op het apparaat zelf (`e.lokaal`, ook een tijdslimiet bij het
  lezen) mag de ronde niet stoppen.

## Het verhaal erbij

* **Een bibliotheek moet op twee plekken** (v91, bugboek valkuil 6): het pad in de code (`index.html`, `pdf.js`, `import.js` of `originelen.js`) en de `SHELL`-lijst in `sw.js`. `test-index.js` controleert dat ze op schijf staan én in die lijst. Bijwerken: `lib/LEESMIJ.md`.

* **Een nieuw `.js`-bestand op drie plekken** (bugboek, valkuil 3): `<script src>` in `index.html`, de `SHELL`-lijst in `sw.js`, en mee in de oplevering. Vergeet je `sw.js`, dan werkt dat deel offline niet, en dat merk je pas op een dak. De volgorde van de scripts doet ertoe (`OVERZICHT.md`).

* **Ophalen van een foto** gaat met `fotoBlob(pad)` of `link(pad)` (eerst de wachtrij, dan de cloud). Een nieuwe plek die zelf `storage.upload` of `createSignedUrl` doet, werkt niet zonder bereik (bugboek, valkuil 10).
