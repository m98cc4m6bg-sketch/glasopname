# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens twee
pagina's. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 28 oktober
2026, bij stap 2 van de strategie (GitHub-werkwijze; geen nieuwe
appversie).*

## Live (27-10-2026)

- **v125 staat live** (27-10, commit `17ae1a2`) en is nagekeken. SQL-scripts
  **t/m 31** zijn gedraaid. Rollen sinds script 30: Jan
  (`julian@jelierbouw.nl`) beheerder, de andere collega('s) collega, het
  back-upaccount alleen lezen.
- **De automatische back-up draait** (privé repo `glasopname-backup`, elke
  nacht 01:17 UTC naar de app-map in Jans Dropbox; mail bij mislukken; taak
  v4). Wachtwoord van het back-upaccount wijzigen: `BEHEER.md` §8.
- **Ingesteld door Jan**: Site URL in Supabase (herstellink werkt),
  tweestapsverificatie op Dropbox en GitHub, `.gitignore` met
  `Claude outputs/`.
- **Niet ingesteld**: de bestelmail (Edge Function `mail` + Resend). De
  knop meldt dat de mailfunctie niet bereikbaar is; ‹Ja, verstuurd› legt
  de bestelling wel vast.
- Klein restje in de repo: een oud **`.DS_Store`**; Jan mag hem weghalen.

## Opruimen (strategie van 27-10-2026)

Het vaste pad staat in de projectkennis (`claude/STRATEGIE-27-10.md`): één
wens per sessie en pull request, vooraf niveau en budget, een meetlat
(`./meet.sh`). Gedaan op 27-10 (stap 0 en 1):
- `CLAUDE.md` van 39 naar ±6 kB; de valkuilen per onderdeel in `docs/`.
- De handover gesplitst in beslissingen, bugboek en beveiliging
  (projectkennis); `START-HIER.md` onder 10 kB.
- Een lijst van wat uit de projectkennis weg kan, met een archief.
- `meet.sh`: de meetlat. Stand 27-10: grootste bestand, langste functie,
  globale functies, vaste wachttijden en kopieën van de nabootsing **rood**
  (dat zijn stap 3 en 4); `CLAUDE.md` en de startdocumenten **groen**.
- Gedaan op 28-10 (stap 2): tests op GitHub bij elke pull request en elke
  nacht, `main` beschermd. Snelle kern ±1 min (groen).

## Wacht op Jan / navragen

1. **De pull request van stap 2** lezen en mergen (workflows, `test/draai.sh`,
   uitleg; de app verandert niet). Daarna GitHub Desktop: Fetch + Pull.
2. **Op de iPad/Mac proberen**: "Hoe je het zelf controleert" in
   `WIJZIGINGEN-v125.md` (vooral 📍 Leverfoto met de camera) en
   `WIJZIGINGEN-v124.md` (2.9: delen/bewaren van de bestellijst na het
   nakijken van de rechten). Ook nog die van v120, v121 en v123.
3. **P3 herbeoordelen** (Jan vroeg erom, 22-10).
4. **C1** (een glaslat): Jan meet na; dan `zeker: true` en de maat in
   `latten.js`.
5. **Handleidingen**: Jan mag ze lezen en zeggen wat onduidelijk is.
6. **Het webadres en het GitHub-account**: herinneren zodra er een site
   bijkomt op het account, bij een eigen domein of het klantportaal, en als
   het lang blijft liggen (uitleg in de projectkennis).

## Volgende ronde

- **v126** (keuze Jan, 27-10): weggehaalde foto's na 30 dagen echt
  opruimen (niet als een project, een apart bewaarde kopie of "Onlangs
  verwijderd" het pad nog noemt).
- Daarna afwisselend: tests ombouwen (stap 3), de app opknippen zonder
  gedragsverandering (stap 4), en wensen.
- **Instructievideo** bijwerken (`claude/INSTRUCTIEVIDEO.md`; nu ook Beheer,
  Onlangs verwijderd, tekeningen, Toebehoren in drie stappen).
- Nog open uit de controles: taken en logboek live bijwerken, de
  bibliotheken voor Excel en pdf bijwerken, tekens buiten het West-Europese
  alfabet in de pdf, de logboek-bewaartermijn (een keuze), CSP.

## Groter, op de lijst

Beheerscherm keuzelijsten (geparkeerd; herinneren als Jan een keuzelijst wil
wijzigen; `claude/BESLISSINGEN.md` §11c) · bestelmail instellen (Jan, later;
dan éérst de vraag over de adressen, `claude/BEVEILIGING.md` §11e).

## Vorige sessie (28 oktober 2026)

- Stap 2 van de strategie: GitHub draait de snelle kern bij elke pull
  request (verplicht groen om te mergen) en de batterij elke nacht;
  `test/draai.sh` draait beide in één keer; `main` beschermd (alleen via
  pull request, ook voor de beheerder); tak na mergen automatisch weg;
  uitleg in `BEHEER.md` §2 en §12. Niets aan de app veranderd.

## Sessies daarvoor (26–27 oktober 2026)

- Stap 0 en 1 van de strategie: documentatie afgeslankt en verdeeld,
  projectkennis opgeschoond, `meet.sh`.

- v125 klein gebouwd zonder agents en live gezet (script 31); v124 (Jans
  eigen wensen, rollen en Beheer, script 30) live; v123 live; back-uptaak v4.
  Details: de nota's in de projectkennis.

## Waar staat wat

| wat | waar |
|---|---|
| regels voor Claude | `CLAUDE.md` |
| valkuilen per onderdeel | `docs/<onderdeel>.md` |
| hoe de app werkt | `OVERZICHT.md` |
| database en rechten | `DATAMODEL.md` |
| wat Jan doet (ook de back-up en Beheer) | `BEHEER.md` |
| hoe we testen | `TESTEN.md`, `docs/testen.md` |
| glaslatten en sponning | `GLASLATTEN.md` |
| de meetlat | `meet.sh` |
| tests in één keer, tests op GitHub | `test/draai.sh`, `.github/workflows/` (`BEHEER.md` §12) |
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` (projectkennis, niet in de repo) |
| waar we nu staan | dit bestand |
| snel weer op gang in een nieuwe sessie | `claude/START-HIER.md` (projectkennis, niet in de repo) |
| beslissingen, bugboek, beveiliging | `claude/BESLISSINGEN.md`, `claude/BUGBOEK.md`, `claude/BEVEILIGING.md` (projectkennis, bewust **niet** in de openbare repo) |
| de automatische back-up | privé repo `glasopname-backup` (`INSTELLEN.md`), bronkopie in de projectkennis `claude/backup/` |
