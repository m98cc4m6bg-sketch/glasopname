# Glasopname v108: vier punten uit Jans test van 16 oktober

*16 oktober 2026.* Jan: "Lijkt allemaal goed te werken nu, ook bij
wijzigingen op een offline apparaat wordt dit nu een apart project zoals
afgesproken. Wel een paar vraagjes/wijzigingen/bugs."

Geen SQL. Alleen de bestanden.

## 1. Van wie is een apart project? (🟢)

> Kan de titel veranderen van `Klaver (apart bewaard 16-10 15:56)` naar
> `Klaver (apart bewaard 16-10 15:56 - 'naam van collega en apparaat')`?

Ja. Een apart project heet nu bijvoorbeeld:

> **Klaver (apart bewaard 16-10 15:56 - julian, iPhone)**

Dat is de naam en het apparaat van wie het werk was: het apparaat waar het
werk vandaan kwam. Werk dat nog met v107 of ouder apart is gezet (en nog op
een apparaat wacht om omhoog te gaan) krijgt de oude naam: daar is niet
onthouden van wie het was.

`cloud.js`: `reddingBewaar` onthoudt wie en welk apparaat; `reddingenUploaden`
zet het in de naam.

## 2. Het berichtje onderin blijft staan (🟢)

> De melding "je kunt dit project nu bewerken" lijkt te blijven staan.

Klopt: berichtjes onderin bleven staan tot er een nieuw berichtje kwam.
Nu gaat een berichtje **zonder knop** na 8 seconden vanzelf weg.

Een berichtje **mét knop** blijft staan tot je kiest. Dat is er nog maar één:
"Een collega heeft dit project gewijzigd" met ‹Hun versie laden›. Daar moet
iets gebeuren, dus dat mag niet vanzelf verdwijnen.

`cloud.js`: `toonMelding`.

## 3. "Alleen kijken" stond er twee keer (🟢)

> De melding van alleen kijken staat twee keer boven elkaar.

Wat er misging, ook al in v106: het label "👁 Alleen kijken — julian" was
bedoeld voor **de andere tabbladen** (Project info, Samenvatting, enz.), zodat
je daar ook ziet dat je alleen meekijkt. Maar het stond in de werkbalk van
Invoer (die met Project: en Datum:). Die balk is op de andere tabbladen
verborgen. Het label stond dus alleen op Invoer, precies waar de grote balk
al staat, en op de andere tabbladen nergens. De test van v106 keek alleen op
Invoer en zag dat niet.

Nu:
- **Invoer**: alleen de grote balk "julian (Mac) heeft dit project open …
  ‹Toch bewerken›".
- **Andere tabbladen**: een smalle strook direct onder de tabbladen,
  "👁 Alleen kijken — julian ‹Toch bewerken›". Op de telefoon op één regel.

`index.html`: het label (`#kijkChip`) staat nu onder de tabbladen;
`slotToepassen` laat het alleen buiten Invoer zien; `toon()` werkt het bij
bij een ander tabblad.

## 4. De vraag "Wachtwoord bewaren?" op het verkeerde moment (🟠)

> Na inloggen komt op het verkeerde moment een melding vanuit macOS om het
> ingevulde wachtwoord te bewaren. Niet direct na inloggen, maar willekeurig,
> bijvoorbeeld bij wisseling van tabblad. Zorg dat de melding op het juiste
> moment komt, ook op Android, Windows enz.

**Waarom het gebeurde.** Het inlogscherm was geen echt formulier: twee losse
velden en een knop. Een browser vraagt "wachtwoord bewaren?" zodra hij denkt
dat er is ingelogd. Bij een echt formulier weet hij dat (het formulier wordt
verstuurd). Zonder formulier moet hij raden. Safari raadt dat pas bij het
volgende dat op een paginawissel lijkt, zoals het adres dat verandert bij
een ander tabblad.

**Wat er nu gebeurt.** Het inloggen is een echt formulier. Bij ‹Inloggen› of
Enter controleert de app eerst het wachtwoord bij Supabase. **Pas als dat
klopt**, laat de app het de browser weten, op de manier die elke browser
begrijpt:

| browser | hoe | wanneer de vraag komt |
|---|---|---|
| Chrome en Edge (Windows, Mac), Chrome en Samsung Internet (Android) | de standaardmanier van die browsers om een wachtwoord aan te bieden (Credential Management) | direct na het inloggen |
| Safari (Mac, iPhone, iPad), Firefox | het formulier wordt echt "verstuurd", naar een leeg, verborgen kader (`about:blank`); daaraan herkennen ze een inlog | direct na het inloggen |

Bij een **fout wachtwoord** hoort de browser niets, dus geen vraag om een
verkeerd wachtwoord te bewaren. Het wachtwoord gaat alleen naar Supabase,
zoals altijd: het verborgen kader verstuurt niets over het net. Na het
inloggen haalt de app het wachtwoord uit het veld.

