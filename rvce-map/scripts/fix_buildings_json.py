import json

path = 'rvce-map/data/buildings.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for feat in data['features']:
    fid = feat.get('id')
    p = feat.get('properties', {})

    # Fix Main Gate 1 mislabelled as BT Quadrangle
    if fid == 'way/1327820761':
        p['name'] = 'RVCE Vidyanikethan Main Gate (Gate 1)'
        p['building'] = 'gate'
        p['amenity'] = 'gate'
        print('Updated way/1327820761 to RVCE Vidyanikethan Main Gate (Gate 1)')

    # Fix Kotak Mahindra Bank mislabelled as 'yes'
    if fid == 'way/636268136':
        p['name'] = 'Kotak Mahindra Bank & ATM'
        p['building'] = 'bank'
        p['amenity'] = 'bank'
        print('Updated way/636268136 to Kotak Mahindra Bank & ATM')

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print('Saved buildings.json successfully!')
