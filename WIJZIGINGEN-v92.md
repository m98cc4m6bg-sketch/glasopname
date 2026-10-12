# Glasopname v92 — een lege groep zonder foto, en een melding die niet klopte

*12 oktober 2026. Gemeld door Jan: foto met bolletjes, maten ingevuld, de tabel
leeggemaakt en daarna de foto verwijderd. Dan blijft er een lege "Groep 1"
staan, met de melding dat de ruiten naar "zonder foto of tekening" verhuisd
zijn, terwijl er geen ruiten meer waren.*

---

## Installeren

Er is geen SQL nodig. Zet deze bestanden in de repo: `fotos.js`, `index.html`,
`pdf.js` en `sw.js`. In index.html, pdf.js en sw.js is alleen het
versienummer veranderd. De testreeks `test-v91.js` is ook bijgewerkt. Daarna
**↻ Bijwerken**; linksboven moet **v92** staan.

## Wat er misging

Het waren twee dingen:

1. **De melding klopte nooit.** Een groep zonder foto liet altijd dezelfde
   vaste tekst zien: *"De ruiten hieronder blijven gewoon bestaan, en zijn
   toegevoegd aan de sectie 'zonder foto of tekening'."* Dat was niet waar.
   Als je alleen de foto verwijdert, blijven de ruiten in díe groep staan.
   Naar "zonder foto of tekening" gaan ze alleen als je de hele groep
   verwijdert met *🗑 Groep* en *Ruiten bewaren* kiest. Bovendien stond de
   tekst er ook als er helemaal geen ruiten waren, zoals bij jou.
2. **Een lege groep bleef staan.** *🗑 Foto* haalt alleen de afbeelding weg,
   zodat je er een nieuwe in kunt zetten en de ruiten opnieuw kunt aanwijzen.
   Zonder ruiten heeft zo'n groep geen functie meer, maar hij bleef staan.

Je zag dus niets over het hoofd.

## Wat er nu gebeurt

* **Foto verwijderen uit een groep zonder ruiten** haalt de hele groep weg.
  De vraag vooraf zegt dat ook: *"Er staan geen ruiten in deze groep, dus de
  groep gaat ook weg."* Met Cmd+Z komen foto en groep terug.
* **Foto verwijderen uit een groep mét ruiten** werkt zoals voorheen: de groep
  en de ruiten blijven staan, en je kunt er een nieuwe foto in zetten. De
  melding zegt nu wat er werkelijk gebeurt: *"De ruiten hieronder blijven
  gewoon in deze groep staan. Zet er een nieuwe foto in om ze opnieuw aan te
  wijzen."*
* Staat er toch een groep zonder foto en zonder ruiten (bijvoorbeeld uit een
  ouder project), dan zegt de melding dat, en wijst hij op *🗑 Groep*.

## Getest

Twee keer de hele batterij, alles groen. Nieuw in `test-v91.js` (§7):

* **Precies jouw stappen:** leegmaken, foto verwijderen. Daarna is de groep
  weg, staat er geen melding over verhuisde ruiten, blijft de losse ruit
  staan, en zet Cmd+Z foto en groep terug.
* **Met ruiten:** de groep blijft staan zonder foto, de ruit blijft in die
  groep (en komt niet bij de losse maten), en de melding zegt dat.

Dezelfde controles tegen `fotos.js` van v91 geven drie fouten, precies het
gedrag uit jouw schermafdruk. De test vangt dit dus.

**Niet getest:** Safari op de iPad. Er is niets aan de opmaak of de bediening
veranderd, alleen aan wat er na het verwijderen gebeurt en aan de tekst.
