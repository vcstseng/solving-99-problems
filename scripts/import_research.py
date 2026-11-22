"""Explicit, read-only source import. Not part of development or production builds."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
COMPLETED = ['CS07', 'P02', 'DEV04', 'L06', 'S01', 'CS02', 'VER02', 'VER06']


def read_originals(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(t.text or '' for t in item.iterfind('.//s:t', NS))
                      for item in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
        relationships = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(
            archive.read('xl/_rels/workbook.xml.rels'))}
        sheets = ET.fromstring(archive.read('xl/workbook.xml')).find('s:sheets', NS)
        sheet = next(s for s in sheets if s.attrib['name'] == '原始題庫')
        target = relationships[sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        for row in ET.fromstring(archive.read(target)).findall('s:sheetData/s:row', NS):
            cells = {}
            for cell in row:
                value = cell.find('s:v', NS)
                value = value.text or '' if value is not None else ''
                if cell.attrib.get('t') == 's':
                    value = shared[int(value)] if value else ''
                elif cell.attrib.get('t') == 'inlineStr':
                    value = ''.join(t.text or '' for t in cell.iterfind('.//s:t', NS))
                cells[re.sub(r'\d', '', cell.attrib['r'])] = value
            if not re.fullmatch(r'[A-Z]+\d+', cells.get('A', '')):
                continue
            yield {'id': cells['A'], 'domain': cells['B'], 'domainEnglish': cells['C'],
                   'originalName': cells['D'], 'businessProblem': cells['E'],
                   'requiredData': cells['F'], 'context': cells['L'],
                   'group': cells['N'], 'order': int(cells['O']),
                   'completed': cells['A'] in COMPLETED}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    source = parser.parse_args().source.resolve()
    workbook = source / '99_Problems_AI淨價值審查_v4.xlsx'
    problems = list(read_originals(workbook))
    assert len(problems) == len({p['id'] for p in problems}) == 99
    assert sum(p['completed'] for p in problems) == 8
    provenance = {'workbook': workbook.name, 'sheet': '原始題庫',
                  'sha256': hashlib.sha256(workbook.read_bytes()).hexdigest(),
                  'statusBasis': 'Human 指定的八篇 revised Articles；僅轉換網站顯示名稱，不代表部署或驗收。',
                  'articles': {}}
    target = ROOT / 'src/content/articles'
    target.mkdir(parents=True, exist_ok=True)
    for pid in COMPLETED:
        relative = f'articles/revised/problem_{pid}.md'
        raw = (source / relative).read_bytes()
        (target / f'problem_{pid}.md').write_bytes(raw)
        provenance['articles'][pid] = {'source': relative, 'sha256': hashlib.sha256(raw).hexdigest()}
    for name, value in [('problems.json', problems), ('importProvenance.json', provenance)]:
        (ROOT / 'src/_data' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Imported 99 original problem definitions and 8 byte-identical articles.')


if __name__ == '__main__':
    main()
