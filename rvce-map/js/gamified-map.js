/**
 * RVCE Campus — Gamified Isometric Canvas Map
 * Procedurally rendered from real GeoJSON coordinate data.
 * Isometric 2.5D projection with animated water, glowing paths,
 * extruded buildings, floating labels, trees, and route overlays.
 */

class GamifiedMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      onBuildingSelect: null,
      onBuildingHover: null
    }, options);

    // Geographic bounding box of RVCE campus
    this.GEO = {
      minLon: 77.4972, maxLon: 77.5038,
      minLat: 12.9208, maxLat: 12.9252
    };

    // Viewport state
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.minZoom = 0.55;
    this.maxZoom = 3.5;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hoveredBuildingId = null;
    this.selectedBuildingId = null;
    this.routePoints = null;   // [{ x, y }] in isometric canvas space
    this.routeAnimOffset = 0;
    this.walkerT = 0;         // 0..1 along route
    this.walkerActive = false;
    this.walkerSpeed = 0.0008;

    // Data (populated by loadData)
    this.buildings = [];
    this.paths = [];
    this.lake = null;
    this.campusBuildings = [];   // from campus-data.js CAMPUS_BUILDINGS

    // Canvas
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;
    this.tick = 0;

    // Isometric transform params
    // We project to a top-down view first, then apply isometric shear
    this.ISO_ANGLE = 30; // degrees
    this.ISO_SCALE_X = 1.0;
    this.ISO_SCALE_Y = 0.55;

    this._initCanvas();
    this._bindEvents();
  }

  _initCanvas() {
    this.container.innerHTML = `
      <canvas id="gamifiedCanvas" style="display:block;width:100%;height:100%;cursor:grab;"></canvas>
      <div id="gamifiedTooltip" style="
        position:absolute;pointer-events:none;display:none;
        background:rgba(10,15,35,0.92);backdrop-filter:blur(8px);
        color:#fff;padding:8px 13px;border-radius:10px;
        font-family:system-ui;font-size:12px;line-height:1.5;
        border:1px solid rgba(99,132,255,0.4);
        box-shadow:0 0 20px rgba(99,132,255,0.3);
        max-width:200px;z-index:100;
      "></div>
      <div id="gamifiedLegend" style="
        position:absolute;bottom:14px;right:14px;
        background:rgba(10,15,35,0.85);backdrop-filter:blur(8px);
        border:1px solid rgba(99,132,255,0.35);border-radius:10px;
        padding:10px 14px;font-size:11px;color:#cbd5e1;
        font-family:system-ui;z-index:10;
        box-shadow:0 4px 20px rgba(0,0,0,0.4);
      ">
        <div style="font-weight:700;color:#93c5fd;margin-bottom:6px;">MAP LEGEND</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Academic</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Hostel</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#10b981;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Amenity / Sports</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#ec4899;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Food</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#8b5cf6;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Labs & Research</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#ef4444;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>Gate / Metro</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#4ea8de;border-radius:2px;border-radius:50%;margin-right:6px;vertical-align:middle;"></span>Water Canal</div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('gamifiedCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.tooltip = document.getElementById('gamifiedTooltip');

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this._centerView();
  }

  _centerView() {
    // Reset pan to center the campus
    this.panX = this.canvas.width * 0.52;
    this.panY = this.canvas.height * 0.35;
    this.zoom = Math.min(this.canvas.width / 700, this.canvas.height / 600) * 0.88;
  }

  // ─── COORDINATE TRANSFORMS ────────────────────────────────────────────────

  // Geo → flat 2D world space (meters-ish, y-up)
  _geoToWorld(lon, lat) {
    const W = 800, H = 700;
    const x = (lon - this.GEO.minLon) / (this.GEO.maxLon - this.GEO.minLon) * W;
    const y = (1 - (lat - this.GEO.minLat) / (this.GEO.maxLat - this.GEO.minLat)) * H;
    return { x, y };
  }

  // World 2D → isometric screen
  _worldToIso(wx, wy) {
    // Classic isometric: rotate 45°, scale y by 0.5
    const ix = (wx - wy) * 0.707;
    const iy = (wx + wy) * 0.707 * 0.5;
    return { x: ix, y: iy };
  }

  // Full pipeline: geo → isometric screen (with pan/zoom)
  geoToScreen(lon, lat) {
    const w = this._geoToWorld(lon, lat);
    const iso = this._worldToIso(w.x, w.y);
    return {
      x: iso.x * this.zoom + this.panX,
      y: iso.y * this.zoom + this.panY
    };
  }

  // ─── DATA LOADING ─────────────────────────────────────────────────────────

  async loadData(pathsGeoJSON, buildingsGeoJSON, lakeGeoJSON, campusBuildingsList) {
    this.paths = pathsGeoJSON.features.filter(f => f.geometry);
    this.buildingsGeo = buildingsGeoJSON.features.filter(f => f.geometry);
    this.lakeGeometry = lakeGeoJSON;
    this.campusBuildings = campusBuildingsList;

    // Depth-sort buildings so farther back buildings render before closer ones (Painter's algorithm)
    this.buildingsGeo.sort((a, b) => {
      const getC = feat => {
        const g = feat.geometry;
        if (!g) return { lon: 77.5, lat: 12.92 };
        const coords = g.type === 'Polygon' ? g.coordinates : (g.coordinates ? g.coordinates[0] : []);
        if (!coords || !coords[0]) return { lon: 77.5, lat: 12.92 };
        return this._polyCenter(coords);
      };
      const ca = getC(a), cb = getC(b);
      const wa = this._geoToWorld(ca.lon, ca.lat);
      const wb = this._geoToWorld(cb.lon, cb.lat);
      return (wa.x + wa.y) - (wb.x + wb.y);
    });

    // Pre-compute screen positions for campus buildings (for hit testing & labels)
    this.campusBuildingScreenCache = {};
    for (const b of campusBuildingsList) {
      if (b.lon != null && b.lat != null) {
        this.campusBuildingScreenCache[b.id] = { lon: b.lon, lat: b.lat };
      }
    }

    this.startRenderLoop();
  }

  // ─── RENDER LOOP ──────────────────────────────────────────────────────────

  startRenderLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const loop = () => {
      this.tick++;
      this._render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  _render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // ── 1. SKY BACKGROUND ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#0a0f23');
    skyGrad.addColorStop(0.4, '#0d1b3e');
    skyGrad.addColorStop(1, '#112240');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. DRAW STARS ──
    this._drawStars(ctx, W, H);

    // ── 3. GROUND PLANE ──
    this._drawGround(ctx, W, H);

    // ── 4. LAKE / CANAL ──
    if (this.lakeGeometry && this.lakeGeometry.geometries) {
      for (const geom of this.lakeGeometry.geometries) {
        this._drawLake(ctx, geom);
      }
    }

    // ── 5. PATHS & ROADS ──
    for (const feat of this.paths) {
      this._drawPath(ctx, feat);
    }

    // ── 6. TREES (decorative, evenly distributed) ──
    this._drawTrees(ctx);

    // ── 7. BUILDINGS (from OSM GeoJSON polygons) ──
    for (const feat of this.buildingsGeo) {
      this._drawBuildingPoly(ctx, feat);
    }

    // ── 8. CAMPUS BUILDING LABELS & MARKERS ──
    for (const b of this.campusBuildings) {
      if (b.lon == null) continue;
      this._drawBuildingMarker(ctx, b);
    }

    // ── 9. ROUTE OVERLAY ──
    if (this.routePoints && this.routePoints.length > 1) {
      this._drawRoute(ctx);

      // Walker
      if (this.walkerActive) {
        this.walkerT = (this.walkerT + this.walkerSpeed) % 1;
        this._drawWalker(ctx);
      }
    }

    // ── 10. HUD ──
    this._drawHUD(ctx, W, H);
  }

  _drawStars(ctx, W, H) {
    // Seeded stars - drawn sparingly (noise pattern)
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137 + 23) % W);
      const sy = ((i * 97 + 11) % (H * 0.55));
      const alpha = 0.3 + 0.5 * Math.sin(this.tick * 0.012 + i);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  _drawGround(ctx, W, H) {
    // Isometric ground rhombus
    const corners = [
      { lon: this.GEO.minLon, lat: this.GEO.minLat },
      { lon: this.GEO.maxLon, lat: this.GEO.minLat },
      { lon: this.GEO.maxLon, lat: this.GEO.maxLat },
      { lon: this.GEO.minLon, lat: this.GEO.maxLat }
    ].map(p => this.geoToScreen(p.lon, p.lat));

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();

    const groundGrad = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
    groundGrad.addColorStop(0, '#1a2e1a');
    groundGrad.addColorStop(0.35, '#1e3320');
    groundGrad.addColorStop(0.7, '#162a1e');
    groundGrad.addColorStop(1, '#0f1f16');
    ctx.fillStyle = groundGrad;
    ctx.fill();

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(34,85,51,0.18)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.restore();
  }

  _drawLake(ctx, geom) {
    if (!geom || !geom.coordinates) return;
    const rings = geom.type === 'Polygon' ? geom.coordinates : [geom.coordinates];

    for (const ring of rings) {
      const pts = ring.map(([lon, lat]) => this.geoToScreen(lon, lat));
      if (pts.length < 3) continue;

      ctx.save();
      // Animated water shimmer
      const waveOffset = Math.sin(this.tick * 0.02) * 3;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      // Deep water gradient
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const waterGrad = ctx.createRadialGradient(cx, cy + waveOffset, 10, cx, cy, 120 * this.zoom);
      waterGrad.addColorStop(0, 'rgba(56,189,248,0.85)');
      waterGrad.addColorStop(0.4, 'rgba(14,116,144,0.75)');
      waterGrad.addColorStop(1, 'rgba(7,89,133,0.6)');
      ctx.fillStyle = waterGrad;
      ctx.fill();

      // Shimmer lines
      ctx.save();
      ctx.clip();
      for (let s = 0; s < 6; s++) {
        const shimX = cx - 60 * this.zoom + ((this.tick * 0.6 + s * 22) % (120 * this.zoom));
        ctx.beginPath();
        ctx.moveTo(shimX, cy - 25 * this.zoom);
        ctx.lineTo(shimX + 40 * this.zoom, cy + 25 * this.zoom);
        ctx.strokeStyle = 'rgba(186,230,253,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      // Canal border
      ctx.strokeStyle = 'rgba(56,189,248,0.6)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawPath(ctx, feat) {
    const geom = feat.geometry;
    const props = feat.properties || {};
    const hwType = props.highway || 'footway';

    if (!geom || !geom.coordinates) return;

    const allLines = geom.type === 'LineString'
      ? [geom.coordinates]
      : geom.coordinates;

    for (const line of allLines) {
      if (line.length < 2) continue;
      const pts = line.map(([lon, lat]) => this.geoToScreen(lon, lat));

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);

      if (hwType === 'service' || props.motor_vehicle === 'yes' || props.motor_vehicle === 'permissive') {
        // Service roads / main roads — wider, concrete grey
        ctx.strokeStyle = 'rgba(148,163,184,0.55)';
        ctx.lineWidth = Math.max(1.5, 3.5 * this.zoom);
      } else if (hwType === 'footway' || hwType === 'pedestrian') {
        // Paved walkways
        ctx.strokeStyle = 'rgba(94,234,212,0.4)';
        ctx.lineWidth = Math.max(0.8, 1.8 * this.zoom);
        ctx.setLineDash([4, 3]);
      } else {
        // Other paths
        ctx.strokeStyle = 'rgba(74,222,128,0.3)';
        ctx.lineWidth = Math.max(0.5, 1.2 * this.zoom);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  _drawTrees(ctx) {
    // Scatter decorative trees in green areas
    const treePositions = [
      // Around the lake southern shore
      { lon: 77.4992, lat: 12.9215 }, { lon: 77.4997, lat: 12.9213 },
      { lon: 77.5002, lat: 12.9212 }, { lon: 77.5008, lat: 12.9216 },
      { lon: 77.5015, lat: 12.9214 }, { lon: 77.5022, lat: 12.9218 },
      // Western edge
      { lon: 77.4975, lat: 12.9228 }, { lon: 77.4975, lat: 12.9235 },
      { lon: 77.4975, lat: 12.9241 }, { lon: 77.4977, lat: 12.9248 },
      // Northern edge
      { lon: 77.4983, lat: 12.9251 }, { lon: 77.4989, lat: 12.9251 },
      { lon: 77.4995, lat: 12.9251 }, { lon: 77.5001, lat: 12.9251 },
      { lon: 77.5008, lat: 12.9251 }, { lon: 77.5014, lat: 12.9251 },
      // Eastern edge
      { lon: 77.5036, lat: 12.9232 }, { lon: 77.5036, lat: 12.9238 },
      // Interior clusters
      { lon: 77.4993, lat: 12.9226 }, { lon: 77.4990, lat: 12.9229 },
      { lon: 77.5010, lat: 12.9228 }, { lon: 77.5017, lat: 12.9225 },
      { lon: 77.5026, lat: 12.9230 }, { lon: 77.5030, lat: 12.9235 },
      { lon: 77.4985, lat: 12.9244 }, { lon: 77.4989, lat: 12.9248 },
    ];

    for (let i = 0; i < treePositions.length; i++) {
      const tp = treePositions[i];
      const sc = this.geoToScreen(tp.lon, tp.lat);
      this._drawTreeAt(ctx, sc.x, sc.y, i);
    }
  }

  _drawTreeAt(ctx, sx, sy, seed) {
    const r = Math.max(4, 5 * this.zoom);
    const sway = Math.sin(this.tick * 0.018 + seed * 1.7) * 0.8;
    const green = `hsl(${125 + (seed % 25)}, 60%, ${26 + (seed % 10)}%)`;
    const bright = `hsl(${128 + (seed % 20)}, 70%, 35%)`;

    ctx.save();
    // Trunk
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + sway * 0.3, sy - r * 0.9);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = Math.max(1, 1.5 * this.zoom);
    ctx.stroke();

    // Canopy (layered circles)
    for (let layer = 2; layer >= 0; layer--) {
      ctx.beginPath();
      ctx.arc(
        sx + sway * (0.5 - layer * 0.1),
        sy - r * 0.8 - layer * r * 0.4,
        r * (0.85 + layer * 0.15),
        0, Math.PI * 2
      );
      ctx.fillStyle = layer === 2 ? bright : green;
      ctx.fill();
    }
    // Highlight
    ctx.beginPath();
    ctx.arc(sx + sway * 0.4 - r * 0.2, sy - r * 1.8, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(167,243,208,0.3)';
    ctx.fill();
    ctx.restore();
  }

  // Compute building geometry centroid
  _polyCenter(coords) {
    const ring = coords[0];
    const xs = ring.map(p => p[0]);
    const ys = ring.map(p => p[1]);
    return {
      lon: xs.reduce((a, b) => a + b) / xs.length,
      lat: ys.reduce((a, b) => a + b) / ys.length
    };
  }

  _drawBuildingPoly(ctx, feat) {
    const geom = feat.geometry;
    const props = feat.properties || {};
    if (!geom) return;

    const rings = geom.type === 'Polygon'
      ? [geom.coordinates]
      : geom.type === 'MultiPolygon'
        ? geom.coordinates
        : null;
    if (!rings) return;

    const levels = parseInt(props['building:levels'] || props.height / 3 || '2', 10) || 2;
    const buildingName = props.name || props.building || '';

    // Pick fill based on known name / type
    let color = this._getBuildingColor(buildingName, props.building, props.amenity);

    const heightScale = Math.max(8, levels * 5) * this.zoom * 0.5;

    for (const polyRings of rings) {
      if (!polyRings || !polyRings[0]) continue;
      const outerRing = polyRings[0];
      const pts = outerRing.map(([lon, lat]) => this.geoToScreen(lon, lat));
      if (pts.length < 3) continue;

      // ── EXTRUSION SIDE FACES ──
      // Left / south face (slightly darker)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.closePath();

      // Draw extruded walls (offset upward by heightScale)
      const topPts = pts.map(p => ({ x: p.x, y: p.y - heightScale }));

      // For each edge of the polygon, draw a wall quad
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i + 1];
        const t1 = topPts[i], t2 = topPts[i + 1];

        // Only draw visible faces (simple heuristic: right-facing edges)
        const edge_dx = p2.x - p1.x;
        const face_visible = edge_dx > 0;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.closePath();

        // Wall shading
        const wallColor = face_visible
          ? this._shadeColor(color, -35)
          : this._shadeColor(color, -55);
        ctx.fillStyle = wallColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // ── ROOF / TOP FACE ──
      ctx.beginPath();
      ctx.moveTo(topPts[0].x, topPts[0].y);
      for (const p of topPts) ctx.lineTo(p.x, p.y);
      ctx.closePath();

      // Roof gradient
      const cTop = topPts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
      cTop.x /= topPts.length; cTop.y /= topPts.length;

      const roofGrad = ctx.createRadialGradient(cTop.x, cTop.y, 0, cTop.x, cTop.y, 30 * this.zoom);
      roofGrad.addColorStop(0, this._shadeColor(color, 25));
      roofGrad.addColorStop(1, color);
      ctx.fillStyle = roofGrad;
      ctx.fill();

      // Roof outline
      ctx.strokeStyle = this._shadeColor(color, 50);
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    }
  }

  _getBuildingColor(name, building, amenity) {
    const n = (name || '').toLowerCase();
    if (amenity === 'bank' || n.includes('bank') || n.includes('kotak')) return '#0284c7';
    if (amenity === 'library' || n.includes('library')) return '#7c3aed';
    if (amenity === 'fast_food' || n.includes('food') || n.includes('canteen') || n.includes('mm foods')) return '#ec4899';
    if (n.includes('gate')) return '#dc2626';
    if (n.includes('hostel') || n.includes('quarters')) return '#d97706';
    if (n.includes('admin') || n.includes('placement')) return '#1d4ed8';
    if (n.includes('sport') || n.includes('athletic')) return '#059669';
    if (n.includes('chemical') || n.includes('biotech') || n.includes('aiml') || n.includes('ai')) return '#7c3aed';
    if (n.includes('computer') || n.includes('cs') || n.includes('software')) return '#2563eb';
    if (n.includes('electrical') || n.includes('eee')) return '#d97706';
    if (n.includes('electronics') || n.includes('ece') || n.includes('telecom')) return '#0891b2';
    if (n.includes('civil') || n.includes('mechanical')) return '#4b5563';
    if (n.includes('aerospace') || n.includes('information')) return '#7e22ce';
    if (n.includes('innovation') || n.includes('r&d') || n.includes('idrc') || n.includes('cognitive')) return '#8b5cf6';
    if (n.includes('a block') || n.includes('b block') || n.includes('c block')) return '#1e40af';
    if (n.includes('cauvery') || n.includes('krishna') || n.includes('chamundi')) return '#b45309';
    if (n.includes('station') || n.includes('metro')) return '#dc2626';
    if (building === 'train_station') return '#dc2626';
    if (building === 'college' || building === 'university') return '#1e3a8a';
    return '#334155'; // Default
  }

  _shadeColor(hex, amount) {
    // Parse color and lighten/darken
    let r, g, b;
    if (hex.startsWith('#')) {
      const n = parseInt(hex.slice(1), 16);
      r = (n >> 16) & 255;
      g = (n >> 8) & 255;
      b = n & 255;
    } else if (hex.startsWith('rgb')) {
      [r, g, b] = hex.match(/\d+/g).map(Number);
    } else {
      return hex;
    }
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return `rgb(${r},${g},${b})`;
  }

  _drawBuildingMarker(ctx, b) {
    const sc = this.geoToScreen(b.lon, b.lat);
    const isHovered = this.hoveredBuildingId === b.id;
    const isSelected = this.selectedBuildingId === b.id;

    const baseColor = this._getCategoryColor(b.category);
    const pulse = 0.7 + 0.3 * Math.sin(this.tick * 0.04);
    const r = isSelected ? 9 * this.zoom : (isHovered ? 8 * this.zoom : 5.5 * this.zoom);

    ctx.save();

    // Outer glow ring
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, r * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `${baseColor}22`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sc.x, sc.y, r * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `${baseColor}40`;
      ctx.fill();
    }

    // Pulse ring for selected
    if (isSelected) {
      const pr = r + (this.tick % 40) * 0.4 * this.zoom;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, pr, 0, Math.PI * 2);
      ctx.strokeStyle = `${baseColor}${Math.round((1 - (this.tick % 40) / 40) * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Core pin
    ctx.beginPath();
    ctx.arc(sc.x, sc.y, r, 0, Math.PI * 2);
    const pinGrad = ctx.createRadialGradient(sc.x - r * 0.3, sc.y - r * 0.3, 0, sc.x, sc.y, r);
    pinGrad.addColorStop(0, this._shadeColor(baseColor, 60));
    pinGrad.addColorStop(1, baseColor);
    ctx.fillStyle = pinGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Icon emoji at larger zoom
    if (this.zoom > 1.0) {
      ctx.font = `${Math.max(7, 9 * this.zoom)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.icon || '📍', sc.x, sc.y);
    }

    // Label
    if (this.zoom > 0.8 || isHovered || isSelected) {
      const labelY = sc.y - r - 6;
      const label = b.shortName || b.name;
      const fontSize = Math.max(8, Math.min(12, 9 * this.zoom));

      ctx.font = `${isSelected || isHovered ? 700 : 600} ${fontSize}px "Plus Jakarta Sans", system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const tm = ctx.measureText(label);
      const lw = tm.width + 8, lh = fontSize + 6;

      // Label background pill
      ctx.beginPath();
      ctx.roundRect(sc.x - lw / 2, labelY - lh, lw, lh, 4);
      ctx.fillStyle = isSelected
        ? `rgba(30,58,138,0.92)`
        : `rgba(10,15,35,0.82)`;
      ctx.fill();
      ctx.strokeStyle = isSelected ? 'rgba(99,132,255,0.8)' : 'rgba(99,132,255,0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#93c5fd' : '#e2e8f0';
      ctx.fillText(label, sc.x, labelY);
    }

    ctx.restore();
  }

  _getCategoryColor(cat) {
    const MAP = {
      academic: '#3b82f6',
      lab:      '#8b5cf6',
      hostel:   '#f59e0b',
      food:     '#ec4899',
      amenity:  '#10b981',
      sports:   '#22c55e',
      gate:     '#ef4444',
      admin:    '#1d4ed8'
    };
    return MAP[cat] || '#64748b';
  }

  _drawRoute(ctx) {
    const pts = this.routePoints;
    if (!pts || pts.length < 2) return;

    // Convert geo-space route points to screen
    const screenPts = pts.map(p => this.geoToScreen(p.lon, p.lat));

    // ── Outer glow casing ──
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(screenPts[0].x, screenPts[0].y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.strokeStyle = 'rgba(255,80,100,0.25)';
    ctx.lineWidth = Math.max(4, 10 * this.zoom);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── Middle glow ──
    ctx.strokeStyle = 'rgba(255,70,90,0.5)';
    ctx.lineWidth = Math.max(2.5, 6 * this.zoom);
    ctx.stroke();

    // ── Animated dashed inner line ──
    this.routeAnimOffset = (this.routeAnimOffset + 1.2) % 16;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -this.routeAnimOffset;
    ctx.strokeStyle = '#ff6b7a';
    ctx.lineWidth = Math.max(1.5, 3 * this.zoom);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Start Pin ──
    const sp = screenPts[0];
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, Math.max(5, 8 * this.zoom), 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `bold ${Math.max(9, 11 * this.zoom)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('S', sp.x, sp.y);

    // ── End Pin ──
    const ep = screenPts[screenPts.length - 1];
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, Math.max(5, 8 * this.zoom), 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText('D', ep.x, ep.y);

    ctx.restore();
  }

  _drawWalker(ctx) {
    const pts = this.routePoints;
    if (!pts || pts.length < 2) return;

    // Interpolate position along route
    const totalSegs = pts.length - 1;
    const progress = this.walkerT * totalSegs;
    const segIdx = Math.floor(progress) % totalSegs;
    const segT = progress - Math.floor(progress);

    const p1 = this.geoToScreen(pts[segIdx].lon, pts[segIdx].lat);
    const p2 = this.geoToScreen(pts[segIdx + 1].lon, pts[segIdx + 1].lat);

    const wx = p1.x + (p2.x - p1.x) * segT;
    const wy = p1.y + (p2.y - p1.y) * segT;

    const r = Math.max(5, 7 * this.zoom);
    const bounce = Math.abs(Math.sin(this.tick * 0.15)) * 2;

    ctx.save();
    // Glow
    ctx.beginPath();
    ctx.arc(wx, wy - bounce, r * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250,204,21,0.2)';
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.arc(wx, wy - bounce, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(wx - r * 0.3, wy - bounce - r * 0.3, 0, wx, wy - bounce, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Emoji face
    ctx.font = `${Math.max(7, 9 * this.zoom)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚶', wx, wy - bounce);

    ctx.restore();
  }

  _drawHUD(ctx, W, H) {
    // Mini compass
    const cx = W - 38, cy = 38;
    const cr = 16;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,15,35,0.7)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(99,132,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // N arrow
    ctx.beginPath();
    ctx.moveTo(cx, cy - cr + 4);
    ctx.lineTo(cx - 4, cy + 2);
    ctx.lineTo(cx, cy - 2);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy + cr - 4);
    ctx.lineTo(cx + 4, cy - 2);
    ctx.lineTo(cx, cy + 2);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('N', cx, cy - cr - 3);
    ctx.restore();

    // Zoom level indicator
    ctx.save();
    ctx.font = '10px system-ui';
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(`×${this.zoom.toFixed(2)}`, 12, H - 12);
    ctx.restore();

    // RVCE title watermark
    ctx.save();
    ctx.font = 'bold 11px "Plus Jakarta Sans", system-ui';
    ctx.fillStyle = 'rgba(148,163,184,0.35)';
    ctx.textAlign = 'right';
    ctx.fillText('RVCE CAMPUS — GAMIFIED MAP', W - 14, H - 12);
    ctx.restore();
  }

  // ─── INTERACTION ──────────────────────────────────────────────────────────

  _bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
      } else {
        this._handleHover(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
      this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
      this.panY = my - (my - this.panY) * (newZoom / this.zoom);
      this.zoom = newZoom;
    }, { passive: false });

    this.canvas.addEventListener('click', (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) return;
      this._handleClick(e);
    });

    // Touch support
    let lastTouchDist = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX - this.panX;
        this.dragStartY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - this.dragStartX;
        this.panY = e.touches[0].clientY - this.dragStartY;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / lastTouchDist;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
        lastTouchDist = dist;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => { this.isDragging = false; });
  }

  _getMouseCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _findBuildingAtScreen(sx, sy) {
    let closest = null;
    let minDist = 18 * this.zoom;
    for (const b of this.campusBuildings) {
      if (b.lon == null) continue;
      const sc = this.geoToScreen(b.lon, b.lat);
      const d = Math.hypot(sx - sc.x, sy - sc.y);
      if (d < minDist) { minDist = d; closest = b; }
    }
    return closest;
  }

  _handleHover(e) {
    const pos = this._getMouseCanvasPos(e);
    const bld = this._findBuildingAtScreen(pos.x, pos.y);

    if (bld) {
      this.hoveredBuildingId = bld.id;
      this.canvas.style.cursor = 'pointer';
      const rect = this.canvas.getBoundingClientRect();
      this.tooltip.style.left = `${e.clientX - rect.left + 14}px`;
      this.tooltip.style.top = `${e.clientY - rect.top - 10}px`;
      this.tooltip.innerHTML = `
        <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${bld.icon || '📍'} ${bld.shortName || bld.name}</div>
        <div style="color:#94a3b8;font-size:11px;">${bld.category} · ${bld.levels || '?'} floors</div>
        ${bld.rooms && bld.rooms.length ? `<div style="color:#22d3ee;font-size:10px;margin-top:2px;">${bld.rooms.length} rooms/offices</div>` : ''}
        <div style="color:#64748b;font-size:10px;margin-top:4px;">Click to view details</div>
      `;
      this.tooltip.style.display = 'block';
      if (this.options.onBuildingHover) this.options.onBuildingHover(bld);
    } else {
      this.hoveredBuildingId = null;
      this.canvas.style.cursor = 'grab';
      this.tooltip.style.display = 'none';
    }
  }

  _handleClick(e) {
    const pos = this._getMouseCanvasPos(e);
    const bld = this._findBuildingAtScreen(pos.x, pos.y);
    if (bld) {
      this.selectedBuildingId = bld.id;
      if (this.options.onBuildingSelect) this.options.onBuildingSelect(bld);
    }
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────

  selectBuilding(buildingId, flyTo = true) {
    this.selectedBuildingId = buildingId;
    if (flyTo) {
      const b = this.campusBuildings.find(x => x.id === buildingId);
      if (b && b.lon != null) this.flyTo(b.lon, b.lat, 1.6);
    }
  }

  flyTo(lon, lat, targetZoom = 1.6) {
    const targetSc = this.geoToScreen(lon, lat);
    const W = this.canvas.width, H = this.canvas.height;
    // Animate pan to center
    const startPanX = this.panX, startPanY = this.panY, startZoom = this.zoom;
    const endZoom = Math.max(this.minZoom, Math.min(this.maxZoom, targetZoom));

    // Compute required pan for target at center after zoom
    const w = this._geoToWorld(lon, lat);
    const iso = this._worldToIso(w.x, w.y);
    const endPanX = W / 2 - iso.x * endZoom;
    const endPanY = H / 2 - iso.y * endZoom;

    let t = 0;
    const dur = 40;
    const easeInOut = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

    const animFly = () => {
      t++;
      const p = easeInOut(Math.min(t / dur, 1));
      this.panX = startPanX + (endPanX - startPanX) * p;
      this.panY = startPanY + (endPanY - startPanY) * p;
      this.zoom = startZoom + (endZoom - startZoom) * p;
      if (t < dur) requestAnimationFrame(animFly);
    };
    requestAnimationFrame(animFly);
  }

  drawRoute(pathNodeIds, router) {
    if (!pathNodeIds || pathNodeIds.length < 2) {
      this.clearRoute();
      return;
    }

    // Convert path node IDs to lon/lat using router.nodes
    this.routePoints = pathNodeIds.map(id => {
      const n = router.nodes[id];
      return n ? { lon: n.lon, lat: n.lat } : null;
    }).filter(Boolean);

    this.walkerT = 0;
  }

  clearRoute() {
    this.routePoints = null;
    this.walkerT = 0;
    this.walkerActive = false;
  }

  startWalkSimulation(speedMultiplier = 1) {
    this.walkerActive = true;
    this.walkerSpeed = 0.0008 * speedMultiplier;
    this.walkerT = 0;
  }

  stopWalkSimulation() {
    this.walkerActive = false;
  }

  zoomIn() { this.zoom = Math.min(this.maxZoom, this.zoom * 1.25); }
  zoomOut() { this.zoom = Math.max(this.minZoom, this.zoom * 0.8); }
  resetView() { this._centerView(); }
}

if (typeof window !== 'undefined') {
  window.GamifiedMap = GamifiedMap;
}
