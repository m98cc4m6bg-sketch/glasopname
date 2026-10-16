# Glasopname v107: duidelijke melding als een ander het project overnam

*15 oktober 2026. Jans test met v106:*

> Project open en bewerken op de iPhone, project open (alleen lezen) op de
> Mac, iPhone in vliegtuigstand, project overnemen op de Mac terwijl de
> iPhone offline is (melding komt netjes, na 10 seconden overnemen), een
> bestaande maat wijzigen op de Mac, iPhone weer online: de gegevens op de
> iPhone veranderen naar de invoer van de Mac, **zonder verdere melding**.

Geen SQL. Alleen de bestanden.

## Wat er misging (🟢)

Gegevens gingen er niet verloren. Op de iPhone was offline niets gewijzigd,
dus er hoefde niets apart. En dat de iPhone de stand van de Mac laat zien,
klopt: de Mac heeft het project nu.

Maar dat het project was overgenomen, zei de app alleen met een kort
berichtje in de balk onderin. Op een telefoon valt dat niet op. Jans wens
bij v106 was juist: "een melding dat dit komt door een andere collega".

## Wat er nu gebeurt

Het apparaat dat het project kwijtraakte, krijgt een venster:

> **Project overgenomen**
> julian (Mac) heeft dit project om 20:33 overgenomen. Je kunt meekijken;
> met ‹Toch bewerken› neem je het weer terug.

Dat venster komt ook als het apparaat nog iets had klaarstaan dat gelijk
bleek aan de server (dan hoeft er niets apart, en kwam er tot nu toe
helemaal geen melding). Had het wél iets anders, dan blijft het zoals in
v106: "Je werk staat apart", met de naam van wie het overnam.

Bij een vrijwillige overdracht (de bewerker koos ‹Nu vrijgeven› of liet het
aftellen aflopen) blijft het korte berichtje "bart bewerkt dit project nu.
Je kunt meekijken.": daar zag de bewerker zelf het seintje al.

## Bestanden

| bestand | wat |
|---|---|
| `cloud.js` | `glasNaOvername` en `apartEnLaden`: een venster "Project overgenomen" (`overgenomenMelding`) |
| `bewerkslot.js` | de tekst: wie, op welk apparaat, en hoe laat |
| `index.html`, `pdf.js`, `sw.js` | versie v107 |
| `test-v106.js` | §26: precies Jans test (zelfde account op iPhone en Mac) |

## Hoe je het zelf controleert (2 minuten)

Doe je test van vandaag nog eens: iPhone bewerkt, iPhone in vliegtuigmodus,
Mac ‹Toch bewerken› → ‹Overnemen›, iets wijzigen op de Mac, iPhone weer
online. Op de iPhone komt nu het venster "Project overgenomen", en daarna de
balk "Je hebt dit project open op een ander apparaat … (Mac)".

Wil je ook het "apart bewaard" zien: wijzig dan óók iets op de iPhone terwijl
hij in vliegtuigmodus staat (stap 3 in `LEES-MIJ-EERST-v106.md`).

## Ook gevonden bij het nakijken van de repo

Bij de eerste push van v106 ontbraken vier bestanden (`bewerkslot.js`,
`pdf.js`, `test-v105.js`, `test-v98.js`). Daardoor deed het bewerkslot niets
en kon de nieuwe versie zich niet installeren. Dat is met je push van 20:12
rechtgezet; de repo is nagekeken en gelijk aan het pakket.

## Getest

- `test-v106.js` §26: Jans test, op iPhone-breedte (390 px) en met de
  herkenning van een iPhone; het venster, meekijken met de balk, de maat
  van de Mac op de iPhone, niets apart. Bekeken op een schermafdruk.
  Mutatie: het venster terugzetten naar het korte berichtje → rood.
- De overgang vanaf wat nu live staat (**v106**, je commit van 20:12) naar
  v107 (`test-overgang.js`), en vanaf v98.
- De hele batterij twee keer.

## Niet getest

- Een echte iPhone in vliegtuigmodus (nagebootst: de server weg én de
  browser offline). Dat is precies jouw test van vandaag; doe hem nog één
  keer na het bijwerken.
- De echte Supabase.
