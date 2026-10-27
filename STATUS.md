# Glasopname — stand van zaken

*Lees dit als eerste in een nieuwe sessie (na `CLAUDE.md`). Hoogstens twee
pagina's. **Bijwerken bij elke oplevering.** Laatst bijgewerkt: 27 oktober
2026, bij v125 (opgeleverd, nog niet live; v124 staat live).*

## Live (27-10-2026)

- **v124 staat live** (27-10, commit `a7fc36b`) en is nagekeken: de repo is
  gelijk aan het pakket (alleen `config.js` en het oude `.DS_Store` extra).
  SQL-scripts **t/m 30** zijn gedraaid (28 bleek bij v123 nog niet gedraaid;
  Jan deed het op 27-10 vóór 30). Rollen na script 30: Jan
  (`julian@jelierbouw.nl`) beheerder, de andere collega('s) collega, het
  back-upaccount rol collega mét `alleen_lezen` (dat wint). De wachtwoordproef
  in Safari is gedaan en werkt (de Wachtwoorden-app noemt het item "GitHub
  Pages"; dat kan de app niet bepalen).
- **De automatische back-up draait** (privé repo `glasopname-backup`, elke
  nacht 01:17 UTC naar de app-map in Jans Dropbox; mail bij mislukken). Taak
  **v4** staat erin (run #7 groen, 26-10). De notice "ubuntu-latest gaat naar
  Ubuntu 26" vraagt niets: de taak gebruikt alleen standaard-Python
  (`test_backup.py` groen op 3.13 en 3.14). Back-upaccount:
  `backup@glasopname.invalid` (alleen lezen). Wachtwoord wijzigen:
  `BEHEER.md` §8.
- **Ingesteld door Jan**: Site URL in Supabase (herstellink werkt),
  tweestapsverificatie op Dropbox en GitHub, `.gitignore` met
  `Claude outputs/`.
- **Niet ingesteld**: de bestelmail (Edge Function `mail` + Resend). De
  knop meldt dat de mailfunctie niet bereikbaar is; ‹Ja, verstuurd› legt
  de bestelling wel vast.
- Klein restje in de repo: een oud **`.DS_Store`**; Jan mag hem weghalen.

## v125 in het kort (opgeleverd 27-10-2026, nog niet live)

Klein gehouden en zonder agents gebouwd (werkafspraak 27-10, projectkennis
`claude/WERKWIJZE-27-10.md`). Details: `WIJZIGINGEN-v125.md`; keuzes:
`claude/WENSEN-v125.md`. **Eerst script 31**, dan de bestanden.
- "↩ Verder met …" verdwijnt na de prullenbak (ook als een collega het
  project weggooit).
- De naam van een project in de prullenbak is meteen vrij (script 31);
  terugzetten terwijl de naam bezet is → "Naam (2)", de app zegt het en
  neemt de naam over.
- Werkvloer (script 31): de leverfoto zetten, taken zonder eigenaar
  afvinken.
- Spacer zwart weg bij glas zonder spouw; "spacer zwart" op de werkvloer-pdf.
- Een ruit die naar een blok met een andere speling verhuist, houdt zijn
  glasmaat (eigen speling, geel, met uitleg).
- Onderlat op Toebehoren met plaatjes (latkiezer).
- Apart, in **v126**: weggehaalde foto's na 30 dagen echt opruimen.

## v124 in het kort (Jans eigen wensen, keuzes 26-10-2026)

Alles in één versie (keuze Jan). Details: `WIJZIGINGEN-v124.md`; alle
keuzes: `claude/WENSEN-JAN-26-10.md` (projectkennis).
- **Rollen en Beheer** (script 30, `rechten.js`): beheerder (Jan),
  collega, werkvloer (kijken, foto's, eigen taken); per persoon bestellen,
  ontgrendelen, nieuw project en weggooien uit te zetten; Beheer met
  gebruikers, 💾, prullenbak legen, opslag nakijken. Nieuw account =
  werkvloer. Opruimen na 30 dagen loopt door. ‹Apart bewaren› altijd.
- **↶**: de fout met bolletjes (Safari) opgelost; werkt ook na herladen.
  **🗑 Onlangs verwijderd** per project, 30 dagen, voor iedereen.
- **Tekeningen**: aanwijzen op elke tekening, uit alle ruiten; een ruit
  staat bij de tekening met de meeste bolletjes.
- **Werkpunten**: projectnaam vast bovenaan; max glaspakket ("Max incl.
  band") herkend, glastypes zonder passende opbouw grijs en niet kiesbaar;
  spacer zilver/zwart (op de lijst alleen zwart).
- **Toebehoren**: drie stappen, latkiezer met plaatjes, melding bij latzijde
  "geen".
- Foto's opruimen alleen als geen project ze noemt (een apart bewaarde kopie
  verloor anders haar foto's; al sinds v103).

## Wacht op Jan / navragen

1. **Op de iPad/Mac proberen**: "Hoe je het zelf controleert" in
   `WIJZIGINGEN-v124.md` (vooral: de bestellijst delen/bewaren op de iPad
   nadat de app de rechten nakeek). Ook nog die van v120, v121 en v123.
2. **v125 live zetten**: eerst script 31, dan de bestanden
   (`LEES-MIJ-EERST-v125.md`); daarna de repo nakijken. Proberen: "Hoe je
   het zelf controleert" in `WIJZIGINGEN-v125.md`.
3. **P3 herbeoordelen** (Jan vroeg erom, 22-10).
4. **C1** (een glaslat): Jan meet na; dan `zeker: true` en de maat in
   `latten.js`.
5. **Handleidingen**: Jan mag ze lezen en zeggen wat onduidelijk is.
6. **Het webadres en het GitHub-account** (handover §9): herinneren zodra er
   een site bijkomt op het account, bij een eigen domein of het
   klantportaal, en als het lang blijft liggen.

## Volgende ronde

- **v126** (keuze Jan, 27-10): weggehaalde foto's na 30 dagen echt
  opruimen (niet als een project, een apart bewaarde kopie of "Onlangs
  verwijderd" het pad nog noemt).
- **Werkwijze, elk een eigen klus** (`claude/WERKWIJZE-27-10.md`): werken met
  pull requests, de tests ombouwen (per onderdeel, één nabootsing, batterij
  < 15 min), de app geleidelijk opknippen, de documentatie afslanken.
- **Tests bij elke push (GitHub Actions): bewust nog niet** (Jan, 22-10).
- **Instructievideo** bijwerken (`claude/INSTRUCTIEVIDEO.md`; nu ook Beheer,
  Onlangs verwijderd, tekeningen, Toebehoren in drie stappen).
- Nog open uit de controles: taken en logboek live bijwerken, de
  bibliotheken voor Excel en pdf bijwerken, tekens buiten het West-Europese
  alfabet in de pdf, de logboek-bewaartermijn (een keuze), CSP.

## Groter, op de lijst (handover §11)

Beheerscherm keuzelijsten (geparkeerd; herinneren als Jan een keuzelijst wil
wijzigen) · bestelmail instellen (Jan, later; dan éérst de vraag over de
adressen, handover §0 en §11e) · tests draaibaar buiten Claudes omgeving.

## Vorige sessie (27 oktober 2026)

- v124 live gezet door Jan (scripts 28 en 30 gedraaid) en nagekeken.
- Jan vond twee dingen (Verder met, naam in de prullenbak) en beantwoordde de
  navraaglijst; daarna de vraag "waarom duurt het zo lang?": analyse en
  afspraken in `claude/WERKWIJZE-27-10.md`. v125 klein gebouwd, zonder
  agents; de batterij één keer.

## Sessie daarvoor (26–27 oktober 2026)

- v123 live gezet door Jan en nagekeken; Safari-proef gedaan; back-uptaak v4
  draait.
- Jans to-do-lijst besproken (10 punten, keuzes met vragen), daarna v124
  gebouwd door vijf agents in aparte kopieën, samengevoegd, en nagekeken
  door drie aparte agents (code, beveiliging van script 30 in een
  proefdatabase, complete werkgangen). Zij vonden o.a. dat ↶ een
  werkvloer-foto kon weghalen, dat ↶ per tabel + Cmd+Z een ruit kon laten
  verdwijnen, en dat een apart bewaarde kopie haar foto's verloor als het
  origineel werd opgeruimd; alles gerepareerd en getest.

## Waar staat wat

| wat | waar |
|---|---|
| regels voor Claude | `CLAUDE.md` |
| hoe de app werkt | `OVERZICHT.md` |
| database en rechten | `DATAMODEL.md` |
| wat Jan doet (ook de back-up en Beheer) | `BEHEER.md` |
| hoe we testen | `TESTEN.md` |
| glaslatten en sponning | `GLASLATTEN.md` |
| wat er per versie veranderde | `WIJZIGINGEN-vNN.md` (projectkennis en zip "niet-in-repo", niet in de repo) |
| waar we nu staan | dit bestand |
| snel weer op gang in een nieuwe sessie | `START-HIER.md` (projectkennis, niet in de repo) |
| volledige geschiedenis, beslissingen, bugboek, beveiliging | `HANDOVER.md` (projectkennis en zip "niet-in-repo", bewust **niet** in de openbare repo) |
| de automatische back-up | privé repo `glasopname-backup` (`INSTELLEN.md`), bronkopie in de projectkennis `claude/backup/` |
