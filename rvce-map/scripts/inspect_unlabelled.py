import json

with open('rvce-map/data/buildings.json', 'r', encoding='utf-8') as f:
    b = json.load(f)

for i, feat in enumerate(b.get('features', [])):
    p = feat.get('properties', {}) or {}
    name = p.get('name')
    bld = p.get('building')
    if not name or name in ['yes', 'college', 'university', 'construction', 'BT Quadrangle']:
        geom = feat.get('geometry', {})
        coords = geom.get('coordinates', [])
        ring = coords[0] if geom.get('type') == 'Polygon' else (coords[0][0] if coords else [])
        clon = sum(pt[0] for pt in ring) / len(ring) if ring else 0
        clat = sum(pt[1] for pt in ring) / len(ring) if ring else 0
        print(f"Index {i}: id={feat.get('id')} name={name!r} bld={bld!r} at [{clon:.6f}, {clat:.6f}]")
