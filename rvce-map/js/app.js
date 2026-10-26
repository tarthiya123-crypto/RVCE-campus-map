/**
 * RVCE Campus Navigator - Master App Controller
 * Integrates Gamified Canvas Map, 3D Vector Map, Graph Routing, and UI state.
 */

class CampusApp {
  constructor() {
    this.router = new CampusRouter();
    this.currentMode = 'gamified'; // 'gamified' | 'vector'
    this.selectedCategory = 'all';
    this.startBuilding = null;
    this.destBuilding = null;
    this.startRoom = null;
    this.destRoom = null;
    this.activeRouteResult = null;
    this.pathsGeoJSON = null;
    this.buildingsGeoJSON = null;
    this.lakeGeoJSON = null;

    // Voice & Compass
    this.voice = null;
    this.compass = null;

    this.init();
  }

  async init() {
    this.initDOM();
    this.bindEvents();
    this.renderCategoryChips();
    this.renderQuickPlaces();

    // Load all GeoJSON data first
    try {
      const [pathsRes, buildingsRes, lakeRes] = await Promise.all([
        fetch('data/paths.json'),
        fetch('data/buildings.json'),
        fetch('data/lake_layer.json')
      ]);
      this.pathsGeoJSON    = await pathsRes.json();
      this.buildingsGeoJSON = await buildingsRes.json();
      this.lakeGeoJSON     = await lakeRes.json();
    } catch (err) {
      console.error('[App] Failed to load GeoJSON data:', err);
    }

    // Initialize Gamified Isometric Canvas Map
    this.gamifiedMap = new GamifiedMap('gamifiedMapContainer', {
      onBuildingSelect: (bld) => this.showBuildingModal(bld),
      onBuildingHover:  (bld) => {}
    });

    await this.gamifiedMap.loadData(
      this.pathsGeoJSON,
      this.buildingsGeoJSON,
      this.lakeGeoJSON,
      CAMPUS_BUILDINGS
    );

    // Initialize 3D Vector Map (MapLibre GL)
    this.vectorMap = new VectorMap('vectorMapContainer', {
      onBuildingClick: (feat) => {
        const p = feat.properties || {};
        let bld = CAMPUS_BUILDINGS.find(b => b.name === p.name || b.shortName === p.name);
        if (!bld && feat.geometry) {
          const coords = feat.geometry.type === 'Polygon' ? feat.geometry.coordinates[0] : (feat.geometry.coordinates ? feat.geometry.coordinates[0][0] : null);
          if (coords && coords.length) {
            const clon = coords.reduce((s, pt) => s + pt[0], 0) / coords.length;
            const clat = coords.reduce((s, pt) => s + pt[1], 0) / coords.length;
            bld = CAMPUS_BUILDINGS.find(b => window.CampusRouter.haversine(clat, clon, b.lat, b.lon) < 30);
          }
        }
        if (bld) this.showBuildingModal(bld);
      }
    });

    // Build routing graph
    if (this.pathsGeoJSON) {
      this.router.initFromGeoJSON(this.pathsGeoJSON);
      console.log('[App] Routing network ready.');
    }

    // Initialize Voice Navigator
    this.voice = new VoiceNavigator();

    // Initialize Compass Indicator
    this.compass = new CompassIndicator('compassContainer');

    // Welcome narration
    setTimeout(() => {
      this.voice.speak('Welcome to RVCE Campus Navigator. Search for a location or plan your route.');
    }, 1200);
  }

  initDOM() {
    this.searchInput = document.getElementById('globalSearchInput');
    this.searchClearBtn = document.getElementById('searchClearBtn');
    this.searchDropdown = document.getElementById('searchSuggestionsDropdown');

    this.startInput = document.getElementById('startLocationInput');
    this.destInput = document.getElementById('destLocationInput');
    this.swapBtn = document.getElementById('swapRouteBtn');
    this.algoSelect = document.getElementById('algorithmSelect');
    this.findRouteBtn = document.getElementById('findRouteBtn');
    this.clearRouteBtn = document.getElementById('clearRouteBtn');

    this.navSummaryCard = document.getElementById('navSummaryCard');
    this.statDistance = document.getElementById('statDistance');
    this.statTime = document.getElementById('statTime');
    this.statSteps = document.getElementById('statSteps');
    this.statCalories = document.getElementById('statCalories');
    this.directionsList = document.getElementById('directionsList');

    this.simPlayBtn = document.getElementById('simPlayBtn');
    this.simSpeedSelect = document.getElementById('simSpeedSelect');

    this.buildingModal = document.getElementById('buildingModal');
    this.modalTitle = document.getElementById('modalTitle');
    this.modalCategory = document.getElementById('modalCategory');
    this.modalDesc = document.getElementById('modalDesc');
    this.modalRoomsList = document.getElementById('modalRoomsList');
    this.modalStartBtn = document.getElementById('modalStartBtn');
    this.modalDestBtn = document.getElementById('modalDestBtn');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');

    this.sidebar = document.getElementById('sidebarPanel');
    this.sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  }

