# v69 — bovenrand op de iPhone, en 'Opgenomen door' vult zichzelf

Gewijzigd: `index.html`, `cloud.js`, `sw.js`, `pdf.js` (versienummer).
Nieuw: `test-cloud.js`. Geen wijziging in de database.

## 1. De wazige bovenrand

De vorige poging hielp niet, en terecht: ik had
`apple-mobile-web-app-status-bar-style` aangepast, en dat werkt alleen als
de app vanaf het beginscherm start. Jouw schermafdruk komt uit Safari zelf,
en daar doet die regel niets.

De echte oorzaak staat een regel hoger: `viewport-fit=cover` in de
viewport-regel. Dat zegt letterlijk tegen de browser: teken door tot in de
veilige zones, dus ook achter de klok en de dynamic island. Safari legt daar
sinds iOS 26 een vervaging overheen (de scroll edge). Zonder `cover` begint
de pagina onder de statusbalk en is die rand weg.

De `env(safe-area-inset-*)` in de opmaak blijven staan: die worden dan
vanzelf nul, dus de marges kloppen nog. De vorige wijziging naar
`status-bar-style: default` blijft ook staan — die doet zijn werk wél in de
app vanaf het beginscherm.

## 2. 'Opgenomen door' vult zichzelf

Bij het openen van een project wordt het veld gevuld met alles vóór de @ uit
het e-mailadres waarmee je bent ingelogd: `test@gmail.com` wordt `test`,
`julian@jelierbouw.nl` wordt `julian`.

Alleen als het veld nog leeg is. Staat er al een naam, dan blijft die staan —
anders zou jij de collega overschrijven die de opname werkelijk gedaan heeft
zodra je zijn project opent. Met de hand aanpassen kan gewoon.

Dit zit in `cloud.js`, in `zetStaat()`, dus het geldt bij elk project dat uit
de cloud komt en bij een nieuw project. Zonder verbinding of zonder inloggen
gebeurt er niets.

## Getest

`node test-cloud.js` — nieuw, met een nagebootste Supabase-client: een leeg
veld wordt 'test', een adres met punten en cijfers blijft heel
(`julian.werk99`), een ingevulde naam blijft staan, een veld met alleen
spaties telt als leeg, en het tabblad Project wordt opnieuw getekend zodat je
het ziet.

`test-index.js`, `test-naslag.js` en de leverpagina-testen blijven groen.

## Niet getest

- Of de wazige rand op jouw iPhone daadwerkelijk weg is. Dit is de bekende
  oorzaak van inhoud achter de statusbalk, maar ik kan het hier niet zien —
  jij wel, in één oogopslag.
- Hoe de pagina er zonder `viewport-fit=cover` uitziet op een iPhone in
  liggende stand: daar kan links en rechts een witte strook bij de notch
  ontstaan. Zeg het als dat lelijk uitpakt, dan zoek ik een middenweg.
- Of `renderProject()` de naam ook echt in het invoerveld zet: de test
  controleert dat `projectInfo.opnemer` klopt en dat het tabblad opnieuw
  getekend wordt, maar `project.js` zelf zit niet in de test.
