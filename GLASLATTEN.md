# Glaslatten, glasband en "past het in de sponning?" (v113, bijgewerkt v121)

*Uitgezocht 19 oktober 2026 voor de glasopname-app; v114 (20 oktober 2026):
de latzijde per ruit, de onderdorpel, en de maten volgens de tekeningen van
Jongeneel; v115 (20 oktober 2026): opdeklat omgekeerd, "sponning in zicht",
neuslat op ventilatie en uitsteek, de scharniersponning, de latten op
Toebehoren.* Dit is de kennis
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

**Waar het staat.** Per ruit zijn er deze waarden: sponningdiepte (zij en
boven), diepte onder, glaslat, montage (omgekeerd, v115), band binnen,
uitfrezen, latzijde en onderlat. Sinds v115 (wens Jan) staan op **Invoer
alleen de twee diepten** (Diepte en Onder); al het andere kies je op
**Toebehoren** (§13). De app bewaart ze bij het project
(`info.toebehoren.perRuit`). Ze staan dus niet op de ruit zelf:
een wijziging op de ruit geeft hem een nieuw stempel, en dan herkent de app
een oudere stand van een ander apparaat niet meer. Het gaat ook niet naar de
glasleverancier.

**Na een bestelling op slot** (v114, keuze van Jan: "mee op slot"; in v113
was het vrij). Sponningdiepte, glaslat, band binnen, uitfrezen, latzijde,
onderdorpel, onderlat en de standaardlat van het project staan dan vast, net
als de maten. Ontgrendelen kan met je wachtwoord (balk bovenaan Invoer). De
instellingen van band, kit en verlies op Toebehoren blijven vrij. Wie alleen
meekijkt, kan niets.

## 1a. Latzijde: binnen, buiten, beide of geen (v114, v115)