Ook de wachtwoordvraag **in** de app ("Opgenomen door wijzigen", "Invoer
ontgrendelen") was een los wachtwoordveld zonder naam. Ook daar kon Safari
later over beginnen. Daar staat nu onzichtbaar je e-mailadres bij. Zo
herkent de browser het als het wachtwoord dat hij al kent.

Waarom 🟠 en niet 🔴: het gaat om inloggen, maar er verandert niets aan
**wie** er mag inloggen of hoe. Supabase controleert het wachtwoord net als
eerst. Alleen het moment waarop de browser het hoort, is anders.

`index.html`: het inlogformulier (`#cloudLoginForm`) en het verborgen kader
(`#cloudLoginKader`). `cloud.js`: `cloudLoginVerstuur` en
`wachtwoordAanbieden`. De oude afhandeling van Enter is eruit, want het
formulier doet dat nu zelf. `melding.js`: het e-mailadres bij de
wachtwoordvraag.

## Bestanden

| bestand | wat |
|---|---|
| `cloud.js` | apart-naam met wie en apparaat; berichtjes weg na 8 s; inloggen via het formulier en het wachtwoord aanbieden |
| `index.html` | inlogformulier en verborgen kader; de strook "Alleen kijken" onder de tabbladen; versie v108 |
| `melding.js` | het e-mailadres (onzichtbaar) bij de wachtwoordvraag |
| `pdf.js`, `sw.js` | versie v108 |
| `test-v106.js` | §2 (Invoer én Project info), §14 en §23 (de naam), §27–§30 nieuw, 10 nieuwe mutaties |
| `test-v103.js` | de naamcontrole kent het nieuwe achtervoegsel |

## Hoe je het zelf controleert

1. **Apart project.** Doe je test van vandaag nog eens: iets wijzigen op de
   iPhone in vliegtuigmodus, de Mac neemt over, iPhone weer online. In de
   projectenlijst staat nu "… (apart bewaard 16-10 15:56 - julian, iPhone)".
2. **Berichtje.** Neem op de Mac een project over met ‹Toch bewerken›. Onderin
   staat "Je kunt dit project nu bewerken." Na 8 seconden is het weg.
3. **Alleen kijken.** Kijk mee op een tweede apparaat. Op Invoer zie je één
   balk. Ga naar Project info: daar staat een strook onder de tabbladen.
4. **Wachtwoord.** Laat Safari je wachtwoord eerst vergeten: Safari →
   Instellingen → Wachtwoorden, of Systeeminstellingen → Wachtwoorden. Zoek
   je GitHub-adres en verwijder het. Log daarna uit in de app, en weer in.
   De vraag "Wachtwoord bewaren?" moet nu direct komen. Probeer ook één keer
   een fout wachtwoord: dan mag er geen vraag komen. Zelfde proef op de
   iPhone, en als je kunt op een Android-telefoon of Windows-pc.

## Getest

- **§27**: Jans test van vandaag (iPhone-breedte, iPhone-herkenning).
  - Het offline werk komt apart als "Kerkstraat 1 (apart bewaard dd-mm
    uu:mm - julian, iPhone)".
  - "Je kunt dit project nu bewerken" verdwijnt na 8 s.
  - Op Project info staat de strook op één regel over de schermbreedte.
- **§14 en §23**: de naam bij andere wegen naar apart ("- bart, iPad",
  "- julian, Mac").
- **§28**: ‹Hun versie laden› staat na 10 s nog.
- **§2**: op Invoer geen label, op Project info en Naslag wel, en terug op
  Invoer weer weg. Bekeken op schermafdrukken.
- **§29**: inloggen, in twee soorten browser.
  - Als Chrome/Edge: Enter, een poging met een fout wachtwoord en een goede.
  - Als Safari/Firefox (PasswordCredential weggehaald): met de knop.
  - Toets:
    - bij een fout wachtwoord hoort de browser niets;
    - bij een goed wachtwoord precies één inlog;
    - daarna `credentials.store` met het e-mailadres, of één echte
      verzending naar het verborgen kader;
    - de pagina zelf herlaadt niet;
    - het wachtwoord is daarna uit het veld.
- **§30**: de wachtwoordvraag (‹Wijzigen…› bij Opgenomen door) heeft het
  e-mailadres ervóór, onzichtbaar, met de cursor in het wachtwoord.
  Schermafdruk bekeken.
- **Mutaties, allemaal gevangen** (`node test-v106.js --mutaties`). Telkens
  is iets expres teruggedraaid of stukgemaakt:
  - de naam zonder wie;
  - een berichtje dat blijft staan;
  - een knop-berichtje dat toch verdwijnt;
  - het label weer op Invoer;
  - het label nergens;
  - geen bijwerken bij een ander tabblad;
  - geen `credentials.store`;
  - geen verzending naar het kader;
  - meteen verzenden vóór de controle;
  - geen e-mailadres bij de wachtwoordvraag.

  Twee kanttekeningen:
  - Het terugzetten van de oude Enter-afhandeling maakt niets stuk. De knop
    gaat bij het inloggen meteen uit, en dan verstuurt de browser het
    formulier niet nog een keer. Toch weggehaald, want overbodig.
  - Eén oude mutatie uit v106 (`ander`, drie apparaten tegelijk) hangt af
    van wie het eerst bij de server is. Die werd 4 van de 5 keer gevangen.
    Dat ligt aan de test, niet aan de app.
- De overgang vanaf wat nu live staat (**v107**, je commit 1b21836) en vanaf
  v98 (`test-overgang.js`).
- De hele batterij twee keer.

## Niet getest

- **De echte vraag "Wachtwoord bewaren?"** van macOS, iOS, Android en
  Windows. Chromium in de test laat die niet zien. Getest is wat de
  browser te horen krijgt en wanneer; of Safari dan ook echt meteen vraagt,
  moet jouw proef 4 laten zien. Werkt het op een van je apparaten niet
  goed, laat het weten: dan kijk ik verder.
- Echte iPhone, iPad, Android en Windows.
- De echte Supabase.

## Nieuwe begrippen

- **Credential Management** (`PasswordCredential`): de standaardmanier van
  Chrome, Edge en Android om een website een wachtwoord te laten aanbieden
  aan de wachtwoordbeheerder van de browser. Safari en Firefox kennen hem
  niet.
- **Verborgen kader** (`iframe`): een onzichtbaar venstertje in de pagina.
  Het inlogformulier "verstuurt" daarheen, zodat de pagina zelf blijft
  staan.
