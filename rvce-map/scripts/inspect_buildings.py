import json

with open('rvce-map/data/buildings.json', 'r', encoding='utf-8') as f:
    b = json.load(f)

for i, feat in enumerate(b.get('features', [])):
    p = feat.get('properties', {}) or {}
    p_str = json.dumps(p)
    name = str(p.get('name', ''))
    bld = str(p.get('building', ''))
    if 'quadrangle' in p_str.lower() or name.lower() == 'yes' or bld.lower() == 'yes':
        coords = feat.get('geometry', {}).get('coordinates', [])
        print(f"Feature {i} [id={feat.get('id')}]: name={name!r}, building={bld!r}, properties={p}")
