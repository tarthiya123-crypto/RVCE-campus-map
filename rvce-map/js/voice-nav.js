/**
 * RVCE Campus Navigator - Voice Narration (TTS) + Compass Module
 * Uses Web Speech API SpeechSynthesis for real-time navigation narration.
 */

class VoiceNavigator {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.enabled = true;
    this.currentUtterance = null;
    this.preferredVoice = null;
    this.rate = 0.95;
    this.pitch = 1.0;
    this.volume = 1.0;
    this._pickVoice();
  }

  _pickVoice() {
    if (!this.synth) return;
    const setVoice = () => {
      const voices = this.synth.getVoices();
      // Prefer English (India) or English (US)
      this.preferredVoice =
        voices.find(v => v.lang === 'en-IN') ||
        voices.find(v => v.lang === 'en-US') ||
        voices.find(v => v.lang.startsWith('en')) ||
        (voices.length ? voices[0] : null);
    };
    if (this.synth.getVoices().length) setVoice();
    else this.synth.onvoiceschanged = setVoice;
  }

  speak(text, interrupt = false) {
    if (!this.synth || !this.enabled || !text) return;
    if (interrupt) this.stop();
    else if (this.synth.speaking) return; // queue only if not speaking

    const utt = new SpeechSynthesisUtterance(text);
    utt.voice = this.preferredVoice;
    utt.rate = this.rate;
    utt.pitch = this.pitch;
    utt.volume = this.volume;
    this.currentUtterance = utt;
    this.synth.speak(utt);
  }

  stop() {
    if (this.synth) this.synth.cancel();
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  // Narrate a route summary
  narrateRoute(startName, destName, distanceMeters, timeStr) {
    const dist = distanceMeters < 1000
      ? `${Math.round(distanceMeters)} metres`
      : `${(distanceMeters / 1000).toFixed(1)} kilometres`;
    const text = `Route calculated. Head from ${startName} to ${destName}. Total distance: ${dist}. Estimated walk time: ${timeStr}.`;
    this.speak(text, true);
  }

  // Narrate a single turn instruction
  narrateStep(stepTitle) {
    this.speak(stepTitle, true);
  }

  // Narrate bearing direction
  narrateBearing(bearingDeg) {
    const dirs = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
    const idx = Math.round(bearingDeg / 45) % 8;
    const dir = dirs[idx];
    this.speak(`Head ${dir}`, false);
  }
}

/* =====================================================================
   COMPASS BEARING INDICATOR  (floating map widget)
   ===================================================================== */
class CompassIndicator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this._el = null;
    this._needle = null;
    this._label = null;
    this._currentBearing = 0;
    this._targetBearing = 0;
    this._raf = null;
    this._build();
  }

  _build() {
    if (!this.container) return;

    const el = document.createElement('div');
    el.id = 'compassWidget';
    el.className = 'compass-widget';
    el.title = 'Compass Bearing to Destination';
    el.innerHTML = `
      <div class="compass-ring" id="compassRing">
        <div class="compass-needle" id="compassNeedle">
          <div class="needle-north"></div>
          <div class="needle-south"></div>
        </div>
        <div class="compass-center-dot"></div>
        <span class="compass-n-label">N</span>
      </div>
      <div class="compass-bearing-text" id="compassBearingText">---°</div>
      <div class="compass-dir-text" id="compassDirText">–</div>
    `;
    this.container.appendChild(el);
    this._el = el;
    this._needle = document.getElementById('compassNeedle');
    this._bearingText = document.getElementById('compassBearingText');
    this._dirText = document.getElementById('compassDirText');
    this._animate();
  }

  _animate() {
    const diff = ((this._targetBearing - this._currentBearing + 540) % 360) - 180;
    this._currentBearing += diff * 0.12;
    if (this._needle) {
      this._needle.style.transform = `rotate(${this._currentBearing}deg)`;
    }
    this._raf = requestAnimationFrame(() => this._animate());
  }

  setBearing(deg) {
    this._targetBearing = ((deg % 360) + 360) % 360;
    const round = Math.round(this._targetBearing);

    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const dirFull = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
    const idx = Math.round(round / 45) % 8;

    if (this._bearingText) this._bearingText.textContent = `${round}°`;
    if (this._dirText) this._dirText.textContent = dirs[idx];
    if (this._el) this._el.classList.add('compass-active');
  }

  reset() {
    this._targetBearing = 0;
    if (this._bearingText) this._bearingText.textContent = '---°';
    if (this._dirText) this._dirText.textContent = '–';
    if (this._el) this._el.classList.remove('compass-active');
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._el) this._el.remove();
  }
}

// Expose globally
window.VoiceNavigator = VoiceNavigator;
window.CompassIndicator = CompassIndicator;
