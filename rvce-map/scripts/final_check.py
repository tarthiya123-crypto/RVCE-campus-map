import json, re

with open('rvce-map/js/campus-data.js', 'r', encoding='utf-8') as f:
    js_content = f.read()
ids = re.findall(r'"id": "b_', js_content)
print('CAMPUS_BUILDINGS entries:', len(ids))

with open('rvce-map/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

checks = [
    'gamifiedMapContainer',
    'vectorMapContainer',
    'gamified-map.js',
    'data-mode="gamified"',
]
for c in checks:
    print(f'HTML contains [{c}]: {c in html}')
