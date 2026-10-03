# Glasopname v88 — mail, statussen, een slot na bestellen en een kloppend spoor

*1 oktober 2026. De bestelling gaat nu als mail met de bestellijst eraan de
deur uit, en pas dán staat een project op "besteld". Daarna zijn de maten
vastgezet tot iemand ze met zijn wachtwoord vrijgeeft. Taken kun je op naam
van een collega zetten, die er een mailtje over krijgt. En het logboek klopt:
drie ruiten één voor één weggooien zegt nu "3 ruiten verwijderd" in plaats van
"1 ruit verwijderd".*

---

## Installeren

Er zijn drie dingen te doen. Alleen stap 1 is nodig om v88 te laten werken;
zonder stap 2 en 3 doet de app het gewoon, maar dan geeft de knop *Bestelmail
versturen* een nette melding dat de maildienst nog niet ingesteld is.

### Stap 1 — de database en de bestanden

1. Draai **`14_gebruikers_mail_en_statussen.sql`** in Supabase → *SQL Editor*.
   (Script 13 van v88 moet er al in staan; zo niet, eerst die.) Het maakt de
   tabellen `gebruikers`, `mailadressen` en `mailverzonden`, zet je bestaande
   gebruikers erin, zet de oude statussen om en maakt het logboek nauwkeurig.
   Veilig om nog eens te draaien.
2. Zet de bestanden op GitHub: `index.html`, `cloud.js`, `project.js`,
   `pdf.js`, `start.js`, `naslag.js`, `melding.js`, `sw.js`.
   Er is **geen nieuw .js-bestand** deze keer. `config.js` zit niet in de zip
   en blijft zoals hij is.

### Stap 2 — een maildienst (eenmalig, ongeveer een half uur)

De sleutel van een maildienst mag niet in de app staan: de repo is openbaar.
Daarom staat die als geheim in Supabase, en vraagt de app een klein
serverprogramma (een *Edge Function*) om te versturen.

1. Maak een account op **resend.com** (gratis: 3.000 mails per maand, 100 per
   dag — ruim voldoende).
2. Voeg daar een **domein** toe. Neem liever `send.jelierbouw.nl` dan
   `jelierbouw.nl` zelf: dan staat het versturen door de app los van je
   gewone Microsoft-mail en kan het die reputatie niet schaden. Resend geeft
   een paar DNS-regels (SPF en DKIM); die moeten bij de partij waar de DNS van
   `jelierbouw.nl` beheerd wordt. Wacht tot Resend het domein als *verified*
   toont.
3. Maak in Resend een **API-sleutel** met alleen verzendrechten (`re_…`).
4. Zet in Supabase bij *Project Settings → Edge Functions → Secrets* drie
   waarden klaar:
   * `RESEND_API_KEY` = `re_…`
   * `MAIL_VAN` = `Jelier Bouw <inmeten@send.jelierbouw.nl>`
   * `MAIL_ANTWOORD` = `julian@jelierbouw.nl` *(waar antwoorden heen gaan;
     laat je dit leeg, dan gaan ze naar het adres van wie verstuurt)*

### Stap 3 — de mailfunctie plaatsen

In Supabase → *Edge Functions* → een nieuwe functie, **naam: `mail`**, en de
inhoud van `supabase/functions/mail/index.ts` uit de zip erin. Laat
**Verify JWT aan staan**: zo kan alleen iemand die in de app is ingelogd
mailen. Opslaan en uitrollen kan in het dashboard; een terminal heb je niet
nodig. *(De benamingen in het dashboard kunnen iets afwijken van wat hier
staat — Supabase verzet af en toe een menu.)*

Daarna nog de geadresseerden: open een project → **Bestellijst → Bestelmail
versturen**. Staan er nog geen adressen, dan kun je er in dat venster één
intypen; vaste adressen zet je in Supabase in de tabel `mailadressen` (zet
`standaard` op true bij de adressen die altijd aangevinkt moeten staan).
Stuur de eerste mail naar jezelf.

