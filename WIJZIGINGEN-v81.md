# Glasopname v81 — valse melding "een collega heeft dit project gewijzigd"

## Wat er aan de hand was

Er was geen collega. De melding ging over **je eigen opslag die terugkwam**.

Elke keer dat de app opslaat, stuurt de database die wijziging via de live
verbinding terug, ook naar jezelf. De app moet die herkennen als "dit
was ik". Dat ging mis **als je doortypte terwijl het opslaan nog onderweg
was** (het opslaan start 1,2 seconde na je laatste toetsaanslag en duurt
even). Daarom zag je het soms wel en soms niet: het hangt af van hoe snel
je typt en hoe snel je verbinding is.

Er waren drie fouten die samen tot die melding leidden:

1. **De app onthield wat er verstuurd was pas na afloop, en keek dan naar
   het scherm.** Had je intussen een maat veranderd, dan onthield hij de
   nieuwe maat en niet wat er werkelijk verstuurd was. Het teruggestuurde
   bericht paste daar niet bij → "een collega".
2. **Het teruggestuurde bericht kan eerder binnenkomen dan het antwoord op
   het opslaan.** Op dat moment had de app nog niets onthouden → "een
   collega".
3. **Na het opslaan werd alles als "opgeslagen" gemarkeerd**, ook wat je
   tijdens het opslaan had getypt. Daardoor stond er "Jouw wijzigingen
   staan nog open" in de melding, terwijl de app die wijziging zelf niet
   meer als open zag.

### Erger dan de melding: soms ging je invoer verloren

Bij het nabouwen bleek dat dezelfde fout in een andere volgorde **zonder
melding je laatste invoer terugdraaide**: je typte 1250, de app zette
stilletjes weer 1100 neer met "↻ Bijgewerkt door collega" in het
statuspilletje, en 1250 kwam nooit in de database. Dat gebeurde als je het
veld al verlaten had, of even naar een andere app ging en terugkwam,
voordat het teruggestuurde bericht binnen was.

## Wat er veranderd is (alleen `cloud.js`)

* De app maakt bij het opslaan een **vaste kopie** van wat er verstuurd
  wordt en onthoudt die **vóór** het versturen.
* Elke geopende pagina krijgt een **eigen kenmerk** dat met de opslag
  meegaat. Een teruggestuurd bericht met dat kenmerk is altijd van jezelf,
  ook een ouder bericht. Bewust niet op account: werk je met hetzelfde
  account op telefoon en laptop, dan wordt het andere apparaat nog steeds
  live bijgewerkt.
* Is er tijdens het opslaan doorgetypt, dan **blijft dat als open staan**
  en gaat het meteen in een volgende ronde omhoog.
* Terugkeren naar de app terwijl het opslaan nog onderweg is, vraagt de
  database niet meer om een versie die ouder is dan je scherm.
* Een klein vergelijkingsfoutje (een leeg veld dat de database weglaat
  maar de app als "leeg" meetelde) is gelijkgetrokken.
* Na herladen met nog niet opgeslagen werk stond de live verbinding niet
  aan; nu wel.

Een **echte** collega (of jijzelf op een ander apparaat) wordt nog precies
zo gemeld of stil overgenomen als voorheen.

## Getest

`test-sync.js` is **nieuw**: de echte app in Chromium met een nagebootste
database die het tijdsverloop van Supabase naspeelt (opslaan, antwoord,
teruggestuurd bericht in instelbare volgorde).

| scenario | v80 | v81 |
|---|---|---|
| doortypen tijdens opslaan, bericht vóór antwoord | **jouw melding uit de screenshot**, 1250 niet opgeslagen | geen melding, 1250 opgeslagen |
| zelfde, bericht ná antwoord, veld verlaten | **invoer teruggedraaid** naar 1100, "Bijgewerkt door collega" | 1250 blijft en wordt opgeslagen |
| terug naar de app vlak na doortypen | **invoer teruggedraaid** | 1250 blijft |
| leeg veld in de lokale stand | "Bijgewerkt door collega" | niets |
| echte collega | melding | melding (ongewijzigd) |
| jijzelf op een tweede apparaat | bijgewerkt | bijgewerkt (ongewijzigd) |
| herladen met open werk | geen live verbinding | live verbinding aan |

Met de oude `cloud.js` gaan 8 controles fout, met de nieuwe 0. Alle dertien
reeksen groen.

**Niet getest:** de echte Supabase en Safari zelf. De nabootsing volgt wel
precies wat Supabase doet, en de melding uit je screenshot kwam er
woordelijk uit.

## Bijwerken

`cloud.js`, `index.html`, `pdf.js`, `sw.js` — versie **v81** in
`index.html`, `pdf.js` en `sw.js` (die laatste twee alleen het
versienummer). Geen SQL. `config.js` niet aanraken.

Na het online zetten één keer de app volledig sluiten en opnieuw openen,
zodat de nieuwe `cloud.js` geladen wordt.
