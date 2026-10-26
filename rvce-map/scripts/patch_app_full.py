with open('rvce-map/js/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update constructor
old_constructor = """    this.destBuilding = null;
    this.activeRouteResult = null;"""
new_constructor = """    this.destBuilding = null;
    this.startRoom = null;
    this.destRoom = null;
    this.activeRouteResult = null;"""
code = code.replace(old_constructor, new_constructor)

# 2. Update vectorMap initialization
old_vectormap = """    // Initialize 3D Vector Map (MapLibre GL)
    this.vectorMap = new VectorMap('vectorMapContainer', {
      onBuildingClick: (feat) => {
        const name = feat.properties.name || feat.properties.building;
        const bld = CAMPUS_BUILDINGS.find(b => b.name === name || b.shortName === name);
        if (bld) this.showBuildingModal(bld);
      }
    });"""
new_vectormap = """    // Initialize 3D Vector Map (MapLibre GL)
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
    });"""
code = code.replace(old_vectormap, new_vectormap)

# 3. Update route inputs autocomplete in bindEvents
old_bind_route = """    // Routing Inputs Autocomplete
    this.setupRouteFieldAutocomplete(this.startInput, (bld) => {
      this.startBuilding = bld;
      this.startInput.value = bld.shortName || bld.name;
    });

    this.setupRouteFieldAutocomplete(this.destInput, (bld) => {
      this.destBuilding = bld;
      this.destInput.value = bld.shortName || bld.name;
    });"""

new_bind_route = """    // Routing Inputs Autocomplete (with room & faculty support)
    this.setupRouteFieldAutocomplete(this.startInput, (bld, room) => {
      this.setStartLocation(bld, room);
    });

    this.setupRouteFieldAutocomplete(this.destInput, (bld, room) => {
      this.setDestLocation(bld, room);
    });"""
code = code.replace(old_bind_route, new_bind_route)

# 4. Update swap button
old_swap = """    // Swap Locations
    this.swapBtn.addEventListener('click', () => {
      const tempBld = this.startBuilding;
      this.startBuilding = this.destBuilding;
      this.destBuilding = tempBld;

      const tempVal = this.startInput.value;
      this.startInput.value = this.destInput.value;
      this.destInput.value = tempVal;

      if (this.startBuilding && this.destBuilding) {
        this.computeRoute();
      }
    });"""

new_swap = """    // Swap Locations
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
    });"""
code = code.replace(old_swap, new_swap)

# 5. Update handleSearchInput and selectSearchResult and setupRouteFieldAutocomplete
old_search_block = """  handleSearchInput() {
    const query = this.searchInput.value.trim().toLowerCase();
    this.searchClearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
      this.searchDropdown.style.display = 'none';
      return;
    }

    const matches = [];

    // Search buildings
    CAMPUS_BUILDINGS.forEach(b => {
      if (
        b.name.toLowerCase().includes(query) ||
        (b.shortName && b.shortName.toLowerCase().includes(query)) ||
        (b.description && b.description.toLowerCase().includes(query))
      ) {
        matches.push({ type: 'building', data: b, label: b.name, sub: b.category });
      }

      // Search rooms and faculty within building
      (b.rooms || []).forEach(r => {
        if (
          r.room.toLowerCase().includes(query) ||
          r.name.toLowerCase().includes(query) ||
          (r.faculty && r.faculty.toLowerCase().includes(query))
        ) {
          matches.push({
            type: 'room',
            data: b,
            room: r,
            label: `${r.room} - ${r.name}`,
            sub: `${b.shortName || b.name} • ${r.faculty || 'Room'}`
          });
        }
      });
    });

    this.renderSearchSuggestions(matches.slice(0, 15));
  }

  renderSearchSuggestions(items) {
    if (!items.length) {
      this.searchDropdown.innerHTML = '<div style="padding:12px;font-size:12px;color:#94a3b8;text-align:center;">No matching locations found</div>';
      this.searchDropdown.style.display = 'block';
      return;
    }

    this.searchDropdown.innerHTML = items.map((it, idx) => `
      <div class="suggest-item" data-idx="${idx}">
        <span class="suggest-icon">${it.type === 'room' ? '🚪' : (it.data.icon || '📍')}</span>
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

    this.showBuildingModal(bld);
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
      const q = inputEl.value.trim().toLowerCase();
      if (!q) {
        dropdown.style.display = 'none';
        return;
      }

      const matches = CAMPUS_BUILDINGS.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.shortName && b.shortName.toLowerCase().includes(q))
      ).slice(0, 8);

      if (!matches.length) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = matches.map(b => `
        <div class="suggest-item" data-id="${b.id}">
          <span class="suggest-icon">${b.icon || '📍'}</span>
          <div class="suggest-details">
            <div class="suggest-name">${b.shortName || b.name}</div>
            <div class="suggest-sub">${b.category}</div>
          </div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.suggest-item').forEach(item => {
        item.addEventListener('click', () => {
          const bld = CAMPUS_BUILDINGS.find(b => b.id === item.dataset.id);
          if (bld) onSelect(bld);
          dropdown.style.display = 'none';
        });
      });

      dropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!parent.contains(e.target)) dropdown.style.display = 'none';
    });
  }"""

new_search_block = """  handleSearchInput() {
    const query = this.searchInput.value.trim();
    this.searchClearBtn.style.display = query ? 'block' : 'none';

    if (!query) {
      this.searchDropdown.style.display = 'none';
      return;
    }

    const q = query.toLowerCase();
    const normQ = q.replace(/[\\s\\-_]/g, '');
    const matches = [];

    // Search buildings
    CAMPUS_BUILDINGS.forEach(b => {
      const normBld = (b.name + ' ' + (b.shortName || '')).toLowerCase().replace(/[\\s\\-_]/g, '');
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
        const normRoom = (r.room || '').toLowerCase().replace(/[\\s\\-_]/g, '');
        const normFaculty = (r.faculty || '').toLowerCase().replace(/[\\s\\-_]/g, '');
        const normRName = (r.name || '').toLowerCase().replace(/[\\s\\-_]/g, '');

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

      const normQ = q.replace(/[\\s\\-_]/g, '');
      const items = [];

      // 1. Building matches
      CAMPUS_BUILDINGS.forEach(b => {
        const normName = (b.name + ' ' + (b.shortName || '')).toLowerCase().replace(/[\\s\\-_]/g, '');
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
          const normRoom = (r.room || '').toLowerCase().replace(/[\\s\\-_]/g, '');
          const normFaculty = (r.faculty || '').toLowerCase().replace(/[\\s\\-_]/g, '');
          const normRName = (r.name || '').toLowerCase().replace(/[\\s\\-_]/g, '');

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
  }"""
code = code.replace(old_search_block, new_search_block)

# 6. Update setStartLocation, setDestLocation, showBuildingModal
old_modal_block = """  setStartLocation(bld) {
    this.startBuilding = bld;
    this.startInput.value = bld.shortName || bld.name;
    if (this.destBuilding) this.computeRoute();
  }

  setDestLocation(bld) {
    this.destBuilding = bld;
    this.destInput.value = bld.shortName || bld.name;
    if (this.startBuilding) this.computeRoute();
  }

  setStartLocationByName(name) {
    const bld = CAMPUS_BUILDINGS.find(b => b.name === name || b.shortName === name);
    if (bld) this.setStartLocation(bld);
  }

  setDestLocationByName(name) {
    const bld = CAMPUS_BUILDINGS.find(b => b.name === name || b.shortName === name);
    if (bld) this.setDestLocation(bld);
  }

  showBuildingModal(bld) {
    this.currentInspectedBuilding = bld;
    this.modalTitle.textContent = bld.shortName || bld.name;
    this.modalCategory.textContent = `${bld.category} • ${bld.levels || 1} Floors`;
    this.modalDesc.textContent = bld.description || 'RV College of Engineering campus facility.';

    if (bld.rooms && bld.rooms.length) {
      this.modalRoomsList.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;">KEY ROOMS & FACULTY:</div>
        ${bld.rooms.map(r => `
          <div class="modal-room-item">
            <span class="modal-room-number">${r.room}</span>
            <span class="modal-room-faculty">${r.name} (${r.faculty || 'Faculty'})</span>
          </div>
        `).join('')}
      `;
    } else {
      this.modalRoomsList.innerHTML = '';
    }

    this.buildingModal.style.display = 'block';
  }"""

new_modal_block = """  setStartLocation(bld, room = null) {
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
  }"""
code = code.replace(old_modal_block, new_modal_block)

# 7. Update computeRoute to pass startRoom and destRoom to generateInstructions
old_instr = """    // 4. Generate & Display Turn-by-Turn Directions
    const instructions = this.router.generateInstructions(result.path, this.startBuilding, this.destBuilding);
    this.renderDirections(instructions);"""

new_instr = """    // 4. Generate & Display Turn-by-Turn Directions
    const instructions = this.router.generateInstructions(
      result.path,
      this.startBuilding,
      this.destBuilding,
      this.startRoom,
      this.destRoom
    );
    this.renderDirections(instructions);"""
code = code.replace(old_instr, new_instr)

# 8. Update clearRoute to reset rooms
old_clear = """  clearRoute() {
    this.startBuilding = null;
    this.destBuilding = null;
    this.startInput.value = '';
    this.destInput.value = '';
    this.activeRouteResult = null;"""

new_clear = """  clearRoute() {
    this.startBuilding = null;
    this.destBuilding = null;
    this.startRoom = null;
    this.destRoom = null;
    this.startInput.value = '';
    this.destInput.value = '';
    this.activeRouteResult = null;"""
code = code.replace(old_clear, new_clear)

with open('rvce-map/js/app.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('app.js patched successfully!')
