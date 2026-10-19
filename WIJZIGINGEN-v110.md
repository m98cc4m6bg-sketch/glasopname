# Glasopname v110: het aantal volgt de bolletjes, en "+1 extra" in plaats van VERVANGT

*19 oktober 2026.* Jans antwoord op de analyse in
`HANDOVER-aantal-bolletjes.md` (projectkennis):

> V109 staat inmiddels live, graag optie A bouwen. Maatvoering en aantallen
> uit een sponningmatenlijst is inderdaad de absolute waarheid en mag nooit
> stilzwijgend gewijzigd worden. […] Je uitwerking/oplossing voor
> vervolgvraag uit v105 lijkt me goed om zo te bouwen. Verder eens met de
> punten 3 t/m 5.

**Geen SQL.** Alleen de bestanden plaatsen (zie `LEES-MIJ-EERST-v110.md`).

In het kort:
1. In een fotoblok gaan het aantal en de bolletjes alleen nog samen omhoog
   of omlaag (optie A).
2. Een project waar ze niet kloppen, krijgt per regel een keuze onder de
   foto. Er verandert niets vanzelf.
3. Vóór de bestellijst vraagt de app "Klopt het aantal?" als aantal en
   bolletjes niet gelijk zijn.
4. Na een bestelling: alleen een ander aantal is "EXTRA +1" of "1
   annuleren", niet meer VERVANGT (vraag (a) uit v105).
5. Twee kleine fouten die de nieuwe test vond.

Dit geldt ook voor **tekeningen**: een kozijntekening is voor de app
hetzelfde fotoblok. (Je zei het niet uitdrukkelijk; ik ben uitgegaan van ja.
Zeg het als je het anders wilt.)

## 1. Het aantal volgt de bolletjes (🟠, keuze van Jan: optie A)

**Wat er misging.** In een fotoblok kon je het aantal gewoon typen. Dan
kwamen er geen bolletjes bij (en bij verlagen gingen er geen weg), en liepen
het aantal en de foto stil uit elkaar. Dat gebeurde ook via ⤓ doorvoeren en
gelijktrekken. Gevolg: de bestellijst zei iets anders dan de foto, er kon te
veel of te weinig besteld worden, en de monteur zocht op de foto een ruit die
er niet stond.

**Wat er nu gebeurt.**
- **Zodra een regel minstens één bolletje heeft, staat het aantal-vak vast**
  (grijs). Tik je erop, dan legt de app uit hoe het wel gaat. Op een iPad
  komt er geen toetsenbord.
- **Een ruit erbij:** tik op een bolletje → **‹＋ Nog een ruit met deze
  letter (aantal 3 → 4)›** → tik op de foto waar hij zit. Het aantal en het
  bolletje komen er in één keer bij; één keer Cmd+Z zet beide terug.
  ‹Annuleren› in de balk verandert niets.
- **Een ruit eraf:** zoals altijd: tik op het bolletje → ‹Één ruit minder›.
- **Een ontbrekende ruit** (aantal 3, maar 2 bolletjes): het menu van het
  bolletje begint dan met ‹🎯 De ontbrekende ruit aanwijzen›.
- **Alleen het bolletje weghalen** heet nu ‹Alleen het bolletje weghalen
  (aantal blijft 3)›. Dan is er een open plek (zie §2).
- **Een regel zonder bolletje** houdt een vrij aantal. Dat zijn losse maten,
  een ingelezen maatstaat en ‹+ Regel zonder markering›. Het aanwijzen
  (‹🎯 Ruiten aanwijzen›) vult de plekken op en verandert nooit het aantal:
  **een maatstaat blijft de waarheid**. Daarom komt een ingelezen D ×2
  vanzelf goed, zoals je al dacht: je wijst twee plekken aan, en het aantal
  blijft 2.
