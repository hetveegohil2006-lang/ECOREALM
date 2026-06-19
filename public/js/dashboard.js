document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTS & TELEMETRY REGISTRY ---
  const levelVal = document.getElementById('level-val');
  const coinVal = document.getElementById('coin-val');
  const carbonVal = document.getElementById('carbon-val');
  const waterVal = document.getElementById('water-val');
  const energyVal = document.getElementById('energy-val');
  
  const xpVal = document.getElementById('xp-val');
  const xpBar = document.getElementById('xp-bar');
  const levelUpToast = document.getElementById('level-up-toast');
  const toastLevelVal = document.getElementById('toast-level-val');
  
  const waterPill = document.getElementById('water-pill-val');
  const meadowPill = document.getElementById('meadow-pill-val');

  let currentLevel = window.initialLevel || 1;

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  let audioCtx = null;
  let isAudioActive = true;

  function initAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSynth(freq, type, duration, vol = 0.1) {
    if (!isAudioActive) return;
    try {
      initAudioCtx();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio failed to execute:", e);
    }
  }

  function playHover() { playSynth(800, 'sine', 0.05, 0.02); }
  function playClick() { playSynth(350, 'triangle', 0.1, 0.06); }
  function playSuccess() {
    playSynth(440, 'sine', 0.15, 0.06);
    setTimeout(() => playSynth(554, 'sine', 0.15, 0.06), 120);
    setTimeout(() => playSynth(659, 'sine', 0.3, 0.06), 240);
  }

  window.playClickSound = playClick;

  window.toggleAudioSystem = () => {
    isAudioActive = !isAudioActive;
    const sw = document.getElementById('audio-toggle-switch');
    if (isAudioActive) {
      sw.classList.add('active');
      playSuccess();
    } else {
      sw.classList.remove('active');
    }
  };

  // --- INITIAL 3D SCENE SYNC ---
  if (window.initialIslandData && typeof initRealm3D === 'function') {
    initRealm3D('realm-canvas', window.initialIslandData);
    updateXPBar(window.initialXP);
    
    // Draw initial avatar
    const avatarBox = document.getElementById('avatar-svg-container');
    if(avatarBox) {
      avatarBox.innerHTML = renderAvatarSVG(getAvatarTier(currentLevel).tier);
    }
    
    // Check initial achievements
    const mockUser = {
      level: window.initialLevel || 1,
      coins: window.initialCoins || 0,
      carbonOffset: window.initialCarbon || 0,
      waterSaved: window.initialWater || 0,
      energyConserved: window.initialEnergy || 0,
      netZeroUnlocked: window.netZeroUnlocked || false,
      island: window.initialIslandData,
      history: []
    };
    checkAchievementsLocal(mockUser);
  }

  // --- TABS MATRIX MANAGER (GSAP TRANSITIONS) ---
  window.switchTab = (tabId) => {
    playClick();
    
    const activeBtn = document.querySelector('.hud-tab-btn.active');
    const targetBtn = document.querySelector(`.hud-tab-btn[onclick="switchTab('${tabId}')"]`);
    const activeScreen = document.querySelector('.hud-viewport-screen.active');
    const targetScreen = document.getElementById(`screen-${tabId}`);
    
    if (activeScreen === targetScreen) return;

    // Switch Active Button
    if (activeBtn) activeBtn.classList.remove('active');
    if (targetBtn) targetBtn.classList.add('active');

    // Swap Viewport Screens
    gsap.to(activeScreen, {
      opacity: 0,
      scale: 0.98,
      duration: 0.25,
      onComplete: () => {
        activeScreen.classList.remove('active');
        targetScreen.classList.add('active');
        gsap.fromTo(targetScreen, 
          { opacity: 0, scale: 0.98 },
          { opacity: 1, scale: 1, duration: 0.3 }
        );
      }
    });

    // Special Tab Initialization Actions
    if (tabId === 'profile') {
      // Re-trigger stats query
      const pCoins = document.getElementById('profile-stat-coins');
      const pLevel = document.getElementById('profile-stat-level');
      if (pCoins) pCoins.textContent = coinVal.textContent;
      if (pLevel) pLevel.textContent = levelVal.textContent;
    } else if (tabId === 'community') {
      renderLeaderboard('global');
    }
  };

  // Attach hover sounds to active buttons
  function attachHUDHoverSounds() {
    document.querySelectorAll('.hud-tab-btn, .btn-switch-hud, .btn-challenge-action, .btn-buy, .btn-hud-logout, .arcade-card, .intel-close-btn, .shop-buy-btn').forEach(btn => {
      if (!btn.dataset.hoverSound) {
        btn.addEventListener('mouseenter', playHover);
        btn.dataset.hoverSound = "true";
      }
    });
  }
  attachHUDHoverSounds();

  // --- RPG AVATAR PROGRESSION DATA ---
  function getAvatarTier(level) {
    if (level >= 50) return { name: 'Planet Savior', tier: 6 };
    if (level >= 30) return { name: 'Earth Defender', tier: 5 };
    if (level >= 20) return { name: 'Climate Ranger', tier: 4 };
    if (level >= 10) return { name: 'Forest Protector', tier: 3 };
    if (level >= 5) return { name: 'Sprout Keeper', tier: 2 };
    return { name: 'Seed Guardian', tier: 1 };
  }

  function renderAvatarSVG(tier) {
    if (tier === 6) { // Planet Savior
      return `
        <svg width="100%" height="100%" viewBox="0 0 100 100" style="filter: drop-shadow(0 0 8px var(--accent-green-glow));">
          <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="var(--accent-green)" stroke-width="2" />
          <path d="M50 12 L59 38 L87 38 L65 54 L73 80 L50 64 L27 80 L35 54 L13 38 L41 38 Z" fill="rgba(57,255,20,0.18)" stroke="var(--accent-green)" stroke-width="2" />
          <circle cx="50" cy="50" r="12" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-dasharray="4 2" />
          <path d="M50 5 L50 95" stroke="rgba(0,240,255,0.35)" stroke-width="1" />
          <path d="M5 50 L95 50" stroke="rgba(0,240,255,0.35)" stroke-width="1" />
          <circle cx="50" cy="50" r="4" fill="var(--accent-cyan)" />
        </svg>
      `;
    }
    if (tier === 5) { // Earth Defender
      return `
        <svg width="100%" height="100%" viewBox="0 0 100 100" style="filter: drop-shadow(0 0 6px var(--accent-cyan-glow));">
          <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="var(--accent-cyan)" stroke-width="2" />
          <circle cx="50" cy="50" r="28" fill="rgba(0,240,255,0.06)" stroke="var(--accent-cyan)" stroke-dasharray="6 4" stroke-width="1.5" />
          <path d="M50 26 C36 26 26 36 26 50 C26 64 36 74 50 74 C64 74 74 64 74 50 C74 36 64 26 50 26 Z" fill="none" stroke="var(--accent-green)" stroke-width="2" />
          <line x1="32" y1="50" x2="68" y2="50" stroke="rgba(57,255,20,0.5)" stroke-width="2" />
          <line x1="50" y1="32" x2="50" y2="68" stroke="rgba(57,255,20,0.5)" stroke-width="2" />
        </svg>
      `;
    }
    if (tier === 4) { // Climate Ranger
      return `
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="var(--accent-cyan)" stroke-width="1.5" />
          <rect x="36" y="36" width="28" height="28" rx="4" fill="rgba(57,255,20,0.08)" stroke="var(--accent-green)" stroke-width="2" />
          <circle cx="50" cy="50" r="18" fill="none" stroke="var(--accent-cyan)" stroke-width="1" stroke-dasharray="2 4" />
          <line x1="50" y1="18" x2="50" y2="82" stroke="var(--accent-cyan)" opacity="0.6" />
          <line x1="18" y1="50" x2="82" y2="50" stroke="var(--accent-cyan)" opacity="0.6" />
        </svg>
      `;
    }
    if (tier === 3) { // Forest Protector
      return `
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="var(--accent-green)" stroke-width="1.5" />
          <path d="M50 18 L76 38 L70 76 L30 76 L24 38 Z" fill="rgba(57,255,20,0.05)" stroke="var(--accent-green)" stroke-width="2" />
          <path d="M50 32 L62 66 L38 66 Z" fill="var(--accent-cyan)" opacity="0.8" />
        </svg>
      `;
    }
    if (tier === 2) { // Sprout Keeper
      return `
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="rgba(57,255,20,0.5)" stroke-width="1" />
          <path d="M50 78 C50 60 40 45 42 36 C44 26 50 22 50 22 C50 22 56 26 58 36 C60 45 50 60 50 78 Z" fill="rgba(57,255,20,0.2)" stroke="var(--accent-green)" stroke-width="2.5" />
          <path d="M36 50 C44 46 48 53 48 53" stroke="var(--accent-green)" stroke-width="1.5" fill="none" />
          <path d="M64 50 C56 46 52 53 52 53" stroke="var(--accent-green)" stroke-width="1.5" fill="none" />
        </svg>
      `;
    }
    // Tier 1: Seed Guardian
    return `
      <svg width="100%" height="100%" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="rgba(8,12,24,0.6)" stroke="rgba(0,240,255,0.2)" stroke-width="1" />
        <circle cx="50" cy="50" r="14" fill="rgba(0,240,255,0.08)" stroke="var(--accent-cyan)" stroke-width="2" />
        <circle cx="50" cy="50" r="5" fill="var(--accent-green)" />
        <path d="M50 18 A32 32 0 0 1 82 50" fill="none" stroke="rgba(0,240,255,0.3)" stroke-width="1" />
        <path d="M50 82 A32 32 0 0 1 18 50" fill="none" stroke="rgba(0,240,255,0.3)" stroke-width="1" />
      </svg>
    `;
  }

  // --- GLOBAL STATS UI SYNC ---
  function syncGlobalUI(user) {
    levelVal.textContent = user.level;
    coinVal.textContent = user.coins;
    carbonVal.textContent = user.carbonOffset.toFixed(1);
    waterVal.textContent = user.waterSaved.toFixed(0);
    energyVal.textContent = user.energyConserved.toFixed(1);

    // Profile and ticker metrics
    document.getElementById('hud-username-val').textContent = user.username;
    document.getElementById('rank-val').textContent = user.rank;
    
    const pCoins = document.getElementById('profile-stat-coins');
    const pLevel = document.getElementById('profile-stat-level');
    if (pCoins) pCoins.textContent = user.coins;
    if (pLevel) pLevel.textContent = user.level;

    const pUsername = document.getElementById('profile-username-lbl');
    const pRank = document.getElementById('profile-rank-lbl');
    if (pUsername) pUsername.textContent = user.username;
    if (pRank) pRank.textContent = user.rank;

    // Custom title display update
    const titleLabel = document.getElementById('profile-custom-title-display');
    if (titleLabel) {
      titleLabel.textContent = user.customTitleBought ? "COMMAND MODIFIERS DETECTED" : "SYSTEM RANK BASELINE ACTIVE";
    }

    // Unlocked region button sync
    const regionBtn = document.getElementById('shop-buy-region-btn');
    if (regionBtn) {
      if (user.netZeroUnlocked) {
        regionBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Link Active';
        regionBtn.disabled = true;
        regionBtn.classList.add('disabled');
      } else {
        regionBtn.innerHTML = '<i class="fa-solid fa-coins"></i> 150 Coins';
        regionBtn.disabled = false;
        regionBtn.classList.remove('disabled');
      }
    }

    // RPG stats update
    const pCarbon = document.getElementById('profile-impact-carbon');
    const pWater = document.getElementById('profile-impact-water');
    const pEnergy = document.getElementById('profile-impact-energy');
    if (pCarbon) pCarbon.textContent = user.carbonOffset.toFixed(1);
    if (pWater) pWater.textContent = user.waterSaved.toFixed(0);
    if (pEnergy) pEnergy.textContent = user.energyConserved.toFixed(1);

    // Update Avatar SVG
    const avatarBox = document.getElementById('avatar-svg-container');
    const currentTier = getAvatarTier(user.level).tier;
    if (avatarBox) {
      avatarBox.innerHTML = renderAvatarSVG(currentTier);
    }

    // Island pills
    waterPill.textContent = user.island.waterCleanliness;
    meadowPill.textContent = user.island.meadowGreenness;

    // 3D Telemetry overlays
    const treeCounter = document.getElementById('3d-trees-counter');
    const solarCounter = document.getElementById('3d-solar-counter');
    if (treeCounter) treeCounter.textContent = `> BIOMASS CORES: ${user.island.trees} TREES`;
    if (solarCounter) solarCounter.textContent = `> SOLAR ARRAY CONNECTIONS: ${user.island.solarPanels}`;

    updateXPBar(user.xp);

    // Check Achievements / Badges / Trophies
    checkAchievementsLocal(user);

    // Evolution Check
    const oldTier = getAvatarTier(currentLevel).tier;
    const newTier = getAvatarTier(user.level).tier;
    if (newTier > oldTier) {
      triggerAvatarEvolution(currentLevel, user.level);
    }
    currentLevel = user.level;

    // Dynamic 3D simulation refresh
    if (typeof updateRealm3D === 'function') {
      updateRealm3D(user.island);
    }
    attachHUDHoverSounds();
  }

  function updateXPBar(xp) {
    const progress = xp % 100;
    xpVal.textContent = progress;
    xpBar.style.width = `${progress}%`;
  }

  // RPG Level Up Toast Chime
  function triggerLevelUpHUD(level) {
    toastLevelVal.textContent = level;
    levelUpToast.classList.add('show');
    playSynth(523.25, 'sawtooth', 0.15, 0.08); // C5
    setTimeout(() => playSynth(659.25, 'sawtooth', 0.15, 0.08), 120); // E5
    setTimeout(() => playSynth(783.99, 'sawtooth', 0.15, 0.08), 240); // G5
    setTimeout(() => playSynth(1046.50, 'sawtooth', 0.4, 0.08), 360); // C6

    setTimeout(() => {
      levelUpToast.classList.remove('show');
    }, 4000);
  }

  // --- ACTIONS LOGGING (HABITS API) ---
  document.querySelectorAll('.btn-log').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.getAttribute('data-habit-id');
      try {
        const res = await fetch('/api/log-habit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ habitId })
        });
        const data = await res.json();
        if (data.success) {
          playSuccess();
          syncGlobalUI(data.user);
          
          // Log community telemetry feed mock entry
          addFeedLog(`Commander logged: [${data.user.history[0].name}] (+${data.user.history[0].coins} Coins)`);

          if (data.leveledUp) {
            triggerLevelUpHUD(data.user.level);
          }
        }
      } catch (err) {
        console.error("Habit log error:", err);
      }
    });
  });

  // --- ECO STORE DEPLOYMENTS API ---
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const upgradeId = btn.getAttribute('data-upgrade-id');
      try {
        const res = await fetch('/api/buy-upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upgradeId })
        });
        const data = await res.json();
        if (data.success) {
          playSuccess();
          syncGlobalUI(data.user);
          addFeedLog(`Commander deployed upgrade [${upgradeId.toUpperCase()}]`);
        } else {
          playSynth(200, 'sawtooth', 0.4, 0.08); // Fail buzz
          alert(data.error || "Insufficient energy coins!");
        }
      } catch (err) {
        console.error("Upgrade buy error:", err);
      }
    });
  });

  // --- RPG ACHIEVEMENT VALIDATOR ---
  function checkAchievementsLocal(user) {
    const level = user.level || 1;
    const carbon = user.carbonOffset || 0;
    const water = user.waterSaved || 0;
    const energy = user.energyConserved || 0;
    const trees = (user.island && user.island.trees) || 0;
    const flowers = (user.island && user.island.flowers) || 0;
    const netZero = user.netZeroUnlocked || false;
    
    // --- 10 BADGES CHECK ---
    
    // 1. Recycling Hero: Sor & Recycle logged
    const recycleCount = user.history.filter(h => h.name.includes("Recycle") || h.name.includes("Sort")).length;
    if (recycleCount >= 1 || user.island.waterCleanliness > 35) {
      unlockBadge('recycling-hero');
    }
    
    // 2. Water Warrior: Water Saved > 100 L
    if (water >= 100) {
      unlockBadge('water-warrior');
    }
    
    // 3. Energy Saver: Energy Conserved >= 15 kWh
    if (energy >= 15) {
      unlockBadge('energy-saver');
    }
    
    // 4. Green Traveler: Log green travel
    const commuteCount = user.history.filter(h => h.name.includes("Commute") || h.name.includes("Transit")).length;
    if (commuteCount >= 1 || user.island.meadowGreenness > 35) {
      unlockBadge('green-traveler');
    }
    
    // 5. Tree Guardian: Virtual trees planted >= 3
    if (trees >= 3) {
      unlockBadge('tree-guardian');
    }
    
    // 6. Ocean Protector: OceanCleanup game reward logged
    const oceanCount = user.history.filter(h => h.name.includes("Ocean") || h.name.includes("Cleanup")).length;
    if (oceanCount >= 1) {
      unlockBadge('ocean-protector');
    }
    
    // 7. Wildlife Defender: Wildflowers planted >= 2
    if (flowers >= 2) {
      unlockBadge('wildlife-defender');
    }
    
    // 8. Climate Champion: Carbon offset >= 20 kg
    if (carbon >= 20.0) {
      unlockBadge('climate-champion');
    }
    
    // 9. Sustainability Master: Complete scan diagnostic
    const scanCount = user.history.filter(h => h.name.includes("Initialized") || h.name.includes("Scan")).length;
    if (scanCount >= 1) {
      unlockBadge('sustainability-master');
    }
    
    // 10. Planet Savior: Level >= 50
    if (level >= 50) {
      unlockBadge('planet-savior');
    }
    
    // --- 6 TROPHIES CHECK ---
    
    // Trophy 1: First Mission
    if (user.history.length > 0 || carbon > 0) {
      unlockTrophy('first-mission');
    }
    // Trophy 2: Reduce 100kg CO2 (or 50kg for balancing scale)
    if (carbon >= 50.0) {
      unlockTrophy('carbon-100');
    }
    // Trophy 3: Plant 50 Virtual Trees (let's use 10 for accessible gameplay scale)
    if (trees >= 10) {
      unlockTrophy('plant-50');
    }
    // Trophy 4: 10 logged actions in history
    if (user.history.length >= 10) {
      unlockTrophy('missions-30');
    }
    // Trophy 5: Elite ranking global
    if (level >= 10) {
      unlockTrophy('top-100');
    }
    // Trophy 6: Sector 6 key
    if (netZero) {
      unlockTrophy('sector-6');
    }
  }

  function unlockBadge(badgeId) {
    const badge = document.getElementById(`badge-${badgeId}`);
    if (badge && !badge.classList.contains('unlocked')) {
      badge.classList.add('unlocked');
      // Glow and expand
      gsap.fromTo(badge, { scale: 0.7, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out' });
    }
  }

  function unlockTrophy(trophyId) {
    const trophy = document.getElementById(`trophy-${trophyId}`);
    if (trophy && !trophy.classList.contains('unlocked')) {
      trophy.classList.add('unlocked');
      gsap.fromTo(trophy, { scale: 0.8, y: 12 }, { scale: 1, y: 0, duration: 0.5, ease: 'back.out' });
      playSynth(800, 'sine', 0.15, 0.02); // slight chime
    }
  }

  // --- AVATAR EVOLUTION CUTSCENE TRIGGERS ---
  function triggerAvatarEvolution(oldLvl, newLvl) {
    const cutscene = document.getElementById('evolution-cutscene');
    if (!cutscene) return;
    
    const prevTier = getAvatarTier(oldLvl);
    const newTier = getAvatarTier(newLvl);
    
    // Inject SVGs into cutscene morph
    document.getElementById('cutscene-prev-avatar').innerHTML = renderAvatarSVG(prevTier.tier);
    document.getElementById('cutscene-new-avatar').innerHTML = renderAvatarSVG(newTier.tier);
    document.getElementById('cutscene-rank-lbl').textContent = newTier.name.toUpperCase();
    
    // Play transition sounds
    playSynth(180, 'sawtooth', 0.8, 0.06);
    setTimeout(() => playSynth(300, 'triangle', 0.6, 0.08), 200);
    setTimeout(() => {
      // Full evolution major chord chime
      playSynth(523.25, 'sine', 0.8, 0.08); // C5
      playSynth(659.25, 'sine', 0.8, 0.08); // E5
      playSynth(783.99, 'sine', 0.8, 0.08); // G5
      playSynth(1046.50, 'sine', 1.0, 0.1);  // C6
    }, 500);

    // Trigger Laser sweep and show cutscene
    cutscene.style.display = 'flex';
    gsap.fromTo(cutscene, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    
    // Animate laser line sweep in cutscene
    const sweep = cutscene.querySelector('.evolution-laser-sweep');
    gsap.fromTo(sweep, { top: '-5%' }, { top: '105%', duration: 2.0, ease: 'power1.inOut' });
  }

  window.closeEvolutionCutscene = () => {
    playClick();
    const cutscene = document.getElementById('evolution-cutscene');
    gsap.to(cutscene, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        cutscene.style.display = 'none';
      }
    });
  };

  // --- RPG SHOP PURCHASES API ---
  window.buyXPBooster = async () => {
    playClick();
    try {
      const res = await fetch('/api/buy-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        syncGlobalUI(data.user);
        addFeedLog(`Commander purchased XP Quantum Booster (+100 XP)`);
        if (data.leveledUp) {
          triggerLevelUpHUD(data.user.level);
        }
      } else {
        playSynth(200, 'sawtooth', 0.4, 0.08); // Fail
        alert(data.error || "Insufficient energy coins!");
      }
    } catch(err) {
      console.error("XP purchase error:", err);
    }
  };

  window.unlockSector6 = async () => {
    playClick();
    try {
      const res = await fetch('/api/unlock-region', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        syncGlobalUI(data.user);
        addFeedLog(`Commander unlocked Sector 6 (Net-Zero Future Hub)`);
      } else {
        playSynth(200, 'sawtooth', 0.4, 0.08); // Fail
        alert(data.error || "Insufficient energy coins!");
      }
    } catch(err) {
      console.error("Region unlock error:", err);
    }
  };

  window.buyCustomTitle = async () => {
    playClick();
    const titleSelect = document.getElementById('custom-title-select');
    const title = titleSelect.value;
    try {
      const res = await fetch('/api/buy-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (data.success) {
        playSuccess();
        syncGlobalUI(data.user);
        addFeedLog(`Commander purchased rank title modifier: [${title}]`);
      } else {
        playSynth(200, 'sawtooth', 0.4, 0.08);
        alert(data.error || "Insufficient energy coins!");
      }
    } catch(err) {
      console.error("Title purchase error:", err);
    }
  };

  // --- DYNAMIC COMMUNITY FEED LOGS ---
  const feed = document.getElementById('community-feed');
  function addFeedLog(text) {
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'feed-item';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    item.innerHTML = `<span class="feed-timestamp">${timeStr}</span> ${text}`;
    feed.insertBefore(item, feed.firstChild);
    
    if (feed.children.length > 8) {
      feed.removeChild(feed.lastChild);
    }
  }

  // Mock Leaderboard Matrix
  const leaderboardDb = {
    global: [
      { rank: 1, name: "Commander Solar", level: 18, score: 2850 },
      { rank: 2, name: "Commander Leafy", level: 15, score: 2240 },
      { rank: 3, name: "Commander Aqua", level: 12, score: 1800 },
      { rank: 4, name: "EcoNovice99", level: 5, score: 620 }
    ],
    friends: [
      { rank: 1, name: "Commander Leafy", level: 15, score: 2240 },
      { rank: 2, name: "Commander Aqua", level: 12, score: 1800 },
      { rank: 3, name: "EcoNovice99", level: 5, score: 620 }
    ]
  };

  window.toggleLeaderboardType = (type) => {
    playClick();
    document.querySelectorAll('.btn-switch-hud[onclick^="toggleLeaderboardType"]').forEach(b => {
      b.classList.remove('active');
    });
    const clickedBtn = document.querySelector(`.btn-switch-hud[onclick="toggleLeaderboardType('${type}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    renderLeaderboard(type);
  };

  function renderLeaderboard(type) {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    body.innerHTML = "";
    
    // Add current user to leaderboard lists mock
    const list = [...leaderboardDb[type]];
    const userVal = document.getElementById('hud-username-val').textContent;
    const userLvl = parseInt(levelVal.textContent) || 1;
    const userCoins = parseInt(coinVal.textContent) || 0;
    
    list.push({ rank: list.length + 1, name: userVal, level: userLvl, score: userCoins * 10, isCurrentUser: true });
    list.sort((a,b) => b.score - a.score);

    list.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = item.isCurrentUser ? 'leaderboard-row current-user' : 'leaderboard-row';
      tr.innerHTML = `
        <td class="leaderboard-rank">#${index + 1}</td>
        <td>${item.name}</td>
        <td>LVL ${item.level}</td>
        <td style="color: var(--accent-yellow); font-family: var(--font-mono);">${item.score} pts</td>
      `;
      body.appendChild(tr);
    });
  }

  // --- PLANETARY WORLD MAP REGIONS DATABASE ---
  const mapRegions = {
    industrial: { name: "Industrial Restoration Zone", status: "CRITICAL POLLUTION", fill: "18%", desc: "Dismantling high carbon combustion foundries. Calibrating bio-filters to recycle heavy particulate residues.", statusClass: "polluted" },
    forest: { name: "Forest Conservation Zone", status: "RESTORING STATUS", fill: "42%", desc: "Launching drone seeder cells to coordinate complex canopy regeneration. Soil carbon levels rising smoothly.", statusClass: "restoring" },
    energy: { name: "Green Energy Zone", status: "STABLE ALIGNMENT", fill: "68%", desc: "Connecting tracker solar modules and kinetic wind masts directly to metropolitan grid conduits.", statusClass: "stable" },
    ocean: { name: "Ocean Cleanup Coast", status: "POLLUTION ALERT", fill: "30%", desc: "Navigating microplastic collection sweeps in primary harbors. Dissolved oxygen levels below baseline.", statusClass: "polluted" },
    wildlife: { name: "Wildlife Sanctuary", status: "SECURED CORES", fill: "75%", desc: "Telemetry tracking native fauna populations. Fences and migratory zones stable and shielded.", statusClass: "stable" },
    future: { name: "Net-Zero Future Hub", status: "INIT PHASE", fill: "5%", desc: "Setting up test carbon vacuum systems to extract greenhouse loads from urban corridors.", statusClass: "polluted" }
  };

  window.selectMapRegion = (regionId) => {
    playClick();
    const data = mapRegions[regionId];
    if (!data) return;

    // Reset previous selections SVG highlights
    document.querySelectorAll('.map-region-node').forEach(node => {
      node.style.stroke = "rgba(0, 240, 255, 0.3)";
    });
    
    const nodeEl = document.getElementById(`region-${regionId}`);
    if (nodeEl) {
      nodeEl.style.stroke = "var(--accent-cyan)";
    }

    // Populate Slide Overlay
    document.getElementById('intel-region-name').textContent = data.name;
    const statusEl = document.getElementById('intel-region-status');
    statusEl.textContent = data.status;
    statusEl.className = `intel-status ${data.statusClass}`;
    document.getElementById('intel-region-desc').textContent = data.desc;
    document.getElementById('intel-region-fill').style.width = data.fill;
    document.getElementById('intel-region-perc').textContent = data.fill;

    // Show Overlay
    document.getElementById('map-overlay-intel').classList.add('show');
  };

  window.closeMapRegion = () => {
    playClick();
    document.getElementById('map-overlay-intel').classList.remove('show');
    document.querySelectorAll('.map-region-node').forEach(node => {
      node.style.stroke = "rgba(0, 240, 255, 0.3)";
    });
  };

  // --- CARBON SCANNING BRIEFING WIZARD ---
  let carbonAnswers = {};
  let currentCarbonStep = 1;

  window.selectCarbonOption = (stepNum, optionId, score) => {
    playClick();
    
    // Toggle active state locally on buttons
    const stepCard = document.getElementById(`carbon-step-${stepNum}`);
    stepCard.querySelectorAll('.carbon-option-btn').forEach(btn => {
      btn.classList.remove('selected');
    });

    const target = event.currentTarget;
    target.classList.add('selected');

    carbonAnswers[stepNum] = { option: optionId, score: score };
    
    // Auto-advance with brief lag
    setTimeout(() => {
      slideCarbonStep(1);
    }, 300);
  };

  window.slideCarbonStep = (direction) => {
    if (direction === 1 && !carbonAnswers[currentCarbonStep] && currentCarbonStep < 5) {
      alert("Please initialize diagnostic selector scan first!");
      return;
    }
    
    playClick();
    const currentCard = document.getElementById(`carbon-step-${currentCarbonStep}`);
    
    let nextStep = currentCarbonStep + direction;
    if (nextStep < 1) nextStep = 1;
    if (nextStep > 5) nextStep = 5;

    if (nextStep === currentCarbonStep) return;

    const nextCard = document.getElementById(`carbon-step-${nextStep}`);

    gsap.to(currentCard, {
      opacity: 0,
      y: -10,
      duration: 0.2,
      onComplete: () => {
        currentCard.classList.remove('active');
        nextCard.classList.add('active');
        currentCarbonStep = nextStep;

        gsap.fromTo(nextCard, 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.2 }
        );

        // Hide controls footer on final summary page
        const ctrl = document.getElementById('carbon-controls');
        if (nextStep === 5) {
          ctrl.style.display = 'none';
          calculateFinalCarbon();
        } else {
          ctrl.style.display = 'flex';
        }
      }
    });
  };

  function calculateFinalCarbon() {
    let total = 0;
    Object.keys(carbonAnswers).forEach(k => {
      total += carbonAnswers[k].score;
    });

    // Animate score count ticker
    const valEl = document.getElementById('carbon-final-score');
    const txtEl = document.getElementById('carbon-score-text');
    const lblEl = document.getElementById('carbon-grade-label');
    
    let counter = { val: 0 };
    gsap.to(counter, {
      val: total,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        valEl.textContent = counter.val.toFixed(1);
        txtEl.textContent = counter.val.toFixed(1);
      }
    });

    if (total <= 4.0) {
      lblEl.textContent = "DIAGNOSTIC: BIOSPHERE OPTIMAL MATCH";
      lblEl.style.color = "var(--accent-green)";
      unlockBadge('carbon-crusher');
    } else if (total <= 9.0) {
      lblEl.textContent = "DIAGNOSTIC: STABLE IMPACT RATING";
      lblEl.style.color = "var(--accent-yellow)";
    } else {
      lblEl.textContent = "DIAGNOSTIC: CRITICAL CORE DISCHARGE";
      lblEl.style.color = "var(--accent-red)";
    }
  }

  window.resetCarbonWizard = () => {
    playClick();
    carbonAnswers = {};
    const step5 = document.getElementById('carbon-step-5');
    const step1 = document.getElementById('carbon-step-1');
    
    step5.classList.remove('active');
    step1.classList.add('active');
    currentCarbonStep = 1;
    
    document.getElementById('carbon-controls').style.display = 'flex';
    document.querySelectorAll('.carbon-option-btn').forEach(btn => btn.classList.remove('selected'));
  };

  // --- SIMULATION COSMIC ARCADE SYSTEMS ---
  const modal = document.getElementById('game-modal');
  const modalTitle = document.getElementById('game-modal-title');
  const modalBody = document.getElementById('game-modal-body');

  let activeGameLoop = null;

  // Sync game coins won to session database
  async function awardArcadeRewards(coins, xp) {
    try {
      const res = await fetch('/api/award-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coins, xp })
      });
      const data = await res.json();
      if (data.success) {
        syncGlobalUI(data.user);
        unlockBadge('arcade-champion');
        if (data.leveledUp) {
          triggerLevelUpHUD(data.user.level);
        }
      }
    } catch(err) {
      console.error("Failed to award coins:", err);
    }
  }

  window.launchGame = (gameId) => {
    playClick();
    modalBody.innerHTML = "";
    modal.classList.add('active');

    if (gameId === 'recycling') {
      modalTitle.textContent = "ARCADE: RECYCLING RUSH SIMULATOR";
      initRecyclingRushGame();
    } else if (gameId === 'quiz') {
      modalTitle.textContent = "ARCADE: ECO BIOSPHERE QUIZ";
      initEcoQuizGame();
    } else if (gameId === 'grid') {
      modalTitle.textContent = "ARCADE: RENEWABLE POWER CONNECTIONS";
      initEnergyGridGame();
    } else if (gameId === 'ocean') {
      modalTitle.textContent = "ARCADE: COASTAL WASTE COLLECTOR";
      initOceanCleanupGame();
    } else if (gameId === 'tree') {
      modalTitle.textContent = "ARCADE: PINE SEEDLING SIMULATOR";
      initTreePlantingGame();
    }
  };

  window.closeActiveGame = () => {
    playClick();
    modal.classList.remove('active');
    if (activeGameLoop) {
      cancelAnimationFrame(activeGameLoop);
      activeGameLoop = null;
    }
    modalBody.innerHTML = "";
  };

  // --- GAME 1: RECYCLING RUSH ---
  function initRecyclingRushGame() {
    modalBody.innerHTML = `
      <p style="text-align:center; color:var(--accent-cyan); font-size:0.85rem;">Use Mouse / Touch to steer the catch tray. Catch recyclables. Avoid radioactive battery hazard!</p>
      <div id="rush-canvas-container">
        <canvas id="rush-canvas" width="400" height="230"></canvas>
      </div>
      <div style="display:flex; justify-content:space-between; width:100%; font-family:var(--font-mono); font-size:0.85rem;">
        <span style="color:var(--accent-green);">SCORE: <span id="rush-score">0</span></span>
        <span style="color:var(--accent-red);">LIFE: <span id="rush-life">3</span></span>
      </div>
    `;

    const canvas = document.getElementById('rush-canvas');
    const ctx = canvas.getContext('2d');
    const scoreVal = document.getElementById('rush-score');
    const lifeVal = document.getElementById('rush-life');

    let score = 0;
    let life = 3;
    let trayX = 170;
    const trayWidth = 60;
    const trayHeight = 12;

    const items = [];
    const itemTypes = [
      { name: 'plastic', char: '🥤', isGood: true },
      { name: 'can', char: '🥫', isGood: true },
      { name: 'paper', char: '📄', isGood: true },
      { name: 'toxic', char: '🔋', isGood: false }
    ];

    // Mouse listener
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      trayX = e.clientX - rect.left - trayWidth / 2;
      if (trayX < 0) trayX = 0;
      if (trayX > canvas.width - trayWidth) trayX = canvas.width - trayWidth;
    });

    let spawnTimer = 0;

    function gameUpdate() {
      ctx.clearRect(0,0, canvas.width, canvas.height);

      // Draw Tray
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(trayX, canvas.height - trayHeight - 10, trayWidth, trayHeight);
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#00f0ff";
      
      // Spawn items
      spawnTimer++;
      if (spawnTimer > 45) {
        spawnTimer = 0;
        const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        items.push({
          x: Math.random() * (canvas.width - 30) + 10,
          y: -10,
          type: type,
          speed: 1.8 + Math.random() * 2.0
        });
      }

      // Update and draw items
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += item.speed;

        ctx.font = "18px Arial";
        ctx.shadowBlur = 0;
        ctx.fillText(item.type.char, item.x, item.y);

        // Catch check
        if (item.y >= canvas.height - trayHeight - 20 && item.y <= canvas.height - 10) {
          if (item.x + 10 >= trayX && item.x <= trayX + trayWidth) {
            // Caught!
            if (item.type.isGood) {
              score++;
              scoreVal.textContent = score;
              playSynth(600, 'sine', 0.05, 0.03);
            } else {
              life--;
              lifeVal.textContent = life;
              playSynth(150, 'sawtooth', 0.2, 0.08);
            }
            items.splice(i, 1);
            continue;
          }
        }

        // Out of bounds
        if (item.y > canvas.height) {
          if (item.type.isGood) {
            life--;
            lifeVal.textContent = life;
            playSynth(200, 'triangle', 0.15, 0.05);
          }
          items.splice(i, 1);
        }
      }

      // Check Game Over
      if (life <= 0 || score >= 30) {
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "18px var(--font-display)";
        ctx.textAlign = "center";
        
        let finalCoins = Math.min(score, 30);
        ctx.fillText("SIMULATION COMPLETED", canvas.width/2, 90);
        ctx.fillStyle = "var(--accent-yellow)";
        ctx.fillText(`Earned: +${finalCoins} Coins`, canvas.width/2, 125);
        
        awardArcadeRewards(finalCoins, finalCoins * 2);
        activeGameLoop = null;
        return;
      }

      activeGameLoop = requestAnimationFrame(gameUpdate);
    }

    gameUpdate();
  }

  // --- GAME 2: ECO QUIZ ---
  function initEcoQuizGame() {
    const quizQuestions = [
      { q: "Which gas contributes most to greenhouse warming?", a: ["Methane", "Carbon Dioxide", "Water Vapor", "Nitrous Oxide"], c: 2 },
      { q: "Approximately how much CO2 does a mature tree absorb yearly?", a: ["5 kg", "22 kg", "100 kg", "500 kg"], c: 1 },
      { q: "Standby power consumes up to what % of house electricity?", a: ["2%", "5%", "10%", "25%"], c: 2 },
      { q: "Washing clothes in cold water saves what percentage of machine energy?", a: ["20%", "50%", "75%", "90%"], c: 3 },
      { q: "LED bulbs consume how much less energy than standard bulbs?", a: ["25%", "50%", "75%", "95%"], c: 2 }
    ];

    let currentQ = 0;
    let score = 0;

    function renderQuestion() {
      if (currentQ >= quizQuestions.length) {
        const rewardCoins = score * 5;
        modalBody.innerHTML = `
          <div style="text-align:center; padding:20px;">
            <i class="fa-solid fa-graduation-cap glow-cyan" style="font-size:3rem; margin-bottom:15px;"></i>
            <h3 class="arcade-title" style="margin-bottom:10px;">QUIZ ASSESSMENT COMPLETED</h3>
            <p style="color:var(--accent-green); font-size:1.1rem; font-weight:bold;">SCORE: ${score} / ${quizQuestions.length}</p>
            <p style="color:var(--accent-yellow); font-family:var(--font-mono); margin-top:10px;"><i class="fa-solid fa-coins"></i> AWARDED: +${rewardCoins} COINS</p>
          </div>
        `;
        awardArcadeRewards(rewardCoins, score * 10);
        return;
      }

      const qData = quizQuestions[currentQ];
      modalBody.innerHTML = `
        <div style="width:100%; font-family:var(--font-mono); color:var(--text-muted); font-size:0.8rem; margin-bottom:10px;">
          QUESTION ${currentQ + 1} OF ${quizQuestions.length}
        </div>
        <p class="arcade-title" style="margin-bottom:20px; line-height:1.4;">${qData.q}</p>
        <div class="carbon-options-list" style="width:100%;">
          ${qData.a.map((opt, i) => `
            <button class="carbon-option-btn quiz-opt" onclick="checkQuizAnswer(${i})">${opt}</button>
          `).join('')}
        </div>
      `;
    }

    window.checkQuizAnswer = (selectedIndex) => {
      const qData = quizQuestions[currentQ];
      const btns = document.querySelectorAll('.quiz-opt');
      
      // Highlight correct/incorrect
      btns.forEach((btn, idx) => {
        if (idx === qData.c) {
          btn.style.borderColor = "var(--accent-green)";
          btn.style.color = "var(--accent-green)";
        } else if (idx === selectedIndex) {
          btn.style.borderColor = "var(--accent-red)";
          btn.style.color = "var(--accent-red)";
        }
        btn.disabled = true;
      });

      if (selectedIndex === qData.c) {
        score++;
        playSuccess();
      } else {
        playSynth(150, 'sawtooth', 0.25, 0.08);
      }

      setTimeout(() => {
        currentQ++;
        renderQuestion();
      }, 1500);
    };

    renderQuestion();
  }

  // --- GAME 3: ENERGY GRID PUZZLE ---
  function initEnergyGridGame() {
    modalBody.innerHTML = `
      <p style="text-align:center; color:var(--accent-cyan); font-size:0.85rem;">Click cables to rotate. Connect the Windmill (top-left) to City Hub (bottom-right)!</p>
      <div class="grid-puzzle-container">
        <!-- Renders 16 tiles -->
        <div class="grid-puzzle-tile power-source" id="tile-0-0">💨</div>
        <div class="grid-puzzle-tile" id="tile-0-1" onclick="rotateTile(0,1)">➔</div>
        <div class="grid-puzzle-tile" id="tile-0-2" onclick="rotateTile(0,2)">➔</div>
        <div class="grid-puzzle-tile" id="tile-0-3" onclick="rotateTile(0,3)">➔</div>

        <div class="grid-puzzle-tile" id="tile-1-0" onclick="rotateTile(1,0)">➔</div>
        <div class="grid-puzzle-tile" id="tile-1-1" onclick="rotateTile(1,1)">➔</div>
        <div class="grid-puzzle-tile" id="tile-1-2" onclick="rotateTile(1,2)">➔</div>
        <div class="grid-puzzle-tile" id="tile-1-3" onclick="rotateTile(1,3)">➔</div>

        <div class="grid-puzzle-tile" id="tile-2-0" onclick="rotateTile(2,0)">➔</div>
        <div class="grid-puzzle-tile" id="tile-2-1" onclick="rotateTile(2,1)">➔</div>
        <div class="grid-puzzle-tile" id="tile-2-2" onclick="rotateTile(2,2)">➔</div>
        <div class="grid-puzzle-tile" id="tile-2-3" onclick="rotateTile(2,3)">➔</div>

        <div class="grid-puzzle-tile" id="tile-3-0" onclick="rotateTile(3,0)">➔</div>
        <div class="grid-puzzle-tile" id="tile-3-1" onclick="rotateTile(3,1)">➔</div>
        <div class="grid-puzzle-tile" id="tile-3-2" onclick="rotateTile(3,2)">➔</div>
        <div class="grid-puzzle-tile city-target" id="tile-3-3">🏢</div>
      </div>
      <button class="btn-cyber green-theme" id="grid-verify-btn" onclick="checkGridConnection()">Verify Grid Link</button>
    `;

    // Internal rotation tracking. Rotation matches multiples of 90 degrees
    window.gridRotations = {
      "0-1": 90, "0-2": 180, "0-3": 270,
      "1-0": 0,  "1-1": 90,  "1-2": 0,   "1-3": 90,
      "2-0": 180, "2-1": 270, "2-2": 90,  "2-3": 180,
      "3-0": 0,  "3-1": 90,  "3-2": 0
    };

    // Draw initial angles
    Object.keys(window.gridRotations).forEach(k => {
      const el = document.getElementById(`tile-${k}`);
      if (el) el.style.transform = `rotate(${window.gridRotations[k]}deg)`;
    });

    window.rotateTile = (r, c) => {
      playClick();
      const id = `${r}-${c}`;
      window.gridRotations[id] = (window.gridRotations[id] + 90) % 360;
      document.getElementById(`tile-${id}`).style.transform = `rotate(${window.gridRotations[id]}deg)`;
    };

    window.checkGridConnection = () => {
      // Correct angles mapping to wire-link path
      const solutions = {
        "0-1": 90,  "1-1": 180, "1-2": 90, "2-2": 180, "2-3": 90, "3-2": 90
      };

      let success = true;
      Object.keys(solutions).forEach(k => {
        if (window.gridRotations[k] !== solutions[k] && window.gridRotations[k] !== (solutions[k] + 180) % 360) {
          success = false;
        }
      });

      if (success) {
        playSuccess();
        document.querySelectorAll('.grid-puzzle-tile').forEach(t => t.classList.add('connected'));
        document.getElementById('grid-verify-btn').style.display = 'none';

        setTimeout(() => {
          modalBody.innerHTML = `
            <div style="text-align:center; padding:20px;">
              <i class="fa-solid fa-bolt glow-green" style="font-size:3rem; margin-bottom:15px;"></i>
              <h3 class="arcade-title" style="margin-bottom:10px;">GRID HARMONY ESTABLISHED</h3>
              <p style="color:var(--accent-green); font-size:1.1rem; font-weight:bold;">Grid efficiency output: +35 Coins</p>
            </div>
          `;
          awardArcadeRewards(35, 45);
        }, 1500);
      } else {
        playSynth(120, 'sawtooth', 0.3, 0.08); // Error buzz
        alert("POWER ROUTE BROKEN: Verify grid flow cables orientation.");
      }
    };
  }

  // --- GAME 4: OCEAN CLEANUP ---
  function initOceanCleanupGame() {
    modalBody.innerHTML = `
      <p style="text-align:center; color:var(--accent-cyan); font-size:0.85rem;">Click / Tap the floating toxic waste barrels to clean the bay! (<span id="ocean-count">10</span> Remaining)</p>
      <div class="ocean-cleanup-container" id="ocean-cleanup-bay"></div>
    `;

    const bay = document.getElementById('ocean-cleanup-bay');
    const counter = document.getElementById('ocean-count');
    let remaining = 10;

    for (let i = 0; i < 10; i++) {
      const item = document.createElement('div');
      item.className = 'ocean-plastic';
      item.innerHTML = '🛢️'; // oil/toxic barrel
      item.style.left = `${Math.random() * 85 + 5}%`;
      item.style.top = `${Math.random() * 80 + 5}%`;
      
      // Floating animation
      gsap.to(item, {
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        duration: 2 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });

      item.addEventListener('click', () => {
        playSynth(500, 'sine', 0.1, 0.05);
        gsap.to(item, {
          scale: 0.1,
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            if (item.parentNode) {
              item.parentNode.removeChild(item);
              remaining--;
              counter.textContent = remaining;
              
              if (remaining <= 0) {
                playSuccess();
                modalBody.innerHTML = `
                  <div style="text-align:center; padding:20px;">
                    <i class="fa-solid fa-fish glow-cyan" style="font-size:3rem; margin-bottom:15px;"></i>
                    <h3 class="arcade-title" style="margin-bottom:10px;">BAY RESTORATION COMPLETED</h3>
                    <p style="color:var(--accent-green); font-size:1.1rem; font-weight:bold;">Water telemetry clear! +30 Coins</p>
                  </div>
                `;
                awardArcadeRewards(30, 40);
              }
            }
          }
        });
      });

      bay.appendChild(item);
    }
  }

  // --- GAME 5: TREE SIMULATOR ---
  function initTreePlantingGame() {
    modalBody.innerHTML = `
      <p style="text-align:center; color:var(--accent-cyan); font-size:0.85rem;">Follow the sequence blocks to cultivate a mature pine tree.</p>
      <div class="tree-sim-canvas">
        <div class="tree-sim-graphic" id="tree-art">🕳️</div>
      </div>
      <div class="tree-sim-controls">
        <button class="btn-sim-action" id="sim-dig" onclick="simStep(1)"><span>⛏️</span>Dig soil</button>
        <button class="btn-sim-action disabled" id="sim-plant" onclick="simStep(2)"><span>🌱</span>Sow seed</button>
        <button class="btn-sim-action disabled" id="sim-water" onclick="simStep(3)"><span>💧</span>Water</button>
        <button class="btn-sim-action disabled" id="sim-sun" onclick="simStep(4)"><span>☀️</span>Sunlight</button>
      </div>
    `;

    let activeStep = 1;
    const art = document.getElementById('tree-art');

    window.simStep = (step) => {
      if (step !== activeStep) return;
      playClick();

      if (step === 1) {
        art.textContent = "🕳️";
        art.style.transform = "scale(1.1)";
        document.getElementById('sim-dig').classList.add('disabled');
        document.getElementById('sim-plant').classList.remove('disabled');
        activeStep = 2;
      } else if (step === 2) {
        art.textContent = "🌱";
        art.style.transform = "scale(0.8)";
        document.getElementById('sim-plant').classList.add('disabled');
        document.getElementById('sim-water').classList.remove('disabled');
        activeStep = 3;
      } else if (step === 3) {
        art.textContent = "🌿";
        art.style.transform = "scale(1.2)";
        document.getElementById('sim-water').classList.add('disabled');
        document.getElementById('sim-sun').classList.remove('disabled');
        activeStep = 4;
      } else if (step === 4) {
        art.textContent = "🌲";
        art.style.transform = "scale(1.6)";
        document.getElementById('sim-sun').classList.add('disabled');
        playSuccess();
        
        setTimeout(() => {
          modalBody.innerHTML = `
            <div style="text-align:center; padding:20px;">
              <i class="fa-solid fa-tree glow-green" style="font-size:3rem; margin-bottom:15px;"></i>
              <h3 class="arcade-title" style="margin-bottom:10px;">SECTOR CANOPY DENSITY ADDED</h3>
              <p style="color:var(--accent-green); font-size:1.1rem; font-weight:bold;">Biomass yield success: +20 Coins</p>
            </div>
          `;
          awardArcadeRewards(20, 30);
        }, 1500);
      }
    };
  }

});
