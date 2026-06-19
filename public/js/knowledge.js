// EcoREALM Knowledge Center Controller - AAA Strategy Game UI

// --- AUDIO SYNTHESIZER ---
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSynthTone(freq, type, duration, vol = 0.08) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playHoverSound() {
  playSynthTone(750, 'sine', 0.05, 0.02);
}

function playClickSound() {
  playSynthTone(400, 'triangle', 0.1, 0.06);
}

function playSuccessChirp() {
  playSynthTone(480, 'sine', 0.1, 0.05);
  setTimeout(() => playSynthTone(600, 'sine', 0.1, 0.05), 80);
  setTimeout(() => playSynthTone(720, 'sine', 0.2, 0.05), 160);
}

function playWarningSiren() {
  // Dual-frequency computer alarm warning
  let ctx = getAudioContext();
  let now = ctx.currentTime;
  
  playSynthTone(550, 'sawtooth', 0.25, 0.04);
  setTimeout(() => playSynthTone(440, 'sawtooth', 0.25, 0.04), 250);
  setTimeout(() => playSynthTone(550, 'sawtooth', 0.25, 0.04), 500);
}

function attachSoundListeners() {
  document.querySelectorAll('.hud-tab-btn, .cyber-check-card, .effect-selector-btn, .btn-cyber').forEach(el => {
    if(!el.dataset.soundLinked) {
      el.addEventListener('mouseenter', playHoverSound);
      el.dataset.soundLinked = "true";
    }
  });
}

// --- TAB SWAPPING (MUSEUM SECTIONS) ---
window.switchKnowledgeSection = (sectionId) => {
  playClickSound();
  
  const activeBtn = document.querySelector('.hud-sidebar .hud-tab-btn.active');
  const targetBtn = document.querySelector(`.hud-sidebar .hud-tab-btn[onclick="switchKnowledgeSection('${sectionId}')"]`);
  const activeSec = document.querySelector('.hud-viewport-screen.active');
  const targetSec = document.getElementById(`sec-${sectionId}`);
  
  if (activeSec === targetSec) return;
  
  if(activeBtn) activeBtn.classList.remove('active');
  if(targetBtn) targetBtn.classList.add('active');
  
  gsap.to(activeSec, {
    opacity: 0,
    scale: 0.98,
    duration: 0.25,
    onComplete: () => {
      activeSec.classList.remove('active');
      activeSec.style.display = 'none';
      
      targetSec.style.display = 'block';
      targetSec.classList.add('active');
      gsap.fromTo(targetSec, 
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 0.25 }
      );
      
      // Resize canvas if switching to carbon section
      if(sectionId === 'carbon-core') {
        resizeCarbonCanvas();
      }
    }
  });
};

// --- SECTION 1: CARBON PARTICLE EMITTER ---
let canvas, ctx;
let particles = [];
let animFrameId = null;

const sliders = {
  drive: { el: null, valEl: null, factor: 0.25 },
  energy: { el: null, valEl: null, factor: 0.15 }
};

function initCarbonParticles() {
  canvas = document.getElementById('carbon-particles-canvas');
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  
  sliders.drive.el = document.getElementById('sim-slider-drive');
  sliders.drive.valEl = document.getElementById('slider-val-drive');
  sliders.energy.el = document.getElementById('sim-slider-energy');
  sliders.energy.valEl = document.getElementById('slider-val-energy');
  
  resizeCarbonCanvas();
  
  // Create initial particles
  spawnParticles();
  
  // Slider listeners
  sliders.drive.el.addEventListener('input', (e) => {
    sliders.drive.valEl.textContent = e.target.value + " km";
    spawnParticles();
    playSynthTone(200 + (e.target.value * 0.5), 'sine', 0.05, 0.01);
  });
  
  sliders.energy.el.addEventListener('input', (e) => {
    sliders.energy.valEl.textContent = e.target.value + " kWh";
    spawnParticles();
    playSynthTone(200 + (e.target.value * 0.4), 'sine', 0.05, 0.01);
  });
  
  // Start loop
  if(animFrameId) cancelAnimationFrame(animFrameId);
  updateParticlesLoop();
}

function resizeCarbonCanvas() {
  if(!canvas) return;
  const parent = canvas.parentElement;
  canvas.width = parent.clientWidth;
  canvas.height = parent.clientHeight;
}

class CarbonParticle {
  constructor(isClean) {
    this.reset(isClean);
  }
  