- **⤓ Doorvoeren** van het aantal in een fotoblok slaat regels met bolletjes
  over, en zegt dat in een venster ("4 regels hebben bolletjes op de foto;
  daar is het aantal niet veranderd").
- **Gelijktrekken** neemt het aantal niet over naar een regel met bolletjes,
  en zegt dat onderin.
- Kopiëren (⧉) maakt een regel zonder bolletjes, dus met een vrij aantal (zoals
  het was).
- In een **besteld project** (op slot) en bij **alleen kijken** werkt niets
  hiervan; eerst ontgrendelen.

## 2. Een project waar het niet klopt: jij kiest, per regel (🟢)

**Wat er misging.** Projecten van vóór v110 kunnen een aantal hebben dat niet
klopt met de bolletjes. Er waren alleen het duwtje ‹🎯 Ruiten aanwijzen› en
een rode stippelrand bij te veel bolletjes. Te weinig bolletjes zag je niet
op de foto.

**Wat er nu gebeurt.** Bij het openen verandert er **niets**: geen aantal,
geen bolletje. Wel staat er onder de foto een gele strook, met per regel een
keuze:

- *"E: aantal 1, maar 2 bolletjes op de foto. Wat klopt?"*
  - ‹Er zijn er 2 (aantal wordt 2)›
  - ‹Er is er 1 (het bolletje met de rode stippelrand weg)›
- *"C: aantal 2, één bolletje op de foto: nog 1 aan te wijzen."*
  - ‹Aanwijzen›
  - ‹Er is er maar 1 (aantal wordt 1)›. Die vraagt eerst even of het mag,
    omdat het aantal uit een ingelezen maatstaat kan komen.

Het aantal-vak heeft dan een gele rand (open plek) of een rode rand (te veel).
Elke keuze is terug te draaien met ↶ in de balk van de tabel (of Cmd+Z). Tot
nu toe sloeg ↶ in de tabel een wijziging van alleen een bolletje over, en
draaide het dan een oudere wijziging terug; dat is ook hersteld.
Tijdens het aanwijzen staan de regels die je nog aanwijst niet in de strook:
dat is geen fout. Een bolletje dat er te veel is, heeft in zijn menu alleen
"weghalen".

## 3. Vóór de bestellijst: "Klopt het aantal?" (🟢)

Staat er op de bestellijst een regel met bolletjes waarvan het aantal niet
gelijk is aan het aantal bolletjes, dan vraagt de app dat eerst:

> Bij deze ruiten zegt het aantal iets anders dan de bolletjes op de foto:
> C (aantal 2, één bolletje: nog 1 niet aangewezen); E (aantal 1, 2
> bolletjes). De bestellijst gaat uit van het aantal. Klopt dat niet, stop
> dan; onder de foto kies je per regel wat klopt.

‹Stoppen› of ‹Doorgaan met deze aantallen›. Na Stoppen komt er geen pdf en
wordt er niets vastgelegd (ook niet bij ‹Alles exporteren› of de
bestelmail). Regels zonder bolletjes tellen niet mee: daar is het aantal de
waarheid.

## 4. Na een bestelling: "+1 extra" en "1 annuleren" (🟠, vraag (a) uit v105)

**Wat er misging.** Werd na een bestelling alleen het aantal anders, dan zette
de aanvulling er "VERVANGT B uit de 1e" bij. Dan annuleert de leverancier de
bestelde ruiten en maakt hij alles opnieuw, terwijl er maar één bij hoefde.

**Wat er nu gebeurt** (alleen als er verder niets anders is: geen andere
maat, glas of opmerking, en ook geen andere glasmaat door een andere
speling):
- **Meer:** B 3 → 4 staat op de aanvulling als **"EXTRA bij B uit de 1e: +1
  (samen 4x)"**, met **Aantal 1**: alleen wat erbij moet. Bovenaan de pdf staat
  wat EXTRA betekent ("de eerder bestelde blijven"). Er komt niets onder
  ANNULEREN.
- **Minder:** D 2 → 1 staat niet in de tabel, wel onder **ANNULEREN**: "D 1×
  … aantal van 2 naar 1: 1 annuleren, de andere 1 blijven". Bestaat de
  aanvulling alleen daaruit, dan staat er "Geen nieuwe of gewijzigde ruiten
  op deze aanvulling" en de tabel ANNULEREN. De vraag "Naar de leverancier?"
  komt gewoon.
- **Maat én aantal anders:** zoals sinds v105, VERVANGT.
- **Uit welke lijsten:** na een EXTRA zit een ruit in meer dan één lijst.
  Wordt hij daarna nagemeten, dan staat er **"VERVANGT B uit de 1e en 2e (4x
  …)"**, en onder ANNULEREN ook "1e en 2e". Anders zou de leverancier alleen
  in de 2e zoeken en de 3 uit de 1e laten staan. Dit vond de controle (zie
  Getest).
