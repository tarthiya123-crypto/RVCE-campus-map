import json
import numpy as np

# Landmark anchors (name, lon, lat, approx_img_x, approx_img_y in 867x746 image)
anchors = [
    # Top-Left: Metro Station
    {"name": "Metro Station", "lon": 77.498229, "lat": 12.924225, "px": 210, "py": 160},
    # Main Gate / Bridge on Mysore Road
    {"name": "Main Gate / Bridge", "lon": 77.498890, "lat": 12.921227, "px": 165, "py": 660},
    # Amphitheater / IEM
    {"name": "IEM Amphitheater", "lon": 77.498630, "lat": 12.923015, "px": 240, "py": 670},
    # Admin Block
    {"name": "Admin Block", "lon": 77.498753, "lat": 12.923817, "px": 210, "py": 480},
    # Computer Science
    {"name": "Computer Science", "lon": 77.500403, "lat": 12.924524, "px": 355, "py": 320},
    # Civil Department
    {"name": "Civil Department", "lon": 77.499542, "lat": 12.924452, "px": 315, "py": 380},
    # Food Court
    {"name": "Food Court", "lon": 77.499678, "lat": 12.922385, "px": 480, "py": 580},
    # Library
    {"name": "Library", "lon": 77.500214, "lat": 12.922613, "px": 530, "py": 500},
    # Krishna Hostel / Cauvery
    {"name": "Krishna Hostel", "lon": 77.500796, "lat": 12.924194, "px": 615, "py": 340},
    # Sports Ground
    {"name": "Sports Block", "lon": 77.499130, "lat": 12.921737, "px": 420, "py": 140},
]

# We can fit an affine transformation:
# [px, py, 1] = [lon, lat, 1] @ M
A = []
Bx = []
By = []
for a in anchors:
    A.append([a["lon"], a["lat"], 1.0])
    Bx.append(a["px"])
    By.append(a["py"])

A = np.array(A)
Bx = np.array(Bx)
By = np.array(By)

# Solve least squares
Mx, residuals_x, _, _ = np.linalg.lstsq(A, Bx, rcond=None)
My, residuals_y, _, _ = np.linalg.lstsq(A, By, rcond=None)

print(f"Matrix X: {Mx}")
print(f"Matrix Y: {My}")

# Test predictions
print("\nAccuracy check:")
for a in anchors:
    pred_x = a["lon"] * Mx[0] + a["lat"] * Mx[1] + Mx[2]
    pred_y = a["lon"] * My[0] + a["lat"] * My[1] + My[2]
    dx = pred_x - a["px"]
    dy = pred_y - a["py"]
    err = (dx**2 + dy**2)**0.5
    print(f"{a['name']}: actual=({a['px']}, {a['py']}), pred=({pred_x:.1f}, {pred_y:.1f}), err={err:.1f}px")
