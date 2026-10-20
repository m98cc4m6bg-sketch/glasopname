# Glaslatten, glasband en "past het in de sponning?" (v113, bijgewerkt v114)

*Uitgezocht 19 oktober 2026 voor de glasopname-app; v114 (20 oktober 2026):
de latzijde per ruit, de onderdorpel, en de maten volgens de tekeningen van
Jongeneel.* Dit is de kennis
achter `latten.js`. De code rekent precies zoals hieronder staat. Verander
je hier iets, verander het daar ook (en andersom).

## 1. Waar gaat het om?

Bij het inmeten noteer je per ruit de **sponningdiepte**. De app rekent dan
uit of het **pakket** erin past: glas, glasband aan beide kanten en de
glaslat. Past het niet, dan zegt de app wat wel kan:
- een andere lat;
- dunner band binnen;
- dunner glas;
- of de sponning uitfrezen naar een bepaalde maat.

Daarnaast telt het tabblad Toebehoren de latten die je moet bestellen:
- een lat per kant;
- onderaan een neuslat of dezelfde lat, volgens de latzijde (§1a);
- in lengtes van 4 m.

**Waar het staat.** Per ruit zijn er deze waarden: sponningdiepte, glaslat,
band binnen, uitfrezen, latzijde, diepte onderdorpel en onderlat. Je vult ze
in op Invoer (de onderlat op Toebehoren), maar de app bewaart ze bij het
project (`info.toebehoren.perRuit`). Ze staan dus niet op de ruit zelf:
een wijziging op de ruit geeft hem een nieuw stempel, en dan herkent de app
een oudere stand van een ander apparaat niet meer. Het gaat ook niet naar de
glasleverancier.

**Na een bestelling op slot** (v114, keuze van Jan: "mee op slot"; in v113
was het vrij). Sponningdiepte, glaslat, band binnen, uitfrezen, latzijde,
onderdorpel, onderlat en de standaardlat van het project staan dan vast, net
als de maten. Ontgrendelen kan met je wachtwoord (balk bovenaan Invoer). De
instellingen van band, kit en verlies op Toebehoren blijven vrij. Wie alleen
meekijkt, kan niets.

## 1a. Latzijde: binnen, buiten of beide (v114)

