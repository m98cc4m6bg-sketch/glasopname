# Glasopname v85 — verwijderen van een project bleef hangen

*28 september 2026. Na het verwijderen van project Alexander bleef de lijst
grijs staan, bleef het project in het overzicht staan, en meldde de app
daarna "Project bestaat niet meer".*

---

## 1. Wat er misging

Eén regel, met drie gevolgen. In v83 is het verwijderen omgedraaid: eerst de
projectrij weg, dan pas de foto's. Die keten zag er zo uit:

```js
      return fotosOpruimen(id);
    }).then(function (res) {
      if (res === null) return;       // ← hier ging het mis
```

`fotosOpruimen` geeft `null` terug als er **geen foto's** zijn — en `null` was
tegelijk het teken dat het verwijderen was mislukt. Bij een project zonder
foto's, zoals Alexander, werd de goede afloop dus als een mislukking gelezen:

* de lijst bleef grijs (`opacity` werd nooit teruggezet);
* de lijst werd niet opnieuw opgehaald, dus het verwijderde project bleef
  staan;
* de koppeling met het project werd niet losgelaten. De app bleef dat
  verwijderde project bevragen, en de controle uit v84 meldde daarop —
  terecht — "Project bestaat niet meer".

De verwijdering zelf was wel gelukt: na het opnieuw openen van de lijst was
het project weg. Alleen het scherm liep achter.

## 2. Wat er nu gebeurt

Het verwijderen is herschreven met een duidelijk antwoord op de vraag "is het
gelukt?" in plaats van een dubbelzinnige `null`.

1. **De lijst wordt altijd weer normaal** en altijd opnieuw opgehaald, of het
   nu lukt of niet.
2. **Het verwijderen wordt gecontroleerd.** De opdracht vraagt nu terug welke
   rij geraakt is. Raakt hij niets, dan kijkt de app of het project er nog
   staat: staat het er nog, dan krijg je "je hebt hier geen rechten voor";
   staat het er niet meer, dan was een collega je voor en is alles in orde.
3. **De foto's worden pas opgeruimd als de rij echt weg is**, en per 500
   tegelijk tot de map leeg is. Bij een groot project bleef de rest anders
   achter.
4. **Verwijder je het project dat openstaat**, dan wordt nu alles netjes
   losgelaten: de koppeling, de openstaande vlag, de lokale kopie, de live
   verbinding en het scherm. Het pilletje zegt "Project verwijderd" en er
   wordt niets meer naar dat project geschreven.
5. **Mislukt het**, dan blijft het project staan — in de lijst én in de
   database — en zegt de melding er nu bij: "Het project staat er nog."

## 3. Erbij: je werk redden als een collega jouw project verwijdert

Stond een project open dat intussen verwijderd is, dan meldde v84 dat wel,
maar was je invoer daarna alleen nog lokaal en nergens heen te brengen: een
nieuw project begon leeg.

Nu vraagt de app bij het aanmaken van een volgend project of de ruiten die op
het scherm staan mee moeten. Zeg je ja, dan gaan de maten mee en worden ze
meteen naar het nieuwe project geschreven. De foto's gaan niet mee — die zijn
met het oude project verdwenen — dus de ruiten die eraan hingen komen bij
"Zonder foto of tekening" te staan, met alle maten erbij.

Kleiner, maar uit dezelfde hoek: als de database bij het aanmaken geen project
teruggeeft, loopt de app daar niet meer op stuk maar meldt hij het.

## 4. Wat er getest is

Nieuw: `node test-verwijderen.js`. Daarin draait een nagebootste database met
een echte projectenlijst en een fotomap, zodat het hele gedrag nagelopen kan
worden. Elf gevallen, allemaal groen, drie keer achter elkaar gedraaid om er
zeker van te zijn dat het niet van toeval afhangt:

1. het geopende project zonder foto's verwijderen — precies het geval dat
   misging;
2. een project mét foto's verwijderen dat niet openstaat (de bestanden worden
   opgeruimd);
3. de database weigert — project blijft staan, melding klopt;
4. geen rechten (de opdracht raakt niets) — project blijft staan;
5. geen verbinding tijdens het verwijderen;
6. een collega verwijdert het project dat jij open hebt — één duidelijke
   melding, niet elke keer opnieuw;
7. twee keer snel achter elkaar op de prullenbak tikken;
8. annuleren in het bevestigingsvenster;
9. na het verwijderen wordt er niets meer naar dat project geschreven;
10. het laatste project verwijderen — de lijst meldt netjes dat er niets meer
    is;
11. werk redden in een nieuw project nadat het oude verdwenen is.

De andere zeven reeksen zijn opnieuw gedraaid en groen: `test-index.js`,
`test-naslag.js`, `test-herstel.js`, `test-cloudguard.js`,
`test-verbinding.js`, `test-rook.js` en `test-leverpagina.js` + `.py`.

**Niet getest:** het echte Supabase. De database, de opslag en de rechten zijn
nagebootst; of de rechten in jouw project precies zo reageren is daarmee niet
bewezen. Ook Safari niet — hier draait alleen Chromium. Er is niets aan de
opmaak of de aanraakbediening veranderd.

**Zelf controleren, kort:** maak een testproject aan, verwijder het terwijl
het openstaat, en kijk of de lijst meteen bijwerkt en het pilletje "Project
verwijderd" zegt. Doe hetzelfde met een project dat een foto bevat.

## 5. Wat je moet doen

1. De bestanden uit de zip in de repo zetten, committen en pushen.
2. Eén keer op **↻ Bijwerken**; linksboven hoort **v85** te komen.
3. Geen SQL nodig.
