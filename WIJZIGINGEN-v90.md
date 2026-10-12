# Glasopname v90 — het slot deed niet wat het beloofde

*11 oktober 2026. Je kon in een besteld project gewoon doortypen, terwijl de
balk erboven zei dat de maten vastlagen. Terecht gemeld: het slot zat alleen
op het scherm, en zelfs daar niet overal. Nu zit het op de gegevens, en dat is
het verschil tussen een melding en een slot.*

---

## Installeren

Alleen bestanden, geen SQL deze keer: `index.html`, `fotos.js`, `pdf.js`,
`sw.js`. `config.js` blijft zoals hij is.

---

## Wat er misging

In v88 werkte het slot zo: zodra een project op *besteld* staat, zet
`slotToepassen()` alle invoervelden op het tabblad Invoer op alleen-lezen. Dat
gebeurde aan het eind van `renderTabel()`.

Daar zitten twee gaten in, en jij liep tegen allebei aan:

**1. De tabellen onder een foto worden later opnieuw opgebouwd.** Bij het
openen van een project draait eerst `renderTabel()` — die zet de velden dicht
— en daarná `renderFotos()`, die alle fotoblokken met hun invoertabellen
opnieuw tekent. Die verse velden stonden gewoon open. In een project zónder
foto's viel er niets te merken; in een project mét foto's, dus vrijwel al jouw
projecten, kon je overal doortypen waar het er het meest toe doet.

**2. Een veld dat op alleen-lezen staat, is geen slot.** Het is een
scherminstelling. Een foutje in de volgorde van tekenen, een knop die ergens
anders vandaan komt, een toekomstige weergavefunctie die niemand aan het slot
heeft gekoppeld — en het lek is terug.

**En waarom zag de testreeks dit niet?** Omdat die keek naar `#invoerBody`,
de tabel met losse maten. Die stond wél dicht. De test controleerde de
oplossing die er lag, niet de belofte die eronder zat. Dat is precies de
soort test waar je niets aan hebt, en die les zit nu in de nieuwe reeks.

## Wat er nu gebeurt

Het slot zit vanaf nu op **twee** plekken, met een duidelijke taakverdeling.

**Op de gegevens — dit is het echte slot.** Elke weg waarlangs een maat kan
veranderen komt eerst langs één controle (`slotWeigert`). Staat het slot erop,
dan gebeurt er niets, springt het scherm terug naar wat er opgeslagen staat,
en krijg je één keer uitleg (niet bij elke aanslag opnieuw). Dat geldt voor:

* typen in een veld, waar dan ook — bij de losse maten én onder een foto;
* een regel verwijderen, dupliceren of bijzetten;
* doorvoeren met ⤓ en de selectie verwijderen;
* een tabel leegmaken, de speling wijzigen, ongedaan maken en opnieuw;
* kopiëren naar een andere groep en gelijktrekken;
* merkletters automatisch hernoemen of terugdraaien;
* een hele fotogroep verwijderen (daar gaan de ruiten in mee);
* en een import toevoegen of de lijst laten vervangen.

**Op het scherm — dit is alleen de zichtbaarheid.** De velden gaan op
alleen-lezen, en nu bewaakt de app dat ook: komen er ergens nieuwe
invoervelden bij, dan gaan die meteen weer dicht. Daar is geen lijstje meer
voor nodig dat iemand kan vergeten bij te werken; het werkt ook voor
weergavefuncties die er later bij komen.

Verder een klein ding: in een besteld project zet de app geen lege regels meer
onderaan klaar. Die kon je toch niet invullen.

Aan het ontgrendelen verandert niets: iedereen die is ingelogd kan het, met
zijn eigen wachtwoord, en het komt met naam en tijdstip in het logboek.

## Wat dit niet is

Dit blijft een slot in de app. Wie met de publishable key uit `config.js`
rechtstreeks met Supabase praat, komt er nog steeds langs — dat is een
technische ingreep, geen ongelukje, maar het verschil moet helder blijven. Een
slot dat ook dát tegenhoudt vraagt een RLS-regel in de database plus een
wachtwoordcontrole aan de serverkant. Dat stond bewust niet in v88 (jouw
keuze) en staat nog steeds als voorstel in de handover. Nu de rest zo dicht
zit, is dat de enige opening die overblijft.

---

## Wat er getest is

**Nieuw: `test-slot.js`**, en die bootst na wat jij tegenkwam: een project met
een fotogroep met twee ruiten eronder plus een losse maat, op *besteld*.
Gecontroleerd wordt:

1. de velden ónder de foto staan dicht, niet alleen die van de losse maten;
2. ze blijven dicht nadat `renderFotos()` en `renderFotoTabellen()` het scherm
   opnieuw hebben opgebouwd;
3. zet je met geweld een veld weer open en typ je erin, dan **verandert er
   niets in de opname**, springt het scherm terug en komt er één melding;
4. verwijderen, bijzetten, leegmaken, groep verwijderen, dupliceren en
   ongedaan maken laten de maten exact zoals ze stonden;
5. na ontgrendelen met het goede wachtwoord werkt alles weer, en staat
   "slot geopend door …" in het logboek;
6. met een verkeerd wachtwoord blijft alles dicht;
7. in een project dat niet besteld is, verandert er niets aan het gedrag.

De hele batterij — dertien reeksen, inclusief de rooktest in Chromium en de
pdf's met pdfplumber — is twee keer achter elkaar groen gedraaid.

**Niet getest:** Safari op de iPad. De controle zit in de app zelf, dus hij
werkt daar net zo goed, maar de melding en het terugspringen van een veld
tijdens het typen heb ik alleen in Chromium gezien. Laat het weten als dat op
de iPad onrustig aanvoelt.

---

## Gewijzigde bestanden

| bestand | wat |
|---|---|
| `index.html` | `slotWeigert()` als enige doorgang naar een maatwijziging, bewaking op nieuw getekende velden, geen lege regels in een besteld project, `APP_VERSIE` v90 |
| `fotos.js` | zet het slot er weer op nadat de fototabellen opnieuw getekend zijn |
| `pdf.js`, `sw.js` | alleen het versienummer |
| `test-slot.js` | **nieuw** — de reeks hierboven |
