# Glasopname v83 — de hele app doorgelicht op dataverlies

*24 september 2026. Aanleiding: bij het project Verhoef stonden de ruiten nog
op de Bestellijst, maar was het tabblad Invoer leeg. Die ene bug is gevonden
en gerepareerd; daarna is de rest van de app op dezelfde soort fouten
nagelopen.*

---

## 1. Wat er misging bij Verhoef

`cloud.js` bewaarde lokaal de héle opname (ruiten, foto's, projectgegevens,
taken), maar `laadOpgeslagen()` in `index.html` las daar bij het opstarten
alleen de ruiten uit. Foto's, projectgegevens en taken werden overgeslagen.

Normaal merkte je dat niet: `cloud.js` haalde het project daarna uit Supabase
en zette alles alsnog goed. Behalve als er nog niet-verzonden werk openstond
(`glasopname_pending = 1`, bijvoorbeeld doordat de verbinding wegviel of de
app werd afgesloten voordat het opslaan rond was). Dan slaat `cloud.js` dat
ophalen bewust over, omdat het lokale werk moet winnen — en dat "lokale werk"
was dus de halve stand zonder foto's. Vervolgens ging die stand naar Supabase,
met `fotos: []`. Daarmee waren ook de foto-indeling, de bolletjes, de
tekeningen, de projectgegevens en de taken weg, en werden de ruiten onzichtbaar:
ze wezen naar een foto die niet meer bestond, en de tabel "zonder foto of
tekening" laat ruiten mét een foto juist weg.

De foto's zelf zijn hierbij niet uit Supabase Storage verwijderd; alleen de
verwijzing ernaartoe.

## 2. Wat er gerepareerd is

**Dataverlies — de kern**

1. **De lokale kopie wordt weer volledig gelezen** (`index.html`). Foto's,
   projectgegevens en taken komen terug bij het opstarten. `opslaan()` in
   `index.html` schrijft ze nu ook weg, zodat de app zonder Supabase
   hetzelfde doet als met.
2. **Een ruit zonder zijn foto is nooit meer onzichtbaar** (`index.html`).
   Zo'n ruit staat voortaan bij "Zonder foto of tekening", met alle maten.
3. **Foto's worden teruggehaald voordat er iets omhoog gaat** (`cloud.js`).
   Is er openstaand werk waarin ruiten naar een foto wijzen die lokaal
   ontbreekt, dan wordt die foto — met bolletjes en tekening — uit de
   opgeslagen versie in de database teruggehaald. Lukt dat niet, dan worden de
   ruiten losgemaakt en krijg je daar een melding van.
4. **Een onvolledige stand gaat niet naar de server** (`cloud.js`). Wijzen er
   ruiten naar een foto die niet in de opname zit, dan wordt er niets
   verstuurd en verschijnt er een melding. Dit is de rem die had voorkomen dat
   de goede gegevens in de database overschreven werden.
5. **"✓ Opgeslagen" betekent nu echt opgeslagen** (`cloud.js`). Een opslag die
   geen enkele rij raakt — project verwijderd, of geen rechten meer — gaf geen
   foutmelding en werd toch als geslaagd getoond. Nu volgt er een duidelijke
   waarschuwing.
6. **Een verzoek dat blijft hangen legt het opslaan niet meer stil**
   (`cloud.js`). Na 30 seconden zonder antwoord wordt het afgebroken en
   opnieuw geprobeerd; eerder bleef "… Opslaan" staan en ging er de rest van
   de dag niets meer omhoog.
7. **Geen verbinding is niet hetzelfde als "project bestaat niet"**
   (`cloud.js`). Bij een netwerkfout bij het opstarten bleef de koppeling met
   het project eerder achter; daarna kon er niets meer omhoog. Nu blijft het
   project gekoppeld en wordt het opnieuw geprobeerd.
8. **Van project wisselen, een nieuw project maken of uitloggen** waarschuwt
   nu als er werk openstaat dat nog niet op de server staat, probeert het
   eerst alsnog op te slaan, en vraagt anders wat je wilt (`cloud.js`).
9. **Een project verwijderen** haalt eerst de projectrij weg en dan pas de
   foto's (andersom waren de foto's al weg terwijl de app meldde dat het
   mislukt was), en maakt daarna het scherm leeg zodat je niet doortypt in een
   project dat niet meer bestaat (`cloud.js`).
10. **"Alles wissen" wacht de bevestiging af** en wist nu ook de foto's, de
    projectgegevens en de taken (`index.html`, `cloud.js`). Eerder werd er
    opgeslagen vóórdat er gewist was, en kwam de opname bij de volgende start
    gewoon terug.