  reset(isClean) {
    this.isClean = isClean;
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + Math.random() * 20;
    this.size = Math.random() * (isClean ? 3 : 5) + 2;
    this.vy = -(Math.random() * 1.2 + 0.4);
    this.vx = (Math.random() - 0.5) * 0.6;
    this.opacity = Math.random() * 0.5 + 0.3;
    
    // Clean is neon cyan/green, carbon is grey-black soot
    if (isClean) {
      this.color = Math.random() > 0.5 ? 'rgba(0, 240, 255,' : 'rgba(57, 255, 20,';
    } else {
      this.color = Math.random() > 0.5 ? 'rgba(100, 110, 120,' : 'rgba(40, 42, 48,';
    }
  }
  
  update() {
    this.y += this.vy;
    this.x += this.vx;
    if(this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
      this.reset(this.isClean);
    }
  }
  
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.opacity + ')';
    ctx.shadowBlur = this.isClean ? 6 : 0;
    ctx.shadowColor = this.isClean ? 'rgba(0,240,255,0.4)' : 'transparent';
    ctx.fill();
    ctx.shadowBlur = 0; // reset
  }
}

function spawnParticles() {
  const dVal = parseInt(sliders.drive.el.value);
  const eVal = parseInt(sliders.energy.el.value);
  
  // Total carbon loading points
  const loadPoints = (dVal * sliders.drive.factor) + (eVal * sliders.energy.factor);
  
  // Calculate counts based on points
  // Optimal threshold is loadPoints < 50
  const maxCarbonCount = Math.floor(loadPoints * 0.8);
  const cleanCount = Math.max(5, Math.floor((300 - loadPoints) * 0.15));
  
  particles = [];
  
  // Spawn clean particles
  for(let i = 0; i < cleanCount; i++) {
    particles.push(new CarbonParticle(true));
  }
  // Spawn carbon particles
  for(let i = 0; i < maxCarbonCount; i++) {
    particles.push(new CarbonParticle(false));
  }
}

function updateParticlesLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  animFrameId = requestAnimationFrame(updateParticlesLoop);
}

// --- SECTION 2: BIOSPHERE DEGRADATION SLIDER ---
function initClimateSlider() {
  const slider = document.getElementById('climate-impact-slider');
  const label = document.getElementById('climate-slider-lbl');
  if(!slider) return;
  
  // Glacier, trees, ocean elements
  const glacierPoly = document.getElementById('glacier-poly');
  const glacierSnow = document.getElementById('glacier-snow');
  const ocean = document.getElementById('ocean-water');
  const sunGlow = document.getElementById('sun-glow');
  const sunCore = document.getElementById('sun-core');
  
  const trashItems = [
    document.getElementById('trash-item-1'),
    document.getElementById('trash-item-2'),
    document.getElementById('trash-item-3')
  ];
  
  slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    
    // 1. Update text label
    let text = "Net-Zero Balance (+0.0°C)";
    if(val > 80) text = "Planetary Collapse (+4.5°C)";
    else if(val > 50) text = "Critical Deficit (+3.2°C)";
    else if(val > 25) text = "Elevated Stress (+2.1°C)";
    else if(val > 0) text = "Moderate Warming (+1.0°C)";
    
    label.textContent = text;
    
    // Play synth pitch glide
    playSynthTone(150 + (val * 4), 'sine', 0.06, 0.015);
    
    // 2. Melt Glacier
    // Default polygon height is 60. Min height is 160.
    const glacierHeight = 60 + (val * 1.0); // as val -> 100, height coord -> 160
    if(glacierPoly) {
      glacierPoly.setAttribute('points', `20,180 80,${glacierHeight} 140,180`);
    }
    if(glacierSnow) {
      // Snow melts faster
      const snowHeight = 60 + (val * 1.15);
      if(snowHeight < 120) {
        glacierSnow.setAttribute('points', `50,120 80,${snowHeight} 110,120`);
        glacierSnow.style.opacity = 1 - (val / 65);
      } else {
        glacierSnow.style.opacity = 0;
      }
    }
    
    // 3. Degrade Trees
    // Change color and scale opacity
    for(let i = 1; i <= 3; i++) {
      const tree = document.getElementById(`tree-${i}`);
      if(tree) {
        // Blends vibrant green (0,240,255 or 57,255,20) to dry brown
        const r = Math.floor(57 + (val * 1.5));
        const g = Math.floor(255 - (val * 2.0));
        const b = Math.floor(20 + (val * 0.2));
        tree.setAttribute('fill', `rgb(${r},${g},${b})`);
        tree.style.opacity = 1 - (val * 0.007);
      }
    }
    
    // 4. Pollute Ocean
    if(ocean) {
      // Blue (#0080ff) to Muddy yellow (#504d2e)
      const r = Math.floor(0 + (val * 0.8));
      const g = Math.floor(128 - (val * 0.5));
      const b = Math.floor(255 - (val * 2.1));
      ocean.setAttribute('fill', `rgb(${r},${g},${b})`);
    }
    
    // 5. Reveal Trash
    trashItems.forEach((item, index) => {
      if(item) {
        // items reveal at thresholds
        const threshold = index * 20 + 20;
        if(val >= threshold) {
          item.style.opacity = (val - threshold) / (100 - threshold);
        } else {
          item.style.opacity = 0;
        }
      }
    });
    
    // 6. Flare Sun
    if(sunGlow && sunCore) {
      sunGlow.setAttribute('r', 40 + (val * 1.2));
      sunGlow.setAttribute('fill', `rgba(255, ${230 - (val * 1.5)}, 0, ${0.06 + (val * 0.003)})`);
      sunCore.style.opacity = 0.2 + (val * 0.006);
    }
  });
}

