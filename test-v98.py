#!/usr/bin/env python3
"""Leest de pdf invoer die test-v98.js maakt (uit-projectinfo.pdf) met
pdfplumber terug: staat de pagina met projectgegevens erin, voorop, met
alles wat op Project info staat (v98)? Draai eerst:

    node test-v98.js
    python3 test-v98.py
"""
import os
import sys

import pdfplumber

fouten = 0


def check(naam, ok, extra=""):
    global fouten
    print(('  ok   ' if ok else '  FOUT ') + naam + ('  -> ' + str(extra) if extra else ''))
    if not ok:
        fouten += 1


PAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uit-projectinfo.pdf')
if not os.path.exists(PAD):
    print('uit-projectinfo.pdf ontbreekt; draai eerst node test-v98.js')
    sys.exit(1)

with pdfplumber.open(PAD) as pdf:
    teksten = [(p.extract_text() or '') for p in pdf.pages]
    beelden = [len(p.images) for p in pdf.pages]
    # Hoogte van het grootste beeld per pagina, in mm (1 pt = 0,3528 mm).
    hoogtes = [max([(b['bottom'] - b['top']) * 0.3528 for b in p.images] or [0]) for p in pdf.pages]

print('\nPdf invoer met projectgegevens (' + str(len(teksten)) + ' pagina\'s)')
een = teksten[0]
check('pagina 1 is de pagina Projectgegevens', een.startswith('Projectgegevens'), een[:40].replace('\n', ' / '))
check('met de projectnaam groot bovenaan', 'Klantproject' in een.split('\n')[1])
for kop in ['Klant en werkadres', 'Uitvoering', 'Levering', 'Notities', 'Taken', 'Logboek']:
    check('kopje ' + kop, kop in een)
for waarde in ['Klantnaam Fam. de Vries', 'Contactpersoon Anna de Vries', 'Telefoon 06-12345678',
               'Werkadres Voorstraat 12, 3311 ER Dordrecht']:
    check('gegevens: ' + waarde, waarde in een)
check('vervallen velden staan er nog als ze gevuld zijn (e-mail, soort)',
      'E-mail anna@voorbeeld.nl' in een and 'Soort opdrachtgever Particulier' in een)
for waarde in ['Referentie OPD-2026-114', 'Status bezig met inmeten/verwerken', 'Opgenomen door julian',
               'Sleutel bij de buren (nr 14)']:
    check('uitvoering: ' + waarde, waarde in een)
check('levering: adres, week en instructie',
      'Afleveren op Voorstraat 12' in een and 'week 46' in een and 'code 4411' in een)
check('notities, met de regelovergang', 'Klant wil graag voor de kerst klaar.\nHond in de tuin.' in een)
check('taken met eigenaar en status', 'Rooster nameten bart open' in een and 'Sleutel ophalen julian afgerond' in een)
check('logboek met moment, wie en wat', 'bart leverweek gekozen' in een and 'julian 1 ruit toegevoegd' in een)
check('de mail staat in het logboek, zonder ✉ (dat kent het lettertype niet)',
      'mail bestelmail naar bestel@voorbeeld.test' in een and '✉' not in ''.join(teksten))
check('nieuwste logboekregel bovenaan', een.index('leverweek gekozen') < een.index('1 ruit toegevoegd'))

fotopag = [i for i, t in enumerate(teksten) if 'Foto leverlocatie' in t]
check('kopje "Foto leverlocatie" staat op precies één pagina', len(fotopag) == 1, fotopag)
if fotopag:
    i = fotopag[0]
    check('… en daar staat de foto (naast het logo)', beelden[i] >= 2, beelden[i])
    check('… op een bruikbare maat, geen postzegel onderaan een pagina (≥ 6 cm hoog)',
          hoogtes[i] >= 60, '%.0f mm' % hoogtes[i])
    check('de projectgegevens komen vóór de maten', i < next(
        (k for k, t in enumerate(teksten) if t.startswith('Zonder foto')), len(teksten)))
check('de maten zelf staan er nog in', any('K 1 Sponningmaat 1000 1200' in t for t in teksten))

# Veel inhoud: de projectgegevens lopen over meer pagina's.
LANG = PAD.replace('.pdf', '-lang.pdf')
print('\nLang project: over meer pagina\'s')
if not os.path.exists(LANG):
    check('uit-projectinfo-lang.pdf bestaat', False)
else:
    with pdfplumber.open(LANG) as pdf:
        lt = [(p.extract_text() or '') for p in pdf.pages]
        # Lettertype van de notitieregels, op elke pagina.
        notitieLetters = set()
        for p in pdf.pages:
            for w in p.extract_words(extra_attrs=['fontname']):
                if w['text'].startswith('Notitieregel'):
                    notitieLetters.add(w['fontname'])
        lh = [max([(b['bottom'] - b['top']) * 0.3528 for b in p.images] or [0]) for p in pdf.pages]
        # Onderkant van de laatste tekstregel boven de voettekst, in mm.
        onder = [max([w['bottom'] for w in p.extract_words() if 'pagina' not in w['text'] and
                      w['bottom'] < p.height - 25] or [0]) * 0.3528 for p in pdf.pages]
    alles = '\n'.join(lt)
    pg = [i for i, t in enumerate(lt) if t.startswith('Projectgegevens')]
    check('de projectgegevens lopen door op een vervolgpagina',
          len(pg) >= 2 and all('Projectgegevens (vervolg)' in lt[i] for i in pg[1:]), pg)
    check('alle 45 notitieregels staan erin, op volgorde',
          all(('Notitieregel %d:' % n) in alles for n in range(1, 46)) and
          alles.index('Notitieregel 9:') < alles.index('Notitieregel 10:') < alles.index('Notitieregel 45:'))
    check('notities overal in gewone letter, ook na een nieuwe pagina (niet vet)',
          notitieLetters and not any('Bold' in f for f in notitieLetters), sorted(notitieLetters))
    check('alle 12 taken', all(('Taak nummer %d ' % n) in alles for n in range(1, 13)))
    check('alle 30 logregels, met "(laatste 30)" in het kopje',
          all(('logregel %d\n' % n) in alles + '\n' for n in range(1, 31)) and 'Logboek (laatste 30)' in alles)
    # De projectgegevens houden 2 cm vrij voor de voettekst (ONDER in pdf.js).
    check('projectgegevens: geen tekst in de voettekstruimte (onderste 2 cm)',
          all(onder[i] <= 297 - 20 + 1 for i in pg), ['%.0f mm' % onder[i] for i in pg])
    fp = [i for i, t in enumerate(lt) if 'Foto leverlocatie' in t]
    check('foto leverlocatie één keer, op bruikbare maat',
          len(fp) == 1 and lh[fp[0]] >= 60, [fp, ['%.0f' % h for h in lh]])

print('\n' + (str(fouten) + ' fout(en).' if fouten else 'Alles goed.'))
sys.exit(1 if fouten else 0)