11. **Ongedaan maken werkt ook in de tabellen onder een foto** (`undo.js`).
    De momentopname per cel hing alleen aan de tabel met losse maten; onder
    een foto kon één keer ongedaan maken daardoor alles wissen wat er ingetypt
    was.
12. **Een verwijderde foto is terug te halen** (`fotos.js`). Het bestand werd
    meteen uit Storage gegooid, waarna ongedaan maken een lege huls opleverde
    met de melding dat de foto "er wel staat maar niet binnenkomt". Het bestand
    blijft nu staan tot het project verwijderd wordt.
13. **Bolletjes komen terug bij ongedaan maken per tabel** (`blokbalk.js`).
    De ruiten kwamen terug, de bolletjes op de foto niet.
14. **Geen dubbele rijnummers meer** (`blokbalk.js`). Ongedaan maken per tabel
    verlaagde de teller voor nieuwe ruiten, waarna twee ruiten hetzelfde
    nummer konden krijgen — met bolletjes en verwijderknoppen die naar de
    verkeerde ruit wezen.

**Verkeerde maten of verkeerde bestelling**

15. **De speling van het vorige project blijft niet hangen** (`index.html`,
    `cloud.js`). Opende je een ouder project waarin geen speling bewaard was,
    dan hield het formulier de 8 mm van het vorige project en werden alle
    glasmaten 8 mm te klein gerekend, zonder enige melding. Speling en
    bijtelling worden nu altijd gezet (standaard 4 en 11 mm).
16. **⤓ Doorvoeren begint leeg** (`bulk.js`). De keuzelijst stond meteen op de
    eerste waarde. Eén tik op Doorvoeren bij Maatsoort zette daarmee alle
    ruiten op "Glasmaat (direct)" en verdween de speling-aftrek uit elke maat.
    Er staat nu "— kies —" voor, en zonder keuze gebeurt er niets.
17. **⤓ bestaat nu ook bij Corr., Bewerking en Opm.** (`bulk.js`). Die knoppen
    verschenen nooit, doordat de code op een andere kolomkop zocht dan er
    stond.
18. **Een glasmaat van nul of minder wordt geweigerd** (`index.html`). Een
    sponningmaat van 10 mm met 6 mm speling gaf "−2" op de bestellijst; bij
    precies 0 viel de ruit zonder melding van de lijst.
19. **Een onbekende maatsoort telt niet meer op** (`index.html`). Alles wat
    geen Dagmaat of Glasmaat is, wordt als sponningmaat behandeld — dat is wat
    de kolom Corr. op het scherm laat zien.
20. **Onvolledige regels worden gemeld** (`index.html`, `pdf.js`). Een regel
    zonder glastype, opbouw of maat viel stilzwijgend van de bestellijst. Nu
    staat er een rode noot onder de lijst met de merkletters erbij, en bij het
    maken van de bestellijst-pdf wordt eerst gevraagd of je toch door wilt.
21. **Beide opmerkingen gaan mee naar de leverancier** (`index.html`,
    `pdf.js`). Stond er een roedenopmerking, dan verdween de gewone opmerking
    uit de bestelling.
22. **Een rooster of RAL-kleur die niet meer in de keuzelijst staat blijft
    zichtbaar** (`index.html`). Het vakje toonde "— geen —" terwijl de ruit de
    waarde nog droeg en die wél op de bestellijst kwam.
23. **Gelijktrekken trekt ook echt gelijk** (`kopie.js`). Een eigen correctie
    (speling) in de doelruit bleef staan, waardoor twee "gelijkgetrokken"
    ruiten verschillende glasmaten kregen.
24. **Kopieer-naar-menu toont de leverlocatiefoto niet meer** (`kopie.js`).
    Kopieerde je ruiten daarheen, dan waren ze in geen enkele tabel meer te
    zien, maar stonden ze wel op de bestellijst.
25. **Importeren: één veld hangt aan één kolom** (`import.js`). Koppelde je
    twee kolommen aan Breedte, dan won per regel de laatste gevulde kolom.
26. **Importeren: "1200 x 600" in één cel levert breedte én hoogte**
    (`import.js`). Eerder kwam alleen de breedte mee en viel de ruit daarna
    stil van de bestellijst.

**Tekenen**

27. **De selectie loopt niet mee naar een andere foto** (`teken.js`). Kleur,
    dikte en de prullenbak werkten daardoor op onderdelen van de volgende foto
    die je nooit had aangewezen.
28. **Een nieuwe foto in een bestaande groep krijgt geen oude tekening meer
    overheen** (`fotos.js`). De pijlen van de vorige foto bleven staan, in de
    verhouding van die oude foto — ook in de pdf.

