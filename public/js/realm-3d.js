// EcoRealm 3D floating island ecosystem engine - Redesigned for AAA Game Theme
let scene, camera, renderer, controls;
let islandGroup, starfieldGroup, particleSystem;
let treesArray = [];
let flowersArray = [];
let solarPanelsArray = [];
let windTurbinesArray = [];
let cloudsArray = [];

let grassMaterial, waterMaterial, gridHelper;
let islandData = {
  trees: 0,
  flowers: 0,
  waterCleanliness: 0,
  meadowGreenness: 0,
  solarPanels: 0,
  windTurbines: 0
};

// Toggle States
let gridVisible = true;
let isNight = false;
let ambientLight, dirLight;

function initRealm3D(canvasId, initialData) {
  islandData = { ...initialData };
  const container = document.getElementById(canvasId).parentElement;
  
  // Create scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03050c, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 10, 18);

  // Renderer
  const canvasElement = document.getElementById(canvasId);
  renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
  controls.minDistance = 6;
  controls.maxDistance = 28;

  // Lights
  ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0x00f0ff, 1.4); // Holographic cyan sunlight
  dirLight.position.set(12, 18, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  const d = 10;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  // Secondary neon green fill light
  const fillLight = new THREE.DirectionalLight(0x39ff14, 0.5);
  fillLight.position.set(-10, 10, -10);
  scene.add(fillLight);

  // Island base group
  islandGroup = new THREE.Group();
  scene.add(islandGroup);

  createIslandBase();
  createClouds();
  createStarfield();
  createHologramGrid();
  createEnergyParticles();
  
  // Spawn initial assets
  syncAssets();

  // Animation Loop
  const animate = function () {
    requestAnimationFrame(animate);

    // Rotate the island slowly
    islandGroup.rotation.y += 0.0012;

    // Rotate wind turbines
    windTurbinesArray.forEach(turbine => {
      if (turbine.userData && turbine.userData.blades) {
        turbine.userData.blades.rotation.z += 0.045;
      }
    });

    // Move clouds
    cloudsArray.forEach(cloud => {
      cloud.rotation.y -= 0.002;
    });

    // Orbit stars slowly in reverse
    if (starfieldGroup) {
      starfieldGroup.rotation.y -= 0.0003;
      starfieldGroup.rotation.x += 0.0001;
    }

    // Animate energy particles
    animateParticles();

    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  // Debounced resize listener
  let _realmResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(_realmResizeTimer);
    _realmResizeTimer = setTimeout(onWindowResize, 150);
  }, false);
}


function onWindowResize() {
  const container = document.getElementById('realm-canvas').parentElement;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Draw the core floating island cylinders (soil + grass) and water body
function createIslandBase() {
  // 1. Soil / Earth Base
  const baseGeom = new THREE.CylinderGeometry(5.2, 4.0, 3.2, 6, 1);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111625,
    roughness: 0.8,
    metalness: 0.3,
    flatShading: true
  });
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = -1.6;
  baseMesh.receiveShadow = true;
  islandGroup.add(baseMesh);

  // 2. Grass Top
  const grassGeom = new THREE.CylinderGeometry(5.3, 5.2, 0.4, 6, 1);
  grassMaterial = new THREE.MeshStandardMaterial({
    color: getGrassColor(islandData.meadowGreenness),
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true
  });
  const grassMesh = new THREE.Mesh(grassGeom, grassMaterial);
  grassMesh.position.y = 0.2;
  grassMesh.receiveShadow = true;
  grassMesh.castShadow = true;
  islandGroup.add(grassMesh);

  // 3. Water body surrounding the island
  const waterGeom = new THREE.CylinderGeometry(8.0, 7.8, 0.8, 16, 1);
  waterMaterial = new THREE.MeshStandardMaterial({
    color: getWaterColor(islandData.waterCleanliness),
    transparent: true,
    opacity: 0.70,
    roughness: 0.1,
    metalness: 0.8,
    flatShading: true
  });
  const waterMesh = new THREE.Mesh(waterGeom, waterMaterial);
  waterMesh.position.y = -0.6;
  islandGroup.add(waterMesh);
}

