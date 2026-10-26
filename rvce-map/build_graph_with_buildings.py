import json
import math
from pathlib import Path

# ---------- config ----------
PATHS_FILE = "data/paths.json"
BUILDINGS_FILE = "data/buildings.json"

NODES_FILE = "data/nodes.json"
EDGES_FILE = "data/edges.json"

# ---------- helpers ----------

def haversine(lat1, lon1, lat2, lon2):
    """
    Distance between two points on Earth in meters.
    Numerically safe (clamps rounding errors).
    """
    R = 6371000  # radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    sin_dphi = math.sin(dphi / 2)
    sin_dlambda = math.sin(dlambda / 2)

    a = (sin_dphi**2) + math.cos(phi1) * math.cos(phi2) * (sin_dlambda**2)

    # Clamp a into [0,1] to avoid tiny negative/ >1 due to floating point
    a = max(0.0, min(1.0, a))

    c = 2 * math.asin(math.sqrt(a))
    return R * c
def coord_key(coord, ndp=7):
    """
    Turn [lon, lat] into a rounded key string so that very close points
    are considered the same node.
    """
    lon, lat = coord
    return f"{round(lat, ndp)},{round(lon, ndp)}"

def polygon_centroid(coords):
    """
    Compute centroid of a polygon ring (list of [lon, lat]).
    Uses simple average of vertices (good enough for small buildings).
    Assumes coords is the OUTER ring of the polygon.
    """
    if not coords:
        return None

    # sometimes first == last; ignore the last if so
    if len(coords) > 1 and coords[0] == coords[-1]:
        coords = coords[:-1]

    sum_lon = 0.0
    sum_lat = 0.0
    n = len(coords)
    for lon, lat in coords:
        sum_lon += lon
        sum_lat += lat
    return [sum_lon / n, sum_lat / n]

# ---------- 1. load paths and build base nodes/edges ----------

with open(PATHS_FILE, "r", encoding="utf-8") as f:
    paths_geojson = json.load(f)

path_features = paths_geojson.get("features", [])

coord_to_id = {}
nodes = []
edges = []
next_id = 0

def add_node(coord, node_type="path", name=None, extra=None):
    """
    Create a node (if not exists for this coord) and return node id.
    node_type: "path" or "building" etc.
    """
    global next_id
    lon, lat = coord

    # Path nodes are deduplicated by coord; building nodes are unique even if same coord.
    if node_type == "path":
        key = coord_key(coord)
        if key in coord_to_id:
            return coord_to_id[key]

        node_id = next_id
        next_id += 1
        coord_to_id[key] = node_id

    else:
        node_id = next_id
        next_id += 1

    node = {
        "id": node_id,
        "lat": lat,
        "lng": lon,
        "type": node_type
    }

    if name is not None:
        node["name"] = name

    if extra:
        node.update(extra)

    nodes.append(node)
    return node_id

def add_edge(a, b, weight):
    """
    Add undirected edge (actually two directed edges).
    """
    edges.append({
        "from": a,
        "to": b,
        "weight": weight
    })
    edges.append({
        "from": b,
        "to": a,
        "weight": weight
    })

# build path nodes & edges
for feat in path_features:
    geom = feat.get("geometry")
    if not geom:
        continue  # skip features with null / missing geometry

    gtype = geom.get("type")
    coords = geom.get("coordinates") or []
    if gtype == "LineString":
        lines = [coords]
    elif gtype == "MultiLineString":
        lines = coords
    else:
        continue  # ignore non-line geometries

    for line in lines:
        if len(line) < 2:
            continue

        prev_id = None
        prev_lat = prev_lon = None

        for coord in line:
            lon, lat = coord
            node_id = add_node(coord, node_type="path")

            if prev_id is not None:
                dist = haversine(prev_lat, prev_lon, lat, lon)
                add_edge(prev_id, node_id, dist)

            prev_id = node_id
            prev_lat, prev_lon = lat, lon

print(f"After paths: {len(nodes)} nodes, {len(edges)} edges")

# ---------- 2. load buildings and add building nodes ----------

with open(BUILDINGS_FILE, "r", encoding="utf-8") as f:
    buildings_geojson = json.load(f)

building_features = buildings_geojson.get("features", [])

# Pre-fetch list of path nodes for nearest search
path_nodes = [n for n in nodes if n.get("type") == "path"]

def find_nearest_path_node(lat, lon):
    """
    Brute-force nearest search over path_nodes.
    This is fine for a few thousand nodes.
    """
    best_id = None
    best_dist = None
    for n in path_nodes:
        d = haversine(lat, lon, n["lat"], n["lng"])
        if best_dist is None or d < best_dist:
            best_dist = d
            best_id = n["id"]
    return best_id, best_dist

for feat in building_features:
    geom = feat.get("geometry", {})
    props = feat.get("properties", {}) or {}

    gtype = geom.get("type")
    coords = geom.get("coordinates", [])

    centroid = None

    if gtype == "Polygon":
        # coords = [outer_ring, hole1, ...]; we take outer ring
        if coords:
            centroid = polygon_centroid(coords[0])

    elif gtype == "MultiPolygon":
        # take centroid of first polygon's outer ring
        if coords and coords[0]:
            centroid = polygon_centroid(coords[0][0])

    if centroid is None:
        continue  # skip weird geometry

    lon_c, lat_c = centroid

    # Try to get a name from common fields; adjust if your data uses different keys
    name = (
        props.get("name")
        or props.get("building")
        or props.get("BUILDING_N")  # example from some datasets
        or props.get("Building_n")
        or None
    )

    # You can also store the full properties if you want:
    extra = {"properties": props}

    # Create building node
    building_node_id = add_node([lon_c, lat_c], node_type="building", name=name, extra=extra)

    # Connect building to nearest path node
    nearest_id, dist = find_nearest_path_node(lat_c, lon_c)
    if nearest_id is not None:
        add_edge(building_node_id, nearest_id, dist)

print(f"After buildings: {len(nodes)} nodes, {len(edges)} edges")

# ---------- 3. save outputs ----------

with open(NODES_FILE, "w", encoding="utf-8") as f:
    json.dump(nodes, f, indent=2)

with open(EDGES_FILE, "w", encoding="utf-8") as f:
    json.dump(edges, f, indent=2)

print(f"Written {NODES_FILE} and {EDGES_FILE}")