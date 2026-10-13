#!/usr/bin/env python3
"""Leest de pdf's die test-leverpagina.js maakt met pdfplumber terug en
kijkt wat er werkelijk op de leverpagina staat. Draai eerst:

    node test-leverpagina.js
    python3 test-leverpagina.py
"""
import os
import sys

import pdfplumber

fouten = 0


def check(naam, ok, extra=""):
    global fouten
    if isinstance(extra, list):
        extra = ' | '.join(str(x) for x in extra)
    print(('  ok   ' if ok else '  FOUT ') + naam + ('  -> ' + str(extra) if extra else ''))
    if not ok:
        fouten += 1


def lees(pad):
    with pdfplumber.open(pad) as pdf:
        paginas = [(p.extract_text() or '') for p in pdf.pages]
        beelden = [len(p.images) for p in pdf.pages]
    return paginas, beelden


for bestand in ('uit-leeg.pdf', 'uit-vol.pdf', 'uit-fotomist.pdf', 'uit-werkplaats.pdf'):
    if not os.path.exists(bestand):
        print('Ontbreekt: ' + bestand + ' — draai eerst node test-leverpagina.js')
        sys.exit(1)

print('\n1. Niets ingevuld: de pagina is er tóch')
paginas, beelden = lees('uit-leeg.pdf')
check('twee pagina\'s', len(paginas) == 2, str(len(paginas)))
lever = paginas[-1]
check('kop Leverlocatie', 'Leverlocatie' in lever)
check('AFLEVEREN OP', 'AFLEVEREN OP' in lever)
check('meldt dat het werkadres ontbreekt', 'niet ingevuld' in lever,
      [r for r in lever.split('\n') if 'ingevuld' in r][:1])
check('meldt dat er geen instructie is', 'Geen instructie voor de chauffeur' in lever)
check('meldt dat er geen foto is', 'Geen foto van de leverlocatie' in lever)
check('levertermijn staat er als terugval', 'Eerste levermogelijkheid' in lever)
check('geen afbeelding op die pagina', beelden[-1] == 0, str(beelden[-1]))

print('\n2. Alles ingevuld')
paginas, beelden = lees('uit-vol.pdf')
check('twee pagina\'s', len(paginas) == 2, str(len(paginas)))
lever = paginas[-1]
check('werkplaatsadres', 'Vissersdijk' in lever)
check('gewenste leverdatum', 'Gewenste levering: 01-10-2026' in lever)
check('instructie voor de chauffeur', 'sleutel bij de buren' in lever)
check('geen meldingen over ontbrekende zaken',
      'Geen instructie' not in lever and 'Geen foto' not in lever)
check('de foto staat erop', beelden[-1] >= 1, str(beelden[-1]))

print('\n3. Foto niet ophaalbaar (zonder bereik)')
paginas, beelden = lees('uit-fotomist.pdf')
lever = paginas[-1]
check('meldt dat de foto niet opgehaald kon worden',
      'kon niet worden' in lever and 'opgehaald' in lever,
      [r for r in lever.split('\n') if 'opgehaald' in r][:1])
check('zegt níet dat er geen foto is', 'Geen foto van de leverlocatie' not in lever)
check('instructie staat er wel', 'Bellen bij aankomst' in lever)
check('geen afbeelding', beelden[-1] == 0, str(beelden[-1]))

print('\n3b. Werkplaats zonder foto (v94)')
paginas, beelden = lees('uit-werkplaats.pdf')
lever = paginas[-1]
check('werkplaatsadres', 'Vissersdijk' in lever)
check('zegt níets over een ontbrekende foto', 'Geen foto' not in lever and 'foto' not in lever.lower(),
      [r for r in lever.split('\n') if 'oto' in r][:1])
check('instructie staat er wel', 'Achter de loods' in lever)

print('\n4. De bestellijst zelf is niet stuk')
paginas, _ = lees('uit-vol.pdf')
eerste = paginas[0]
check('kop Bestellijst glas', 'Bestellijst glas' in eerste)
check('glasmaten staan erin', '992' in eerste and '1992' in eerste)
check('nieuwe figuurglasnaam leesbaar in de tabel', 'Crepi blank' in eerste,
      [r for r in eerste.split('\n') if 'Crepi' in r][:1])
check('het kastlijntje is niet verhaspeld', 'Figuurglas' in eerste,
      [r for r in eerste.split('\n') if 'Figuurglas' in r][:1])

print('\n5. De voettekst staat op elke pagina binnen het blad (v91)')
# Tot v90 viel hij van de liggende bestellijstpagina's af: de leverpagina
# erachter is staand, en de voettekst rekende met de hoogte daarvan.
with pdfplumber.open('uit-vol.pdf') as pdf:
    n = len(pdf.pages)
    for i, p in enumerate(pdf.pages, 1):
        woorden = p.extract_words()
        voet = [w for w in woorden if w['text'] == 'pagina']
        liggend = p.width > p.height
        binnen = bool(voet) and all(0 <= w['bottom'] <= p.height and 0 <= w['x1'] <= p.width for w in voet)
        tekst = p.extract_text() or ''
        check('pagina %d (%s): "pagina %d van %d" staat erop' % (i, 'liggend' if liggend else 'staand', i, n),
              binnen and ('pagina %d van %d' % (i, n)) in tekst,
              [round(w['bottom']) for w in voet] + [round(p.height)])
        check('pagina %d: projectregel in de voettekst' % i, 'Jelier Bouw B.V.' in tekst)

print('\n' + ('Alles goed.' if fouten == 0 else str(fouten) + ' fout(en).'))
sys.exit(0 if fouten == 0 else 1)