// Helpers to interpolate material colors based on state
function getGrassColor(greenness) {
  // Lerp between dry steel/brown (0x242838) and neon green (0x39ff14)
  const ratio = greenness / 100;
  const cStart = new THREE.Color(0x182030);
  const cEnd = new THREE.Color(0x00ff66);
  return cStart.clone().lerp(cEnd, ratio);
}

function getWaterColor(cleanliness) {
  // Lerp between polluted toxic purple/dark (0x2a143a) and pristine cyan glow (0x00f0ff)
  const ratio = cleanliness / 100;
  const cStart = new THREE.Color(0x1b0a24);
  const cEnd = new THREE.Color(0x00d0ff);
  return cStart.clone().lerp(cEnd, ratio);
}

// Create slow-moving cloud ring
function createClouds() {
  const cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  cloudsArray.push(cloudsGroup);

  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    roughness: 0.9,
    transparent: true,
    opacity: 0.35,
    flatShading: true
  });

  // Spawn 3 cloud clusters
  for (let i = 0; i < 3; i++) {
    const cluster = new THREE.Group();
    const radius = 9 + Math.random() * 2;
    const angle = (i * Math.PI * 2) / 3;
    
    cluster.position.set(Math.cos(angle) * radius, 3 + Math.random() * 1.5, Math.sin(angle) * radius);

    // Create blobs for each cloud
    const count = 3 + Math.floor(Math.random() * 2);
    for (let j = 0; j < count; j++) {
      const size = 0.5 + Math.random() * 0.5;
      const blobGeom = new THREE.DodecahedronGeometry(size, 1);
      const blob = new THREE.Mesh(blobGeom, cloudMaterial);
      blob.position.set(
        (Math.random() - 0.5) * 1.0,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 1.0
      );
      cluster.add(blob);
    }

    cloudsGroup.add(cluster);
  }
}

// Create Holographic Space star field
function createStarfield() {
  starfieldGroup = new THREE.Group();
  scene.add(starfieldGroup);

  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 400;
  const starPositions = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount * 3; i += 3) {
    // Distribute randomly in a large sphere
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 35 + Math.random() * 15; // Distant space

    starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i + 2] = r * Math.cos(phi);
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starsMaterial = new THREE.PointsMaterial({
    color: 0x00f0ff,
    size: 0.15,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true
  });

  const starPoints = new THREE.Points(starsGeometry, starsMaterial);
  starfieldGroup.add(starPoints);
}

// Create Hologram Grid Matrix below the island
function createHologramGrid() {
  gridHelper = new THREE.GridHelper(24, 24, 0x00f0ff, 0x00f0ff);
  gridHelper.position.y = -3.5;
  // Apply opacity to material
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);
}

// Create floating ecosystem energy particles
function createEnergyParticles() {
  const particleCount = 60;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    // Circular distribution around grass level
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 3.5;
    
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.4 + Math.random() * 3.0; // Y
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    
    velocities.push({
      y: 0.01 + Math.random() * 0.02,
      angleSpeed: 0.005 + Math.random() * 0.01,
      angle: angle,
      radius: radius
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x39ff14, // Neon green energy
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true
  });

  particleSystem = new THREE.Points(geometry, material);
  particleSystem.userData = { velocities: velocities };
  scene.add(particleSystem);
}

