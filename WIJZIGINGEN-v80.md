# Glasopname v80 — meer bolletjes bij een aantal groter dan 1

## 1. "rúit" → "ruit"

In de naslag, bij Bijtelling dagmaat. Het accent stond er als nadruk; nu
gewoon "ruit".

## 2. Een regel ×3 krijgt drie bolletjes

Je voorstel klopt en is gebouwd: **het aantal bolletjes volgt het aantal op
de regel.** A1 met aantal 2 krijgt twee bolletjes, A4 met aantal 3 krijgt
er drie, allemaal met hetzelfde merk.

Waarom dit beter is dan opsplitsen: de bestellijst blijft één regel A4 ×3
in plaats van drie losse regels. De optie *"Regels met een aantal groter
dan 1 opsplitsen in losse ruiten"* bij het importeren bestond al en werkt
nog precies zo — maar die levert de leverancier drie regels op, en je
merken worden genummerd.

**Het botst inderdaad niet met inmeten vanaf de foto of op locatie.** Op de
foto tikken maakt nog steeds een nieuwe regel met aantal 1 en één
bolletje.

### Hoe het werkt

* **🎯 Ruiten aanwijzen (6)** telt nu ruiten, niet regels: A1 ×2 + A4 ×3 +
  B ×1 is zes.
* Tijdens het aanwijzen zegt de balk welke ruit aan de beurt is: *"A4 —
  ruit 2 van 3 · nog 4 te gaan"*. De ruiten van één regel komen achter
  elkaar.
* Tot nu toe haalde de app bij het aanwijzen **eerst de bestaande
  bolletjes van die regel weg** — daar zat je "maar één per merk". Dat
  gebeurt niet meer.
* De kopbalk van een fotogroep zegt *"6 ruiten · 3 regels"* in plaats van
  *"3 ruiten"*. Staat er bij elke regel aantal 1, dan blijft het gewoon
  *"3 ruiten"*. Dit geldt ook voor "Zonder foto of tekening".

## Wat je over het hoofd zag

Vier dingen, met hoe ik ze heb opgelost:

**Het aantal wordt achteraf verlaagd.** A4 heeft drie bolletjes, iemand
zet het aantal op 2. Dan is er één te veel. Die wordt **niet** stilletjes
weggehaald — jij hebt hem neergezet, en welke van de drie moet weg weet
alleen jij. Hij krijgt een gestreepte rode rand, en bij aantikken staat er
*"één bolletje te veel: het aantal is 2"*. In de pdf komen per regel
hooguit zoveel bolletjes als het aantal.

**Eén van de drie ruiten valt af.** Het menu bij een bolletje had alleen
*Ruit verwijderen* — en dat haalt de hele regel weg, alle drie de ruiten.
Bij een regel met aantal > 1 staat er nu:

* **Eén ruit minder (aantal 3 → 2)** — dit bolletje weg én het aantal één
  lager; de regel blijft;
* **Hele regel verwijderen (3 ruiten)** — zoals voorheen, maar het zegt nu
  wat het doet.

Bij aantal 1 is het menu ongewijzigd.

**Het aantal gaat omhoog.** Na een import of op locatie zet iemand B van
1 op 2. Dan verschijnt meteen *Ruiten aanwijzen (1)* om de tweede aan te
wijzen. Dat is een duwtje, geen blokkade: laat je het staan, dan gebeurt
er verder niets.

**De ruiten van één regel staan op verschillende foto's.** Bijvoorbeeld
twee A4's op de voorgevel en één op de achtergevel. Dat kan niet: een
regel hoort bij één fotogroep, want daar staat zijn tabel. Wil je dat
toch, splits de regel dan: A4 ×2 op de voorgevel en een eigen regel ×1 op
de achtergevel. **Dit heb ik niet veranderd** — zeg het als je het anders
wilt.

### Let op bij bestaande projecten

Een project met een regel ×3 en één bolletje laat na deze update
*Ruiten aanwijzen (2)* zien. Dat klopt — er ontbreken er twee — maar het is
nieuw.

## Getest

| reeks | wat |
|---|---|
| `test-bolletjes.js` | **nieuw** — de echte app in Chromium: een foto met A1 ×2, A4 ×3, B ×1; de knop zegt zes; aanwijzen loopt A1 1/2, A1 2/2, A4 1/3 …; na zes tikken staan er precies 2 + 3 + 1 bolletjes en is de knop weg; geen extra regels; de kopbalk telt "6 ruiten · 3 regels"; aantal verlaagd → één bolletje gemarkeerd als te veel, niet weggehaald; aantal verhoogd → knop verschijnt weer; "één ruit minder" verlaagt het aantal en laat de regel staan; op de foto tikken zonder aanwijzen maakt nog steeds één regel met één bolletje; bij aantal 1 het oude menu |
| `test-naslag.js` | + "ruit" zonder accent |

Alle twaalf reeksen groen. Visueel nagekeken op 402 px (iPhone): drie
bolletjes A4 naast elkaar, het derde met de rode streepjesrand, en het menu
met de nieuwe keuzes.

**Niet getest:** Safari zelf, de echte Supabase, en het afkappen van
overbodige bolletjes in de pdf — dat laatste zit in de code maar heeft
nog geen eigen test.

## Bijwerken

`fotos.js`, `index.html`, `naslag.js`, `pdf.js`, `sw.js` — versie **v80** in
`index.html`, `pdf.js` en `sw.js`. Geen SQL.

## Geparkeerd

Het onderzoek naar glasdikte bij grote ruiten staat in
`ONDERZOEK-glasdikte-windlast.md`; daar is niets van ingebouwd.
