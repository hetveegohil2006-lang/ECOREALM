// EcoREALM Onboarding Scan Controller - AAA Strategy Game UI
let currentQuestion = 1;
const totalQuestions = 6;
const answers = {};
let finalScore = 0.0;
let finalGrade = 'C';
let finalClassification = 'Carbon Combatant';

// Web Audio API Synthesizer Sound System
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(freq, type, duration, vol = 0.1) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

function playHoverSound() {
  playSound(700, 'sine', 0.06, 0.03);
}

function playClickSound() {
  playSound(500, 'triangle', 0.12, 0.07);
}

function playTransitionSound() {
  playSound(350, 'sawtooth', 0.4, 0.05);
  setTimeout(() => {
    playSound(450, 'triangle', 0.3, 0.06);
  }, 100);
}

function playChimeSound() {
  const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
  notes.forEach((freq, index) => {
    setTimeout(() => {
      playSound(freq, 'sine', 0.5, 0.08);
    }, index * 120);
  });
}

// Attach hover sounds to interactive elements
function initSoundListeners() {
  document.querySelectorAll('.btn-cyber, .option-card').forEach(el => {
    if (!el.dataset.soundAttached) {
      el.addEventListener('mouseenter', playHoverSound);
      el.dataset.soundAttached = "true";
    }
  });
}

// Three.js Holographic Earth Setup
let scene, camera, renderer, controls;
let hologramEarth, secondaryWireframe, orbitalRing1, orbitalRing2, particleSystem;
let rotationSpeed = 0.003;
let earthPulse = false;

function initHologramEarth() {
  const container = document.getElementById('threejs-canvas-parent');
  const canvasElement = document.getElementById('scan-earth-canvas');
  
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03050c, 0.015);
  
  // Camera
  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  
  // OrbitControls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;
  
  // Group
  const hologramGroup = new THREE.Group();
  scene.add(hologramGroup);
  
  // Holographic Earth (Wireframe Sphere)
  const geom = new THREE.SphereGeometry(2.5, 24, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  hologramEarth = new THREE.Mesh(geom, mat);
  hologramGroup.add(hologramEarth);
  
  // Secondary Outer Green Wireframe (gives depth/color blending)
  const geomOuter = new THREE.SphereGeometry(2.54, 12, 12);
  const matOuter = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    wireframe: true,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide
  });
  secondaryWireframe = new THREE.Mesh(geomOuter, matOuter);
  hologramGroup.add(secondaryWireframe);
  
  // Add Orbital Rings
  const ringGeom = new THREE.RingGeometry(3.3, 3.32, 64);
  const ringMat1 = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0x39ff14,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.2
  });
  
  orbitalRing1 = new THREE.Mesh(ringGeom, ringMat1);
  orbitalRing1.rotation.x = Math.PI / 2.5;
  hologramGroup.add(orbitalRing1);
  
  orbitalRing2 = new THREE.Mesh(ringGeom, ringMat2);
  orbitalRing2.rotation.x = -Math.PI / 3;
  orbitalRing2.rotation.y = Math.PI / 4;
  hologramGroup.add(orbitalRing2);
  
  // Outer Particle Cloud
  const particleCount = 60;
  const particleGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount * 3; i += 3) {
    // Distribute randomly on a sphere surface of radius ~3.6
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 3.2 + Math.random() * 0.8;
    
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i+2] = r * Math.cos(phi);
  }
  
  particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particleMat = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.06,
    transparent: true,
    opacity: 0.7
  });
  
  particleSystem = new THREE.Points(particleGeom, particleMat);
  hologramGroup.add(particleSystem);
  
  // Ambient Lighting just in case
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);
  
  // Animation Loop
  const animate = function () {
    requestAnimationFrame(animate);
    
    // Manual slow rotations
    hologramEarth.rotation.y += rotationSpeed;
    secondaryWireframe.rotation.y -= rotationSpeed * 0.5;
    
    orbitalRing1.rotation.z += 0.005;
    orbitalRing2.rotation.z -= 0.004;
    
    particleSystem.rotation.y += rotationSpeed * 0.3;
    
    // Scale pulsation
    if (earthPulse) {
      const scale = 1.0 + Math.sin(Date.now() * 0.006) * 0.04;
      hologramGroup.scale.set(scale, scale, scale);
    }
    
    controls.update();
    renderer.render(scene, camera);
  };
  
  animate();
  
  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

