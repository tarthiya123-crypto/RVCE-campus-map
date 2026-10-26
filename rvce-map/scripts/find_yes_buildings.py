import json

with open('rvce-map/data/buildings.json', 'r', encoding='utf-8') as f:
    b = json.load(f)

for i, feat in enumerate(b.get('features', [])):
    p = feat.get('properties', {}) or {}
    name = p.get('name')
    bld = p.get('building')
    coords = feat.get('geometry', {}).get('coordinates', [])
    if bld == 'yes' and not name:
        ring = coords[0] if feat.get('geometry', {}).get('type') == 'Polygon' else coords[0][0]
        clon = sum(pt[0] for pt in ring) / len(ring)
        clat = sum(pt[1] for pt in ring) / len(ring)
        print(f"Index {i} [{feat.get('id')}]: lon={clon:.6f}, lat={clat:.6f}")