**Geen standaard** (Jan: "dit wisselt continu, binnen een project, of zelfs
binnen een kozijn"). Per ruit kies je in de kolom **Latzijde**:

| keuze | betekenis | onderin |
|---|---|---|
| **binnen** | binnenbeglazing: de latten zitten binnen | dezelfde lat als boven |
| **buiten** | buitenbeglazing: de latten zitten buiten | de **passende neuslat** (de app kiest de maat, §6) |
| **beide** | glas tussen twee latten, zonder aanslag | de lat telt **twee keer** in de sponning; onderin buiten de neuslat, binnen dezelfde lat |
| **?** | nog niet gekozen | dezelfde lat als boven, met een melding |

- Een nieuwe ruit staat op **?**. Toebehoren en de controle vóór de
  bestellijst noemen de ruiten zonder keuze (alleen in een project waar de
  latten bijgehouden worden: ergens een diepte of een zijde).
- De onderlat kun je per ruit anders kiezen op Toebehoren (bijv. een
  ventilatielat, of een bepaalde neuslat). Die keuze gaat altijd voor.
- **Oude projecten**: de vink "latten aan twee kanten" (v111–v113) telt als
  **beide**. De oude projectinstellingen "glaslatten zitten" en "standaard
  onderlat" gebruikt de app niet meer (ze blijven wel bewaard). Zonder zijde
  rekent hij onderin met dezelfde lat; de melding vraagt om te kiezen.
- **Open vraag aan Jan** (zie de nota): bij "beide" komt onderin buiten een
  neuslat. Bij binnendeuren en tussenwanden is dat niet nodig; kies dan op
  Toebehoren dezelfde lat als onderlat.

## 1b. De onderdorpel (v114)

Is de sponning onderin anders dan aan de zijkanten (vaak minder diep), vul
dan in het venster van de ruit **Diepte onderdorpel** in. Leeg = gelijk.
De app beoordeelt boven en onder apart en toont **het slechtste** van de
twee, bijv. "onder: past niet −4". De neuslat rekent met de diepte onderin.

## 2. De maten van een sponning

```
           buiten
   ┌──────────┐
   │  kozijn  │       ← aanslag
   │     ┌────┘
   │     │ band │ glas │ band │ lat │
   │     └──────────────────────────┘ ← sponningbodem
   │                                     
        ←──────── sponningdiepte ──────→   (loodrecht op het glas)
```

- **Sponningdiepte (zo noemt Jan het; in de app ook)**: de ruimte
  loodrecht op het glas, van de aanslag tot de buitenkant van het kozijn.
  In NPR 3577 en bij de meeste kozijnmakers heet dit de
  *sponningbreedte*. Een kozijnmaker schrijft "binnensponning 17 x 52":
  17 langs het glas, 52 loodrecht erop. In de app vul je dan **52** in.
- **Sponninghoogte**: langs het glas, van de zichtlijn tot de
  sponningbodem, meestal 17–20 mm. Dat is de randafdekking van het glas.
  De app rekent er niet mee.

## 3. Wat er in de sponning moet

```
nodig = band binnen + glas + band buiten + lat (in de sponning)
```

- **Glas**: de dikte uit de glaslijst van de app (dezelfde als in de kolom
  Dikte). Dubbel glas 4-15-4 = 23 mm.
  - **Gelaagd**: de lijst geeft 33.1 als 6 mm. De folie (0,38 of 0,76 mm)
    telt niet mee; dat valt binnen de marge van 1 mm.
  - **Maatafwijking**: let bij gelaagd glas en figuurglas extra op
    "krap". Volgens EN 1279 mag de dikte daar ±1,5 mm afwijken (gewoon
    floatglas ±1,0 mm).
- **Glasband**: dubbelzijdig PE-band, meestal 9 mm breed, in grijs of wit.
  - **Binnen 2, 3 of 4 mm.**
  - **Nat beglazen** (band + kit erover): daar vraagt NPR 3577 een kitvoeg
    van minstens 4 mm breed en 6 mm diep, met band van minstens 4 mm. Band
    van 2 of 3 mm is dus voor droog beglazen (alleen band).
  - **Buiten 3 of 4 mm, nooit 2** (Jan). De buitenkant werkt het meest
    door zon, vocht en wind.
  - Per project kies je de kleur en de dikte voor binnen en buiten. Per
    ruit kan het band binnen anders.
- **Glaslat**: de ruimte die de lat in de sponning inneemt. Zie §5.

**Wanneer past het?** (keuze van Jan)

| verschil `diepte − nodig` | oordeel | kleur |
|---|---|---|
| 0 | past | groen |
| +0,1 … +1 mm | **ruim** (de lat zit iets losser) | groen |
| −0,1 … −1 mm | **krap** (het band vangt het op) | oranje |
| meer dan 1 mm te ruim | **te ruim** | oranje |
| meer dan 1 mm te krap | **past niet** | rood |

**Wat "te ruim" betekent**, hangt af van de lat:
- **gewone glaslat**: de lat wordt tegen het band gedrukt en vastgezet. Hij
  ligt dan een paar mm terug ten opzichte van het kozijnvlak. Dat is in de
  praktijk vaak goed; de vakregel is alleen dat hij niet mag uitsteken. De
  app zegt "de lat ligt N mm terug".
- **opdeklat**: die zit vast op het vlak, dus het glas klemt niet. Dat is
  echt fout. De app zegt "het glas klemt niet".
- **onderaan bij buitenbeglazing**: een lat die terugligt geeft een richel
  waar water blijft staan.

Is er geen lat die binnen 1 mm past, dan noemt het advies **de breedste
lat die erin past**, met hoeveel mm hij terugligt.

De marge van 1 mm staat bovenin `latten.js` (`MARGE_MM`).

**Uitfrezen.** Past het niet, dan kan de sponning dieper:

```
uitfrezen naar = nodig − eigen sponning van de lat (naar boven afgerond)
```

Het advies kun je in het venster **aantikken** (v114): de lat, het band en/of
uitfrezen worden dan in één keer gekozen (één keer ongedaan maken).
Het advies kijkt (nog) alleen naar boven en de zijkanten.

Zet je in het venster van de ruit "sponning uitfrezen" aan, dan rekent de
app met die maat.
- **Waar het staat**: in de tabel en de pdf staat dan "(frezen N)" bij het
  oordeel; in de export "uitgefreesd N".
- **Alleen als het nodig is**: is de sponning al diep genoeg, dan toont de
  app het vinkje niet, en ook niet "(frezen …)".
- **Let op de aanslag**: bij een deur van 38–40 mm raden vakmensen
  uitfrezen af, omdat de aanslag dan te zwak wordt; daar kies je een
  opdeklat. De app weet de dikte van de deur niet. Het advies zegt daarom
  "laat genoeg hout voor de aanslag staan".

**Voorbeeld van Jan, een deur.** De deur is 40 mm dik, de sponning 27 mm.
Het glas is 4-13-5 (22 mm), met 3 + 3 mm band.
- Zonder lat is dat al 28 mm. Jan noemde dat "past niet". Met zijn eigen
  marge van 1 mm noemt de app het **krap −1**: het band vangt het net op.
  Zo staat het nu in de app; is het in de praktijk "past niet", dan moet
  de marge omlaag (zie WIJZIGINGEN-v113).
- Met een opdeklat met 5 mm eigen sponning is er 27 + 5 = 32 mm. Er blijft
  dan 4 mm over: het glas zit los, dus "te ruim". Met 4 mm band binnen is
  het nog 3 mm te ruim.
- De app adviseert daarom een opdeklat met minder eigen sponning, zo nodig
  samen met ander band. Bijvoorbeeld E7 (3 mm) met 4 mm band binnen:
  27 + 3 = 30 mm, nodig 22 + 4 + 3 = 29 mm, dus "ruim +1".

## 4. Welke lat waar

| soort | waar | in de sponning |
|---|---|---|
| **Glaslat schuin (A)** | rondom; schuin watert af, dus ook buiten | de 2e maat (17x**15** → 15 mm) |
| **Glaslat recht (B)** | rondom, vooral binnen | de 2e maat |
| **Glaslat met sponninkje (A5)** | als het krap is | 12 mm (Jan); het sponninkje valt over de kozijnrand |
| **Opdeklat (E, GLD)** | **op** het kozijn, raam of deur, als het pakket niet meer in de sponning past (renovatie: enkel glas → dubbel) | 0 mm, en de eigen sponning **vergroot** de ruimte |
| **Neuslat (N)** | **alleen onderaan**, bij buitenbeglazing | zie §6 |
| **Ventilatielat (C)** | onderaan bij buitenbeglazing; gaatjes onderin ventileren de sponning | de 2e maat |

**Een ventilatielat heeft niets te maken met een Duco-rooster.** De lat
ventileert de sponning (vocht weg). Een rooster ventileert de kamer.

## 5. Hoe je "a x b" leest

Bij Jongeneel betekent **17x15**: 17 mm hoog (langs het glas) en 15 mm in de
sponning. De KVT-regel 12.3.2 zegt: minimaal 17 mm hoog en minimaal 15 mm
breed (buiten). Een A4 17x15 is dus precies het minimum.

Bij andere winkels draait het soms om: Praxis schrijft "15x17". **Ga uit van
de modelcode** (A4, B5, N40), niet van de volgorde van de maten.

Een **opdeklat 9x32** is 9 mm dik (van het vlak af) en 32 mm breed (op het
vlak). Een **neuslat 18x50** is 18 mm hoog en 50 mm breed in totaal.

## 6. Neuslat: neemt níet zijn hele breedte in

Een neuslat 18x50 (Jongeneel N35) neemt **geen 50 mm** sponningruimte in.

```
          glas
           │ band
           │ │┌──────────────────────────────┐
           │ ││  lijf 13 hoog     │ neus 18  │
           │ │└───────────────────┤ hoog     │
           │ │  uitsparing 5 hoog │ (9 mm    │ ← steekt vóór het kozijn uit
           │ │                    │  breed)  │
   ────────┴─┴────────────────────┴──────────┘
   dorpel           S = 35 mm (modelnummer)
```

- Onderin zit een **uitsparing van ±5 mm hoog en S mm breed**. S is het
  modelnummer: N35 → 35 mm. Die valt over de dorpel.
- De rest is de **neus**. Die steekt vóór het kozijn uit, als druiplijst.
  Volgens de tekeningen van Jongeneel is de neus **9 mm** (v114; tot v113
  rekende de app met 15). Dat telt alleen voor hoe ver hij uitsteekt, niet
  voor of hij past.
- **Hij past als: ruimte vóór het glas + 5 mm ≤ S.**
  - De ruimte vóór het glas is de sponningdiepte min glas en band, dus
    vanaf de buitenkant van het band.
  - KVT 12.3.1 vraagt dat de neus minstens 5 mm vrij blijft van de voorkant
    van de dorpel.
  - De neuslat ligt op blokjes, minstens 5 mm boven de dorpel. De
    uitsparing van 5 mm dekt die ventilatiespleet af.
- **Latten aan twee kanten**: aan de andere kant zit onderin een gewone
  lat. Die gaat dus ook van de ruimte af.
- **Past het glas met band er al niet in** (meer dan 1 mm), dan kiest de app
  geen neuslat. Op Toebehoren staat dan de reden.
- **De app kiest de kleinste die past.** Een te grote neuslat steekt alleen
  verder uit; een te kleine past niet.
- Bij latzijde **buiten** (of beide) zoekt de app per ruit de goede maat.
  Zonder sponningdiepte weet hij het niet; dan staat er "Neuslat, maat nog
  onbekend". Met een diepte waarbij geen enkele past, staat de reden erbij
  ("geen neuslat breed genoeg").
- **Een bepaalde neuslat gekozen** als onderlat (bijv. N30): die beoordeelt
  de app ook als neuslat. Is hij te smal, dan staat er "onder: N30 te smal".

| model | maat | S (over de dorpel) | max. ruimte vóór het glas |
|---|---|---|---|
| N25 | 18x40 | 25 | 20 mm |
| N30 | 18x45 | 30 | 25 mm |
| N35 | 18x50 | 35 | 30 mm |
| N40 | 18x55 | 40 | 35 mm |
| N45 | 18x60 | 45 | 40 mm |
| N50 | 18x65 | 50 | 45 mm |
| N55 | 18x70 | 55 | 50 mm |

**Andere merken hebben een andere neus.** Vawa NL40 is 18x54 (neus 14),
Combifit N4 17x48 met sponning 40 (neus 8). Vergelijk daarom nooit alleen
op buitenmaat.

## 7. Opdeklat met eigen sponning

De lat komt op het kozijn, raam of deur. In de lat zit een sponning van
c mm diep (loodrecht op het glas) en d mm breed (langs het glas). Het glas
mag dus c mm buiten het vlak uitsteken.

```
beschikbaar = sponningdiepte + c        (de lat zelf neemt 0 mm in)
```

| lat | eigen sponning (c) in de app | bron |
|---|---|---|
| E6 9x32 | 0 (vlak) | productpagina Jongeneel |
| E7 9x32 met sponning | 3 | productpagina Jongeneel |
| E8 13x32 | **0** (v114; was 3) | Jongeneel: zonder sponning |
| E22 12x33 met sponning | 5 | tekening Jongeneel |
| GLD1 20x34,5 (deur) | 7,5 (sponning 17,5 breed × 7,5 diep) | tekening Jongeneel (screenshot van Jan) |
| GLD2 25x34,5 (deur) | **14** (v114; was 13; sponning 17,5 × 14) | tekening Jongeneel (screenshot van Jan) |

## 8. Alle latten in de app

Allemaal **Meranti FSC, gevingerlast, gegrond, 4000 mm**, behalve de twee
grenen latten (2700 mm). Sinds v114 zijn alle maten nagekeken op de
productpagina's en tekeningen van Jongeneel (`zeker: true`). Komt er een lat
bij waarvan de maat niet zeker is, zet dan `zeker: false`: de app toont dan
"maat nog niet nagemeten", ook in het advies.

**Vervallen in v114**: B2 (Jongeneel verkoopt hem niet meer; een oude keuze
B2 wordt B1). **Andere naam**: GL13 heet B13 (een oude keuze GL13 wordt
B13). Beide staan in `OUDE_NAMEN` in `latten.js`.

**Niet in het advies**: latten lager dan 17 mm (A16, de grenen latjes) bij
dubbel glas. KVT 12.3.2 vraagt minstens 17 mm.

| model | soort | maat | in de sponning | artikelnr. |
|---|---|---|---|---|
| A4 | schuin | 17x15 | 15 | B7601017015400.FVG |
| A5 | schuin met sponning | 17x15 | 12 | B7602017015400.FVG |
| A10 | schuin | 17x19 | 19 | B7602017019400.FVG |
| A12 | schuin | 17x26 | 26 | B7601017026400.FVG |
| A16 | schuin | 15x33 | 33 | B7601015033400.FVG |
| B1 | recht | 17x17 | 17 | B7621017017400.FVG |
| B5 | recht | 17x19 | 19 | B7621017019400.FVG |
| B13 (was GL13) | recht | 17x27 | 27 | B7621017027400.FVG |
| B14 | recht | 25x25 | 25 | B7621025025400.FVG |
| B17 | recht | 17x35 | 35 | B7621017035400.FVG |
| C1 | ventilatie | 17x26 | 26 | B7641017026400.FVG |
| C2 | ventilatie | **20x27** (v114) | 27 | B7641020027400.FVG |
| C3 | ventilatie | 22x30 | 30 | B7641022030400.FVG |
| E6, E7, E8, E22 | opdek | zie §7 | 0 | B765… |
| GLD1, GLD2 | opdek, deur | zie §7 | 0 | B7652020035400.FVG, B7652025035400.FVG |
| N25 … N55 | neuslat | zie §6 (neus 9) | zie §6 | B7691018040400.FVG … |
| G915 | grenen rond | 9x15 | 15 | B7702009015270F |
| G916 | grenen recht | 9x16 | 16 | B7702009016270F |

**Hoe het artikelnummer is opgebouwd** (Jongeneel en Pontmeyer):

```
B76 91 018 055 400 .FVG
    │   │   │   └ lengte in cm (400 = 4000 mm)
    │   │   └ 2e maat
    │   └ 1e maat
    └ soort: 01/02 schuin, 21/22 recht, 41 ventilatie, 51/52 opdek, 91 neus
```

## 9. De onderlat apart

Kies je onderin een andere gewone lat of ventilatielat dan boven (bijv. C1,
26 mm, onder een A4 van 15 mm), of is de onderdorpel minder diep (§1b), dan
beoordeelt de app onderin apart. Op Toebehoren staat dat onder de keuze:
"onderin: past niet −10"; in de tabel op Invoer het slechtste van de twee.

## 10. Foto's en tekeningen

In `latten/` staan per lat een productfoto (`<id>.jpg`) en, waar Jongeneel
die heeft, de maattekening (`<id>-tek.jpg`); samen 51 bestanden. Tik je op
een foto, dan zie je hem groot met de tekening eronder. De service worker
bewaart ze voor offline (`LAT_FOTOS` in `sw.js`).

**Hoe ze opgehaald zijn** (v114). Jongeneel blokkeert scripts ("Challenge
Validation"): het oude script `latfotos-ophalen.sh` kreeg alleen een
controlepagina terug en is in v114 weggehaald. De foto's en tekeningen zijn
opgehaald door Claude, via de ingebouwde browser van de Claude-app op de Mac
(daar laadt de site gewoon). De pagina's staan in `latfotos.txt`.

**Een lat erbij of een nieuwe foto?** Vraag het Claude ("haal de foto en
tekening van lat X van jongeneel.nl"), of sla hem in Safari op als
`latten/<id>.jpg` (verkleind, ±600 px). Zet hem dan ook in `LAT_FOTOS` in
`sw.js`. **Zonder foto tekent de app de doorsnede zelf.**

## 11. Wat niet zeker is

- **De neuslat**: volgens de tekening van Jongeneel staat bij de maat S
  het modelnummer, terwijl de nettomaat 6 mm groter lijkt. De app rekent
  met S = modelnummer (zoals Dekkerhout: NL25 18x40 met sponning 25 …) en
  een neus van 9 mm. Wijkt het in de praktijk af, dan in `latten.js`
  (`eigenSponning`, `neus`) aanpassen.
- **Modelcodes verschillen per leverancier.** Dekkerhout A12 is 17x15 en
  Elephant C1 is 9x33. Neem dus alleen een maat over van een leverancier met
  dezelfde artikelnummers als Jongeneel (Pontmeyer, Beekhuizen-Hoekerd).
- **A5 "12 mm in de sponning"**: keuze van Jan.
  - In de bronnen zit het sponninkje (3x3 of 3x4 mm) aan de glaszijde, als
    "kitsponning". Dan mag het band aan de latkant 1 mm zijn in plaats van
    4 mm.
  - Met 4 mm band geeft Jans 12 mm dezelfde winst. Met 2 of 3 mm band
    rekent de app 1 à 2 mm te gunstig.
- **Sponninghoogte** (de randafdekking, langs het glas): de app vraagt er
  niet naar. In oude sponningen voor enkel glas (10–15 mm) blijft de rand
  van dubbel glas zichtbaar. NPR 3577 vraagt minstens 17 mm.
- **"Sponningdiepte" heet in veel bronnen de maat langs het glas** (17 mm).
  Is de ingevulde diepte kleiner dan glas en band samen, dan vraagt het
  venster of je de goede maat hebt gemeten.
- **De maatlezing van de ventilatielatten** en van A16 15x33.

Weet je het zeker (profieltekening, etiket, een lat opgemeten)? Pas dan in
`latten.js` de maat aan en zet `zeker: true`.

## 12. Bronnen

- **Jongeneel**, het assortiment, de artikelnummers en de maattekeningen
  (v114, ook GLD1/GLD2 uit Jans screenshots):
  - https://www.jongeneel.nl/c/glaslatten
  - de productpagina's in `latfotos.txt`.
- **KVT 12.3** (latten voor beglazen: vorm, afmetingen, neuslat 5 mm vrij):
  https://kvt-online.nl/12-beglazen-glasplaatsen-randvoorwaarden-en-aansluitingen/12-3-latten-voor-beglazen/
- **Dezelfde modelcodes**:
  - Pontmeyer;
  - Beekhuizen-Hoekerd ("N45 18x60 neus+sponning 45 mm").
- **Maatlezing**:
  - Gamma (glaslat 17x15, neuslat 18x45, opdeklat 9x32);
  - Sleiderink E1;
  - Lambert Kozijnen (kitsponning, "Veranderingen diktes glaspakket").
- **Neuslat**:
  - goedkoperglas.nl (afstand glas → voorkant dorpel + 5 mm);
  - glasdiscount.nl ("18x40 met sponning 5x40");
  - glashandelonline.com;
  - Vawa;
  - Combifit;
  - Stiho.
- **Opdeklat**:
  - allesvoorglas.nl;
  - glasbeslaginfo.nl;
  - Mulder ("isolatie-glaslat D2 25x34,5 met sponning").
- **Ventilatielat**:
  - Koningsblaauw;
  - Dekkerhout;
  - allesvoorglas.nl.
