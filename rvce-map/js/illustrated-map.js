/**
 * RVCE Illustrated 2.5D Campus Map Engine
 * Provides smooth pan/zoom, interactive SVG building hotspots,
 * animated glowing neon routes, and walk simulation.
 */

class IllustratedMap {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      imageSrc: 'assets/rvce_isometric_map.jpg',
      onBuildingSelect: null,
      onBuildingHover: null
    }, options);

    this.scale = 1.0;
    this.minScale = 0.6;
    this.maxScale = 3.5;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.buildings = [];
    this.selectedBuildingId = null;
    this.routePoints = []; // [ {x, y} ]
    this.animationId = null;
    this.walkerProgress = 0; // 0 to 1
    this.isSimulating = false;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="map-viewport" id="illustratedViewport">
        <div class="map-stage" id="illustratedStage">
          <img class="map-base-img" src="${this.options.imageSrc}" alt="RVCE Illustrated Campus Map" id="baseMapImg" draggable="false" />
          <svg class="map-svg-overlay" id="mapSvgOverlay" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1"/>
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2"/>
                <feMerge>
                  <feMergeNode in="blur2"/>
                  <feMergeNode in="blur1"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#10b981" />
                <stop offset="50%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#ef4444" />
              </linearGradient>
            </defs>
            <g id="svgRoutesGroup"></g>
            <g id="svgHotspotsGroup"></g>
            <g id="svgWalkerGroup"></g>
          </svg>
        </div>
        <div class="map-floating-overlay-info" id="mapHoverCard" style="display:none;"></div>
      </div>
    `;

    this.viewport = document.getElementById('illustratedViewport');
    this.stage = document.getElementById('illustratedStage');
    this.svg = document.getElementById('mapSvgOverlay');
    this.routesGroup = document.getElementById('svgRoutesGroup');
    this.hotspotsGroup = document.getElementById('svgHotspotsGroup');
    this.walkerGroup = document.getElementById('svgWalkerGroup');
    this.hoverCard = document.getElementById('mapHoverCard');

    // Initial centering
    this.resetView();
  }

  loadBuildings(buildings) {
    this.buildings = buildings;
    this.renderHotspots();
  }

  renderHotspots() {
    if (!this.hotspotsGroup) return;
    this.hotspotsGroup.innerHTML = '';

    this.buildings.forEach(b => {
      if (b.imgX == null || b.imgY == null) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `building-hotspot ${b.category || ''}`);
      g.setAttribute('data-id', b.id);
      g.setAttribute('transform', `translate(${b.imgX}, ${b.imgY})`);

      // Outer pulse ring
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('r', '2.2');
      pulseCircle.setAttribute('class', 'hotspot-pulse');
      g.appendChild(pulseCircle);

      // Core pin circle
      const coreCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      coreCircle.setAttribute('r', '1.4');
      coreCircle.setAttribute('class', 'hotspot-core');
      g.appendChild(coreCircle);

      // Label background & text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('y', '-2.4');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'hotspot-label');
      text.textContent = b.shortName || b.name;
      g.appendChild(text);

      // Events
      g.addEventListener('mouseenter', (e) => this.handleHotspotHover(b, e));
      g.addEventListener('mouseleave', () => this.handleHotspotLeave());
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectBuilding(b.id, true);
      });

      this.hotspotsGroup.appendChild(g);
    });
  }

  handleHotspotHover(b, e) {
    if (!this.hoverCard) return;
    this.hoverCard.innerHTML = `
      <div class="hover-card-content">
        <div class="hover-badge">${b.icon || '📍'} ${b.shortName || b.name}</div>
        <div class="hover-desc">${b.description || ''}</div>
        <div class="hover-meta">
          <span>Floors: ${b.levels || 1}</span>
          ${b.rooms && b.rooms.length ? `<span>• Rooms: ${b.rooms.length}</span>` : ''}
        </div>
      </div>
    `;
    this.hoverCard.style.display = 'block';

    if (this.options.onBuildingHover) {
      this.options.onBuildingHover(b);
    }
  }

  handleHotspotLeave() {
    if (this.hoverCard) this.hoverCard.style.display = 'none';
  }

  selectBuilding(buildingId, triggerCallback = false) {
    this.selectedBuildingId = buildingId;
    const allHotspots = this.hotspotsGroup.querySelectorAll('.building-hotspot');
    allHotspots.forEach(el => {
      if (el.getAttribute('data-id') === buildingId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    const bld = this.buildings.find(b => b.id === buildingId);
    if (bld && bld.imgX != null) {
      this.focusCoordinates(bld.imgX, bld.imgY, 1.4);
    }

    if (triggerCallback && this.options.onBuildingSelect && bld) {
      this.options.onBuildingSelect(bld);
    }
  }

  focusCoordinates(pctX, pctY, targetScale = 1.4) {
    const rect = this.viewport.getBoundingClientRect();
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, targetScale));
    
    // Convert percentage to pixel displacement
    const targetPxX = (pctX / 100) * rect.width;
    const targetPxY = (pctY / 100) * rect.height;

    this.panX = (rect.width / 2) - targetPxX * this.scale;
    this.panY = (rect.height / 2) - targetPxY * this.scale;
    this.updateTransform();
  }

  // Draw animated route
  drawRoute(points) {
    this.routePoints = points;
    this.routesGroup.innerHTML = '';
    this.walkerGroup.innerHTML = '';
    if (!points || points.length < 2) return;

    // Convert points array [ [x1, y1], [x2, y2], ... ] to SVG path data
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i][0]} ${points[i][1]}`;
    }

    // Outer glow casing path
    const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glowPath.setAttribute('d', d);
    glowPath.setAttribute('class', 'route-path-glow');
    glowPath.setAttribute('filter', 'url(#neonGlow)');
    this.routesGroup.appendChild(glowPath);

    // Inner bright animated dashed line
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', d);
    mainPath.setAttribute('class', 'route-path-main');
    mainPath.setAttribute('id', 'routeMainSvgPath');
    this.routesGroup.appendChild(mainPath);

    // Start Pin Marker
    const startPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    startPin.setAttribute('cx', points[0][0]);
    startPin.setAttribute('cy', points[0][1]);
    startPin.setAttribute('r', '2.5');
    startPin.setAttribute('class', 'route-endpoint start-pin');
    this.routesGroup.appendChild(startPin);

    // End Pin Marker
    const endPin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    endPin.setAttribute('cx', points[points.length - 1][0]);
    endPin.setAttribute('cy', points[points.length - 1][1]);
    endPin.setAttribute('r', '2.5');
    endPin.setAttribute('class', 'route-endpoint end-pin');
    this.routesGroup.appendChild(endPin);

    // Setup walker dot
    this.walkerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.walkerDot.setAttribute('r', '2.2');
    this.walkerDot.setAttribute('class', 'walker-avatar');
    this.walkerDot.setAttribute('cx', points[0][0]);
    this.walkerDot.setAttribute('cy', points[0][1]);
    this.walkerGroup.appendChild(this.walkerDot);

    // Fit view to route bounds
    this.fitRouteBounds(points);
  }

  fitRouteBounds(points) {
    if (!points || !points.length) return;
    let minX = 100, maxX = 0, minY = 100, maxY = 0;
    points.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.focusCoordinates(centerX, centerY, 1.35);
  }

  clearRoute() {
    this.routePoints = [];
    this.routesGroup.innerHTML = '';
    this.walkerGroup.innerHTML = '';
    this.stopWalkSimulation();
  }

  // Real-time animated walk simulation along route
  startWalkSimulation(speedMultiplier = 1) {
    const pathEl = document.getElementById('routeMainSvgPath');
    if (!pathEl || !this.walkerDot) return;

    this.stopWalkSimulation();
    this.isSimulating = true;
    const totalLength = pathEl.getTotalLength();
    let currentDist = 0;
    const speed = 0.08 * speedMultiplier; // percentage per frame

    const animate = () => {
      if (!this.isSimulating) return;

      currentDist += speed;
      if (currentDist > totalLength) {
        currentDist = 0; // loop
      }

      const pt = pathEl.getPointAtLength(currentDist);
      this.walkerDot.setAttribute('cx', pt.x);
      this.walkerDot.setAttribute('cy', pt.y);

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopWalkSimulation() {
    this.isSimulating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  bindEvents() {
    const vp = this.viewport;

    // Pan with mouse drag
    vp.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      vp.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      vp.style.cursor = 'grab';
    });

    // Zoom with scroll wheel
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoomFactor));

      const rect = vp.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.updateTransform();
    }, { passive: false });

    // Touch gesture support
    let touchStartDist = 0;
    let touchStartScale = 1;

    vp.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.startX = e.touches[0].clientX - this.panX;
        this.startY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartScale = this.scale;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - this.startX;
        this.panY = e.touches[0].clientY - this.startY;
        this.updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, touchStartScale * (dist / touchStartDist)));
        this.scale = newScale;
        this.updateTransform();
      }
    }, { passive: true });

    vp.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  zoomIn() {
    this.scale = Math.min(this.maxScale, this.scale * 1.25);
    this.updateTransform();
  }

  zoomOut() {
    this.scale = Math.max(this.minScale, this.scale * 0.8);
    this.updateTransform();
  }

  resetView() {
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  updateTransform() {
    if (this.stage) {
      this.stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.IllustratedMap = IllustratedMap;
}