- Op het tabblad **Bestellijst** staat bij zo'n ruit "op de aanvulling als 1
  extra; de 3 bestelde blijven" of "1 annuleren; de andere 1 blijven". In de
  lijst van bestellingen staat "1 met een lager aantal".
- Het **overzicht** (als er niets meer te bestellen is) zegt in de kolom
  Besteld "1e + 2e (3 + 1)", en onder "gevraagd te annuleren" ook de lagere
  aantallen.
- Zet je bewust een aantal terug naar een eerder besteld aantal (B 3 → 4 →
  3), dan vroeg de app eerst "Oudere stand?". Dat doet hij niet meer, ook
  niet als je het zonder bereik deed. Een oud apparaat dat een oude stand
  terugzet (met een ouder stempel), krijgt de vraag nog wel.
- **Een EXTRA is een verschil.** Bestelt een collega tussen jouw pdf en jouw
  ‹Ja, verstuurd› ook iets bij, of wordt de bestelling eronder ingetrokken,
  dan rekent de app uit wat de leverancier echt maakt (bijvoorbeeld 3 + 2 +
  1 = 6). Klopt dat niet met het project, dan staat de ruit geel en komt het
  verschil op de volgende aanvulling.

De database (script 23) hoefde niet aangepast te worden: die kijkt alleen
naar wat er besteld is, en dat klopt ook bij EXTRA en "minder".

## 5. Kleine fouten, gevonden met de nieuwe test (🟢)

