import json

def get_centroid(feat):
    geom = feat.get('geometry', {})
    gtype = geom.get('type')
    coords = geom.get('coordinates', [])
    if gtype == 'Polygon' and coords:
        ring = coords[0]
        return [sum(p[0] for p in ring)/len(ring), sum(p[1] for p in ring)/len(ring)]
    elif gtype == 'MultiPolygon' and coords and coords[0]:
        ring = coords[0][0]
        return [sum(p[0] for p in ring)/len(ring), sum(p[1] for p in ring)/len(ring)]
    return None

with open('rvce-map/data/buildings.json', 'r', encoding='utf-8') as f:
    buildings = json.load(f)

extracted = []
for i, f in enumerate(buildings.get('features', [])):
    p = f.get('properties', {}) or {}
    name = p.get('name') or p.get('building')
    c = get_centroid(f)
    if name and c and name not in ['yes', 'university', 'college', 'school', 'garage']:
        extracted.append({
            'id': f'b_{i}',
            'name': name,
            'lon': c[0],
            'lat': c[1],
            'levels': p.get('building:levels', '3'),
            'amenity': p.get('amenity', ''),
            'type': p.get('type', '')
        })

print(f"Extracted {len(extracted)} named landmarks:")
for x in extracted:
    print(f"- {x['name']} at [{x['lon']:.6f}, {x['lat']:.6f}]")
