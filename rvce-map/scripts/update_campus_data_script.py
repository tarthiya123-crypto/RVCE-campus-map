import json

with open('rvce-map/scripts/build_campus_data.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Add b_kotak_bank if not present
if 'b_kotak_bank' not in text:
    kotak_entry = '''    {
        "id": "b_kotak_bank",
        "name": "Kotak Mahindra Bank & RVCE Branch ATM",
        "shortName": "Kotak Mahindra Bank",
        "category": "amenity",
        "lon": 77.499408,
        "lat": 12.924871,
        "imgX": 35.0,
        "imgY": 45.0,
        "levels": 1,
        "description": "On-campus Kotak Mahindra Bank full-service branch with 24/7 ATM facility, fee payment counters, and student banking services next to Gate 1 on Mysore Road.",
        "icon": "🏦",
        "rooms": [
            {"room": "Banking Hall", "name": "Branch Manager & Customer Desk", "faculty": "Branch Manager", "floor": 0},
            {"room": "ATM", "name": "24/7 Cash Withdrawal & Deposit ATM", "faculty": "Self Service", "floor": 0},
            {"room": "Fee Counter", "name": "RVCE Student Fee Counter", "faculty": "Challan Staff", "floor": 0}
        ]
    },
'''
    text = text.replace('campus_buildings = [\n', 'campus_buildings = [\n' + kotak_entry)

# Update Civil rooms
old_civil = '''        "rooms": [
            {"room": "CE-101", "name": "HoD Office (Civil)", "faculty": "Dr. Radhakrishna (HoD)", "floor": 1},
            {"room": "CE-110", "name": "Concrete Testing & Materials Lab", "faculty": "Lab Staff", "floor": 1},
            {"room": "CE-005", "name": "Geodetic Surveying Store", "faculty": "Survey Lab", "floor": 0},
            {"room": "CE-207", "name": "Smart Classroom 207", "faculty": "Faculty", "floor": 2},
            {"room": "CE-223", "name": "PG Computer Aided Design Center", "faculty": "CAD Lab", "floor": 2},
            {"room": "CE-307", "name": "Staff Room & Faculty Lounge", "faculty": "Professors", "floor": 3}
        ]'''

new_civil = '''        "rooms": [
            {"room": "CE-101", "name": "HoD Office (Civil Engineering)", "faculty": "Dr. Radhakrishna (Professor & HoD)", "floor": 1},
            {"room": "CE-102", "name": "Civil Department Office", "faculty": "Administrative Staff", "floor": 1},
            {"room": "CE-104", "name": "Dean Academics Cabin", "faculty": "Dr. M. V. Renuka Devi (Professor & Dean)", "floor": 1},
            {"room": "CE-110", "name": "Concrete Testing & Materials Lab", "faculty": "Dr. B. C. Udayashankar & Lab Staff", "floor": 1},
            {"room": "CE-005", "name": "Geodetic Surveying & Total Station Store", "faculty": "Dr. K. S. Satyanarayana", "floor": 0},
            {"room": "CE-011", "name": "Materials & Specimen Store", "faculty": "Lab Assistants", "floor": 0},
            {"room": "CE-116", "name": "Restroom (Ladies)", "faculty": "Facility", "floor": 1},
            {"room": "CE-117", "name": "Restroom (Gents)", "faculty": "Facility", "floor": 1},
            {"room": "CE-207", "name": "Smart Classroom 207", "faculty": "Civil Faculty", "floor": 2},
            {"room": "CE-218", "name": "Ladies Common Room", "faculty": "Student Amenity", "floor": 2},
            {"room": "CE-220", "name": "Staff Toilet", "faculty": "Staff Facility", "floor": 2},
            {"room": "CE-223", "name": "PG Computer Aided Design & Structural Center", "faculty": "Dr. L. V. Ramana", "floor": 2},
            {"room": "CE-307", "name": "Staff Room & Faculty Lounge", "faculty": "Dr. N. C. Balaji & Professors", "floor": 3},
            {"room": "CE-315", "name": "Ladies Restroom (3rd Floor)", "faculty": "Facility", "floor": 3},
            {"room": "CE-316", "name": "Gents Restroom (3rd Floor)", "faculty": "Facility", "floor": 3}
        ]'''

text = text.replace(old_civil, new_civil)

# Update Gate 1 to ensure name is explicit
text = text.replace(
    '"name": "Gate No. 1 — RVCE Vidyanikethan Main Gate (Mysore Road)"',
    '"name": "RVCE Vidyanikethan Main Gate (Gate 1)"'
)

# Add Kotak to quick destinations
text = text.replace(
    '  { id: \'b_krishna_hostel\', name: \'Krishna Hostel\', icon: \'🛏️\' }',
    '  { id: \'b_krishna_hostel\', name: \'Krishna Hostel\', icon: \'🛏️\' },\n  { id: \'b_kotak_bank\', name: \'Kotak Bank\', icon: \'🏦\' }'
)

with open('rvce-map/scripts/build_campus_data.py', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated build_campus_data.py successfully!')