- De **telling in de balk van een fotoblok** zei bij het openen het aantal
  regels ("5 ruiten" voor acht ruiten), pas na een wijziging de juiste ("8
  ruiten · 5 regels").
- Op een **telefoon** schoof de pagina opzij: het omschrijvingsveld van een
  foto kromp niet, en duwde ‹🗑 Groep› buiten beeld.

## Bestanden

| bestand | wat |
|---|---|
| `index.html` | het aantal-vak (vast met bolletjes, met uitleg), `setVal` weigert, opmaak van de strook; EXTRA/minder bij de bestellingen (`aantalVerschil`, `teBestellen`, `bestelMomentopname`), uit welke lijsten (`besteldInTekst`), "Oudere stand?" niet bij een bewuste wijziging; tabblad Bestellijst; versie v110 |
| `fotos.js` | ‹＋ Nog een ruit met deze letter›, de strook met keuzes, het menu, de telling bij openen |
| `pdf.js` | "Klopt het aantal?", EXTRA en "N annuleren" op de aanvulling en het overzicht, uit welke lijsten; versie v110 |
| `bulk.js`, `kopie.js` | doorvoeren en gelijktrekken laten het aantal van een regel met bolletjes staan |
| `blokbalk.js` | ↶ in de balk van een tabel ziet nu ook een wijziging van alleen de bolletjes |
| `sw.js` | versie v110 |
| `test-v110.js` | **nieuw**: de tests hieronder |
| `test-gevel.jpg` | **nieuw**: de foto (een gevel met vier kozijnen) voor `test-v110.js` |
| `test-v104.js`, `test-v105.js` | verwachting bijgewerkt: alleen een ander aantal is nu EXTRA; de mutatie "zelfdemaat" verhuisd naar test-v110 |
| handleidingen | zie onderaan |

## Hoe je het zelf controleert

1. **Op de iPad, in een testproject met een foto.**
   - Tik op de foto: ruit A. Tik op het aantal-vak van A: het vak is grijs,
     er komt geen toetsenbord, wel de uitleg.
   - Tik op bolletje A → ‹＋ Nog een ruit met deze letter (aantal 1 → 2)› →
     tik ergens op de foto. Verwacht: A ×2, twee bolletjes A. Cmd+Z (of ↶):
     beide terug.
   - Tik op een bolletje A → ‹Één ruit minder›: A ×1, één bolletje.
2. **Een maatstaat:** importeer een lijst met een regel ×2 (bijvoorbeeld
   D ×2), en wijs hem aan met ‹🎯 Ruiten aanwijzen›. Verwacht: twee tikken,
   D blijft ×2, en daarna staat het vak vast.
3. **Een oud project** waar het niet klopt (staat er een rode stippelrand
   om een bolletje, of zie je ‹🎯 Ruiten aanwijzen› terwijl je dacht dat
   alles klaar was): de gele strook onder de foto, met per regel de keuze.
4. **Bestellijst** van zo'n project: eerst "Klopt het aantal?".
5. **Na een bestelling** (testproject): ontgrendel, B +1 via het bolletje,
   maak de bestellijst. Verwacht: "EXTRA bij B uit de 1e: +1 (samen …x)",
   Aantal 1, niets onder ANNULEREN.

## Getest

- **`test-v110.js`** (Chromium, 13 onderdelen, 119 controles). Een gevel als
  echte foto in het project (`test-gevel.jpg`). Tikken op de foto en op de
  bolletjes zijn echte kliks. De bolletjes in de PDF invoer worden geteld
  (pdfplumber zoekt de oranje rondjes en leest de letter erin).
  - **Vangnet eerst** (1–3), op het gedrag van vóór v110:
    - aanwijzen, ook van een ingelezen D ×2 (het aantal blijft 2);
    - een tik buiten het aanwijzen maakt een nieuwe ruit;
    - één ruit minder, met Cmd+Z;
    - de bestellijst met B ×3;
    - de PDF invoer.

    Dat was groen op v109, op één fout na: de telling in de balk.
  - **4, het aantal staat vast:**
    - typen en het vangnet in de code veranderen niets;
    - D zonder bolletje is gewoon te typen;
    - ‹＋ Nog een ruit› verhoogt het aantal en zet het bolletje in één stap,
      en één Cmd+Z zet beide terug;
    - ‹Annuleren› verandert niets;
    - na het opnieuw opbouwen van het scherm vervalt een half gekozen "nog
      een ruit";
    - een vak dat al vrij op het scherm stond, weigert alsnog en toont weer
      het echte aantal;
    - een losse regel met een bolletje komt weer vrij als het bolletje weg
      is;
    - bij een open plek biedt het menu eerst "de ontbrekende ruit aanwijzen".
  - **5, een oud project:**
    - openen verandert niets;
    - de strook toont precies E en C;
    - elke knop doet wat er staat, ook ↶ in de tabel;
    - verlagen vraagt eerst;
    - een bolletje te veel heeft alleen "weghalen", ook bij een regel ×2.
  - **6:** ⤓ doorvoeren en gelijktrekken laten het aantal van regels met
    bolletjes staan, en zeggen dat.
  - **7, "Klopt het aantal?":**
    - de vraag noemt precies de regels die niet kloppen;
    - na Stoppen komt er geen pdf, ook niet bij ‹Alles exporteren›;
    - na het rechtzetten komt de vraag niet meer.
  - **8, na de bestelling: B +1 via het bolletje, D 2 → 1, C nagemeten.**
    Gecontroleerd zijn:
    - de pdf: EXTRA met aantal 1, de uitleg bovenaan, ANNULEREN D 1×, de oude
      C wel en B niet, en de totalen;
    - wat er is vastgelegd, en wat de database daarvan maakt;
    - het overzicht;
    - een aanvulling met alleen "1 annuleren";
    - een ingekorte oudere bestelling.
  - **9:** een bestelling zoals v109 hem vastlegde (alleen het aantal anders,
    als VERVANGT met dezelfde maat). Het overzicht vraagt de geldige niet te
    annuleren.
  - **10:** besteld en op slot: de nieuwe knoppen staan uit en weigeren. Op
    telefoonbreedte (390): geen horizontaal schuiven, en de strook en het
    menu passen. Schermafdrukken bekeken.
  - **11, vier lijsten na elkaar:**
    - EXTRA, daarna een andere maat: "VERVANGT K1 uit de 1e en 2e (3x …)";
    - een lager aantal;
    - terug naar een eerder aantal: geen "Oudere stand?";
    - het overzicht en de kolom Besteld;
    - een oud apparaat met een oud stempel krijgt de vraag wél;
    - alleen het aantal plus een andere speling geeft VERVANGT.
  - **12:** een lager aantal van een apparaat met v109 (de bolletjes bleven
    staan) gaat niet zonder "Klopt het aantal?".
  - **13:**
    - een tussenbestelling van een collega en een ingetrokken bestelling:
      de app rekent wat de leverancier echt maakt;
    - een ruit minder zonder bereik: geen "Oudere stand?", wel "1 annuleren".
- **Mutaties** (`node test-v110.js --mutaties`): 61 keer iets expres
  teruggedraaid of stukgemaakt, en alle 61 gevangen.
- `test-v104.js` en `test-v105.js` bijgewerkt waar het gedrag bewust anders
  is ("EXTRA" in plaats van "VERVANGT" bij alleen een ander aantal).
- **De hele batterij twee keer**, met de overgang vanaf wat nu live staat
  (v109, commit b306e16) en vanaf v98: beide rondes helemaal groen (29 van
  29). Dat gebeurde twee keer: vóór en ná de reparaties van de tweede
  controle.
- **Twee onafhankelijke controles** (aparte beoordelaars die het werk niet
  zagen).
  - De eerste vond onder meer dat na een EXTRA de verkeerde bestellijst
    werd genoemd (dan kon er dubbel besteld worden). Ook bleef een half
    gekozen "nog een ruit" onzichtbaar aan staan, en kwam de vraag "Oudere
    stand?" bij een bewuste wijziging. Cijfers: gegevens 6, systemen 7.
  - De tweede, op de reparaties, vond een EXTRA op een andere basis
    (tussenbestelling, intrekken), "Oudere stand?" zonder bereik, en twee
    kleine punten in de strook en het menu. Cijfers: gegevens 7,5,
    systemen 7.

  Alles hersteld en hierboven getest.

## Niet getest

- **Echte Safari op iPad en iPhone**: tikken op het vaste aantal-vak (geen
  toetsenbord verwacht), het menu van een bolletje met de vinger, en de
  naklik van iOS na het aanraken van een bolletje (de app negeert 0,7 s elke
  tik op de foto; de test wacht daarom even). Chromium bootst aanraken na,
  maar niet hoe iOS het doet.
- Android en Windows (Edge) echt; alleen Chromium op telefoonbreedte.
- **"Alleen kijken"** (een collega bewerkt): de nieuwe knoppen lopen via
  hetzelfde slot als een besteld project, en dat is getest. Alleen kijken
  zelf is niet apart getest.
- Een regel met bolletjes op **twee verschillende foto's** (kan alleen in een
  heel oud project): de strook staat dan bij de foto met het eerste bolletje.
  Niet getest.
