/**
 * RVCE 3D Vector Map Engine (MapLibre GL)
 * High-performance 3D extruded geometry, anime/architectural stylization,
 * campus water canal, 3D camera controls, and route overlays.
 */

class VectorMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = Object.assign({
      center: [77.5002, 12.9234],
      zoom: 17.2,
      pitch: 60,
      bearing: -25,
      onBuildingClick: null
    }, options);

    this.map = null;
    this.isLoaded = false;
    this.viewIndex = 0;
    this.views = [
      { name: "North-West", bearing: -25, pitch: 60 },
      { name: "North", bearing: 0, pitch: 60 },
      { name: "East", bearing: 90, pitch: 60 },
      { name: "South", bearing: 180, pitch: 60 },
      { name: "West", bearing: 270, pitch: 60 }
    ];
    this.isTopView = false;
    this.startMarker = null;
    this.endMarker = null;

    this.initMap();
  }

  initMap() {
    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#eef2f5' // Clean architectural canvas
            }
          }
        ]
      },
      center: this.options.center,
      zoom: this.options.zoom,
      pitch: this.options.pitch,
      bearing: this.options.bearing,
      antialias: true,
      maxPitch: 85
    });

    this.map.on('load', async () => {
      await this.loadLayers();
      this.isLoaded = true;
      if (this.options.onLoad) this.options.onLoad();
    });
  }

  async loadLayers() {
    try {
      // 1. Water Canal Layer (lake_layer.json)
      const lakeRes = await fetch('data/lake_layer.json');
      const lakeData = await lakeRes.json();

      // Convert GeometryCollection to FeatureCollection if needed
      const lakeFeatures = {
        type: 'FeatureCollection',
        features: (lakeData.geometries || []).map((geom, idx) => ({
          type: 'Feature',
          id: idx,
          geometry: geom,
          properties: { name: 'Campus Lake & Water Canal' }
        }))
      };

      this.map.addSource('lake-source', {
        type: 'geojson',
        data: lakeFeatures
      });

      this.map.addLayer({
        id: 'lake-fill',
        type: 'fill',
        source: 'lake-source',
        paint: {
          'fill-color': '#4ea8de',
          'fill-opacity': 0.82
        }
      });

      this.map.addLayer({
        id: 'lake-casing',
        type: 'line',
        source: 'lake-source',
        paint: {
          'line-color': '#2a6f97',
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      // 2. Paths & Walkways (paths.json)
      const pathsRes = await fetch('data/paths.json');
      const pathsData = await pathsRes.json();

      this.map.addSource('paths-source', {
        type: 'geojson',
        data: pathsData
      });

      // Footways & Pedestrian walkways casing
      this.map.addLayer({
        id: 'paths-casing',
        type: 'line',
        source: 'paths-source',
        paint: {
          'line-color': '#cbd5e1',
          'line-width': 7,
          'line-opacity': 0.9
        }
      });

      // Footways main inner line
      this.map.addLayer({
        id: 'paths-inner',
        type: 'line',
        source: 'paths-source',
        paint: {
          'line-color': '#94a3b8',
          'line-width': 4
        }
      });

      // 3. Buildings 3D Extrusion (buildings.json)
      const bldRes = await fetch('data/buildings.json');
      const bldData = await bldRes.json();

      this.map.addSource('buildings-source', {
        type: 'geojson',
        data: bldData
      });

      // 3D Extruded Buildings
      this.map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'buildings-source',
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'amenity'], '#f4a261', // Amber for amenities / food
            ['in', 'Hostel', ['get', 'name']], '#e76f51', // Terracotta for hostels
            ['in', 'Department', ['get', 'name']], '#2a9d8f', // Emerald for departments
            ['in', 'Admin', ['get', 'name']], '#264653', // Deep blue for admin
            '#e2d9cc' // Default architectural warm stone
          ],
          'fill-extrusion-height': [
            'case',
            ['has', 'height'], ['to-number', ['get', 'height']],
            ['has', 'building:levels'], ['*', ['to-number', ['get', 'building:levels']], 3.6],
            11 // Default 11 meters
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.94
        }
      });

      // 4. Route Source & Layers
      this.map.addSource('route-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Glowing route casing
      this.map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff4757',
          'line-width': 10,
          'line-opacity': 0.4
        }
      });

      // Main route line
      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#e84118',
          'line-width': 5
        }
      });

      // Building click handler
      this.map.on('click', 'buildings-3d', (e) => {
        const feat = e.features && e.features[0];
        if (!feat) return;

        const p = feat.properties || {};
        let name = p.name;
        // Never display generic OSM tags like 'yes', 'university', 'college'
        if (!name || ['yes', 'university', 'college', 'construction', 'school', 'garage'].includes(name.toLowerCase())) {
          if (p.building && !['yes', 'university', 'college', 'construction', 'school', 'garage'].includes(p.building.toLowerCase())) {
            name = p.building;
          } else {
            // Find closest building from CAMPUS_BUILDINGS
            const campusList = (typeof CAMPUS_BUILDINGS !== 'undefined' ? CAMPUS_BUILDINGS : []);
            let bestBld = null;
            let minDist = 35;
            for (const b of campusList) {
              if (b.lon == null || b.lat == null) continue;
              const d = window.CampusRouter ? window.CampusRouter.haversine(e.lngLat.lat, e.lngLat.lng, b.lat, b.lon) : 999;
              if (d < minDist) {
                minDist = d;
                bestBld = b;
              }
            }
            name = bestBld ? (bestBld.shortName || bestBld.name) : (p.amenity ? p.amenity.toUpperCase() : 'Campus Facility');
          }
        }

        const levels = p['building:levels'] || '3';

        new maplibregl.Popup({ offset: [0, -10], closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:system-ui;padding:4px 6px;">
              <strong style="color:#0f172a;font-size:14px;">${name}</strong>
              <div style="color:#64748b;font-size:12px;margin:3px 0 6px;">Floors: ${levels}</div>
              <div style="display:flex;gap:6px;">
                <button onclick="window.app.setStartLocationByName('${name.replace(/'/g, "\\'")}')" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">Start Here</button>
                <button onclick="window.app.setDestLocationByName('${name.replace(/'/g, "\\'")}')" style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">Go Here</button>
              </div>
            </div>
          `)
          .addTo(this.map);

        if (this.options.onBuildingClick) {
          this.options.onBuildingClick(feat);
        }
      });

      // Change cursor on building hover
      this.map.on('mouseenter', 'buildings-3d', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', 'buildings-3d', () => {
        this.map.getCanvas().style.cursor = '';
      });

    } catch (err) {
      console.error('[VectorMap] Error loading 3D layers:', err);
    }
  }

  // Draw route on 3D map
  drawRoute(pathNodes) {
    if (!this.map || !this.map.getSource('route-source')) return;

    if (!pathNodes || pathNodes.length < 2) {
      this.clearRoute();
      return;
    }

    const coords = pathNodes.map(n => [n.lon, n.lat]);

    const routeGeo = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords
          }
        }
      ]
    };

    this.map.getSource('route-source').setData(routeGeo);

    // Update Start / End 3D Markers
    const startCoord = coords[0];
    const endCoord = coords[coords.length - 1];

    if (!this.startMarker) {
      const el = document.createElement('div');
      el.className = 'vector-3d-marker start-3d-marker';
      el.innerHTML = '🟢';
      this.startMarker = new maplibregl.Marker({ element: el })
        .setLngLat(startCoord)
        .addTo(this.map);
    } else {
      this.startMarker.setLngLat(startCoord);
    }

    if (!this.endMarker) {
      const el = document.createElement('div');
      el.className = 'vector-3d-marker end-3d-marker';
      el.innerHTML = '🔴';
      this.endMarker = new maplibregl.Marker({ element: el })
        .setLngLat(endCoord)
        .addTo(this.map);
    } else {
      this.endMarker.setLngLat(endCoord);
    }

    // Fit map bounds to route with smooth easeTo
    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );

    this.map.fitBounds(bounds, {
      padding: { top: 70, bottom: 70, left: 380, right: 70 },
      pitch: 55,
      duration: 1000
    });
  }

  clearRoute() {
    if (this.map && this.map.getSource('route-source')) {
      this.map.getSource('route-source').setData({
        type: 'FeatureCollection',
        features: []
      });
    }
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }
    if (this.endMarker) {
      this.endMarker.remove();
      this.endMarker = null;
    }
  }

  // Camera Controls
  toggleTopView() {
    this.isTopView = !this.isTopView;
    if (this.isTopView) {
      this.map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    } else {
      const current = this.views[this.viewIndex];
      this.map.easeTo({ pitch: current.pitch, bearing: current.bearing, duration: 600 });
    }
    return this.isTopView;
  }

  cycleRotation() {
    if (this.isTopView) this.isTopView = false;
    this.viewIndex = (this.viewIndex + 1) % this.views.length;
    const v = this.views[this.viewIndex];
    this.map.easeTo({
      bearing: v.bearing,
      pitch: v.pitch,
      duration: 700
    });
    return v.name;
  }

  flyToLocation(lon, lat, zoom = 18) {
    this.map.flyTo({
      center: [lon, lat],
      zoom: zoom,
      pitch: 60,
      duration: 1000
    });
  }

  zoomIn() {
    this.map.zoomIn({ duration: 300 });
  }

  zoomOut() {
    this.map.zoomOut({ duration: 300 });
  }

  resetView() {
    this.map.easeTo({
      center: this.options.center,
      zoom: this.options.zoom,
      pitch: this.options.pitch,
      bearing: this.options.bearing,
      duration: 800
    });
  }
}

if (typeof window !== 'undefined') {
  window.VectorMap = VectorMap;
}