**Geen standaard** (Jan: "dit wisselt continu, binnen een project, of zelfs
binnen een kozijn"). Per ruit kies je in de kolom **Latzijde**:

| keuze | betekenis | onderin |
|---|---|---|
| **binnen** | binnenbeglazing: de latten zitten binnen | dezelfde lat als boven |
| **buiten** | buitenbeglazing: de latten zitten buiten | de **passende neuslat** (de app kiest de maat, §6) |
| **beide** | glas tussen twee latten, zonder aanslag | de lat telt **twee keer** in de sponning; onderin aan beide kanten **dezelfde lat** (v115, keuze Jan; een neuslat alleen als je hem kiest) |
| **geen (meegeleverd)** | nieuwe kozijnen: de latten komen mee (v115) | geen latten; Toebehoren telt alleen band, kit en tape |
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
- **Csv-import** (v115, keuze Jan): ingelezen ruiten krijgen latzijde
  **geen (meegeleverd)**: dat zijn meestal nieuwe kozijnen met latten. Per
  ruit te veranderen.
- **Beide** (v115, keuze Jan): onderin dezelfde lat als boven, aan beide
  kanten. Wil je buiten toch een neuslat, kies hem dan als onderlat.
  Tot v114 kwam er buiten automatisch een neuslat; daarom (v119, keuze Jan)
  een **strook op Toebehoren** met de ruiten op "beide" zonder eigen
  onderlat, tot je er een kiest of op **Begrepen** tikt (per ruit bewaard).
  Sinds v121 (Jan: "duidelijk, subtiel") is dat een **rustige grijze
  melding** (geen ⚠, niet oranje: er is niets fout), en zegt de knop van
  de onderlat bij zo'n ruit stil "beide kanten" (ook na Begrepen).
- **Binnen = nooit een neuslat of ventilatielat** (v117, Jan): die zijn voor
  buitenbeglazing. In het venster voor de onderlat staan ze bij binnen niet;
  "Alle ruiten" slaat de ruiten met binnen over en zegt welke. Had een ruit
  er al een (of zet je hem daarna op binnen), dan wordt het oordeel rood
  ("onder: N30 alleen buiten") tot je iets anders kiest. De app verandert
  het niet stil (keuze Jan).

## 1b. De onderdorpel en de scharniersponning (v114, v115)

Op Invoer staan twee vakken: **Diepte** (zij en boven) en **Onder**. Leeg
Onder = gelijk aan Diepte (het grijze getal in het vak).

**Waarom onderin vaak dieper is** (v115, uitgezocht):
- In de stijlen (en vaak de bovendorpel) van een kozijn met draaiende delen
  zit een **scharniersponning**: een uitgefreesd hol van ±16 mm breed en
  5,5–8 mm diep waar de knoop (het "potje") van het scharnier in valt.
  Daardoor is de **bruikbare** diepte aan de zijkanten kleiner dan wat je
  aan de onderdorpel meet. Meet aan de zijkanten dus wat er echt over is.
- De **onderdorpel** heeft geen scharnier, wel een schuin afwateringsvlak
  (minstens 9°) en bij buitenbeglazing de neuslat.
- Exacte maten maken voor de app niet uit: je vult gewoon de twee diepten in.

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
  - **Binnen 2, 3, 4 of 5 mm.** 5 mm bestaat niet als rol: dat is **een rol
    2 mm en een rol 3 mm op elkaar** (v118, Jan). De app telt dan op beide
    rollen de omtrek, en per ruit dubbel "m band".
  - **Nat beglazen** (band + kit erover): daar vraagt NPR 3577 een kitvoeg
    van minstens 4 mm breed en 6 mm diep, met band van minstens 4 mm. Band
    van 2 of 3 mm is dus voor droog beglazen (alleen band).
  - **Buiten 3, 4 of 5 mm, nooit 2** (Jan). De buitenkant werkt het meest
    door zon, vocht en wind.
  - Per project kies je de kleur en de dikte voor binnen en buiten
    (standaard 3 en 3). Per ruit kan het band binnen én, sinds v118, het
    band buiten anders (Toebehoren, kolommen Band dikte binnen/buiten).
- **Glaslat**: de ruimte die de lat in de sponning inneemt. Zie §5.

**Wanneer past het?** (keuze van Jan)

| verschil `diepte − nodig` | gewone glaslat | opdeklat |
|---|---|---|
| 0 | **past · vlak met kozijn** (oranje, v119; sinds v120 ook onderin buiten) | past |
| meer dan 0 | **past · N mm in zicht** (groen, v115) | +0,1 … +1: **ruim**; meer: **te ruim** (oranje) |
| −0,1 … −1 mm | **krap** (het band vangt het op); een A5: **nood** (v120) | krap |
| meer dan 1 mm te krap | **past niet** (rood) | past niet |

**Ruimte over bij een gewone glaslat is géén fout** (Jan, v115). De lat
schuift dan gewoon verder de sponning in, tegen het glas (met band), en er
blijft een randje sponning in het zicht. Dat is een heel normale manier van
monteren. De app zegt dan "past · N mm sponning in zicht" (tot v114: "te
ruim"). In de kiezer staan de latten met weinig zicht bovenaan ("Past bij
deze ruit"); wie een bestaande lat wil volgen, ziet bij elke lat hoeveel
zicht er overblijft.

**Latten nooit laten uitsteken, en liever niet precies vlak** (Jan,
22-10-2026, v119):
- Komt een lat **precies vlak** met het kozijn (0 mm over), dan is dat
  oranje **"past · vlak met kozijn"**: het past, maar het oogt niet
  (esthetisch). Het advies noemt latten waarbij een randje sponning in
  zicht blijft. Geen vraag vóór de bestellijst, wel een strook op
  Toebehoren met de ruiten (v120) en "vlak met kozijn" bij Let op op de
  werkvloer-pdf.
  - **Ook onderin aan de buitenkant** (Jan, v120): in v119 zei de app daar
    "past" (water), maar Jan wil ook daar oranje. Het advies noemt daar
    eerst een **neuslat** (het water loopt af), want een randje sponning
    houdt onderin buiten water vast.
- Een **A5** (glaslat met sponninkje) past soms alleen omdat zijn
  sponninkje (3 mm) over de rand van het kozijn valt (0 tot 3 mm over met
  12 mm in de sponning). Dan steekt hij 1–3 mm voor het kozijn uit: oranje
  **"nood: steekt N mm uit"**, een **noodmaatregel**. Zit hij ook nog tot
  1 mm te krap (het band vangt dat op), dan steekt hij 4 mm uit: ook "nood"
  (sinds v120; daarvoor het mildere "krap"). Strook op
  Toebehoren, ook in de vraag "Past het in de sponning?" vóór de
  bestellijst, en "NOOD: A5 steekt N mm uit" bij Let op op de
  werkvloer-pdf. Met precies 3 mm over ligt de A5 vlak, daarboven in zicht.

**Bij een opdeklat is te ruim wel een fout**: die ligt vast op het
kozijnvlak en kan niet verder schuiven, dus het glas klemt niet. Advies:
dikker band, een andere opdeklat, of de lat **omgekeerd** monteren (§7).

De marge van 1 mm staat bovenin `latten.js` (`MARGE_MM`).

**Uitfrezen.** Past het niet, dan kan de sponning dieper:

```
uitfrezen naar = nodig − eigen sponning van de lat (naar boven afgerond)
```

Het advies kun je in het venster **aantikken** (v114): de lat, de montage,
het band en/of uitfrezen worden dan in één keer gekozen (één keer ongedaan
maken).

**Advies per plek en per zijde** (v115, Jan: ja):
- apart voor **boven en zijkanten** en voor **onderin** (een andere onderlat,
  uitfrezen van de onderdorpel; bij een neuslat die niet past: de kleinste
  die wel past, of een ventilatielat/schuine lat);
- bij latzijde **buiten** (en beide) geen rechte of ronde latten in het
  advies: buiten moet het water af, daar hoort een schuine lat. Kies je er
  zelf een, dan zegt de kiezer "buiten liever een schuine lat";
- een opdeklat met eigen sponning in beide standen (normaal en omgekeerd).

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
| **Opdeklat (E, GLD)** | **op** het kozijn, raam of deur, als het pakket niet meer in de sponning past (renovatie: enkel glas → dubbel) | 0 mm; de eigen sponning **vergroot** de ruimte (normaal) of neemt hem in (omgekeerd, §7) |
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
**Hoe hij gemonteerd wordt** (v115, uitgezocht): de neuslat ligt onderin
**tegen het glas** (met band) op de dorpel, op blokjes van ±5 mm. Het lijf
met de uitsparing (S breed) ligt over de dorpel; de neus hangt vóór het
kozijn. De ventilatieopening niet dichtkitten. **Lengte** (v121, Jan):
**recht** afgekort (geen verstek), **20 mm langer dan de sponning breed is**
(de sponningmaat in de breedte, glasbreedte + 2 × speling; niet de
*sponningbreedte* uit §2, die de diepte is):
hij loopt aan beide kanten door in de scharniersponning. In het zaagplan
is dat de instelling "Neuslat (recht): langer dan sponning" (standaard
20 mm), los van de toeslag voor het verstek; tot v120 kreeg hij die
verstektoeslag en heette het "verstek". (De montagerichtlijn van de
fabrikant noemt ±4 mm ruimte aan elke kant; Jans praktijk gaat voor.) De **totale breedte** (S + 9) zegt dus weinig over wat hij
in de sponning doet: dat bepaalt **S** (zijn "sponningmaat").

```
rest       = diepte onder − glas − band (− de lat aan de andere kant bij "beide")
ventilatie = S − rest          (ruimte tussen kozijn en begin van de neus)
uitsteek   = ventilatie + 9    (hoe ver de lat in totaal voor het kozijn uitsteekt)
```

- **Past als ventilatie ≥ 5 mm** (KVT 12.3.1: de neus minstens 5 mm vrij
  van de voorkant van de dorpel, voor de ventilatie en zodat het water weg
  kan). Meer mag: een neuslat is flexibel (Jan). Er is dus geen "te groot",
  alleen "te klein".
- **De app toont alleen de neuslatten die passen** (v115, wens Jan), elk
  met zijn ventilatie en uitsteek. De uitsteek is handig als er al latten
  zitten en je die wilt volgen. De te kleine staan er in één regel onder.
- **Automatisch de kleinste die past** (ventilatie zo dicht mogelijk bij
  5 mm; keuze Jan). Een andere kies je zelf.
- Voorbeeld: onder 52 mm, 4-15-4 (23) + 3 + 3 band → rest 23 mm. N25: 2 mm
  ventilatie (te klein). **N30: 7 mm ventilatie, steekt 16 mm uit.** N35:
  12 / 21, … N55: 32 / 41.
- **Latten aan twee kanten** ("beide") met een gekozen neuslat: aan de
  andere kant zit onderin dezelfde lat als boven. Die gaat ook van de
  ruimte af.
- **Past het glas met band er al niet in** (meer dan 1 mm), dan kiest de app
  geen neuslat; het advies is dan uitfrezen of dunner band.
- **Een bepaalde neuslat gekozen die te klein is**: "onder: N25 te klein",
  met als advies de kleinste die wel past.

| model | maat | S (over de dorpel) | max. rest (5 mm ventilatie) |
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

## 7. Opdeklat met eigen sponning: normaal of omgekeerd (v115)

De lat komt op het kozijn, raam of deur. In de lat zit een sponning van
c mm diep (loodrecht op het glas) en d mm breed (langs het glas). Hij kan
**twee kanten op** (Jan, v115):

```
normaal:   sponning van de lat aan de glaskant → ruimte erbij
           beschikbaar = sponningdiepte + c
omgekeerd: het dikke deel van de lat steekt de sponning in, de sponning
           van de lat valt over het kozijn → de lat neemt c in
           beschikbaar = sponningdiepte − c
```

Zo zijn er meer combinaties. Voorbeeld: sponning 35 mm, 4-15-4 (23) + 3 + 3
band = 29. Een A4 (15) past niet (−9). E22 normaal geeft 35 + 5 = 40
tegen 29: 11 mm te ruim (het glas klemt niet). **E22 omgekeerd**: nodig
29 + 5 = 34 tegen 35: **ruim +1**.

In de app: de kiezer toont E7, E22, GLD1 en GLD2 elk twee keer (normaal en
omgekeerd), met een tekening van de montage (groen +c, rood −c). In het
venster per ruit kun je de montage omzetten. Een vlakke opdeklat (E6, E8)
heeft geen verschil. Bewaard per ruit als `latOmgekeerd`.

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
| C1 | ventilatie | 17x26 | 26 (*) | B7641017026400.FVG |
| C2 | ventilatie | **20x27** (v114) | 27 | B7641020027400.FVG |
| C3 | ventilatie | 22x30 | 30 | B7641022030400.FVG |
| E6, E7, E8, E22 | opdek | zie §7 | 0 | B765… |
| GLD1, GLD2 | opdek, deur | zie §7 | 0 | B7652020035400.FVG, B7652025035400.FVG |
| N25 … N55 | neuslat | zie §6 (neus 9) | zie §6 | B7691018040400.FVG … |
| G915 | grenen rond | 9x15 | 15 | B7702009015270F |
| G916 | grenen recht | 9x16 | 16 | B7702009016270F |

(*) **C1, twee maten bij Jongeneel** (Jan, 22-10-2026, v120): de naam en de
productfoto zeggen 17x26, een tweede (CAD-)tekening op dezelfde pagina zegt
23 breed. De app rekent met 26 (is hij 23, dan zegt de app eerder "past
niet" dan dat hij uitsteekt), toont de tekening van 23 niet, en zet de C1 op
"maat nog niet nagemeten" tot Jan er één nagemeten heeft.

**Hoe het artikelnummer is opgebouwd** (Jongeneel en Pontmeyer):

```
B76 91 018 055 400 .FVG
    │   │   │   └ lengte in cm (400 = 4000 mm)
    │   │   └ 2e maat
    │   └ 1e maat
    └ soort: 01/02 schuin, 21/22 recht, 41 ventilatie, 51/52 opdek, 91 neus
```

## 9. De onderlat apart

De onderlat kies je op Toebehoren (kolom Onderlat, v115):
- **Automatisch**: buiten de kleinste neuslat die past, anders dezelfde lat;
- **Zelfde lat als boven** (ook bij buiten; v111 heette dat "Glaslat");
- een **neuslat** (alleen die passen, met ventilatie en uitsteek);
- een **ventilatielat** of een **andere lat**.

Kies je onderin een andere gewone lat of ventilatielat dan boven, of is de
onderdorpel anders (§1b), dan beoordeelt de app onderin apart. Het oordeel
in de tabel is het slechtste van de twee.

## 9a. Max glaspakket uit een maatstaat (v117)

Een maatstaat van de kozijnfabriek heeft soms een kolom **"Max glaspakket
incl band"**: zo dik mag glas + band (binnen en buiten) zijn (Jan bevestigd,
21-10-2026: band aan beide kanten). De import
herkent die kolom (ook "max glaspakket", "glaspakket", "max dikte") en
bewaart het getal bij de ruit (`maxPakket`).
- Toebehoren rekent **glas + band binnen + band buiten** en zet dat naast
  het max: past het niet, dan is het oordeel rood "te dik −1 (max 28)".
  Ook bij latzijde "geen (meegeleverd)", juist dan. Precies gelijk = past.
- In de keuzelijst van de **opbouw** (Invoer en Toebehoren) staan de
  opbouwen die met band te dik zijn onder een eigen kopje "Te dik voor max
  glaspakket …", grijs. Ze blijven te kiezen (keuze Jan: controleren en
  grijs maken, niet automatisch kiezen).
- Het max komt **niet** meer in de opmerking (die gaat naar de leverancier).
- Vóór de bestellijst: zo'n ruit staat in de vraag "Past het in de
  sponning?".
- Sinds v118 (keuze Jan) ook **op Invoer rood**: de dikte "23 · te dik" en
  de opbouw rood omrand, met de rekensom in de tip. Gerekend met het band
  van die ruit (zonder keuze 3 + 3, de projectstandaard). Kiezen mag.

## 9b. De dikte van het pakket (v117)

Op Toebehoren staat naast Dikte de kolom **Pakket**: glas + band binnen +
band buiten (zonder lat), daaronder **met lat** (wat er in de sponning moet:
glas + band + de lat in de sponning, × 2 bij beide), en het **max** uit de
maatstaat (rood als het te dik is).

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

- **De neuslat** (v121: **bevestigd door Jan**, "tekening klopt"): het
  profiel is S + 9 (N25: 25 + 9 = 34 mm); de handelsmaat (18x40) is de
  ruwe maat. De app rekent met S = modelnummer en een neus van 9 mm.
- **Modelcodes verschillen per leverancier.** Dekkerhout A12 is 17x15 en
  Elephant C1 is 9x33. Neem dus alleen een maat over van een leverancier met
  dezelfde artikelnummers als Jongeneel (Pontmeyer, Beekhuizen-Hoekerd).
- **A5 "12 mm in de sponning"**: keuze van Jan. Jan bevestigde (22-10-2026)
  dat het sponninkje over de rand van het kozijn valt; dat gebruiken is
  een noodmaatregel (zie §3).
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

## 12. Toebehoren: de latten kiezen (v115)

Wens van Jan: Invoer compact houden; de latten (veel keuzes) op Toebehoren.
- **Per foto of tekening** een kopje met de afbeelding en de merkletters
  (tik = groot), zodat je ziet over welke ruit het gaat; daarna de losse
  regels. Per foto: "latzijde hier" (alle ruiten van die foto in één keer).
- Sinds v118 (wens Jan) per foto, tekening en de losse regels een **eigen
  tabel met een eigen kopregel**, ónder de foto (zoals de tabellen op
  Invoer). Op een laptop en groter staan de kolommen van alle tabellen
  recht onder elkaar.
- Kolommen (namen sinds v118): **Merk, Glastype, Opbouw, Glas dikte, Pakket
  dikte, Sponning diepte, Sponning diepte onder** (van Invoer,
  hier ook te wijzigen: dezelfde gegevens, dus Invoer, pdf en bestellijst
  volgen), **Latzijde, Glaslat type, Onderlat type, Band dikte binnen, Band
  dikte buiten (v118), Oordeel** en wat er per ruit **Nodig** is. Zo kun je ook glastype of opbouw aanpassen om een
  pakket passend te krijgen.
- Bovenaan, los en vóór "Per ruit", het blok **"Voor het hele project (alle
  ruiten)"** (v118): zijde, glaslat (ook omgekeerd) en onderlat in één keer. Bij de glaslat een **voorbeeld** (foto, maten, normaal of
  omgekeerd; tik = groot met de maattekening; v117).
  - **Ruiten aanvinken** (v120, keuze Jan: blok én vinkjes): ☐ bij het merk,
    of "☐ deze foto kiezen". Sinds v121 (P3, keuze Jan) komt dan onderin
    het scherm een **actiebalk**: diepte (zij en boven), latzijde, glaslat,
    onderlat en band binnen, met **vóór het toepassen** per ruit wat het
    oordeel wordt ("A5 · nood → A5 · past · 1 mm in zicht") en "slechter
    bij …" als het erop achteruitgaat. Het voorbeeld is de controle: geen
    extra vraag; daarna ↶ **Terugzetten** in het berichtje (boven de balk).
    Bij latzijde binnen wordt een neus- of ventilatielat overgeslagen (en
    gezegd). Het blok bovenin is dan één regel ("N ruiten gekozen"); zonder
    vinkjes is het weer "Voor het hele project", met een vraag vooraf. Op
    slot (na een bestelling) geen balk. Tot v120 werkte het blok bovenin
    op de gekozen ruiten.
  - **Enter** in een dieptevak gaat naar hetzelfde vak van de volgende ruit
    (v120): typen, Enter, typen, langs de gevel.
  - **⧉ Dupliceren** op Invoer neemt de keuzes van Toebehoren mee
    (sponningdiepte, onderdiepte, latzijde, glaslat …), met de melding
    "Controleer …" (v120, keuze Jan).