## 3. Wat er getest is

Zes testreeksen, allemaal groen bij v83:

```
node test-index.js         # opmaak, DATA, rekenwerk, versies          (jsdom)
node test-naslag.js        # catalogus, leverbaarheid, roeden          (jsdom)
node test-herstel.js       # NIEUW: de reparaties hierboven            (jsdom)
node test-cloudguard.js    # NIEUW: de rem op een onvolledige opname   (jsdom)
node test-rook.js          # NIEUW: de hele app in Chromium            (Chromium)
node test-leverpagina.js && python3 test-leverpagina.py                (Chromium + pdfplumber)
```

`test-herstel.js` speelt de fout van Verhoef na: een lokale kopie met foto,
projectgegevens en taken, een herstart, en dan de controle dat alles
terugkomt. Verder controleert hij de speling per project, de onmogelijke
glasmaten, de melding over onvolledige regels, de beide opmerkingen, de
keuzelijsten met een oude waarde, het doorvoeren met ⤓ en "Alles wissen".

`test-rook.js` start de echte app in Chromium zonder Supabase: invullen,
narekenen (1000 − 2×4 = 992), alle tabbladen langs, de lokale kopie
controleren, en daarna een herstart mét de vlag "nog niet verzonden" — precies
de situatie waarin het misging.

`test-index.js` en `test-naslag.js` waren van v65 en gaven 17 fouten die niets
met de app te maken hadden (verouderde aantallen en namen). Ze zijn bijgewerkt
en tellen nu niet meer op vaste aantallen, maar vergelijken de app met
zichzelf — bijvoorbeeld: alle drie de versienummers gelijk, en evenveel
catalogusfoto's in `sw.js` als er in de map staan. Zo verlopen ze niet opnieuw.

**Wat niet getest is:** het echte Supabase — inloggen, opslaan, realtime en de
foutpaden daarvan zijn nagebootst, niet uitgevoerd. En Safari: hier draait
alleen Chromium. De bekende Safari-punten (16 px in invoervelden,
`env(safe-area-inset-*)`, `touch-action`) zijn ongemoeid gelaten.

## 4. Wat er bewust blijft liggen

Deze punten zijn gevonden maar niet in deze versie gerepareerd, omdat ze een
eigen blok verdienen:

* **Twee apparaten kunnen elkaars werk nog steeds overschrijven.** Elke opslag
  stuurt het hele project; wie het laatst opslaat wint. Meet apparaat A offline
  door terwijl B ruiten toevoegt, dan verdwijnt B's werk zodra A weer verbinding
  heeft. Voorstel voor v84: bij het opslaan de versie meesturen die je binnen
  kreeg (`updated_at`), en bij verschil niet zomaar overschrijven maar de
  keuze geven — samenvoegen op ruit- en fotoniveau, of de nieuwste houden.
  Dit is de grootste die overblijft.
* **↶ in de tekenbalk haalt het laatste onderdeel uit de lijst weg, niet de
  laatste handeling.** Gum je eerst iets weg en druk je daarna op ↶, dan
  verdwijnt een ander onderdeel. Tekenen en gummen leveren ook geen stap op
  voor de gewone ongedaan-knop.
* **Een foto draaien verschuift tekstvakken.** De hoekpunten worden omgezet,
  de breedte en hoogte van het vak niet; daardoor kan tekst anders afbreken of
  wegvallen.
* **↶ per tabel draait een gewijzigde speling niet terug**, maar zoekt verder
  naar een oudere wijziging in die tabel — en draait dus iets anders terug.
* **Automatisch hernoemen van dubbele merkletters** hernoemt bij kale letters
  ook de ruit die de letter al had, terwijl het venster zegt dat die hem
  behoudt.
* **Importeren uit een pdf leest kolommen op positie.** Staan twee getallen
  dichter dan 6 pt bij elkaar, dan worden ze één cel. De nieuwe melding over
  onvolledige regels vangt het gevolg op, de oorzaak niet.

## 5. Wat je moet doen

1. De bestanden uit de zip in de map van de repo zetten (bestaande
   overschrijven), committen en pushen met GitHub Desktop. `config.js` zit er
   niet bij en hoeft niet aangeraakt te worden.
2. Op je telefoon of tablet één keer op **↻ Bijwerken** drukken, zodat de
   nieuwe versie geladen wordt. Linksboven moet dan **v83** staan.
3. **Geen SQL nodig** deze keer: er is niets aan de keuzelijsten veranderd.
4. Kijk bij het project Verhoef of de ruiten nu bij "Zonder foto of tekening"
   staan. Zo ja, dan kun je ze met "Ruiten aanwijzen" weer aan een foto
   koppelen.