// Stage Progression Logic
function startDiagnostic() {
  playTransitionSound();
  
  gsap.to('#phase-briefing', {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      document.getElementById('phase-briefing').style.display = 'none';
      const questionPhase = document.getElementById('phase-questions');
      questionPhase.style.display = 'block';
      gsap.to(questionPhase, { opacity: 1, duration: 0.4 });
      initSoundListeners();
    }
  });
}

function submitAnswer(qNum, selection, scoreVal, message) {
  playClickSound();
  
  answers[qNum] = { selection, score: scoreVal, message };
  
  // Append log to floating list on right (brief animation)
  const list = document.getElementById('scan-telemetry-list');
  const logItem = document.createElement('div');
  logItem.className = 'telemetry-item new-log';
  logItem.style.opacity = 0;
  
  let label = "Q" + qNum;
  if(qNum === 1) label = "TRANSIT";
  if(qNum === 2) label = "ENERGY";
  if(qNum === 3) label = "DIET";
  if(qNum === 4) label = "WASTE";
  if(qNum === 5) label = "WATER";
  if(qNum === 6) label = "SHOPPING";
  
  let textClass = "text-green";
  if (selection === 'heavy') textClass = "text-red";
  else if (selection === 'medium') textClass = "text-yellow";
  
  logItem.innerHTML = `
    <span class="telemetry-lbl">${label} INDEX</span>
    <span class="telemetry-val ${textClass}">${selection.toUpperCase()} (${scoreVal.toFixed(1)}t)</span>
  `;
  list.insertBefore(logItem, list.firstChild);
  gsap.to(logItem, { opacity: 1, y: 0, duration: 0.3 });
  
  // Remove last item if too long
  if(list.children.length > 5) {
    list.removeChild(list.lastChild);
  }
  
  // Tick active bar updates
  const nextTick = document.getElementById(`tick-${qNum + 1}`);
  if(nextTick) nextTick.classList.add('active');
  
  // Go to next question
  if (qNum < totalQuestions) {
    const currentCard = document.getElementById(`q-${qNum}`);
    const nextCard = document.getElementById(`q-${qNum + 1}`);
    
    gsap.to(currentCard, {
      opacity: 0,
      x: -20,
      duration: 0.3,
      onComplete: () => {
        currentCard.style.display = 'none';
        nextCard.style.display = 'block';
        gsap.fromTo(nextCard, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3 });
        document.getElementById('question-steps-indicator').textContent = `DIAGNOSTIC PROTOCOL: CATEGORY ${qNum + 1}/6`;
        initSoundListeners();
      }
    });
    currentQuestion = qNum + 1;
  } else {
    // Finished all questions! Trigger Phase 3 scan
    runProgressScan();
  }
}

function runProgressScan() {
  playTransitionSound();
  
  // Speed up holographic globe and turn on scale pulse
  rotationSpeed = 0.015;
  earthPulse = true;
  if(hologramEarth) hologramEarth.material.color.setHex(0x39ff14); // Change sphere to green
  
  // Activate visual laser sweep
  const laser = document.getElementById('laser-sweep');
  laser.style.display = 'block';
  gsap.fromTo(laser, { top: '-5%' }, { top: '105%', duration: 1.5, repeat: -1, ease: 'power1.inOut' });
  
  gsap.to('#phase-questions', {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      document.getElementById('phase-questions').style.display = 'none';
      const progressPhase = document.getElementById('phase-progress');
      progressPhase.style.display = 'block';
      gsap.to(progressPhase, { opacity: 1, duration: 0.4 });
      
      startAnalysisSequence();
    }
  });
}