// --- SECTION 3: CLIMATE EFFECTS CARDS ---
const effectsData = {
  floods: {
    mini: "EVENT TYPE: HYDRAULIC DEVIATION",
    title: "Coastal & Flash Flooding",
    desc: "Warmer air retains more water vapor (approx. 7% per 1°C increase). This increases extreme precipitation events, causing severe flooding in populated coastal basins and erosion.",
    art: "🌊🏚️"
  },
  heatwaves: {
    mini: "EVENT TYPE: THERMAL ANOMALY",
    title: "Global Extreme Heatwaves",
    desc: "Greenhouse concentration traps air thermal domes. Global cities register heat dome anomalies over 50°C, threatening human survival and electric grids.",
    art: "☀️🥵"
  },
  droughts: {
    mini: "EVENT TYPE: ARID DESICCATION",
    title: "Soil Desiccation & Droughts",
    desc: "Accelerated evaporation drains planetary soil humidity. Arid crack matrices spread, causing agricultural failures and freshwater depletion.",
    art: "🏜️🌾"
  },
  wildfires: {
    mini: "EVENT TYPE: ECO-COMBUSTION",
    title: "Arid Forest Wildfires",
    desc: "Arid canopy sectors catch ignition sparks readily. Uncontrollable wildfires raze carbon basins, pumping millions of tons of new soot into the air.",
    art: "🔥🌲"
  },
  'sea-level': {
    mini: "EVENT TYPE: OCEANIC EXPANSION",
    title: "Thermal Expansion & Sea Level Rise",
    desc: "Thermal expansion of water combined with polar icecap melt rises global sea sectors. Archipelagos and coastal seaports face terminal submersion risks.",
    art: "🌊🏙️"
  }
};