  bindEvents() {
    // Mode Switcher
    document.querySelectorAll('.mode-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });
    // Sidebar Toggle
    if (this.sidebarToggleBtn) {
      this.sidebarToggleBtn.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
        this.sidebarToggleBtn.innerHTML = this.sidebar.classList.contains('collapsed') ? '➡️' : '⬅️';
      });
    }

    // Search Autocomplete
    this.searchInput.addEventListener('input', () => this.handleSearchInput());
    this.searchInput.addEventListener('focus', () => this.handleSearchInput());
    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchDropdown.style.display = 'none';
      this.searchClearBtn.style.display = 'none';
    });

    // Close search dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.searchDropdown.style.display = 'none';
      }
    });

    // Routing Inputs Autocomplete (with room & faculty support)
    this.setupRouteFieldAutocomplete(this.startInput, (bld, room) => {
      this.setStartLocation(bld, room);
    });

    this.setupRouteFieldAutocomplete(this.destInput, (bld, room) => {
      this.setDestLocation(bld, room);
    });

    // Swap Locations
    this.swapBtn.addEventListener('click', () => {
      const tempBld = this.startBuilding;
      const tempRoom = this.startRoom;
      this.startBuilding = this.destBuilding;
      this.startRoom = this.destRoom;
      this.destBuilding = tempBld;
      this.destRoom = tempRoom;

      const tempVal = this.startInput.value;
      this.startInput.value = this.destInput.value;
      this.destInput.value = tempVal;

      if (this.startBuilding && this.destBuilding) {
        this.computeRoute();
      }
    });

    // Compute Route
    this.findRouteBtn.addEventListener('click', () => this.computeRoute());
    this.clearRouteBtn.addEventListener('click', () => this.clearRoute());

    // Simulation Controls
    let isSimulating = false;
    this.simPlayBtn.addEventListener('click', () => {
      if (!isSimulating) {
        const speed = parseFloat(this.simSpeedSelect.value) || 1;
        if (this.currentMode === 'gamified') {
          this.gamifiedMap.startWalkSimulation(speed);
        }
        this.simPlayBtn.innerHTML = '⏸ Pause Walk';
        this.simPlayBtn.style.background = '#f59e0b';
        isSimulating = true;
      } else {
        if (this.currentMode === 'gamified') this.gamifiedMap.stopWalkSimulation();
        this.simPlayBtn.innerHTML = '▶ Simulate Walk';
        this.simPlayBtn.style.background = '#10b981';
        isSimulating = false;
      }
    });

    this.simSpeedSelect.addEventListener('change', () => {
      if (isSimulating && this.currentMode === 'gamified') {
        const speed = parseFloat(this.simSpeedSelect.value) || 1;
        this.gamifiedMap.startWalkSimulation(speed);
      }
    });

    // Modal Actions
    this.modalCloseBtn.addEventListener('click', () => {
      this.buildingModal.style.display = 'none';
    });

    this.modalStartBtn.addEventListener('click', () => {
      if (this.currentInspectedBuilding) {
        this.setStartLocation(this.currentInspectedBuilding);
        this.buildingModal.style.display = 'none';
      }
    });

    this.modalDestBtn.addEventListener('click', () => {
      if (this.currentInspectedBuilding) {
        this.setDestLocation(this.currentInspectedBuilding);
        this.buildingModal.style.display = 'none';
      }
    });

    // Floating Map Control Buttons
    document.getElementById('ctrlZoomIn').addEventListener('click', () => {
      if (this.currentMode === 'gamified') this.gamifiedMap.zoomIn();
      else this.vectorMap.zoomIn();
    });

    document.getElementById('ctrlZoomOut').addEventListener('click', () => {
      if (this.currentMode === 'gamified') this.gamifiedMap.zoomOut();
      else this.vectorMap.zoomOut();
    });

    document.getElementById('ctrlRotate').addEventListener('click', () => {
      if (this.currentMode === 'vector') {
        const viewName = this.vectorMap.cycleRotation();
        console.log('[VectorMap] Switched view to:', viewName);
      }
    });

    document.getElementById('ctrlReset').addEventListener('click', () => {
      if (this.currentMode === 'gamified') this.gamifiedMap.resetView();
      else this.vectorMap.resetView();
    });

    document.getElementById('ctrlTopView').addEventListener('click', () => {
      if (this.currentMode === 'vector') {
        const isTop = this.vectorMap.toggleTopView();
        document.getElementById('ctrlTopView').innerHTML = isTop ? '🏙️' : '⬆️';
      }
    });

    // Voice Toggle Button
    const voiceBtn = document.getElementById('ctrlVoice');
    if (voiceBtn) {
      voiceBtn.classList.add('voice-active');
      voiceBtn.addEventListener('click', () => {
        const isOn = this.voice ? this.voice.toggle() : false;
        voiceBtn.classList.toggle('voice-active', isOn);
        voiceBtn.classList.toggle('voice-muted', !isOn);
        voiceBtn.title = isOn ? 'Voice Navigation: ON' : 'Voice Navigation: OFF';
        voiceBtn.innerHTML = isOn ? '🔊' : '🔇';
      });
    }
  }

  switchMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-pill-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const gamifiedEl = document.getElementById('gamifiedMapContainer');
    const vectorEl   = document.getElementById('vectorMapContainer');

    if (mode === 'gamified') {
      gamifiedEl.classList.remove('hidden');
      vectorEl.classList.add('hidden');
      // Resume canvas render loop if paused
      if (this.gamifiedMap) this.gamifiedMap.startRenderLoop();
    } else {
      gamifiedEl.classList.add('hidden');
      vectorEl.classList.remove('hidden');
      // Pause canvas render loop to save GPU
      if (this.gamifiedMap) this.gamifiedMap.stopRenderLoop();
      if (this.vectorMap && this.vectorMap.map) {
        this.vectorMap.map.resize();
      }
    }
  }

  renderCategoryChips() {
    const container = document.getElementById('categoryChipsContainer');
    if (!container) return;
    container.innerHTML = '';

    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `chip-btn ${cat.id === this.selectedCategory ? 'active' : ''}`;
      btn.innerHTML = `<span>${cat.icon}</span> ${cat.label}`;
      btn.addEventListener('click', () => {
        this.selectedCategory = cat.id;
        document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterBuildingsByCategory(cat.id);
      });
      container.appendChild(btn);
    });
  }

  renderQuickPlaces() {
    const container = document.getElementById('quickPlacesGrid');
    if (!container) return;
    container.innerHTML = '';

    QUICK_DESTINATIONS.forEach(q => {
      const bld = CAMPUS_BUILDINGS.find(b => b.id === q.id);
      if (!bld) return;

      const card = document.createElement('div');
      card.className = 'quick-place-card';
      card.innerHTML = `<span>${q.icon}</span> <span>${q.name}</span>`;
      card.addEventListener('click', () => {
        this.showBuildingModal(bld);
        if (this.currentMode === 'gamified') {
          this.gamifiedMap.selectBuilding(bld.id, true);
        } else {
          this.vectorMap.flyToLocation(bld.lon, bld.lat);
        }
      });
      container.appendChild(card);
    });
  }

  filterBuildingsByCategory(catId) {
    const filtered = catId === 'all'
      ? CAMPUS_BUILDINGS
      : CAMPUS_BUILDINGS.filter(b => b.category === catId);
    // Gamified map always shows all buildings from GeoJSON; filter only affects markers
    if (this.gamifiedMap) this.gamifiedMap.campusBuildings = filtered;
  }

  handleSearchInput() {
    const query = this.searchInput.value.trim();
    this.searchClearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
      this.searchDropdown.style.display = 'none';
      return;
    }

    const q = query.toLowerCase();
    const normQ = q.replace(/[\s\-_]/g, '');
    const matches = [];

    // Search buildings
    CAMPUS_BUILDINGS.forEach(b => {
      const normBld = (b.name + ' ' + (b.shortName || '')).toLowerCase().replace(/[\s\-_]/g, '');
      if (
        normBld.includes(normQ) ||
        b.name.toLowerCase().includes(q) ||
        (b.shortName && b.shortName.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q))
      ) {
        matches.push({
          type: 'building',
          data: b,
          label: b.shortName || b.name,
          sub: `${b.category.toUpperCase()} • ${b.levels || 1} Floors`,
          icon: b.icon || '📍'
        });
      }

      // Search rooms and faculty within building
      (b.rooms || []).forEach(r => {
        const normRoom = (r.room || '').toLowerCase().replace(/[\s\-_]/g, '');
        const normFaculty = (r.faculty || '').toLowerCase().replace(/[\s\-_]/g, '');
        const normRName = (r.name || '').toLowerCase().replace(/[\s\-_]/g, '');

        const isRoomMatch = normRoom.includes(normQ) || (r.room && r.room.toLowerCase().includes(q));
        const isFacultyMatch = normFaculty.includes(normQ) || (r.faculty && r.faculty.toLowerCase().includes(q));
        const isNameMatch = normRName.includes(normQ) || (r.name && r.name.toLowerCase().includes(q));

        if (isRoomMatch || isFacultyMatch || isNameMatch) {
          let badge = 'Room';
          let icon = '🚪';
          if (isFacultyMatch) { badge = 'Faculty / HoD'; icon = '👨‍🏫'; }
          else if (r.name.toLowerCase().includes('lab')) { badge = 'Lab'; icon = '🔬'; }

          matches.push({
            type: 'room',
            data: b,
            room: r,
            label: `${r.room}: ${r.name}`,
            sub: `${b.shortName || b.name} • ${r.faculty || ('Floor ' + r.floor)} [${badge}]`,
            icon: icon
          });
        }
      });
    });

    this.renderSearchSuggestions(matches.slice(0, 20));
  }

  renderSearchSuggestions(items) {
    if (!items.length) {
      this.searchDropdown.innerHTML = '<div style="padding:12px;font-size:12px;color:#94a3b8;text-align:center;">No matching locations, rooms, or faculty found</div>';
      this.searchDropdown.style.display = 'block';
      return;
    }

    this.searchDropdown.innerHTML = items.map((it, idx) => `
      <div class="suggest-item" data-idx="${idx}">
        <span class="suggest-icon">${it.icon}</span>
        <div class="suggest-details">
          <div class="suggest-name">${it.label}</div>
          <div class="suggest-sub">${it.sub}</div>
        </div>
      </div>
    `).join('');

    this.searchDropdown.querySelectorAll('.suggest-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx, 10);
        const selected = items[idx];
        this.selectSearchResult(selected);
      });
    });

    this.searchDropdown.style.display = 'block';
  }

  selectSearchResult(selected) {
    this.searchDropdown.style.display = 'none';
    this.searchInput.value = selected.label;
    const bld = selected.data;

    this.showBuildingModal(bld, selected.room || null);
    if (this.currentMode === 'gamified') {
      this.gamifiedMap.selectBuilding(bld.id, true);
    } else {
      this.vectorMap.flyToLocation(bld.lon, bld.lat);
    }
  }

  setupRouteFieldAutocomplete(inputEl, onSelect) {
    const parent = inputEl.closest('.route-field');
    const dropdown = document.createElement('div');
    dropdown.className = 'search-suggestions-dropdown';
    parent.appendChild(dropdown);

    inputEl.addEventListener('input', () => {
      const rawQ = inputEl.value.trim();
      const q = rawQ.toLowerCase();
      if (!q) {
        dropdown.style.display = 'none';
        return;
      }

      const normQ = q.replace(/[\s\-_]/g, '');
      const items = [];

      // 1. Building matches
      CAMPUS_BUILDINGS.forEach(b => {
        const normName = (b.name + ' ' + (b.shortName || '')).toLowerCase().replace(/[\s\-_]/g, '');
        if (normName.includes(normQ) || b.name.toLowerCase().includes(q) || (b.shortName && b.shortName.toLowerCase().includes(q))) {
          items.push({
            type: 'building',
            bld: b,
            title: b.shortName || b.name,
            sub: `${b.category.toUpperCase()} • ${b.levels || 1} Floors`,
            icon: b.icon || '📍',
            displayText: b.shortName || b.name,
            room: null
          });
        }

        // 2. Room & Faculty matches
        (b.rooms || []).forEach(r => {
          const normRoom = (r.room || '').toLowerCase().replace(/[\s\-_]/g, '');
          const normFaculty = (r.faculty || '').toLowerCase().replace(/[\s\-_]/g, '');
          const normRName = (r.name || '').toLowerCase().replace(/[\s\-_]/g, '');

          const roomMatch = normRoom.includes(normQ) || (r.room && r.room.toLowerCase().includes(q));
          const facultyMatch = normFaculty.includes(normQ) || (r.faculty && r.faculty.toLowerCase().includes(q));
          const nameMatch = normRName.includes(normQ) || (r.name && r.name.toLowerCase().includes(q));

          if (roomMatch || facultyMatch || nameMatch) {
            let badge = 'Room';
            let icon = '🚪';
            if (facultyMatch) { badge = 'Faculty'; icon = '👨‍🏫'; }
            else if (r.name.toLowerCase().includes('lab')) { badge = 'Lab'; icon = '🔬'; }

            items.push({
              type: 'room',
              bld: b,
              room: r,
              title: `${r.room}: ${r.name}`,
              sub: `${b.shortName || b.name} • ${r.faculty || ('Floor ' + r.floor)} [${badge}]`,
              icon: icon,
              displayText: `${r.room} (${b.shortName || b.name})`
            });
          }
        });
      });

      if (!items.length) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = items.slice(0, 10).map((it, idx) => `
        <div class="suggest-item" data-idx="${idx}">
          <span class="suggest-icon">${it.icon}</span>
          <div class="suggest-details">
            <div class="suggest-name">${it.title}</div>
            <div class="suggest-sub">${it.sub}</div>
          </div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.suggest-item').forEach(item => {
        item.addEventListener('click', () => {
          const idx = parseInt(item.dataset.idx, 10);
          const chosen = items[idx];
          if (chosen) {
            inputEl.value = chosen.displayText;
            onSelect(chosen.bld, chosen.room || null);
          }
          dropdown.style.display = 'none';
        });
      });

      dropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!parent.contains(e.target)) dropdown.style.display = 'none';
    });
  }

  setStartLocation(bld, room = null) {
    this.startBuilding = bld;
    this.startRoom = room;
    this.startInput.value = room ? `${room.room} (${bld.shortName || bld.name})` : (bld.shortName || bld.name);
    if (this.destBuilding) this.computeRoute();
  }

  setDestLocation(bld, room = null) {
    this.destBuilding = bld;
    this.destRoom = room;
    this.destInput.value = room ? `${room.room} (${bld.shortName || bld.name})` : (bld.shortName || bld.name);
    if (this.startBuilding) this.computeRoute();
  }

  setStartLocationByName(name) {
    const bld = CAMPUS_BUILDINGS.find(b => b.name === name || b.shortName === name);
    if (bld) this.setStartLocation(bld, null);
  }

  setDestLocationByName(name) {
    const bld = CAMPUS_BUILDINGS.find(b => b.name === name || b.shortName === name);
    if (bld) this.setDestLocation(bld, null);
  }

  showBuildingModal(bld, highlightedRoom = null) {
    this.currentInspectedBuilding = bld;
    this.modalTitle.textContent = bld.shortName || bld.name;
    this.modalCategory.textContent = `${bld.category.toUpperCase()} • ${bld.levels || 1} Floors`;
    this.modalDesc.textContent = bld.description || 'RV College of Engineering campus facility.';

    let html = '';

    if (highlightedRoom) {
      html += `
        <div class="searched-room-banner">
          <div class="badge">🎯 Matching Search Result</div>
          <div style="font-weight:700;font-size:13px;color:#1e3a8a;">${highlightedRoom.room}: ${highlightedRoom.name}</div>
          <div style="color:#475569;font-size:11px;margin-top:2px;">Faculty / Contact: ${highlightedRoom.faculty || 'Department'} • Floor ${highlightedRoom.floor ?? 'N/A'}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button onclick="window.app.setStartLocation(window.app.currentInspectedBuilding, ${JSON.stringify(highlightedRoom).replace(/"/g, '&quot;')}); document.getElementById('buildingModal').style.display='none';" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;">Start From This Room</button>
            <button onclick="window.app.setDestLocation(window.app.currentInspectedBuilding, ${JSON.stringify(highlightedRoom).replace(/"/g, '&quot;')}); document.getElementById('buildingModal').style.display='none';" style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;">Route To This Room</button>
          </div>
        </div>
      `;
    }

    if (bld.rooms && bld.rooms.length) {
      html += `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:700;color:#64748b;">ROOMS & FACULTY DIRECTORY (${bld.rooms.length}):</span>
          <input type="text" id="modalRoomFilterInput" placeholder="Filter rooms/prof..." style="padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;width:130px;" />
        </div>
        <div id="modalRoomsItemsContainer" style="display:flex;flex-direction:column;gap:5px;max-height:160px;overflow-y:auto;">
        ${bld.rooms.map(r => {
          const isHigh = highlightedRoom && (r.room === highlightedRoom.room || (r.faculty && highlightedRoom.faculty && r.faculty === highlightedRoom.faculty));
          return `
          <div class="modal-room-item ${isHigh ? 'highlighted' : ''}" data-room="${(r.room || '').toLowerCase()}" data-faculty="${(r.faculty || '').toLowerCase()}" data-name="${(r.name || '').toLowerCase()}">
            <div style="flex:1;">
              <span class="modal-room-number">${r.room}</span>
              <span class="modal-room-faculty">${r.name} — <em>${r.faculty || 'Faculty'}</em> (Floor ${r.floor ?? 1})</span>
            </div>
            <div style="display:flex;gap:4px;margin-top:2px;">
              <button onclick="window.app.setStartLocation(window.app.currentInspectedBuilding, ${JSON.stringify(r).replace(/"/g, '&quot;')}); document.getElementById('buildingModal').style.display='none';" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer;">Start</button>
              <button onclick="window.app.setDestLocation(window.app.currentInspectedBuilding, ${JSON.stringify(r).replace(/"/g, '&quot;')}); document.getElementById('buildingModal').style.display='none';" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer;">Dest</button>
            </div>
          </div>
        `;}).join('')}
        </div>
      `;
    } else {
      html += '<div style="font-size:11px;color:#94a3b8;font-style:italic;">No room-level subdivisions registered for this facility.</div>';
    }

    this.modalRoomsList.innerHTML = html;

    // In-modal room filter
    const filterInput = document.getElementById('modalRoomFilterInput');
    if (filterInput) {
      filterInput.addEventListener('input', () => {
        const fq = filterInput.value.trim().toLowerCase();
        const items = document.querySelectorAll('#modalRoomsItemsContainer .modal-room-item');
        items.forEach(it => {
          const match = it.dataset.room.includes(fq) || it.dataset.faculty.includes(fq) || it.dataset.name.includes(fq);
          it.style.display = match ? 'flex' : 'none';
        });
      });
    }

    this.buildingModal.style.display = 'block';
  }

  // Master Route Computation
  computeRoute() {
    if (!this.startBuilding || !this.destBuilding) {
      alert('Please select both a Start and Destination location.');
      return;
    }

    if (this.startBuilding.id === this.destBuilding.id) {
      alert('Start and Destination are the same location.');
      return;
    }

    // Snap to graph nodes
    const startNodeId = this.router.snapBuilding(this.startBuilding);
    const destNodeId = this.router.snapBuilding(this.destBuilding);

    if (!startNodeId || !destNodeId) {
      alert('Could not connect locations to campus walking network.');
      return;
    }

    // Run selected algorithm
    const algo = this.algoSelect.value;
    let result = null;

    if (algo === 'dijkstra') {
      result = this.router.runDijkstra(startNodeId, destNodeId);
    } else if (algo === 'astar') {
      result = this.router.runAStar(startNodeId, destNodeId);
    } else if (algo === 'bfs') {
      result = this.router.runBFS(startNodeId, destNodeId);
    } else if (algo === 'accessible') {
      result = this.router.runAccessible(startNodeId, destNodeId);
    }

    if (!result || !result.success || !result.path.length) {
      alert('No accessible walking path found between these buildings.');
      return;
    }

    this.activeRouteResult = result;

    // Convert path nodes to 3D and Illustrated points
    const pathNodes = result.path.map(id => this.router.nodes[id]);

    // 1. Render in 3D Vector Map
    this.vectorMap.drawRoute(pathNodes);

    // 2. Render in Gamified Canvas Map
    this.gamifiedMap.drawRoute(result.path, this.router);

    // 3. Update Metrics Summary
    this.updateRouteMetrics(result);

    // 4. Generate & Display Turn-by-Turn Directions
    const instructions = this.router.generateInstructions(
      result.path,
      this.startBuilding,
      this.destBuilding,
      this.startRoom,
      this.destRoom
    );
    this.renderDirections(instructions);

    this.navSummaryCard.style.display = 'block';

    // 5. Voice narration of route summary
    const distM = Math.round(result.totalDistance);
    const secs = Math.round(distM / 1.2);
    const mins = Math.floor(secs / 60);
    const secR = secs % 60;
    const timeStr = mins > 0 ? `${mins} minute${mins > 1 ? 's' : ''} ${secR} seconds` : `${secR} seconds`;
    if (this.voice) {
      this.voice.narrateRoute(
        this.startBuilding.shortName || this.startBuilding.name,
        this.destBuilding.shortName || this.destBuilding.name,
        distM,
        timeStr
      );
    }

    // 6. Update compass bearing (start → destination)
    if (this.compass && this.startBuilding && this.destBuilding) {
      const brng = CampusRouter.bearing(
        this.startBuilding.lat, this.startBuilding.lon,
        this.destBuilding.lat, this.destBuilding.lon
      );
      this.compass.setBearing(brng);
    }
  }

  generateIllustratedPathPoints(pathNodeIds, startBld, destBld) {
    const pts = [];
    pts.push([startBld.imgX, startBld.imgY]);

    // Approximate mapping for intermediate nodes based on bounding box
    const total = pathNodeIds.length;
    for (let i = 1; i < total - 1; i++) {
      const ratio = i / total;
      const x = startBld.imgX + (destBld.imgX - startBld.imgX) * ratio;
      const y = startBld.imgY + (destBld.imgY - startBld.imgY) * ratio;
      pts.push([x, y]);
    }

    pts.push([destBld.imgX, destBld.imgY]);
    return pts;
  }

  updateRouteMetrics(result) {
    const distMeters = Math.round(result.totalDistance);
    const walkSeconds = Math.round(distMeters / 1.2); // 1.2 m/s walk speed
    const mins = Math.floor(walkSeconds / 60);
    const secs = walkSeconds % 60;
    const steps = Math.round(distMeters * 1.3);
    const calories = (distMeters * 0.045).toFixed(1);

    this.statDistance.textContent = `${distMeters} m`;
    this.statTime.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    this.statSteps.textContent = steps;
    this.statCalories.textContent = `${calories} kcal`;
  }

  renderDirections(instructions) {
    this.directionsList.innerHTML = instructions.map((inst, idx) => `
      <div class="direction-step" data-idx="${idx}">
        <span class="step-icon">${inst.icon}</span>
        <div class="step-content">
          <div class="step-title">${inst.title}</div>
          <div class="step-detail">${inst.detail}</div>
        </div>
        <button class="step-speak-btn" title="Read aloud" onclick="window.app && window.app.voice && window.app.voice.narrateStep('${inst.title.replace(/'/g, '')}')" style="background:none;border:none;cursor:pointer;font-size:13px;color:#64748b;padding:2px 4px;flex-shrink:0;">🔊</button>
      </div>
    `).join('');
  }

  clearRoute() {
    this.startBuilding = null;
    this.destBuilding = null;
    this.startRoom = null;
    this.destRoom = null;
    this.startInput.value = '';
    this.destInput.value = '';
    this.activeRouteResult = null;

    this.gamifiedMap.clearRoute();
    this.vectorMap.clearRoute();
    this.navSummaryCard.style.display = 'none';

    // Reset compass and stop voice
    if (this.compass) this.compass.reset();
    if (this.voice) this.voice.stop();
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CampusApp();
});