---

## 1. Naslag begint dicht

Bij een nieuw project stond Figuurglas onder Naslag altijd open, dus moest je
eerst een lap foto's wegklappen. Alle secties beginnen nu dicht. Zoeken klapt
de secties met treffers wél open — dat was het nuttige deel.

## 2. Vier statussen, waarvan twee vanzelf

| status | wanneer |
|---|---|
| **aangemaakt** | een nieuw project, nog zonder maten |
| **bezig met inmeten/verwerken** | automatisch zodra de eerste ruit inhoud heeft — compleet hoeft die niet te zijn |
| **besteld** | automatisch, en alleen, als de bestelmail er echt uit is |
| geleverd / gemonteerd / afgerond | met de hand, zoals voorheen |

Oude projecten zijn omgezet: *open* → *aangemaakt*, *ingemeten* → *bezig met
inmeten/verwerken*. Met de hand een status kiezen mag nog steeds (bijvoorbeeld
als je telefonisch bestelt); dan staat in het logboek dat het met de hand
gebeurde, en door wie.

**Belangrijk:** het maken van de bestellijst-pdf zet de status níet meer op
besteld. Dat deed v87 wel, en dat is precies waarom die status onbetrouwbaar
was: een pdf maken is nog geen bestelling. Een gemaakte pdf levert nu alleen
de regel "bestellijst gemaakt" in het logboek op.

## 3. De bestelmail

Op het tabblad Bestellijst zit een knop **✉️ Bestelmail versturen**. Daarin:

* de vaste adressen met een vinkje (uit `mailadressen`), plus een veld voor
  een adres dat er eenmalig bij moet;
* een onderwerp dat al klaarstaat (*Bestelling glas — projectnaam*);
* een bericht dat al klaarstaat: referentie, aantal posities, afleveradres,
  gewenste levering, de afleverinstructies als die er zijn, en de opmerking
  dat de maten in de bijlage glasmaten zijn. Je kunt alles nog aanpassen;
* de bestellijst als pdf eraan (uit te vinken als je zelf wilt bijvoegen).

Lukt het versturen, dan gebeurt er drie dingen: het project gaat op
**besteld**, het staat met tijdstip, geadresseerden en afzender in het
**logboek**, en de **maten gaan op slot** (zie 5). Lukt het niet, dan blijft
álles staan zoals het was en zie je waaróm het niet lukte — geen project dat
"besteld" heet terwijl de leverancier niets heeft.

Antwoorden van de leverancier komen bij jou (`MAIL_ANTWOORD`), niet bij een
adres waar niemand kijkt.

## 4. Taken op naam van een collega, met bericht

* Bij een taak staat nu een **keuzelijst met namen**. Die namen komen uit
  Supabase: maak je daar een gebruiker aan, dan verschijnt hij hier
  automatisch (tabel `gebruikers`). De naam is in het begin het stuk vóór de
  @ van het mailadres; dat kun je in Supabase bijwerken naar "Jan", "Bart".
* Ook bij het veld voor een nieuwe taak kies je op wiens naam hij komt;
  standaard die van jezelf.
* Zet je een taak op naam van een ander, dan vraagt de app of die er een
  **mailtje** over moet krijgen — met de taak, het project en een
  rechtstreekse link erin. Zeg je nee, dan ziet hij de taak gewoon op zijn
  startscherm onder *Mijn taken*. Mislukt de mail, dan staat de taak er nog
  steeds; dat zegt de melding ook.

## 5. Het slot op de maten na bestellen

Staat een project op *besteld*, dan zijn de maatvelden op het Invoer-tabblad
**alleen-lezen**, met een balk bovenaan die zegt waarom. Tekenen op foto's en
notities blijven wél mogelijk; het gaat om de maatvoering.