window.selectClimateEffect = (key) => {
  const data = effectsData[key];
  if(!data) return;
  
  // Play click & warning siren
  playClickSound();
  playWarningSiren();
  
  // Set button class
  document.querySelectorAll('.effect-selector-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const clickedBtn = document.querySelector(`.effect-selector-btn[onclick="selectClimateEffect('${key}')"]`);
  if(clickedBtn) clickedBtn.classList.add('active');
  
  // Animate card swap
  const card = document.getElementById('effect-infographic-card');
  gsap.to(card, {
    opacity: 0.3,
    y: 5,
    duration: 0.15,
    onComplete: () => {
      document.getElementById('effect-mini-label').textContent = data.mini;
      document.getElementById('effect-title').textContent = data.title;
      document.getElementById('effect-desc').textContent = data.desc;
      document.getElementById('infographic-art').textContent = data.art;
      
      // Reset
      gsap.to(card, { opacity: 1, y: 0, duration: 0.25 });
    }
  });
};

// --- SECTION 4: ACTIONS CHECKLIST ---
const checkStates = {};
function toggleHelpCheck(idx) {
  playClickSound();
  
  const card = document.querySelectorAll('.cyber-check-card')[idx - 1];
  const ind = document.getElementById(`help-check-${idx}`);
  
  checkStates[idx] = !checkStates[idx];
  
  if(checkStates[idx]) {
    card.classList.add('active');
    ind.classList.add('checked');
    playSuccessChirp();
  } else {
    card.classList.remove('active');
    ind.classList.remove('checked');
  }
  
  // Calculate percentage
  let checkedCount = 0;
  for(let i = 1; i <= 6; i++) {
    if(checkStates[i]) checkedCount++;
  }
  const perc = Math.round((checkedCount / 6) * 100);
  
  // Update labels
  const effVal = document.getElementById('help-efficiency-lbl');
  const ring = document.getElementById('restoration-glow');
  const msg = document.getElementById('help-feedback-msg');
  
  effVal.textContent = `${perc}%`;
  
  // Rotate indicator ring
  const rot = (perc / 100) * 360;
  ring.style.transform = `rotate(${rot}deg)`;
  
  // Set messages
  if(perc === 0) {
    msg.textContent = "Grid baseline idle. Toggle checkbox actions on the left to calibrate restoration telemetry.";
  } else if (perc < 50) {
    msg.textContent = "Grid calibrated to low output. Activating secondary energy saving grids.";
  } else if (perc < 100) {
    msg.textContent = "High grid coordination detected. Ecosystem recovery rate positive.";
  } else {
    msg.textContent = "OPTIMAL COGNITIVE LINK STABLE! Sector biomass efficiency at 100% capacity.";
  }
}
window.toggleHelpCheck = toggleHelpCheck;

// --- SECTION 6: TELEMETRY FACTS HUB ---
const climateFacts = [
  "CO2 levels are now higher than at any point in human history, currently hovering at 428 PPM.",
  "Melting land ice sheets in Greenland and Antarctica dump 267 billion tons of water into oceans yearly.",
  "Public transit reduces individual greenhouse emissions by up to 82% compared to standard combustion driving.",
  "Meatless plant-based diets conserve 70% more water and 50% more soil energy compared to meat-heavy diets.",
  "Switching to energy-efficient LED bulbs saves 75% more grid load and lasts 25 times longer than incandescent bulbs.",
  "スタンドバイ standby electricity accounts for up to 10% of home utility bills. Unplugging idle cores shaves load instantly.",
  "Reforestation of native forest zones can absorb up to 22kg of CO2 per tree canopy annually.",
  "Over 8 million tonnes of plastic packaging enter oceans every year, harming marine life and reef food chains.",
  "Recycling sorting divert organic cells from landfill pits, preventing potent methane gas leaks.",
  "Water heating makes up 18% of residential power load. Washing laundry in cold water saves 90% of machine energy.",
  "A global average heating of 1.5°C would destroy 70% of reef corals. At 2.0°C, over 99% of corals are lost.",
  "Global sea levels have risen 20cm since 1880, and the rate is accelerating, threating seaport cities.",
  "Using rain barrels to collect roof precipitation captures clean greywater for garden irrigation, saving municipal grids.",
  "Active EV train transit commutes generate zero direct tailpipe carbon emissions, preserving atmosphere index balance."
];

let typewriterTimer = null;
window.triggerTelemetryQuery = () => {
  playClickSound();
  
  const textContainer = document.getElementById('facts-printout-area');
  const btn = document.getElementById('btn-run-query');
  btn.disabled = true;
  
  // Pick random fact
  const fact = climateFacts[Math.floor(Math.random() * climateFacts.length)];
  
  textContainer.textContent = "";
  
  let i = 0;
  if(typewriterTimer) clearInterval(typewriterTimer);
  
  // Telemetry sound chirp on trigger
  playSynthTone(500, 'sawtooth', 0.2, 0.05);
  setTimeout(() => playSynthTone(600, 'sawtooth', 0.15, 0.05), 80);
  
  typewriterTimer = setInterval(() => {
    if(i < fact.length) {
      textContainer.textContent += fact[i];
      // Typewriter ticking audio
      if (i % 2 === 0) {
        playSynthTone(800 + Math.random() * 200, 'sine', 0.015, 0.015);
      }
      i++;
    } else {
      clearInterval(typewriterTimer);
      btn.disabled = false;
      playSynthTone(600, 'sine', 0.1, 0.03); // completion chirp
    }
  }, 25);
};

// Initializer
window.addEventListener('DOMContentLoaded', () => {
  attachSoundListeners();
  initCarbonParticles();
  initClimateSlider();
});
