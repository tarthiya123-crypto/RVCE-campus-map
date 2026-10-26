/**
 * RVCE Campus Routing Engine
 * Implements Dijkstra, A*, BFS, and Accessible routing
 * with Turn-by-Turn Instruction generation and Performance Benchmarking.
 */

class CampusRouter {
  constructor() {
    this.nodes = {}; // nodeId -> { id, x, y, lat, lon }
    this.edges = {}; // nodeId -> [ { to, w, type } ]
    this.buildingSnapMap = {}; // buildingId -> nearestNodeId
    this.isReady = false;
  }

  // Haversine distance in meters
  static haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Calculate compass bearing from p1 to p2 in degrees (0-360, 0=North)
  static bearing(lat1, lon1, lat2, lon2) {
    const toRad = d => (d * Math.PI) / 180;
    const toDeg = r => (r * 180) / Math.PI;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
    return brng;
  }

  nodeKey(lon, lat) {
    return `${lon.toFixed(6)},${lat.toFixed(6)}`;
  }

  // Initialize graph from paths GeoJSON
  initFromGeoJSON(pathsGeoJSON) {
    this.nodes = {};
    this.edges = {};

    const addEdge = (u, v, dist, highwayType = 'footway') => {
      if (!this.edges[u]) this.edges[u] = [];
      if (!this.edges[v]) this.edges[v] = [];
      this.edges[u].push({ to: v, w: dist, type: highwayType });
      this.edges[v].push({ to: u, w: dist, type: highwayType });
    };

    const processLine = (coords, highwayType) => {
      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];

        const id1 = this.nodeKey(p1[0], p1[1]);
        const id2 = this.nodeKey(p2[0], p2[1]);

        if (!this.nodes[id1]) {
          this.nodes[id1] = { id: id1, x: p1[0], y: p1[1], lon: p1[0], lat: p1[1] };
        }
        if (!this.nodes[id2]) {
          this.nodes[id2] = { id: id2, x: p2[0], y: p2[1], lon: p2[0], lat: p2[1] };
        }

        const dist = CampusRouter.haversine(p1[1], p1[0], p2[1], p2[0]);
        addEdge(id1, id2, dist, highwayType);
      }
    };

    pathsGeoJSON.features.forEach(f => {
      if (!f.geometry) return;
      const type = f.properties ? f.properties.highway : 'footway';
      if (f.geometry.type === 'LineString') {
        processLine(f.geometry.coordinates, type);
      } else if (f.geometry.type === 'MultiLineString') {
        f.geometry.coordinates.forEach(line => processLine(line, type));
      }
    });

    // Auto-stitch disconnected components (e.g. sidewalk gaps to roads)
    this.stitchComponents();

    this.isReady = true;
    console.log(`[Router] Graph ready: ${Object.keys(this.nodes).length} nodes, ${Object.keys(this.edges).length} vertices.`);
    return this;
  }

  // Auto-connect disconnected path clusters (sidewalks, building porches)
  stitchComponents() {
    const getComponents = () => {
      const visited = new Set();
      const comps = [];
      for (const node in this.nodes) {
        if (visited.has(node)) continue;
        const comp = [];
        const q = [node];
        visited.add(node);
        while (q.length > 0) {
          const u = q.shift();
          comp.push(u);
          for (const e of (this.edges[u] || [])) {
            if (!visited.has(e.to)) {
              visited.add(e.to);
              q.push(e.to);
            }
          }
        }
        comps.push(comp);
      }
      comps.sort((a, b) => b.length - a.length);
      return comps;
    };

    let comps = getComponents();
    let maxIterations = 20;

    while (comps.length > 1 && maxIterations > 0) {
      maxIterations--;
      const mainComp = comps[0];
      const otherComp = comps[1];

      let bestU = null;
      let bestV = null;
      let bestDist = Infinity;

      for (const u of otherComp) {
        const nu = this.nodes[u];
        for (const v of mainComp) {
          const nv = this.nodes[v];
          const d = CampusRouter.haversine(nu.lat, nu.lon, nv.lat, nv.lon);
          if (d < bestDist) {
            bestDist = d;
            bestU = u;
            bestV = v;
          }
        }
      }

      if (bestU && bestV) {
        if (!this.edges[bestU]) this.edges[bestU] = [];
        if (!this.edges[bestV]) this.edges[bestV] = [];
        this.edges[bestU].push({ to: bestV, w: bestDist, type: 'connector' });
        this.edges[bestV].push({ to: bestU, w: bestDist, type: 'connector' });
      }

      comps = getComponents();
    }
  }

  // Find nearest path node to given (lon, lat)
  findNearestNode(lon, lat) {
    let bestId = null;
    let minDist = Infinity;

    for (const id in this.nodes) {
      const n = this.nodes[id];
      const d = CampusRouter.haversine(lat, lon, n.lat, n.lon);
      if (d < minDist) {
        minDist = d;
        bestId = id;
      }
    }
    return { nodeId: bestId, distance: minDist };
  }

  // Snap building to nearest path node
  snapBuilding(bld) {
    if (this.buildingSnapMap[bld.id]) return this.buildingSnapMap[bld.id];
    const snap = this.findNearestNode(bld.lon, bld.lat);
    this.buildingSnapMap[bld.id] = snap.nodeId;
    return snap.nodeId;
  }

  // 1. DIJKSTRA'S ALGORITHM (Optimal shortest path)
  runDijkstra(startNodeId, targetNodeId) {
    const t0 = performance.now();
    const dist = {};
    const prev = {};
    const visited = new Set();

    // Min Priority Queue simulation with simple Map/Set
    const Q = new Set(Object.keys(this.nodes));
    for (const id in this.nodes) dist[id] = Infinity;
    dist[startNodeId] = 0;

    let nodesVisitedCount = 0;

    while (Q.size > 0) {
      let u = null;
      let minD = Infinity;

      // Extract min
      for (const node of Q) {
        if (dist[node] < minD) {
          minD = dist[node];
          u = node;
        }
      }

      if (u === null || minD === Infinity) break;
      Q.delete(u);
      visited.add(u);
      nodesVisitedCount++;

      if (u === targetNodeId) break;

      const neighbors = this.edges[u] || [];
      for (const e of neighbors) {
        if (visited.has(e.to)) continue;
        const alt = dist[u] + e.w;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          prev[e.to] = u;
        }
      }
    }

    const t1 = performance.now();
    const path = this._reconstructPath(prev, startNodeId, targetNodeId);

    return {
      algorithm: 'Dijkstra',
      success: path.length > 0,
      path: path,
      totalDistance: dist[targetNodeId] === Infinity ? 0 : dist[targetNodeId],
      visitedCount: nodesVisitedCount,
      executionTimeMs: Number((t1 - t0).toFixed(2))
    };
  }

  // 2. A* (A-STAR) ALGORITHM (Heuristic guided search)
  runAStar(startNodeId, targetNodeId) {
    const t0 = performance.now();
    const targetNode = this.nodes[targetNodeId];
    if (!targetNode) return this.runDijkstra(startNodeId, targetNodeId);

    const gScore = {};
    const fScore = {};
    const prev = {};
    const openSet = new Set([startNodeId]);
    const closedSet = new Set();

    for (const id in this.nodes) {
      gScore[id] = Infinity;
      fScore[id] = Infinity;
    }

    gScore[startNodeId] = 0;
    fScore[startNodeId] = CampusRouter.haversine(
      this.nodes[startNodeId].lat,
      this.nodes[startNodeId].lon,
      targetNode.lat,
      targetNode.lon
    );

    let nodesVisitedCount = 0;

    while (openSet.size > 0) {
      let current = null;
      let lowestF = Infinity;

      for (const node of openSet) {
        if (fScore[node] < lowestF) {
          lowestF = fScore[node];
          current = node;
        }
      }

      if (current === targetNodeId) {
        const t1 = performance.now();
        const path = this._reconstructPath(prev, startNodeId, targetNodeId);
        return {
          algorithm: 'A* Search',
          success: true,
          path: path,
          totalDistance: gScore[targetNodeId],
          visitedCount: nodesVisitedCount,
          executionTimeMs: Number((t1 - t0).toFixed(2))
        };
      }

      openSet.delete(current);
      closedSet.add(current);
      nodesVisitedCount++;

      const neighbors = this.edges[current] || [];
      for (const e of neighbors) {
        if (closedSet.has(e.to)) continue;

        const tentativeG = gScore[current] + e.w;
        if (tentativeG < gScore[e.to]) {
          prev[e.to] = current;
          gScore[e.to] = tentativeG;

          // Heuristic: Straight line Haversine distance
          const h = CampusRouter.haversine(
            this.nodes[e.to].lat,
            this.nodes[e.to].lon,
            targetNode.lat,
            targetNode.lon
          );
          fScore[e.to] = tentativeG + h;
          openSet.add(e.to);
        }
      }
    }

    const t1 = performance.now();
    return {
      algorithm: 'A* Search',
      success: false,
      path: [],
      totalDistance: 0,
      visitedCount: nodesVisitedCount,
      executionTimeMs: Number((t1 - t0).toFixed(2))
    };
  }

  // 3. BFS (Breadth-First Search - Fewest Intersections)
  runBFS(startNodeId, targetNodeId) {
    const t0 = performance.now();
    const queue = [startNodeId];
    const visited = new Set([startNodeId]);
    const prev = {};
    let found = false;
    let visitedCount = 0;

    while (queue.length > 0) {
      const u = queue.shift();
      visitedCount++;

      if (u === targetNodeId) {
        found = true;
        break;
      }

      const neighbors = this.edges[u] || [];
      for (const e of neighbors) {
        if (!visited.has(e.to)) {
          visited.add(e.to);
          prev[e.to] = u;
          queue.push(e.to);
        }
      }
    }

    const t1 = performance.now();
    const path = found ? this._reconstructPath(prev, startNodeId, targetNodeId) : [];

    // Calculate distance of BFS path
    let dist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const edge = (this.edges[u] || []).find(e => e.to === v);
      dist += edge ? edge.w : 0;
    }

    return {
      algorithm: 'Breadth-First Search (BFS)',
      success: found,
      path: path,
      totalDistance: dist,
      visitedCount: visitedCount,
      executionTimeMs: Number((t1 - t0).toFixed(2))
    };
  }

  // 4. ACCESSIBLE PATHFINDER (Wheelchair friendly, smooth paved routes)
  runAccessible(startNodeId, targetNodeId) {
    const t0 = performance.now();
    const dist = {};
    const prev = {};
    const visited = new Set();
    const Q = new Set(Object.keys(this.nodes));

    for (const id in this.nodes) dist[id] = Infinity;
    dist[startNodeId] = 0;
    let count = 0;

    while (Q.size > 0) {
      let u = null;
      let minD = Infinity;

      for (const node of Q) {
        if (dist[node] < minD) {
          minD = dist[node];
          u = node;
        }
      }

      if (u === null || minD === Infinity) break;
      Q.delete(u);
      visited.add(u);
      count++;

      if (u === targetNodeId) break;

      const neighbors = this.edges[u] || [];
      for (const e of neighbors) {
        if (visited.has(e.to)) continue;

        // Weight modifier: prioritize wide service roads & paved paths, penalize steps/rough paths
        let weightFactor = 1.0;
        if (e.type === 'service' || e.type === 'footway') weightFactor = 0.9;
        if (e.type === 'steps' || e.type === 'path') weightFactor = 2.5;

        const alt = dist[u] + e.w * weightFactor;
        if (alt < dist[e.to]) {
          dist[e.to] = alt;
          prev[e.to] = u;
        }
      }
    }

    const t1 = performance.now();
    const path = this._reconstructPath(prev, startNodeId, targetNodeId);

    // Calculate actual meter distance
    let actualDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const u = path[i];
      const v = path[i + 1];
      const edge = (this.edges[u] || []).find(e => e.to === v);
      actualDist += edge ? edge.w : 0;
    }

    return {
      algorithm: 'Accessible Route',
      success: path.length > 0,
      path: path,
      totalDistance: actualDist,
      visitedCount: count,
      executionTimeMs: Number((t1 - t0).toFixed(2))
    };
  }

  // Helper to reconstruct path from prev pointers
  _reconstructPath(prev, startId, targetId) {
    const path = [];
    let cur = targetId;
    while (cur) {
      path.unshift(cur);
      if (cur === startId) break;
      cur = prev[cur];
    }
    return path[0] === startId ? path : [];
  }

  // Generate Turn-by-Turn Navigation Instructions
  generateInstructions(pathNodeIds, startBuilding, destBuilding, startRoom = null, destRoom = null) {
    if (!pathNodeIds || pathNodeIds.length < 2) return [];

    const instructions = [];
    const coords = pathNodeIds.map(id => this.nodes[id]);

    // Initial step with room precision if available
    const startTitle = startRoom
      ? `Start at Room ${startRoom.room}: ${startRoom.name}`
      : `Start at ${startBuilding.shortName || startBuilding.name}`;
    const startDetail = startRoom
      ? `${startBuilding.shortName || startBuilding.name} (Floor ${startRoom.floor ?? 1}${startRoom.faculty ? ', ' + startRoom.faculty : ''}). Step onto the campus pathway.`
      : `Exit and step onto the campus pathway.`;

    instructions.push({
      step: 1,
      type: 'depart',
      icon: '🟢',
      title: startTitle,
      detail: startDetail,
      distance: 0
    });

    let currentSegmentDist = 0;
    let lastBearing = CampusRouter.bearing(
      coords[0].lat,
      coords[0].lon,
      coords[1].lat,
      coords[1].lon
    );

    for (let i = 1; i < coords.length - 1; i++) {
      const pPrev = coords[i - 1];
      const pCur = coords[i];
      const pNext = coords[i + 1];

      const segDist = CampusRouter.haversine(pCur.lat, pCur.lon, pNext.lat, pNext.lon);
      currentSegmentDist += segDist;

      const nextBearing = CampusRouter.bearing(pCur.lat, pCur.lon, pNext.lat, pNext.lon);
      let angleDiff = (nextBearing - lastBearing + 540) % 360 - 180;

      // Only emit turn instruction if significant angle change and enough distance
      if (Math.abs(angleDiff) > 30 && currentSegmentDist > 15) {
        let turnType = 'straight';
        let icon = '⬆️';
        let text = 'Continue straight';

        if (angleDiff > 45 && angleDiff <= 135) {
          turnType = 'turn-right';
          icon = '➡️';
          text = 'Turn right';
        } else if (angleDiff > 135) {
          turnType = 'sharp-right';
          icon = '↗️';
          text = 'Sharp right';
        } else if (angleDiff < -45 && angleDiff >= -135) {
          turnType = 'turn-left';
          icon = '⬅️';
          text = 'Turn left';
        } else if (angleDiff < -135) {
          turnType = 'sharp-left';
          icon = '↖️';
          text = 'Sharp left';
        }

        instructions.push({
          step: instructions.length + 1,
          type: turnType,
          icon: icon,
          title: text,
          detail: `Walk for ${Math.round(currentSegmentDist)} meters.`,
          distance: Math.round(currentSegmentDist)
        });

        currentSegmentDist = 0;
        lastBearing = nextBearing;
      }
    }

    // Final arrival step with room precision
    const destTitle = destRoom
      ? `Arrive at Room ${destRoom.room}: ${destRoom.name}`
      : `Arrive at ${destBuilding.shortName || destBuilding.name}`;
    const destDetail = destRoom
      ? `Enter ${destBuilding.shortName || destBuilding.name}, proceed to Floor ${destRoom.floor ?? 1}${destRoom.faculty ? ' (' + destRoom.faculty + ')' : ''}.`
      : `Destination reached! Floors: ${destBuilding.levels || 1}.`;

    instructions.push({
      step: instructions.length + 1,
      type: 'arrive',
      icon: '🏁',
      title: destTitle,
      detail: destDetail,
      distance: Math.round(currentSegmentDist)
    });

    return instructions;
  }
}

if (typeof window !== 'undefined') {
  window.CampusRouter = CampusRouter;
}