// Animate floating particles rising and orbiting
function animateParticles() {
  if (!particleSystem) return;
  const positions = particleSystem.geometry.attributes.position.array;
  const velocities = particleSystem.userData.velocities;
  const count = positions.length / 3;

  for (let i = 0; i < count; i++) {
    const vel = velocities[i];
    
    // Rise up
    positions[i * 3 + 1] += vel.y;
    
    // Rotate / Orbit
    vel.angle += vel.angleSpeed;
    positions[i * 3] = Math.cos(vel.angle) * vel.radius;
    positions[i * 3 + 2] = Math.sin(vel.angle) * vel.radius;

    // Reset if too high
    if (positions[i * 3 + 1] > 5) {
      positions[i * 3 + 1] = 0.4;
      vel.angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(vel.angle) * vel.radius;
      positions[i * 3 + 2] = Math.sin(vel.angle) * vel.radius;
    }
  }
  
  particleSystem.geometry.attributes.position.needsUpdate = true;
}

// Tree Asset Constructor
function createTreeMesh() {
  const tree = new THREE.Group();
  
  // Trunk
  const trunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.4;
  trunk.castShadow = true;
  tree.add(trunk);

  // Foliage (stacked geometric cones, neon green edges)
  const foliageMat = new THREE.MeshStandardMaterial({ 
    color: 0x00ff66, 
    roughness: 0.6,
    metalness: 0.1,
    flatShading: true 
  });
  
  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 5), foliageMat);
  cone1.position.y = 1.1;
  cone1.castShadow = true;
  tree.add(cone1);

  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.8, 5), foliageMat);
  cone2.position.y = 1.6;
  cone2.castShadow = true;
  tree.add(cone2);

  // Set initial scale to 0 for spawn animation
  tree.scale.set(0.001, 0.001, 0.001);
  return tree;
}

// Flower Asset Constructor
function createFlowerMesh() {
  const flower = new THREE.Group();

  const stemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x00ff66 });
  const stem = new THREE.Mesh(stemGeom, stemMat);
  stem.position.y = 0.15;
  flower.add(stem);

  // Flower head - neon colors
  const colors = [0x00f0ff, 0x39ff14, 0xff00ff, 0xffcc00];
  const randColor = colors[Math.floor(Math.random() * colors.length)];
  const petalGeom = new THREE.SphereGeometry(0.08, 5, 5);
  const petalMat = new THREE.MeshStandardMaterial({ color: randColor, flatShading: true });
  const petal = new THREE.Mesh(petalGeom, petalMat);
  petal.position.y = 0.3;
  flower.add(petal);

  flower.scale.set(0.001, 0.001, 0.001);
  return flower;
}

// Solar Panel Asset Constructor
function createSolarPanelMesh() {
  const panel = new THREE.Group();

  // Stand
  const standGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.1 });
  const stand = new THREE.Mesh(standGeom, standMat);
  stand.position.y = 0.3;
  stand.castShadow = true;
  panel.add(stand);

  // Grid plate
  const plateGeom = new THREE.BoxGeometry(0.8, 0.08, 0.5);
  const plateMat = new THREE.MeshStandardMaterial({ 
    color: 0x00f0ff, 
    roughness: 0.05, 
    metalness: 0.95
  });
  const plate = new THREE.Mesh(plateGeom, plateMat);
  plate.position.y = 0.65;
  plate.rotation.x = 0.45; // Tilts toward sun
  plate.castShadow = true;
  panel.add(plate);

  panel.scale.set(0.001, 0.001, 0.001);
  return panel;
}

// Wind Turbine Asset Constructor
function createWindTurbineMesh() {
  const turbine = new THREE.Group();

  // Mast
  const mastGeom = new THREE.CylinderGeometry(0.05, 0.1, 2.5, 6);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5 });
  const mast = new THREE.Mesh(mastGeom, mastMat);
  mast.position.y = 1.25;
  mast.castShadow = true;
  turbine.add(mast);

  // Head
  const headGeom = new THREE.BoxGeometry(0.15, 0.15, 0.3);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
  const head = new THREE.Mesh(headGeom, headMat);
  head.position.set(0, 2.5, 0.08);
  head.castShadow = true;
  turbine.add(head);

  // Rotor Blades Group
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 2.5, 0.24);

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.1, metalness: 0.8 });
  for (let i = 0; i < 3; i++) {
    const bladeGeom = new THREE.BoxGeometry(0.06, 0.9, 0.02);
    const blade = new THREE.Mesh(bladeGeom, bladeMat);
    blade.position.y = 0.45;
    
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI * 2) / 3;
    pivot.add(blade);
    bladesGroup.add(pivot);
  }
  turbine.add(bladesGroup);
  turbine.userData = { blades: bladesGroup };

  turbine.scale.set(0.001, 0.001, 0.001);
  return turbine;
}

