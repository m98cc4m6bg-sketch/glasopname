# Glasopname v73 — Glasbewerking zonder maten, mét controle

## 1. De maten zijn uit de namen

Tot en met v72 stond in de keuzelijst `Gematteerd — Satijnglas
(4/5/6/8/10/12 mm)`. Die hele tekst kwam ook op de bestellijst terecht,
terwijl er maar één dikte besteld wordt. Verwarrend voor de leverancier,
en dus weg.

De namen zijn nu kaal: `Gematteerd — Satijnglas`.

De maten zijn niet verdwenen — ze staan in `naslag.js` bij de catalogus en
worden gebruikt om te controleren of een bewerking in de gekozen opbouw
kán zitten. Ze blijven ook gewoon zichtbaar op het tabblad Naslag.

**Bestaande projecten** worden bij het openen stil omgezet. De
omzettingskaart wordt uit de catalogus zelf opgebouwd, dus hij kan niet
uit de pas lopen: alle 40 oude namen wijzen naar een naam die nu bestaat.

**Draai `11_glasbewerking_namen.sql` in Supabase.** Zonder dat script
blijft de database de oude lijst opdringen en staan de maten er zo weer
in. `cloud.js` herkent dat nu ook: staat er nog een oude lijst, dan
gebruikt de app zijn eigen en zegt dat in de console.

## 2. Leverbaarheid: wat kan waarin

Elke soort bestaat in bepaalde bladdiktes. Elke opbouw noemt de diktes
van de glasbladen. De combinatie kan als één van de bladen een dikte
heeft die de soort kent.

```
Satijnglas bestaat in 4, 5, 6, 8, 10, 12 mm
4-16-4 heeft bladen van 4 mm            → kan
Niagara blank bestaat alleen in 5 mm
4-16-4 heeft bladen van 4 mm            → kan niet
5-16-4 heeft bladen van 5 en 4 mm       → kan wel
```

De ontleding van een opbouw werkt voor alle vormen die in de app
voorkomen: `4 mm`, `4-16-4`, `4-8-4-8-6`, `33.1`, `1010.2`, `44.2 ESG`,
`4-13-4 ZW`, `4-13-33.2A`. Spouwmaten tellen niet mee; een gelaagd blad
(`33.2`) telt als twee bladen van 3 mm.

**Bij twijfel gebeurt er niets.** Een onbekende waarde uit een ouder
project, een lege keuze of een opbouw die nog niet gekozen is levert geen
melding op. Dit is een controle op wat Van Noordenne publiceert, geen
bestelbevestiging — daarom wordt er nergens iets geblokkeerd.

## 3. Wat je in de app merkt

**In de keuzelijst Glasbewerking** staan soorten die niet in de huidige
opbouw passen lichtgrijs, onder een eigen kopje direct achter de
leverbare soorten van dezelfde groep: `Figuurglas · niet in deze opbouw`.
Dat kopje is er bewust bij: Safari op de iPhone negeert de kleur van een
optie in het keuzewiel, dus zonder kopje zou je daar niets zien.

**Kies je er toch een**, dan verschijnt een venster:

> **Niet beschikbaar in huidige dikte/opbouw**
> Niagara blank bestaat in 5 mm; de opbouw 4-16-4 heeft een blad van 4 mm.
>
> `Annuleren`   `Kiezen + opbouw wijzigen`

*Annuleren* zet de vorige waarde terug. *Kiezen + opbouw wijzigen* zet de
bewerking, kleurt de regel rood en springt naar de kolom Opbouw.

**De regel blijft rood** tot de combinatie klopt. Ook na importeren, bulk
invullen en ongedaan maken, want de kleur hangt aan `herbereken()`.

**Glas Type en Opbouw tonen alleen nog wat de gekozen bewerking kan
dragen.** Voorbeeld: kies je Starglass (bestaat alleen in 3 mm), dan
blijven van de tien glastypen er vier over. Staat er al iets in dat niet
past, dan blijft dat zichtbaar onder het kopje
`Huidig · past niet bij de bewerking` — je moet kunnen zien waar het
conflict zit.

## 4. Op de bestellijst

Scherm én pdf: de strijdige regel kleurt rood, achter de bewerking staat
een `*`, en onder de tabel staat een kader met

> **\* check beschikbaarheid combinatie dikte-glastype!**

In de CSV-export is er een kolom **Let op** achteraan bij gekomen met
dezelfde tekst. Achteraan, zodat bestaande kolommen op hun plek blijven
voor wie dat bestand ergens anders inleest.

## 5. Gewijzigde bestanden

| bestand | wat |
|---|---|
| `naslag.js` | namen zonder maten, leverbaarheidscontrole, keuzelijsten |
| `index.html` | keuzelijst, melding, rode regel, bestellijst, CSV, opmaak |
| `pdf.js` | rode regel, sterretje en voetnoot op de bestellijst |
| `cloud.js` | herkent nu ook de lijst mét maten als verouderd |
| `sw.js` | versienummer |
| `11_glasbewerking_namen.sql` | **nieuw — draaien in Supabase** |

## 6. Getest

| reeks | wat |
|---|---|
| `test-index.js` | 92 controles — keuzelijsten, melding, rode regel, filtering, bestellijst, CSV |
| `test-naslag.js` | 51 controles — namen, omzetting van alle 40 oude namen, leverbaarheid |
| `test-strijdig-pdf.js` + `.py` | **nieuw** — maakt de bestellijst-pdf echt en leest hem met pdfplumber terug: sterretje, voetnoot, en acht rood gevulde cellen precies op de strijdige regel (5 + 13 controles) |
| `test-leverpagina.js` + `.py` | 28 controles — leverpagina ongemoeid |
| `test-cloud.js` | 5 controles — 'Opgenomen door' ongemoeid |

Alles groen. Verder is de opmaak nagekeken in Chromium op 1500 px en op
390 px (iPhone-breedte); de schermafdrukken zijn meegestuurd.

**Ook gecontroleerd:** alle 828 opbouwcodes in `DATA.opbouw_per_type`
leveren bladdiktes op, geen enkele blijft leeg of geeft een onzinnige
maat. Dat staat als vaste controle in de testreeks.

**Niet getest:** hoe Safari op iOS het keuzewiel tekent — dat kan ik hier
niet draaien. Daarom staan de niet-leverbare soorten daar onder een eigen
kopje en niet alleen in het grijs.

## 7. Controle na het plaatsen

1. `11_glasbewerking_namen.sql` draaien. De controleregel onderaan hoort
   `42` en `0` te geven.
2. App verversen; rechtsboven moet **v73** staan, in de console `[pdf] v73`.
3. Open een bestaand project: de bewerkingen horen nu zonder maten in de
   regels te staan.