Ontgrendelen kan **iedere ingelogde gebruiker met zijn eigen wachtwoord** —
zo loopt het niet vast als de inmeter op vakantie is. Dat wachtwoord wordt
door Supabase gecontroleerd; de app ziet het niet en bewaart het niet. Na het
ontgrendelen:

* staat er een balk "Ontgrendeld door …" met een knop om het weer vast te
  zetten;
* staat **"slot geopend door julian"** als eigen regel in het logboek;
* krijgt elke ruit die je daarna wijzigt het bolletje "gewijzigd ná de
  bestellijst", en zegt het logboek er "ná de bestelling" bij.

**Wat dit slot niet is.** Het zit in de app, niet in de database. Iemand die
met de sleutel uit `config.js` rechtstreeks met Supabase praat, komt er
langs — dat is een technische ingreep, geen ongelukje, maar het is wel het
verschil. Een echt slot vraagt een RLS-regel in de database plus een
wachtwoordcontrole aan de serverkant; dat is bewust niet in dit blok gedaan
(jouw keuze: "alleen slot in de app"). Het staat als voorstel in de handover.

## 6. Het logboek klopt nu — en blijft leesbaar

Jouw voorbeeld: drie losse regels weggooien gaf "1 ruit verwijderd". De app
telde goed; de database bewaarde binnen twee minuten alleen de eerste regel.

Dat is nu anders opgelost, want een regel per opslag is ook niets: tijdens het
typen slaat de app elke paar seconden op. App en database werken nu samen:

* de **app** houdt bij wélke ruiten er in déze werkgang zijn toegevoegd,
  gewijzigd en verwijderd, en zegt of dit nog dezelfde werkgang is;
* de **database** werkt dan de laatste regel bij in plaats van een nieuwe toe
  te voegen. Die regel groeit dus mee: 1 → 2 → 3 ruiten verwijderd.

Een nieuwe regel begint bij een andere persoon, na een half uur stilte, bij
het openen van een project, of bij iets bijzonders (een ontgrendeling, een
verstuurde bestelmail, een statuswijziging). Dezelfde ruit twintig keer
bijschaven levert dus één regel "1 ruit gewijzigd" op, en niet twintig.

Verder:

* De **momentopname** van de inhoud (waarmee een oude stand terug te halen
  is) wordt apart geremd: één per tien minuten per project, en altijd als er
  iemand anders aan het werk gaat. Opruimen gebeurt op 200 regels en 20
  momentopnames per project.
* Het logboek op **Projectgegevens** toont nu ook de verstuurde mail, met
  ✉ ervoor — en een mislukte poging met de reden erbij.

---

## Wat er getest is

Twaalf reeksen, twee keer achter elkaar volledig groen:

| reeks | wat |
|---|---|
| `test-mail-en-slot.js` | **nieuw** — de statussen, het bestelmailvenster, versturen (en wat er gebeurt als het mislukt), het slot, ontgrendelen met goed en fout wachtwoord, taken toewijzen met bericht, en drie ruiten één voor één weg |
| `test-mailfunctie.ts` | **nieuw** — de Edge Function zelf: wat hij verstuurt, vastlegt, weigert (onzinnig adres, te grote bijlage, niet ingelogd, GET), en dat de status níet op besteld gaat als de maildienst faalt. Draaien met `bun test-mailfunctie.ts` |
| `test-sql.sql` | **nieuw** — de SQL-scripts tegen een échte Postgres: het logboek per werkgang, de taakteller, de statusmigratie, het opruimen, en of de scripts twee keer gedraaid kunnen worden |
| `test-rook.js` | uitgebreid: het bestelmailvenster in Chromium met échte jsPDF — er zit werkelijk een pdf van ±350 kB aan de mail, en die begint met `%PDF-` |
| `test-start.js`, `test-herstel.js`, `test-cloudguard.js`, `test-verbinding.js`, `test-verwijderen.js`, `test-index.js`, `test-naslag.js`, `test-leverpagina.js/.py` | de bestaande reeksen, aangepast waar v88 iets verandert |