// Get random coordinates on the circular grass surface
function getRandomIslandCoords() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.2 + Math.random() * 3.3; // Avoid center & edges
  return {
    x: Math.cos(angle) * radius,
    y: 0.4,
    z: Math.sin(angle) * radius
  };
}

// Animate mesh growth (scale 0 -> 1)
function animateGrowth(mesh) {
  let scale = 0.001;
  const growthInterval = setInterval(() => {
    scale += 0.05;
    if (scale >= 1.0) {
      mesh.scale.set(1, 1, 1);
      clearInterval(growthInterval);
    } else {
      mesh.scale.set(scale, scale, scale);
    }
  }, 16);
}

// Sync counts and animate differences
function syncAssets() {
  adjustAssetCount(treesArray, islandData.trees, createTreeMesh);
  adjustAssetCount(flowersArray, islandData.flowers, createFlowerMesh);
  adjustAssetCount(solarPanelsArray, islandData.solarPanels, createSolarPanelMesh);
  adjustAssetCount(windTurbinesArray, islandData.windTurbines, createWindTurbineMesh);
}

function adjustAssetCount(array, targetCount, constructorFunc) {
  if (array.length < targetCount) {
    const diff = targetCount - array.length;
    for (let i = 0; i < diff; i++) {
      const mesh = constructorFunc();
      const coords = getRandomIslandCoords();
      mesh.position.set(coords.x, coords.y, coords.z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      islandGroup.add(mesh);
      array.push(mesh);
      animateGrowth(mesh);
    }
  } else if (array.length > targetCount) {
    const diff = array.length - targetCount;
    for (let i = 0; i < diff; i++) {
      const mesh = array.pop();
      islandGroup.remove(mesh);
    }
  }
}

// Public update hook
function updateRealm3D(newData) {
  islandData = { ...newData };

  // Update base material colors smoothly
  if (grassMaterial) {
    const newGrassColor = getGrassColor(islandData.meadowGreenness);
    gsap.to(grassMaterial.color, {
      r: newGrassColor.r,
      g: newGrassColor.g,
      b: newGrassColor.b,
      duration: 1.5
    });
  }

  if (waterMaterial) {
    const newWaterColor = getWaterColor(islandData.waterCleanliness);
    gsap.to(waterMaterial.color, {
      r: newWaterColor.r,
      g: newWaterColor.g,
      b: newWaterColor.b,
      duration: 1.5
    });
  }

  // Adjust energy particles opacity based on greenness
  if (particleSystem) {
    const targetOpacity = Math.max(0.2, (islandData.meadowGreenness + islandData.waterCleanliness) / 200);
    gsap.to(particleSystem.material, { opacity: targetOpacity, duration: 1.0 });
  }

  // Update dynamic meshes
  syncAssets();
}

// Interactive Simulation HUD parameter controls
function toggleScanlines() {
  const scan = document.querySelector('.scanline');
  const btn = document.getElementById('btn-toggle-scanlines');
  if (scan.style.display === 'none') {
    scan.style.display = 'block';
    btn.textContent = "Scanlines: ON";
    btn.classList.add('active');
  } else {
    scan.style.display = 'none';
    btn.textContent = "Scanlines: OFF";
    btn.classList.remove('active');
  }
}

function toggleSimulationLighting() {
  isNight = !isNight;
  const btn = document.getElementById('btn-toggle-lighting');
  
  if (isNight) {
    // Night lighting: deep navy, low ambient light
    gsap.to(ambientLight, { intensity: 0.15, duration: 1.5 });
    gsap.to(dirLight, { intensity: 0.3, duration: 1.5 });
    gsap.to(scene.fog, { color: 0x010307, density: 0.02, duration: 1.5 });
    if (renderer) renderer.setClearColor(0x010307);
    btn.textContent = "Day/Night: NIGHT";
    btn.classList.add('active');
  } else {
    // Day lighting: cyan/green fills, high ambient
    gsap.to(ambientLight, { intensity: 0.55, duration: 1.5 });
    gsap.to(dirLight, { intensity: 1.4, duration: 1.5 });
    gsap.to(scene.fog, { color: 0x03050c, density: 0.015, duration: 1.5 });
    if (renderer) renderer.setClearColor(0x03050c);
    btn.textContent = "Day/Night: DAY";
    btn.classList.remove('active');
  }
}

/**
 * Updates the 3D island scene based on the user's carbon score, offset level, and shop upgrades.
 * Called from dashboard.js when user data is loaded or updated.
 * @param {number} carbonKg - User's current carbon footprint in kg CO2e.
 * @param {number} offsetLevel - User's offset level (0–100), reflecting eco-actions taken.
 * @param {object} shopUpgrades - Object containing purchased island assets.
 */
function updateRealmFromCarbonScore(carbonKg, offsetLevel, shopUpgrades = {}) {
  if (!scene) return; // Guard: only update if scene is initialized

  // Normalize offset to 0–100 proxy
  const cleanness = Math.min(100, Math.max(0, offsetLevel || 0));

  // Compute greenness: higher offset + shop upgrades = greener
  const greenness = Math.min(100, cleanness + (shopUpgrades.meadowGreenness || 0));
  const waterClean = Math.min(100, cleanness + (shopUpgrades.waterCleanliness || 0));

  // Compute smog density: high carbon = dense smog, low carbon = clear atmosphere
  // carbonKg range: 0 (pristine) – 20,000+ kg (very polluted); normalize to 0.005–0.04
  const normalizedCarbon = Math.min(1, carbonKg / 15000);
  const fogDensity = 0.005 + normalizedCarbon * 0.035;

  // Update atmospheric fog
  if (scene.fog) {
    gsap.to(scene.fog, { density: fogDensity, duration: 2.0 });
  }

  // Compute smog color: clean (dark space #03050c) -> polluted (grey-brown #2a2218)
  const r = Math.floor(3 + normalizedCarbon * 39);
  const g = Math.floor(5 + normalizedCarbon * 29);
  const b = Math.floor(12 + normalizedCarbon * 12);
  if (renderer) {
    renderer.setClearColor(new THREE.Color(`rgb(${r},${g},${b})`));
  }

  // Update grass and water based on offset level
  if (grassMaterial) {
    const newGrassColor = getGrassColor(greenness);
    gsap.to(grassMaterial.color, { r: newGrassColor.r, g: newGrassColor.g, b: newGrassColor.b, duration: 2.0 });
  }
  if (waterMaterial) {
    const newWaterColor = getWaterColor(waterClean);
    gsap.to(waterMaterial.color, { r: newWaterColor.r, g: newWaterColor.g, b: newWaterColor.b, duration: 2.0 });
  }

  // Update islandData and sync trees/assets
  islandData.meadowGreenness = greenness;
  islandData.waterCleanliness = waterClean;

  // Combine shop upgrades and carbon offset rewards
  islandData.trees = (shopUpgrades.trees || 0) + Math.min(8, Math.floor(cleanness / 12.5));
  islandData.flowers = shopUpgrades.flowers || 0;
  islandData.solarPanels = shopUpgrades.solarPanels || 0;
  islandData.windTurbines = shopUpgrades.windTurbines || 0;

  syncAssets();
}

// Expose to global scope for dashboard.js consumption
window.updateRealmFromCarbonScore = updateRealmFromCarbonScore;