function startAnalysisSequence() {
  const terminal = document.getElementById('scan-terminal-log');
  const fill = document.getElementById('scan-progress-fill');
  const percentText = document.getElementById('scan-percentage-val');
  const statusMsg = document.getElementById('scan-status-msg');
  
  const scanMessages = [
    { text: "Analyzing lifestyle patterns...", threshold: 5, type: 'info' },
    { text: "Decrypted: Transport grid load... COMPLETED", threshold: 18, type: 'success' },
    { text: "Decrypted: Household energy core load... COMPLETED", threshold: 30, type: 'success' },
    { text: "Calculating carbon emissions...", threshold: 45, type: 'info' },
    { text: "Decrypted: Dietary biomass consumption... COMPLETED", threshold: 58, type: 'success' },
    { text: "Evaluating restoration potential...", threshold: 65, type: 'info' },
    { text: "Decrypted: Waste circularity index... COMPLETED", threshold: 75, type: 'success' },
    { text: "Generating Guardian Profile...", threshold: 85, type: 'info' },
    { text: "Diagnostic Complete. Initializing Dossier...", threshold: 100, type: 'success' }
  ];
  
  let currentPercentage = 0;
  let msgIdx = 0;
  
  // Setup scanner sound hum (continuous scan wave)
  let scanOsc = null;
  let scanGain = null;
  try {
    const ctx = getAudioContext();
    scanOsc = ctx.createOscillator();
    scanGain = ctx.createGain();
    scanOsc.type = 'sawtooth';
    scanOsc.frequency.setValueAtTime(80, ctx.currentTime);
    scanGain.gain.setValueAtTime(0.02, ctx.currentTime);
    scanOsc.connect(scanGain);
    scanGain.connect(ctx.destination);
    scanOsc.start();
  } catch(e){}
  
  function updateProgress() {
    currentPercentage += Math.floor(Math.random() * 4) + 1;
    if (currentPercentage > 100) currentPercentage = 100;
    
    fill.style.width = `${currentPercentage}%`;
    percentText.textContent = `${currentPercentage}%`;
    
    // Check if we need to print a message
    if (msgIdx < scanMessages.length && currentPercentage >= scanMessages[msgIdx].threshold) {
      const msg = scanMessages[msgIdx];
      statusMsg.textContent = msg.text.toUpperCase();
      
      const line = document.createElement('div');
      line.className = `terminal-log-line ${msg.type}`;
      line.innerHTML = `<span>></span> <span>${msg.text}</span>`;
      terminal.appendChild(line);
      terminal.scrollTop = terminal.scrollHeight;
      
      // Pitch sweeps during log dumps
      playSound(300 + (currentPercentage * 4), 'sine', 0.08, 0.02);
      
      // Modulate oscillator frequency
      if(scanOsc) {
        scanOsc.frequency.setValueAtTime(80 + (currentPercentage * 2), audioCtx.currentTime);
      }
      
      msgIdx++;
    }
    
    if (currentPercentage < 100) {
      setTimeout(updateProgress, 120 + Math.random() * 80);
    } else {
      // Progress finishes!
      if (scanOsc) {
        try {
          scanOsc.stop();
        } catch(e){}
      }
      setTimeout(revealResults, 800);
    }
  }
  
  updateProgress();
}