Dit keer dus wel een echte database: ik heb PostgreSQL 16 opgezet, `auth.users`
en de rollen van Supabase nagebootst, en de scripts 13 en 14 er echt op
gedraaid. Uitkomsten: drie keer één ruit weg binnen één werkgang → één regel
"3 ruiten verwijderd"; 200 opslagen tijdens doortypen → 3 regels; 250 losse
werkgangen → opgeruimd tot 200; nieuwe gebruiker in `auth.users` → automatisch
een naam in `gebruikers`; taakteller 2 → 1 → 0.

**Wat ik niet heb kunnen testen, en waar ik dus op jouw ogen vertrouw:**

* **De echte Resend-koppeling.** De mailfunctie is getest met een nagebootste
  maildienst: wat hij verstuurt en vastlegt klopt, maar er is hier nooit een
  mail de deur uit gegaan. Stuur de eerste bestelmail naar jezelf, en kijk of
  hij niet in de spam belandt — dat hangt van de DNS-regels af, niet van de
  app.
* **De Edge Function in Supabase zelf.** De code is getest op gedrag, en de
  TypeScript is nagelopen, maar niet op Deno in Supabase uitgerold. Als het
  uitrollen klaagt, stuur me de melding.
* **Jouw echte Supabase.** De scripts draaiden op PostgreSQL 16; Supabase
  draait een eigen versie met extra uitbreidingen. Kijk na het draaien of je
  bij *Table editor* `gebruikers`, `mailadressen` en `mailverzonden` ziet,
  met RLS aan, en of de statussen in de projectlijst goed staan.
* **Safari op iPad en iPhone.** De tests draaien op Chromium. Let bij het
  eerste gebruik op het bestelmailvenster op de iPad (het is een hoog venster
  met een tekstvak) en op de keuzelijst met namen bij een taak.
* **De wachtwoordvraag bij ontgrendelen** is getest met een nagebootste
  Supabase-inlog. Op het echte systeem controleert Supabase het wachtwoord;
  mocht je daarbij uit de app geschopt worden, zeg het dan — dan zet ik de
  controle om naar de serverkant.

---

## Gewijzigde bestanden

| bestand | wat |
|---|---|
| `14_gebruikers_mail_en_statussen.sql` | **nieuw** — gebruikers, mailadressen, maillogboek, statussen, en het nauwkeurige spoor. Eerst draaien. |
| `supabase/functions/mail/index.ts` | **nieuw** — het serverprogramma dat mailt via Resend en de status op besteld zet |
| `cloud.js` | gebruikerslijst, mailaanroep, taakbericht, de statussen, het spoor per werkgang, wachtwoordcontrole |
| `pdf.js` | het bestelmailvenster, het bestelmoment vastleggen, geen status meer bij de pdf, `PDF_VERSIE` v88 |
| `index.html` | het slot met de balk en het ontgrendelen, de knop Bestelmail, opmaak voor het mailvenster en de namenlijst, `APP_VERSIE` v88 |
| `project.js` | namenlijst bij taken, taken toewijzen, statuswijziging in het logboek, mail in het logboek |
| `naslag.js` | alle secties beginnen dicht |
| `melding.js` | een venster dat om een wachtwoord kan vragen (`appWachtwoord`) |
| `start.js` | statusplaatjes voor de nieuwe statussen |
| `sw.js` | `VERSIE` v88 |
| `test-mail-en-slot.js`, `test-mailfunctie.ts`, `test-sql.sql` | **nieuw** — zie hierboven |
| `test-rook.js`, `test-index.js`, `test-naslag.js` | bijgewerkt op het nieuwe gedrag |

De drie versienummers (`APP_VERSIE`, `PDF_VERSIE`, `VERSIE` in `sw.js`) staan
alle drie op `v88`.