- Bij elk lattype een uitklapbaar **zaagplan** als tekening (v117): per
  lengte een balk met de stukken in mm en de rest. Ook in de PDF invoer.
  **Bestellen = het zaagplan + 1 reserve per lattype** (v120, keuze Jan;
  tot v119: de totale lengte + 10 % zaagverlies). De reserve staat bij de
  instellingen ("Reserve per lattype"). Een lat langer dan de lengte zit
  niet in het zaagplan: die staat apart ("apart bestellen") en telt niet
  ook nog als gewone lengte (tot v119 wel). Een lengte onder 1 m typen
  (bijv. "5,4" in het vak voor mm): eerst een vraag (5.400 mm?).
- De onderlatknop zegt bij een neuslat ventilatie én uitsteek ("N30 · vent.
  7 · uitst. 16"; v117).
- De kiezers voor glaslat en onderlat tonen bovenin de foto met de
  merkletter van die ruit opgelicht.
- Op de telefoon is elke ruit een kaartje (dicht één regel, tik voor de
  rest; open: "✕ inklappen"). Zaagplan, instellingen, lattengroepen en de
  grote foto of tekening hebben een ✕ (v118).
- **PDF werkvloer** (v118): per foto de foto met de letters en per ruit
  glasmaat, opbouw, latzijde, glaslat, onderlat, band en de latten met
  stuklengtes (bij ×3: samen), met een kolom "Let op" (latzijde nog kiezen,
  past niet, te dik); daarna benodigdheden en zaagplan.
- Na een bestelling op slot (zoals de maten); het oordeel blijft aan te
  tikken om te kijken.
- **De Naslag** heeft een tabblad **Glaslatten (Jongeneel)** met alle
  latten, foto, maattekening en maten. Het leest dezelfde lijst
  (`GlasLatten.LATTEN` in `latten.js`): één bron.

## 13. Bronnen

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
- **Neuslat en montage** (v115):
  - schildersvak.nl en BCD0013 (neuslat op blokjes, neus ≥ 5 mm voor de dorpel, niet dichtkitten);
  - joostdevree.nl (neuslat, ventilatie, druiplijst);
  - de maattekening N40 van Jongeneel (40 = de vlakke onderkant tot de neus, R8);
  - goedkoperglas.nl (afstand glas → voorkant dorpel + 5 mm);
  - glasdiscount.nl ("18x40 met sponning 5x40");
  - glashandelonline.com;
  - Vawa;
  - Combifit;
  - Stiho.
- **Scharniersponning** (v115): industrieelproducerenmethout.nl §4.1/4.3
  (scharniersponning ±16 breed, 5,5–8 diep in de stijlen; onderdorpel
  afwatering ≥ 9°); woodworking.nl, klusidee.nl.
- **Opdeklat**:
  - allesvoorglas.nl;
  - glasbeslaginfo.nl;
  - Mulder ("isolatie-glaslat D2 25x34,5 met sponning").
- **Ventilatielat**:
  - Koningsblaauw;
  - Dekkerhout;
  - allesvoorglas.nl.