function revealResults() {
  playChimeSound();
  
  // Deactivate laser sweep and slow down earth
  document.getElementById('laser-sweep').style.display = 'none';
  rotationSpeed = 0.003;
  earthPulse = false;
  
  // Calculate final score
  finalScore = 0.0;
  Object.keys(answers).forEach(q => {
    finalScore += answers[q].score;
  });
  
  // Determine rating / classification
  if (finalScore < 4.0) {
    finalGrade = 'A';
    finalClassification = 'Planetary Steward';
  } else if (finalScore < 8.0) {
    finalGrade = 'B';
    finalClassification = 'Terra-Sentinel';
  } else if (finalScore < 13.0) {
    finalGrade = 'C';
    finalClassification = 'Biomass Guardian';
  } else {
    finalGrade = 'F';
    finalClassification = 'Carbon Combatant';
  }
  
  // Inject values into DOM
  document.getElementById('dossier-classification').textContent = finalClassification.toUpperCase();
  document.getElementById('dossier-rating').textContent = finalGrade;
  document.getElementById('dossier-carbon-val').textContent = finalScore.toFixed(1);
  
  // Map description
  const descLabel = document.getElementById('dossier-rating-description');
  if (finalGrade === 'A') descLabel.textContent = "High efficiency biosphere sync profile.";
  else if (finalGrade === 'B') descLabel.textContent = "Sustainable baseline footprint profile.";
  else if (finalGrade === 'C') descLabel.textContent = "Moderate carbon load. Reforestation needed.";
  else descLabel.textContent = "Critical ecological deficit. High threat index.";
  
  // Generate recommendations
  const recContainer = document.getElementById('dossier-recommendations');
  recContainer.innerHTML = '';
  
  // Recommendations generation
  if (answers[1] && answers[1].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-car text-red"></i>
        <div>
          <strong>Transit Grid Optimization</strong>
          <p>Replace single-commute vehicular loads. Shift 3 trips weekly to transit rails to save 1.5t CO₂/yr.</p>
        </div>
      </div>
    `;
  }
  if (answers[2] && answers[2].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-bolt text-red"></i>
        <div>
          <strong>Power Grid Insulating</strong>
          <p>Switch shelter utilities to a certified renewable resource. Install smart insulation arrays.</p>
        </div>
      </div>
    `;
  }
  if (answers[3] && answers[3].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-utensils text-red"></i>
        <div>
          <strong>Dietary Biomass Calibrating</strong>
          <p>Integrate 3 meatless plant-based days weekly to shrink nitrogen pollution footprint by 40%.</p>
        </div>
      </div>
    `;
  }
  if (answers[4] && answers[4].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-trash text-red"></i>
        <div>
          <strong>Compost and Sorting Loop</strong>
          <p>Divert organic compost cells away from landfills to stop high-methane gas leaks.</p>
        </div>
      </div>
    `;
  }
  if (answers[5] && answers[5].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-droplet text-red"></i>
        <div>
          <strong>Hydraulic Flow Restrictions</strong>
          <p>Add flow aerators to bathroom valves and limit orbital shower times below 5 minutes.</p>
        </div>
      </div>
    `;
  }
  if (answers[6] && answers[6].selection === 'heavy') {
    recContainer.innerHTML += `
      <div class="recommendation-item">
        <i class="fa-solid fa-bag-shopping text-red"></i>
        <div>
          <strong>Circular Consumer Purchase</strong>
          <p>Engage secondary trade networks and repair nodes. Halt fast electronics replacements.</p>
        </div>
      </div>
    `;
  }
  
  // If recommendations empty (user answered perfectly), add default green vanguards
  if(recContainer.innerHTML === '') {
    recContainer.innerHTML = `
      <div class="recommendation-item">
        <i class="fa-solid fa-seedling text-green"></i>
        <div>
          <strong>Pristine Guardian Profile Locked</strong>
          <p>Your lifestyle emissions are exemplary. Focus on deploying simulation wind turbine masts to spread green energy to neighboring grids!</p>
        </div>
      </div>
    `;
  }
  
  // Fade in final results panel
  gsap.to('#phase-progress', {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      document.getElementById('phase-progress').style.display = 'none';
      const resultsPhase = document.getElementById('phase-results');
      resultsPhase.style.display = 'block';
      gsap.to(resultsPhase, { opacity: 1, duration: 0.4 });
      
      // Animate score counter numbers ticking up
      let scoreObj = { val: 0.0 };
      gsap.to(scoreObj, {
        val: finalScore,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => {
          document.getElementById('dossier-carbon-val').textContent = scoreObj.val.toFixed(1);
        }
      });
      
      initSoundListeners();
    }
  });
}

function completeOnboarding() {
  playClickSound();
  
  // Commit stats via AJAX then redirect
  fetch('/api/save-scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      carbonScore: finalScore,
      rating: finalGrade,
      classification: finalClassification
    })
  })
  .then(response => response.json())
  .then(data => {
    if(data.success) {
      // Fade transition overlay
      const transition = document.getElementById('logo-nav-transition');
      if (transition) {
        transition.classList.add('active');
      }
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    }
  })
  .catch(err => {
    console.error("Onboarding saving error:", err);
    window.location.href = '/'; // Fallback redirect anyway
  });
}

// Initializer
window.addEventListener('DOMContentLoaded', () => {
  initHologramEarth();
  initSoundListeners();
  
  // Instantly show the global logo navigation on the onboarding scan page
  document.body.classList.add('boot-complete');
  
  // Set date details in feed
  const feed = document.getElementById('scan-telemetry-list');
  const dateLine = document.createElement('div');
  dateLine.className = 'telemetry-item';
  dateLine.innerHTML = `
    <span class="telemetry-lbl">SYSTEM SEC</span>
    <span class="telemetry-val" style="color: var(--accent-cyan);">${new Date().toLocaleDateString()}</span>
  `;
  feed.appendChild(dateLine);
});