- De echte Supabase, en de leverancier zelf: of Van Noordenne "EXTRA" en "1
  annuleren, de andere 1 blijven" leest zoals bedoeld. Misschien goed om bij
  de eerste keer even te bellen.
- De **instructievideo** klopt op een paar plekken niet meer: het menu van
  een bolletje (h03), de tabel (h04), gelijktrekken en ⤓ (h05) en het aantal
  (h07). Opnieuw opnemen kan met de opnamescripts
  (`Glasopname-video-scripts.zip`); die heb ik dan weer nodig.

## Handleidingen

- `OVERZICHT.md`:
  - routes "Ruit op de foto aanwijzen", "Het aantal in een fotoblok" en
    "Aantal en bolletjes kloppen niet";
  - "Bestellijst" (de vraag "Klopt het aantal?") en "Volgende bestellijst"
    (EXTRA, N annuleren, uit welke lijsten);
  - twee keuzes in §6;
  - begrippen bolletje, "het aantal volgt de bolletjes" en EXTRA;
  - regelaantallen; §9 test-v110.
- `BEHEER.md`: §10 "Vragen die je kunt verwachten na v110".
- `DATAMODEL.md`: de bolletjes (`markeringen`) en de nieuwe velden per ruit
  in een bestelling (`extra`, `minder`, `vervangtUit`, …). Geen SQL.
- `STATUS.md`, `CLAUDE.md` (twee valkuilen, `test-v110.js` in de batterij,
  de overgang vanaf v109), `TESTEN.md` (de lessen van test-v110).
