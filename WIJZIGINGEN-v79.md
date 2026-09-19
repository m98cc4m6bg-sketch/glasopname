# Glasopname v79 — eigen meldingen, jaarkalender, Project info opgeruimd

Acht punten uit je lijst, plus wat er onderweg boven kwam.

## 1. Leverweek: een heel jaar vooruit

De kalender bij **Leverweek…** toont nog steeds acht weken — dat is voor de
meeste leveringen genoeg en het blijft snel kiezen. Onderaan staat nu
**📅 Heel jaar tonen**. Die vouwt hem uit naar 53 weken in een lijst die
schuift, met een streepje per maand dat blijft staan terwijl je scrolt.

De kalender blijft daarbij helemaal in beeld: past hij niet onder de knop,
dan klapt hij naar boven, en anders schuift hij passend. Hij is ook nooit
breder dan het scherm meer.

## 2. De melding bij een herkende vorm is weg

Die verscheen bij élke rechte lijn. Je ziet de vorm zelf al veranderen op
de foto, dus de bevestiging voegde niets toe.

## 3. Schalen kan nu vanuit elke hoek

In v78 schaalde alleen de hoek rechtsonder; de andere drie verplaatsten.
Dat was niet te raden. Nu:

* **elke hoek schaalt**, vanuit de hoek er tegenover — die blijft staan;
* **verplaatsen** doe je door het onderdeel zelf te pakken, of bij een
  lasso-selectie door ergens binnen het kader te slepen;
* de muisaanwijzer laat zien wat een hoek doet.

Lijndikte en lettergrootte schalen bewust niet mee; die kies je in de balk.

## 4. Geen systeemmeldingen meer

Dit was de grootste ingreep. De app gebruikte op **28 plekken**
`alert`, `confirm` of `prompt`. Die komen van de browser: op een iPhone
staat er "jelierbouw.github.io zegt" boven, de knoppen heten altijd OK en
Annuleren, en in een app vanaf het beginscherm zien ze er slordig uit.

Er is nu één bestand, **`melding.js`**, met vier vormen:

| vorm | waarvoor | geeft terug |
|---|---|---|
| `appMelding` | iets meedelen | — |
| `appFout` | een fout, rode rand | — |
| `appVraag` | ja of nee | true / false |
| `appInvoer` | iets laten intypen | de tekst, of null |
| `appKeuze` | meer dan twee antwoorden | de gekozen waarde |

Wat dat concreet oplevert:

* **de knoppen zeggen wat ze doen** — "Alles wissen", "Verwijderen",
  "Opruimen" in plaats van OK;
* **onomkeerbare dingen krijgen een rode knop**;
* **Escape en naast het venster tikken** annuleren;
* **de aandacht springt meteen naar de juiste knop of het invoerveld**, dus
  op een telefoon komt het toetsenbord vanzelf op;
* het invoerveld is 16 px, anders zoomt Safari in;
* op een telefoon staan de knoppen onder elkaar, over de volle breedte.

Twee plekken waren al een eigen venster (de vraag over dikte/opbouw en de
melding over de leverpagina); die zijn zo gebleven.

Eén vraag is er bovendien beter van geworden. Bij **een groep met ruiten
verwijderen** kwamen er vroeger twee vensters achter elkaar, waarbij "OK"
in het tweede "ruiten ook weg" betekende en "Annuleren" iets heel anders
dan annuleren. Dat is nu één venster met drie knoppen: *Annuleren*,
*Ruiten bewaren*, *Ruiten ook weg*.

**Let op bij het uploaden:** `melding.js` is een nieuw bestand. Vergeet je
het, dan valt de app terug op de oude browservensters — lelijk, maar niets
breekt.

## 5, 6 en 7. Teksten

* Het keuzemenu heet nu **Speling aftrek rondom** (was: Speling
  sponningmaat (rondom)). Ook bij de losse tabellen, zodat het overal
  hetzelfde heet.
* **Sponningmaat** in de naslag: *dit is de werkelijke maat van de
  sponning, zonder aftrek van eventuele speling* — met erachter wat de app
  er zelf van aftrekt.
* Nieuw kopje **Bijtelling dagmaat**: *de maat die de rúit groter moet
  worden dan de dagmaat van het kozijn, te gebruiken bij bijvoorbeeld
  meten van binnenuit.*

## 8. Project info in dezelfde stijl als Invoer

De zes blokken — Opdrachtgever, Werkadres, Uitvoering, Notities, Levering,
Taken — zijn nu elk een eigen kaart met een grijze kopbalk en een rode
zijkant, precies zoals de tabellen op Invoer. Levering had geen eigen kop
en hing onder Notities; die staat nu los. De takenteller is een etiket
rechts in de balk geworden, net als de telling bij een fototabel.

## Onderweg gevonden

* **De pagina schoof 28 px opzij** op telefoonbreedte bij Project info. Een
  rasterkolom rekt uit tot de breedste inhoud die niet wil afbreken;
  `min-width: 0` en een afbrekende knoppenrij lossen dat op. Nu blijft de
  pagina op alle vijf de tabbladen precies 402 px.
* **Een fout in de console** zodra je exporteerde zonder inhoud:
  `bouwFotoPdf` gaf `undefined` terug terwijl de aanroeper er een `.then`
  aan hing. Die stond er al langer; nu geeft hij een lege belofte terug.

## Getest

Elf reeksen, allemaal groen. Nieuw:

| reeks | wat |
|---|---|
| `test-melding.js` | **nieuw** — het venster in Chromium: knoppen, Escape, buiten tikken, invoerveld, drie antwoorden, telefoonbreedte. En een controle over álle bronbestanden heen dat er nergens meer een `alert`, `confirm` of `prompt` in staat |
| `test-project.js` | **nieuw** — de echte app op 1400 en 402 px: zes kaarten met kopbalk en rode zijkant, niets buiten het scherm, de kalender van acht weken naar een heel jaar, en een week ver vooruit kiezen |
| `test-teken.js` | uitgebreid: schalen vanuit rechtsonder én linksboven, en geen melding meer bij een herkende vorm |
| `test-naslag.js` | uitgebreid: de drie nieuwe teksten en vijf maatsoorten |

Daarnaast de hele app handmatig doorlopen in Chromium op beide breedtes:
alle vijf de tabbladen tekenen, het rekenwerk klopt (1000 × 2000
sponningmaat → 992 × 1992, 24 mm, 20 kg/m²), en alle negen vensters komen
in de eigen stijl op — zonder dat er één browservenster tussendoor komt.

**Wat ik niet kon testen:** de echte Supabase (er draait een nep-versie,
jouw sleutel blijft buiten beeld), en Safari zelf — er is hier alleen
Chromium. De bekende Safari-valkuilen zijn wel meegenomen: 16 px in
invoervelden tegen automatisch inzoomen, en `env(safe-area-inset-*)` op
het meldingvenster.

## Bijwerken

| bestand | |
|---|---|
| `melding.js` | **nieuw** — moet erbij, anders vallen de meldingen terug op de browser |
| `index.html` | opmaak, Project info, teksten, versie |
| `project.js` | jaarkalender |
| `teken.js` | schalen op elke hoek, melding weg |
| `naslag.js` | de drie teksten |
| `pdf.js`, `cloud.js`, `fotos.js`, `bulk.js`, `import.js`, `kopie.js`, `blokbalk.js` | eigen meldingen |
| `sw.js` | cachet `melding.js`, versie |

Versie **v79** in `index.html`, `pdf.js` en `sw.js` — alle drie hetzelfde,
anders blijft de service worker de oude versie serveren.

Geen SQL nodig.
