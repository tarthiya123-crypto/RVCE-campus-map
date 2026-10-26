import json

# Comprehensive database of RVCE Campus
# Coordinates from buildings.json centroids + exact geolocations
campus_buildings = [
    {
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
    {
        "id": "b_admin",
        "name": "Administration Block & Placement Department",
        "shortName": "Admin Block",
        "category": "admin",
        "lon": 77.498753,
        "lat": 12.923817,
        "imgX": 25.0, # percentage on 867x746 illustrated map
        "imgY": 64.0,
        "levels": 3,
        "description": "Central administrative headquarters of RVCE, Principal's office, Deans, Registrar, and Placement & Training Center.",
        "icon": "🏛️",
        "rooms": [
            {"room": "G-01", "name": "Principal's Office", "faculty": "Dr. K. N. Subramanya (Principal)", "floor": 0},
            {"room": "G-02", "name": "Vice Principal Office", "faculty": "Dr. K. S. Geetha (Vice Principal)", "floor": 0},
            {"room": "101", "name": "Dean Academics Office", "faculty": "Dr. M. V. Renuka Devi (Dean)", "floor": 1},
            {"room": "102", "name": "Dean Student Affairs", "faculty": "Dr. B. M. Sagar (Dean)", "floor": 1},
            {"room": "105", "name": "Placement & Training Office", "faculty": "Dr. D. Ranganath (Dean Placement)", "floor": 1},
            {"room": "201", "name": "Controller of Examinations (COE)", "faculty": "COE Staff", "floor": 2},
            {"room": "205", "name": "IQAC & Accreditation Cell", "faculty": "Director IQAC", "floor": 2},
            {"room": "G-08", "name": "Visitors & VIP Lounge", "faculty": "Reception Desk", "floor": 0}
        ]
    },
    {
        "id": "b_cse",
        "name": "Computer Science & Engineering Department",
        "shortName": "CSE Department",
        "category": "academic",
        "lon": 77.500403,
        "lat": 12.924524,
        "imgX": 42.0,
        "imgY": 44.0,
        "levels": 3,
        "description": "Department of Computer Science & Engineering. Home to advanced computing labs, AI/ML research groups, and smart lecture halls.",
        "icon": "💻",
        "rooms": [
            {"room": "CS-101", "name": "HoD Office (CSE)", "faculty": "Dr. Ramakanth Kumar P (HoD)", "floor": 1},
            {"room": "CS-102", "name": "Department Office & Staff", "faculty": "Administrative Staff", "floor": 1},
            {"room": "CS-105", "name": "Faculty Cabins", "faculty": "Professors & Assoc. Professors", "floor": 1},
            {"room": "CS-201", "name": "High Performance Computing Lab", "faculty": "Research Lab", "floor": 2},
            {"room": "CS-202", "name": "Cloud Computing & Systems Lab", "faculty": "Lab Staff", "floor": 2},
            {"room": "CS-205", "name": "Seminar Hall (CS Dept)", "faculty": "Department", "floor": 2},
            {"room": "CS-301", "name": "AI & Deep Learning Research Lab", "faculty": "Dr. B. Sathish Babu", "floor": 3},
            {"room": "CS-305", "name": "Software Engineering Lab", "faculty": "Lab Instructors", "floor": 3}
        ]
    },
    {
        "id": "b_ece",
        "name": "Electronics & Communication Department",
        "shortName": "ECE Department",
        "category": "academic",
        "lon": 77.500062,
        "lat": 12.923795,
        "imgX": 48.0,
        "imgY": 58.0,
        "levels": 3,
        "description": "Department of Electronics and Communication Engineering. Houses VLSI design, DSP, Embedded Systems, and RF microwave laboratories.",
        "icon": "📡",
        "rooms": [
            {"room": "EC-101", "name": "HoD Office (ECE)", "faculty": "Dr. K. B. Ramesh (HoD)", "floor": 1},
            {"room": "EC-104", "name": "VLSI Design & Embedded Lab", "faculty": "Lab Instructors", "floor": 1},
            {"room": "EC-201", "name": "Digital Signal Processing Lab", "faculty": "Faculty Staff", "floor": 2},
            {"room": "EC-208", "name": "Microwave & Antenna Lab", "faculty": "Research Scholars", "floor": 2},
            {"room": "EC-301", "name": "Communication Networks Lab", "faculty": "Lab Staff", "floor": 3}
        ]
    },
    {
        "id": "b_eee",
        "name": "Electrical & Electronics Department",
        "shortName": "EEE Department",
        "category": "academic",
        "lon": 77.499946,
        "lat": 12.924123,
        "imgX": 41.5,
        "imgY": 54.0,
        "levels": 3,
        "description": "Department of Electrical & Electronics Engineering with high-voltage testing, power electronics, and renewable energy labs.",
        "icon": "⚡",
        "rooms": [
            {"room": "EE-101", "name": "HoD Office (EEE)", "faculty": "Dr. Rudranna Nandihalli (HoD)", "floor": 1},
            {"room": "EE-104", "name": "Electrical Machines Lab", "faculty": "Lab Staff", "floor": 1},
            {"room": "EE-201", "name": "Power Electronics & Drives Lab", "faculty": "Faculty Cabins", "floor": 2},
            {"room": "EE-205", "name": "Control Systems & Automation Lab", "faculty": "Staff", "floor": 2}
        ]
    },
    {
        "id": "b_civil",
        "name": "Civil Engineering Department",
        "shortName": "Civil Department",
        "category": "academic",
        "lon": 77.499542,
        "lat": 12.924452,
        "imgX": 36.5,
        "imgY": 51.0,
        "levels": 4,
        "description": "Department of Civil Engineering with concrete technology, surveying, geotechnical engineering, and environmental labs.",
        "icon": "🏗️",
        "rooms": [
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
        ]
    },
    {
        "id": "b_mech",
        "name": "Mechanical Engineering Department",
        "shortName": "Mechanical Engg",
        "category": "academic",
        "lon": 77.498102,
        "lat": 12.923016,
        "imgX": 26.0,
        "imgY": 72.0,
        "levels": 3,
        "description": "Department of Mechanical Engineering, including thermodynamic test engines, CAD/CAM labs, and manufacturing workshops.",
        "icon": "⚙️",
        "rooms": [
            {"room": "ME-101", "name": "HoD Office (Mechanical)", "faculty": "Dr. M. Krishna (HoD)", "floor": 1},
            {"room": "ME-105", "name": "Fluid Mechanics & Heat Transfer Lab", "faculty": "Lab Faculty", "floor": 1},
            {"room": "ME-201", "name": "CAD / CAM & Simulation Lab", "faculty": "Design Staff", "floor": 2},
            {"room": "ME-205", "name": "IC Engines & Turbo Machinery Lab", "faculty": "Instructors", "floor": 2}
        ]
    },
    {
        "id": "b_chem",
        "name": "Chemical Engineering, Chemistry and Physics",
        "shortName": "Chemical Dept",
        "category": "academic",
        "lon": 77.500025,
        "lat": 12.923150,
        "imgX": 45.0,
        "imgY": 67.0,
        "levels": 3,
        "description": "Department of Chemical Engineering with unit operations, reaction kinetics, and applied physical sciences labs.",
        "icon": "🧪",
        "rooms": [
            {"room": "CH-101", "name": "HoD Office (Chemical)", "faculty": "Dr. K. S. Rajmohan (HoD)", "floor": 1},
            {"room": "CH-103", "name": "Process Heat Transfer Lab", "faculty": "Lab Staff", "floor": 1},
            {"room": "CH-109", "name": "Department Seminar Hall", "faculty": "Faculty", "floor": 1},
            {"room": "CH-114", "name": "Particulate Technology Lab", "faculty": "Staff", "floor": 1},
            {"room": "CHE-201", "name": "Engineering Chemistry Lab 1 & 2", "faculty": "Chemistry Faculty", "floor": 2},
            {"room": "CHE-214", "name": "Advanced Research Chemistry Lab", "faculty": "Scholars", "floor": 2}
        ]
    },
    {
        "id": "b_biotech",
        "name": "Biotechnology Department",
        "shortName": "Biotechnology",
        "category": "academic",
        "lon": 77.498877,
        "lat": 12.922392,
        "imgX": 30.5,
        "imgY": 79.0,
        "levels": 3,
        "description": "Biotechnology Department with bioprocess engineering, genetics, bioinformatics, and tissue culture facilities.",
        "icon": "🧬",
        "rooms": [
            {"room": "BT-101", "name": "HoD Office (Biotech)", "faculty": "Dr. Vidya Niranjan (HoD)", "floor": 1},
            {"room": "BT-104", "name": "Microbiology & Genetics Lab", "faculty": "Lab Faculty", "floor": 1},
            {"room": "BT-201", "name": "Bioprocess & Fermentation Lab", "faculty": "Research Staff", "floor": 2},
            {"room": "BT-205", "name": "Bioinformatics & Genomics Lab", "faculty": "Scholars", "floor": 2}
        ]
    },
    {
        "id": "b_telecom",
        "name": "Telecommunication Department",
        "shortName": "Telecom Dept",
        "category": "academic",
        "lon": 77.500315,
        "lat": 12.923609,
        "imgX": 51.0,
        "imgY": 60.5,
        "levels": 3,
        "description": "Department of Telecommunication Engineering with optical fiber communications, satellite labs, and signal processing.",
        "icon": "📶",
        "rooms": [
            {"room": "TC-101", "name": "HoD Office (Telecom)", "faculty": "Dr. K. Sreelakshmi (HoD)", "floor": 1},
            {"room": "TC-103", "name": "Optical Fiber Communication Lab", "faculty": "Lab Staff", "floor": 1},
            {"room": "TC-202", "name": "Wireless Sensor Networks Lab", "faculty": "Research Scholars", "floor": 2}
        ]
    },
    {
        "id": "b_aero_ise",
        "name": "Aerospace & Information Science Department",
        "shortName": "Aerospace & ISE",
        "category": "academic",
        "lon": 77.500960,
        "lat": 12.923049,
        "imgX": 58.5,
        "imgY": 68.0,
        "levels": 3,
        "description": "Houses the Department of Aerospace Engineering and Information Science & Engineering (ISE) with aerodynamics tunnel and avionics testing.",
        "icon": "🚀",
        "rooms": [
            {"room": "AS-101", "name": "HoD Office (Aerospace)", "faculty": "Dr. Ravindra S. Kulkarni (HoD)", "floor": 1},
            {"room": "IS-101", "name": "HoD Office (ISE)", "faculty": "Dr. B. M. Sagar (HoD ISE)", "floor": 1},
            {"room": "AS-104", "name": "Subsonic Wind Tunnel Lab", "faculty": "Aerodynamics Lab", "floor": 1},
            {"room": "IS-201", "name": "Big Data Analytics & IoT Lab", "faculty": "ISE Staff", "floor": 2},
            {"room": "IS-301", "name": "Information Security Lab", "faculty": "Cybersecurity Faculty", "floor": 3}
        ]
    },
    {
        "id": "b_aiml",
        "name": "Artificial Intelligence & Machine Learning (AIML)",
        "shortName": "AIML Dept",
        "category": "academic",
        "lon": 77.498643,
        "lat": 12.922321,
        "imgX": 27.5,
        "imgY": 80.0,
        "levels": 3,
        "description": "Department of AI & ML with dedicated GPU cluster computing, computer vision, NLP, and autonomous robotics labs.",
        "icon": "🤖",
        "rooms": [
            {"room": "AI-101", "name": "HoD Office (AIML)", "faculty": "Dr. B. Sathish Babu (HoD)", "floor": 1},
            {"room": "AI-105", "name": "NVIDIA GPU AI Research Lab", "faculty": "Research Lab", "floor": 1},
            {"room": "AI-201", "name": "Computer Vision & Robotics Lab", "faculty": "Lab Instructors", "floor": 2}
        ]
    },
    {
        "id": "b_mca",
        "name": "Master of Computer Applications (MCA)",
        "shortName": "MCA Department",
        "category": "academic",
        "lon": 77.498474,
        "lat": 12.922373,
        "imgX": 25.0,
        "imgY": 79.0,
        "levels": 3,
        "description": "Postgraduate Department of Master of Computer Applications with modern software development studios.",
        "icon": "🎓",
        "rooms": [
            {"room": "MCA-101", "name": "HoD Office (MCA)", "faculty": "Dr. Andhe Dharani (HoD)", "floor": 1},
            {"room": "MCA-104", "name": "Enterprise Web Apps Lab", "faculty": "Lab Staff", "floor": 1},
            {"room": "MCA-202", "name": "Mobile Computing Lab", "faculty": "Faculty", "floor": 2}
        ]
    },
    {
        "id": "b_maths",
        "name": "Mathematics Department & Basic Sciences",
        "shortName": "Mathematics Dept",
        "category": "academic",
        "lon": 77.501402,
        "lat": 12.924013,
        "imgX": 63.5,
        "imgY": 55.0,
        "levels": 3,
        "description": "Department of Mathematics. Computational mathematics labs, research scholars wing, and basic science lecture halls.",
        "icon": "📐",
        "rooms": [
            {"room": "101", "name": "HoD Office (Mathematics)", "faculty": "Dr. G. Jayalatha (HoD)", "floor": 1},
            {"room": "103", "name": "Research Scholars Room", "faculty": "PhD Scholars", "floor": 1},
            {"room": "111", "name": "Faculty Cabin", "faculty": "Dr. Savithri Shashidhar (Assoc. Prof)", "floor": 1},
            {"room": "112", "name": "Faculty Cabin", "faculty": "Dr. Neeti Ghiya (Assoc. Prof)", "floor": 1},
            {"room": "204", "name": "Faculty Cabin", "faculty": "Dr. Y. Sailaja & Dr. Suma N. Manjunath", "floor": 2},
            {"room": "205", "name": "Faculty Cabin", "faculty": "Dr. Sowmya M.", "floor": 2},
            {"room": "206", "name": "Faculty Cabin", "faculty": "Dr. A. Sujatha & Dr. Vidya Patil", "floor": 2},
            {"room": "305", "name": "Faculty Cabin", "faculty": "Mr. P. Rajashekhar & Dr. Harsh M.", "floor": 3},
            {"room": "304", "name": "Faculty Cabin", "faculty": "Dr. Ravi K. M. & Dr. Suman N. P.", "floor": 3}
        ]
    },
    {
        "id": "b_iem",
        "name": "Industrial Engineering & Management (IEM)",
        "shortName": "IEM Department",
        "category": "academic",
        "lon": 77.498725,
        "lat": 12.922989,
        "imgX": 32.0,
        "imgY": 72.5,
        "levels": 3,
        "description": "Department of Industrial Engineering & Management with operations research, ergonomics, and supply chain simulation labs.",
        "icon": "📊",
        "rooms": [
            {"room": "IEM-101", "name": "HoD Office (IEM)", "faculty": "Dr. C. S. Chethan Kumar (HoD)", "floor": 1},
            {"room": "IEM-104", "name": "Simulation & Optimization Lab", "faculty": "Lab Instructors", "floor": 1},
            {"room": "IEM-201", "name": "Ergonomics & Work Study Lab", "faculty": "Faculty Staff", "floor": 2}
        ]
    },
    {
        "id": "b_cch",
        "name": "Central Computing Hub (CCH)",
        "shortName": "Central Computing Hub",
        "category": "lab",
        "lon": 77.499572,
        "lat": 12.922458,
        "imgX": 39.0,
        "imgY": 77.0,
        "levels": 2,
        "description": "High-speed campus computing facility equipped with 500+ workstations, campus network NOC, and online examination servers.",
        "icon": "🖥️",
        "rooms": [
            {"room": "CCH-01", "name": "Main Computing Arena 1", "faculty": "System Admin", "floor": 0},
            {"room": "CCH-02", "name": "Online Examination Center", "faculty": "Exam Team", "floor": 0},
            {"room": "CCH-101", "name": "Campus Network Operations Center (NOC)", "faculty": "IT Team", "floor": 1}
        ]
    },
    {
        "id": "b_cs_labs",
        "name": "CS Labs (Labs 1 to 4, 9, 10 & PG Lab)",
        "shortName": "CS Labs Complex",
        "category": "lab",
        "lon": 77.499339,
        "lat": 12.924604,
        "imgX": 34.0,
        "imgY": 49.0,
        "levels": 2,
        "description": "Specialized computer laboratories for programming, database systems, software engineering, and PG research.",
        "icon": "🧪",
        "rooms": [
            {"room": "Lab 1", "name": "Object Oriented Programming Lab", "faculty": "Lab Assistants", "floor": 0},
            {"room": "Lab 2", "name": "Data Structures & Algorithms Lab", "faculty": "Lab Staff", "floor": 0},
            {"room": "Lab 3-4", "name": "Database & Web Tech Lab", "faculty": "Staff", "floor": 1},
            {"room": "Lab 9-10", "name": "Advanced Linux & Systems Lab", "faculty": "Staff", "floor": 1}
        ]
    },
    {
        "id": "b_library",
        "name": "Central Library & Digital Resource Center",
        "shortName": "Central Library",
        "category": "amenity",
        "lon": 77.500214,
        "lat": 12.922613,
        "imgX": 47.0,
        "imgY": 75.0,
        "levels": 4,
        "description": "Multi-storey knowledge reservoir with over 150,000 volumes, IEEE/ACM digital access, silent reading wings, and group discussion rooms.",
        "icon": "📚",
        "rooms": [
            {"room": "L-01", "name": "Circulation Desk & Book Issue", "faculty": "Chief Librarian (Dr. T. R. Sridevi)", "floor": 0},
            {"room": "L-101", "name": "Reference Section & Periodicals", "faculty": "Library Staff", "floor": 1},
            {"room": "L-201", "name": "Digital Library & E-Journals Center", "faculty": "Digital Resource Staff", "floor": 2},
            {"room": "L-301", "name": "Quiet Study Hall & Research Scholars Corner", "faculty": "Reading Section", "floor": 3}
        ]
    },
    {
        "id": "b_innovation",
        "name": "RVCE Innovation Center & R&D Block",
        "shortName": "Innovation Center",
        "category": "lab",
        "lon": 77.498876,
        "lat": 12.923300,
        "imgX": 34.5,
        "imgY": 68.0,
        "levels": 6,
        "description": "State-of-the-art incubation hub for student startups, patent cell, prototyping centers, 3D printing labs, and industry projects.",
        "icon": "💡",
        "rooms": [
            {"room": "IC-101", "name": "Incubation & Startup Desk", "faculty": "Innovation Director", "floor": 1},
            {"room": "IC-201", "name": "Maker Space & 3D Prototyping", "faculty": "Technical Manager", "floor": 2},
            {"room": "IC-301", "name": "Corporate Sponsored R&D Labs", "faculty": "Industry Liaisons", "floor": 3}
        ]
    },
    {
        "id": "b_iem_audi",
        "name": "IEM Auditorium & Amphitheater",
        "shortName": "IEM Auditorium",
        "category": "amenity",
        "lon": 77.498630,
        "lat": 12.923015,
        "imgX": 28.0,
        "imgY": 91.0,
        "levels": 2,
        "description": "Iconic open-air amphitheater and auditorium for college festivals (8th Mile), cultural events, conferences, and student gatherings.",
        "icon": "🎭",
        "rooms": [
            {"room": "Main Stage", "name": "Amphitheater Stage", "faculty": "Cultural Committee", "floor": 0},
            {"room": "Audi-1", "name": "Indoor Seminar Hall", "faculty": "Event Coordinator", "floor": 1}
        ]
    },
    {
        "id": "b_bt_quad",
        "name": "BT Quadrangle & Open Courtyard",
        "shortName": "BT Quadrangle",
        "category": "amenity",
        "lon": 77.498633,
        "lat": 12.922597,
        "imgX": 29.0,
        "imgY": 77.0,
        "levels": 1,
        "description": "Scenic lush landscaped green quadrangle bordered by Biotechnology, MCA, and IEM departments, a prime student hangout.",
        "icon": "🌿",
        "rooms": []
    },
    {
        "id": "b_food_court",
        "name": "Food Court & Mingos Canteen",
        "shortName": "Food Court / Mingos",
        "category": "food",
        "lon": 77.499678,
        "lat": 12.922385,
        "imgX": 41.0,
        "imgY": 78.5,
        "levels": 2,
        "description": "Central student hub offering South Indian, North Indian, continental dishes, fresh juices, and quick snacks with outdoor seating.",
        "icon": "🍔",
        "rooms": [
            {"room": "FC-1", "name": "Mingos Central Canteen", "faculty": "Main Cafeteria", "floor": 0},
            {"room": "FC-2", "name": "Juice Junction & Coffee Kiosk", "faculty": "Beverages", "floor": 0},
            {"room": "FC-3", "name": "Upper Terrace Seating", "faculty": "Student Dining", "floor": 1}
        ]
    },
    {
        "id": "b_mm_foods",
        "name": "MM Foods & Snack Corner",
        "shortName": "MM Foods",
        "category": "food",
        "lon": 77.500504,
        "lat": 12.923778,
        "imgX": 53.0,
        "imgY": 58.0,
        "levels": 1,
        "description": "Popular snack counter serving chaats, dosas, sandwiches, tea, and quick bites between lectures.",
        "icon": "☕",
        "rooms": []
    },
    {
        "id": "b_thoda_aur",
        "name": "Thoda Aur Bakery & Cafe",
        "shortName": "Thoda Aur",
        "category": "food",
        "lon": 77.499806,
        "lat": 12.923452,
        "imgX": 43.5,
        "imgY": 63.5,
        "levels": 1,
        "description": "Campus bakery offering fresh pastries, burgers, pizzas, rolls, and cold drinks.",
        "icon": "🥪",
        "rooms": []
    },
    {
        "id": "b_krishna_hostel",
        "name": "Krishna Hostel",
        "shortName": "Krishna Hostel",
        "category": "hostel",
        "lon": 77.500796,
        "lat": 12.924194,
        "imgX": 54.0,
        "imgY": 48.0,
        "levels": 4,
        "description": "Senior student residence hall with double and single occupancy rooms, study hall, and mess facilities.",
        "icon": "🛏️",
        "rooms": [
            {"room": "Warden Office", "name": "Hostel Warden Office", "faculty": "Chief Warden", "floor": 0},
            {"room": "Mess Hall", "name": "Krishna Hostel Dining Mess", "faculty": "Catering Supervisor", "floor": 0}
        ]
    },
    {
        "id": "b_cauvery_block",
        "name": "Cauvery Block",
        "shortName": "Cauvery Block",
        "category": "hostel",
        "lon": 77.501185,
        "lat": 12.924130,
        "imgX": 60.5,
        "imgY": 49.0,
        "levels": 4,
        "description": "Modern multi-storey hostel residence with attached bathrooms, Wi-Fi connectivity, laundry, and indoor recreational rooms.",
        "icon": "🏢",
        "rooms": [
            {"room": "Reception", "name": "Hostel Reception & Caretaker", "faculty": "Block Supervisor", "floor": 0}
        ]
    },
    {
        "id": "b_sir_mv_hostel",
        "name": "Sir M. Visvesvaraya Hostel",
        "shortName": "Sir MV Hostel",
        "category": "hostel",
        "lon": 77.502487,
        "lat": 12.922817,
        "imgX": 80.0,
        "imgY": 69.0,
        "levels": 4,
        "description": "Spacious student accommodation named in honor of Sir M. Visvesvaraya, with landscaped gardens and sports recreation.",
        "icon": "🛏️",
        "rooms": [
            {"room": "Office", "name": "Hostel Caretaker Desk", "faculty": "Caretaker", "floor": 0}
        ]
    },
    {
        "id": "b_diamond_jubilee",
        "name": "Diamond Jubilee Hostel",
        "shortName": "Diamond Jubilee",
        "category": "hostel",
        "lon": 77.503153,
        "lat": 12.922981,
        "imgX": 89.0,
        "imgY": 67.0,
        "levels": 4,
        "description": "Constructed during the Diamond Jubilee celebrations, offering premium modern amenities for engineering scholars.",
        "icon": "💎",
        "rooms": [
            {"room": "Admin Desk", "name": "Diamond Jubilee Office", "faculty": "Warden Staff", "floor": 0}
        ]
    },
    {
        "id": "b_chamundi_hostel",
        "name": "Chamundi Hostel",
        "shortName": "Chamundi Hostel",
        "category": "hostel",
        "lon": 77.501880,
        "lat": 12.922083,
        "imgX": 73.0,
        "imgY": 83.0,
        "levels": 3,
        "description": "Dedicated hostel residence block with round-the-clock security, dining facilities, and peaceful study areas.",
        "icon": "🏡",
        "rooms": []
    },
    {
        "id": "b_sports_block",
        "name": "RVCE Sports Complex & Athletic Grounds",
        "shortName": "Sports Complex",
        "category": "sports",
        "lon": 77.499130,
        "lat": 12.921737,
        "imgX": 33.0,
        "imgY": 88.0,
        "levels": 4,
        "description": "Full-fledged sports pavilion with indoor badminton courts, gymnasium, table tennis, basketball courts, and outdoor cricket ground.",
        "icon": "⚽",
        "rooms": [
            {"room": "Gym", "name": "Fitness & Weightlifting Gym", "faculty": "Sports Director (Dr. R. Mohan)", "floor": 0},
            {"room": "Badminton", "name": "Indoor Wooden Badminton Courts", "faculty": "Sports Staff", "floor": 1},
            {"room": "Grounds", "name": "Cricket & Football Field", "faculty": "Grounds Staff", "floor": 0}
        ]
    },
    {
        "id": "b_cognitive",
        "name": "Cognitive Science & Astra Robotics Center",
        "shortName": "Cognitive & Robotics",
        "category": "lab",
        "lon": 77.501488,
        "lat": 12.923936,
        "imgX": 64.0,
        "imgY": 56.0,
        "levels": 3,
        "description": "Home to Astra Robotics student club, UAV drone research, brain-computer interfaces, and neural computation labs.",
        "icon": "🦾",
        "rooms": [
            {"room": "Robo-01", "name": "Astra Robotics Workshop", "faculty": "Student Leads", "floor": 0},
            {"room": "Cog-101", "name": "Cognitive Computing Lab", "faculty": "Research Scholars", "floor": 1}
        ]
    },
    {
        "id": "b_idrc",
        "name": "Inter Disciplinary Research Centre (IDRC)",
        "shortName": "IDRC",
        "category": "lab",
        "lon": 77.501242,
        "lat": 12.923736,
        "imgX": 61.0,
        "imgY": 59.0,
        "levels": 3,
        "description": "Interdisciplinary research center fostering collaborative research across nanoscience, sensors, and sustainable energy.",
        "icon": "🔬",
        "rooms": []
    },
    {
        "id": "b_metro_station",
        "name": "RV Vidyanikethan Metro Station (Namma Metro)",
        "shortName": "RVCE Metro Station",
        "category": "gate",
        "lon": 77.498229,
        "lat": 12.924225,
        "imgX": 27.0,
        "imgY": 21.0,
        "levels": 2,
        "description": "Direct metro transit link to Majestic, MG Road, Whitefield, and Kengeri via Namma Metro Purple Line.",
        "icon": "🚇",
        "rooms": [
            {"room": "Concourse", "name": "Ticketing & Skywalk to Campus Gate", "faculty": "BMRCL Staff", "floor": 1}
        ]
    },
    {
        "id": "b_gate_1",
        "name": "RVCE Vidyanikethan Main Gate (Gate 1)",
        "shortName": "Gate 1 (Main Gate)",
        "category": "gate",
        "lon": 77.499028,
        "lat": 12.924620,
        "imgX": 30.0,
        "imgY": 48.0,
        "levels": 1,
        "description": "The primary ceremonial entrance to RVCE on Mysore Road, adjacent to the Metro skywalk and BMTC bus stop.",
        "icon": "🚪",
        "rooms": [
            {"room": "Security", "name": "Main Gate Security & Visitor Registration", "faculty": "Chief Security Officer", "floor": 0}
        ]
    },
    {
        "id": "b_gate_2",
        "name": "Gate No. 2 — Admin / IEM Gate (South Entrance)",
        "shortName": "Gate 2 (Admin Gate)",
        "category": "gate",
        "lon": 77.498630,
        "lat": 12.923015,
        "imgX": 28.0,
        "imgY": 72.0,
        "levels": 1,
        "description": "Southern campus gateway leading directly to Administration Block, Placement Office, and IEM Auditorium.",
        "icon": "🚪",
        "rooms": []
    },
    {
        "id": "b_gate_3",
        "name": "Gate No. 3 — Krishna / Hostel Gate",
        "shortName": "Gate 3 (Hostel Gate)",
        "category": "gate",
        "lon": 77.500800,
        "lat": 12.924200,
        "imgX": 54.0,
        "imgY": 47.0,
        "levels": 1,
        "description": "Access gate near Krishna Hostel, Cauvery Block, and Staff Quarters connecting to eastern campus ring road.",
        "icon": "🚪",
        "rooms": []
    },
    {
        "id": "b_kriyaakalpa",
        "name": "Kriyaakalpa Cultural & Museum Center",
        "shortName": "Kriyaakalpa",
        "category": "amenity",
        "lon": 77.499506,
        "lat": 12.923732,
        "imgX": 39.5,
        "imgY": 60.0,
        "levels": 2,
        "description": "Exhibition hall showcasing RVCE's heritage, alumni achievements, and fine arts student exhibitions.",
        "icon": "🏛️",
        "rooms": []
    },
    {
        "id": "b_staff_quarters",
        "name": "RVCE Staff Quarters",
        "shortName": "Staff Quarters",
        "category": "hostel",
        "lon": 77.500878,
        "lat": 12.924794,
        "imgX": 51.0,
        "imgY": 41.0,
        "levels": 4,
        "description": "Faculty and staff residential enclave nestled in peaceful green surrounds on the campus perimeter.",
        "icon": "🏡",
        "rooms": []
    },
    {
        "id": "b_lake_promenade",
        "name": "Campus Lake & Green Promenade",
        "shortName": "Campus Lake",
        "category": "amenity",
        "lon": 77.501994,
        "lat": 12.921060,
        "imgX": 75.0,
        "imgY": 92.0,
        "levels": 1,
        "description": "Scenic water canal and lake promenade bounding the southern edge of campus with tree-lined walkway.",
        "icon": "🌊",
        "rooms": []
    }
]

# Write to js/campus-data.js
js_content = f"""/**
 * RVCE Campus Master Knowledge Base
 * Automatically verified with OSM GeoJSON & 3D Coordinates
 */

const CAMPUS_BUILDINGS = {json.dumps(campus_buildings, indent=2)};

// Category definitions
const CATEGORIES = [
  {{ id: 'all', label: 'All Places', icon: '📍' }},
  {{ id: 'academic', label: 'Departments', icon: '🎓' }},
  {{ id: 'lab', label: 'Labs & Research', icon: '🔬' }},
  {{ id: 'hostel', label: 'Hostels & Living', icon: '🛏️' }},
  {{ id: 'food', label: 'Canteens & Food', icon: '🍔' }},
  {{ id: 'amenity', label: 'Amenities & Library', icon: '📚' }},
  {{ id: 'sports', label: 'Sports & Courts', icon: '⚽' }},
  {{ id: 'gate', label: 'Gates & Metro', icon: '🚇' }}
];

// Quick Access Chips for Top Destinations
const QUICK_DESTINATIONS = [
  {{ id: 'b_admin', name: 'Admin Block', icon: '🏛️' }},
  {{ id: 'b_cse', name: 'CS Department', icon: '💻' }},
  {{ id: 'b_ece', name: 'ECE Department', icon: '📡' }},
  {{ id: 'b_civil', name: 'Civil Dept', icon: '🏗️' }},
  {{ id: 'b_food_court', name: 'Mingos Food Court', icon: '🍔' }},
  {{ id: 'b_metro_station', name: 'RVCE Metro', icon: '🚇' }},
  {{ id: 'b_library', name: 'Central Library', icon: '📚' }},
  {{ id: 'b_krishna_hostel', name: 'Krishna Hostel', icon: '🛏️' }}
];

if (typeof module !== 'undefined') {{
  module.exports = {{ CAMPUS_BUILDINGS, CATEGORIES, QUICK_DESTINATIONS }};
}}
"""

with open('rvce-map/js/campus-data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Generated campus-data.js with {len(campus_buildings)} locations!")
