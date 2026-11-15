(function () {
  const DATA = window.GAME_DATA;

  // Format Angka Singkat
  function fmt(n) {
    if (n < 1000) return Math.floor(n).toString();
    const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx"];
    const idx = Math.floor(Math.log10(n) / 3) - 1;
    if (idx >= units.length) return n.toExponential(2);
    return (n / Math.pow(1000, idx + 1)).toFixed(2) + units[idx];
  }

  // State Utama Permainan
  let state = {
    gold: 0,
    souls: 0,
    emeralds: 5, // Modal awal 1x Gacha!
    xp: 0,
    stage: 1,
    wave: 1,
    swordLv: 1,
    critLv: 1,
    weaponIdx: 0,
    allies: [0, 0, 0, 0, 0, 0],
    unlockedSkills: [true, false, false, false, false, false],
    ownedPets: [],
    equippedPet: null,
    activeEnchant: null,
    rebirths: 0
  };

  // Load Save Data
  try {
    const saved = localStorage.getItem("shadowBladeUltraSave");
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (e) {}

  function saveGame() {
    try {
      localStorage.setItem("shadowBladeUltraSave", JSON.stringify(state));
    } catch (e) {}
  }

  // Variabel Pertarungan Live
  let enemy = {
    name: "",
    maxHp: 100,
    hp: 100,
    maxArmor: 0,
    armor: 0,
    regen: 0,
    dodge: 0,
    color: 0x4ade80,
    shape: "slime",
    isBoss: false,
    isMc: false,
    trait: "",
    fuseMax: 0,
    fuseTimer: 0,
    stunTimer: 0,
    isDungeon: false,
    dungeonData: null
  };

  let bossTimer = 25;
  let bossMaxTimer = 25;
  let combo = 0;
  let comboTimer = 0;
  let skillCDs = [0, 0, 0, 0, 0, 0];
  let skillActives = [0, 0, 0, 0, 0, 0];

  // ==========================================
  // INISIALISASI ENGINE 2D WEBGL (PIXI.JS)
  // ==========================================
  const arenaEl = document.getElementById("pixi-canvas");
  const app = new PIXI.Application({
    resizeTo: arenaEl,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2)
  });
  arenaEl.appendChild(app.view);

  const bgLayer = new PIXI.Container();
  const particleLayer = new PIXI.Container();
  const enemyLayer = new PIXI.Container();
  const slashLayer = new PIXI.Container();
  const textLayer = new PIXI.Container();

  app.stage.addChild(bgLayer, particleLayer, enemyLayer, slashLayer, textLayer);

  // Latar Belakang Ambient Biome
  const bgGraphics = new PIXI.Graphics();
  bgLayer.addChild(bgGraphics);

  const ambientParticles = [];
  for (let i = 0; i < 28; i++) {
    const p = new PIXI.Graphics();
    p.beginFill(0xffffff, 0.25);
    p.drawCircle(0, 0, Math.random() * 2.5 + 1);
    p.endFill();
    p.x = Math.random() * 500;
    p.y = Math.random() * 600;
    p.vy = -(Math.random() * 0.6 + 0.2);
    bgLayer.addChild(p);
    ambientParticles.push(p);
  }

  // Container Sprite Musuh & Pet Pendamping
  const enemySprite = new PIXI.Container();
  enemyLayer.addChild(enemySprite);

  const petOrb = new PIXI.Graphics();
  enemyLayer.addChild(petOrb);

  let enemyHitFlash = 0;
  let screenShake = 0;
  let slashParticles = [];
  let floatingTexts = [];

  // ==========================================
  // KALKULASI STATISTIK PEMAIN
  // ==========================================
  function getEquippedPetObj() {
    return DATA.pets.find((p) => p.id === state.equippedPet) || null;
  }

  function getActiveEnchantObj() {
    return DATA.enchants.find((e) => e.id === state.activeEnchant) || null;
  }

  function getTapDamage() {
    const weapon = DATA.weapons[state.weaponIdx];
    const base = 10 + (state.swordLv - 1) * 7 * Math.pow(1.045, Math.min(state.swordLv, 120));
    let mult = weapon.mult * (1 + state.souls * 0.08);
    const pet = getEquippedPetObj();
    if (pet && (pet.bonusType === "tap" || pet.bonusType === "all")) mult *= 1 + pet.bonusVal;
    const ench = getActiveEnchantObj();
    if (ench) mult *= ench.multTap;
    if (skillActives[2] > 0) mult *= 3.5; // Battle Fury
    return Math.floor(base * mult);
  }

  function getDps() {
    let total = 0;
    DATA.allies.forEach((a, i) => {
      const lv = state.allies[i];
      if (lv > 0) {
        total += a.baseDps * lv * Math.pow(1.03, Math.min(lv, 100));
      }
    });
    let mult = 1 + state.souls * 0.08;
    const pet = getEquippedPetObj();
    if (pet && (pet.bonusType === "dps" || pet.bonusType === "all")) mult *= 1 + pet.bonusVal;
    return Math.floor(total * mult);
  }

  function getCritChance() {
    let c = 0.05 + (state.critLv - 1) * 0.008;
    const pet = getEquippedPetObj();
    if (pet && pet.bonusType === "crit") c += pet.bonusVal;
    return Math.min(c, 0.75);
  }

  function getCritMult() {
    return 2.2 + (state.critLv - 1) * 0.12;
  }

  function getSwordCost() {
    return Math.floor(15 * Math.pow(1.16, state.swordLv - 1));
  }

  function getCritCost() {
    return Math.floor(40 * Math.pow(1.22, state.critLv - 1));
  }

  // ==========================================
  // NOTIFIKASI TOAST (TANPA POPUP!)
  // ==========================================
  function showToast(msg, borderColor = "#34d399") {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = "toast-item";
    el.style.borderColor = borderColor;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2800);
  }

  // ==========================================
  // GENERATOR VISUAL MUSUH & BOSS (PIXI GRAPHICS)
  // ==========================================
  function buildEnemyGraphic() {
    enemySprite.removeChildren();
    const g = new PIXI.Graphics();
    const c = enemy.color;
    const isBoss = enemy.isBoss;
    const scale = isBoss ? 1.38 : 1.0;

    // Aura Cahaya Belakang
    g.beginFill(c, isBoss ? 0.22 : 0.12);
    g.drawCircle(0, 0, isBoss ? 95 : 65);
    g.endFill();

    if (enemy.shape === "creeper") {
      // Kepala & Badan Kotak ala Creeper
      g.lineStyle(3, 0x052e16);
      g.beginFill(c);
      g.drawRoundedRect(-36, -55, 72, 72, 6);
      g.drawRoundedRect(-24, 17, 48, 45, 4);
      g.endFill();
      // Wajah Creeper
      g.beginFill(0x090d16);
      g.drawRect(-22, -38, 14, 14);
      g.drawRect(8, -38, 14, 14);
      g.drawRect(-10, -22, 20, 18);
      g.drawRect(-18, -14, 8, 16);
      g.drawRect(10, -14, 8, 16);
      g.endFill();
    } else if (enemy.shape === "enderman" || enemy.shape === "boss_dragon") {
      g.lineStyle(3, 0xf0abfc);
      g.beginFill(0x18181b);
      g.drawPolygon([0, -70, 48, 0, 28, 65, -28, 65, -48, 0]);
      g.endFill();
      // Mata Ungu Menyala
      g.beginFill(0xe879f9);
      g.drawRect(-26, -15, 18, 7);
      g.drawRect(8, -15, 18, 7);
      g.endFill();
    } else if (enemy.shape === "boss_warden" || enemy.shape === "golem") {
      g.lineStyle(4, 0x38bdf8);
      g.beginFill(c);
      g.drawRoundedRect(-55, -55, 110, 110, 16);
      g.endFill();
      // Inti Jiwa di Dada
      g.beginFill(0x0f172a);
      g.drawCircle(0, 5, 26);
      g.endFill();
      g.beginFill(0x22d3ee);
      g.drawCircle(0, 5, 14);
      g.endFill();
    } else if (enemy.shape === "skull" || enemy.shape === "boss_lich" || enemy.shape === "boss_wither") {
      g.lineStyle(3, 0xffffff, 0.5);
      g.beginFill(c);
      g.drawRoundedRect(-42, -50, 84, 72, 18);
      g.drawRect(-25, 22, 50, 24);
      g.endFill();
      g.beginFill(0x090b10);
      g.drawCircle(-18, -15, 11);
      g.drawCircle(18, -15, 11);
      g.endFill();
      g.beginFill(0xf43f5e);
      g.drawCircle(-18, -15, 5);
      g.drawCircle(18, -15, 5);
      g.endFill();
    } else {
      // Bentuk Kristal / Beast Default
      g.lineStyle(3, 0xffffff, 0.45);
      g.beginFill(c);
      g.drawPolygon([0, -64, 54, -18, 38, 56, -38, 56, -54, -18]);
      g.endFill();
      // Mata Garang
      g.beginFill(0xfef08a);
      g.drawPolygon([-24, -10, -6, -2, -20, 6]);
      g.drawPolygon([24, -10, 6, -2, 20, 6]);
      g.endFill();
    }

    // Jika Punya Armor Shield, Gambar Perisai Biru Mengelilingi Musuh
    if (enemy.maxArmor > 0) {
      const shield = new PIXI.Graphics();
      shield.name = "armorRing";
      shield.lineStyle(3, 0x38bdf8, 0.85);
      shield.drawCircle(0, 0, isBoss ? 88 : 62);
      enemySprite.addChild(shield);
    }

    g.scale.set(scale);
    enemySprite.addChild(g);
  }

  // ==========================================
  // SPAWN MUSUH / BOSS (HARDCORE SCALING)
  // ==========================================
  function spawnEnemy(customDungeon = null) {
    const biomeIdx = Math.min(Math.floor((state.stage - 1) / 3), DATA.biomes.length - 1);
    const biome = DATA.biomes[biomeIdx];

    // Update Warna Latar Biome
    bgGraphics.clear();
    bgGraphics.beginFill(biome.bgTop, 0.55);
    bgGraphics.drawRect(0, 0, app.screen.width, app.screen.height);
    bgGraphics.endFill();
    ambientParticles.forEach((p) => (p.tint = biome.accent));

    // Kurva HP Hardcore (naik curam tiap stage & wave)
    const stagePower = Math.pow(1.48, state.stage - 1) * (1 + (state.wave - 1) * 0.18);
    const baseHp = 95 * stagePower;

    if (customDungeon) {
      enemy = {
        name: customDungeon.name + " Guardian",
        maxHp: Math.floor(baseHp * customDungeon.hpScale),
        hp: Math.floor(baseHp * customDungeon.hpScale),
        maxArmor: Math.floor(baseHp * customDungeon.hpScale * 0.65),
        armor: Math.floor(baseHp * customDungeon.hpScale * 0.65),
        regen: 0.025,
        dodge: 0.1,
        color: 0xf43f5e,
        shape: "boss_warden",
        isBoss: true,
        isMc: true,
        trait: "DUNGEON TITAN",
        fuseMax: 0,
        fuseTimer: 0,
        stunTimer: 0,
        isDungeon: true,
        dungeonData: customDungeon
      };
      bossMaxTimer = 20;
      bossTimer = 20;
    } else if (state.wave === 5 || state.wave === 10) {
      // BOSS FIGHT
      const bossTemplate = DATA.bosses[biomeIdx];
      const finalHp = Math.floor(baseHp * bossTemplate.hpMult * (state.wave === 10 ? 1.5 : 1));
      enemy = {
        name: bossTemplate.name,
        maxHp: finalHp,
        hp: finalHp,
        maxArmor: Math.floor(finalHp * bossTemplate.armorPct),
        armor: Math.floor(finalHp * bossTemplate.armorPct),
        regen: bossTemplate.regen,
        dodge: 0.08,
        color: bossTemplate.color,
        shape: bossTemplate.shape,
        isBoss: true,
        isMc: !!bossTemplate.mc,
        trait: bossTemplate.trait,
        fuseMax: 0,
        fuseTimer: 0,
        stunTimer: 0,
        isDungeon: false,
        dungeonData: null
      };
      bossMaxTimer = 25;
      bossTimer = 25;
    } else {
      // MUSUH REGULER
      const pool = DATA.enemies.filter((e) => e.biome === biomeIdx);
      const tpl = pool[Math.floor(Math.random() * pool.length)];
      const finalHp = Math.floor(baseHp * tpl.hpMult);
      enemy = {
        name: tpl.name,
        maxHp: finalHp,
        hp: finalHp,
        maxArmor: Math.floor(baseHp * (tpl.armorPct || 0)),
        armor: Math.floor(baseHp * (tpl.armorPct || 0)),
        regen: tpl.regen || 0,
        dodge: tpl.dodge || 0,
        color: tpl.color,
        shape: tpl.shape,
        isBoss: false,
        isMc: !!tpl.mc,
        trait: tpl.trait || "",
        fuseMax: tpl.fuse || 0,
        fuseTimer: tpl.fuse || 0,
        stunTimer: 0,
        isDungeon: false,
        dungeonData: null
      };
    }

    buildEnemyGraphic();
    updateHUD();
  }

  // ==========================================
  // EFEK VISUAL TEBASAN & FLOATING TEXT
  // ==========================================
  function spawnSlashEffect(x, y, isCrit) {
    const weapon = DATA.weapons[state.weaponIdx];
    const slash = new PIXI.Graphics();
    const angle = (Math.random() - 0.5) * Math.PI * 1.4;
    const len = isCrit ? 150 : 105;

    slash.lineStyle(isCrit ? 6 : 4, isCrit ? 0xfbbf24 : weapon.color, 1);
    slash.moveTo(-len, 0);
    slash.quadraticCurveTo(0, isCrit ? -28 : -14, len, 0);
    slash.x = x;
    slash.y = y;
    slash.rotation = angle;
    slash.life = 1.0;
    slashLayer.addChild(slash);
    slashParticles.push(slash);

    // Percikan Partikel
    const count = isCrit ? 12 : 6;
    for (let i = 0; i < count; i++) {
      const p = new PIXI.Graphics();
      p.beginFill(isCrit ? 0xfde047 : weapon.color);
      p.drawCircle(0, 0, isCrit ? 4 : 2.5);
      p.endFill();
      p.x = x;
      p.y = y;
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 2;
      p.vx = Math.cos(a) * spd;
      p.vy = Math.sin(a) * spd;
      p.life = 1.0;
      particleLayer.addChild(p);
      slashParticles.push(p);
    }
  }

  function spawnFloatingText(text, x, y, color = "#ffffff", size = 18) {
    const t = new PIXI.Text(text, {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: size,
      fontWeight: "900",
      fill: color,
      stroke: "#000000",
      strokeThickness: 4
    });
    t.anchor.set(0.5);
    t.x = x + (Math.random() - 0.5) * 40;
    t.y = y - 20;
    t.vy = -2.2;
    t.life = 1.0;
    textLayer.addChild(t);
    floatingTexts.push(t);
  }
  // ==========================================
  // LOGIKA SERANGAN (DAMAGE + ARMOR PENETRATION)
  // ==========================================
  function dealDamage(rawDmg, isTap = false, x = app.screen.width / 2, y = app.screen.height / 2) {
    if (enemy.hp <= 0) return;

    // Cek Dodge (Enderman / Wraith)
    if (isTap && enemy.dodge > 0 && enemy.stunTimer <= 0 && Math.random() < enemy.dodge) {
      spawnFloatingText("MISS!", x, y, "#94a3b8", 16);
      enemySprite.x += (Math.random() > 0.5 ? 1 : -1) * 35;
      return;
    }

    let isCrit = false;
    let dmg = rawDmg;

    if (isTap) {
      combo++;
      comboTimer = 2.2;
      const comboBonus = 1 + Math.min(combo, 100) * 0.005;
      dmg *= comboBonus;

      if (Math.random() < getCritChance()) {
        isCrit = true;
        dmg *= getCritMult();
      }
    }

    dmg = Math.floor(dmg);
    let hitArmor = false;

    // Jika Musuh Punya Armor Shield
    if (enemy.armor > 0) {
      hitArmor = true;
      const ench = getActiveEnchantObj();
      const pen = ench ? ench.armorPen : 0; // Smite V menembus 50% langsung ke HP!
      const hpPierce = Math.floor(dmg * pen);
      const armorDmg = dmg - hpPierce;

      enemy.armor = Math.max(0, enemy.armor - armorDmg);
      enemy.hp = Math.max(0, enemy.hp - hpPierce);

      if (enemy.armor === 0) {
        const ring = enemySprite.getChildByName("armorRing");
        if (ring) ring.visible = false;
        showToast("🛡️ ARMOR SHATTERED!", "#38bdf8");
      }
    } else {
      enemy.hp = Math.max(0, enemy.hp - dmg);
    }

    if (isTap) {
      window.SFX.playSlash(isCrit, hitArmor);
      spawnSlashEffect(x, y, isCrit);
      enemyHitFlash = 1.0;
      screenShake = isCrit ? 9 : 4;
      const label = hitArmor ? `🛡️ ${fmt(dmg)}` : isCrit ? `💥 ${fmt(dmg)}!` : fmt(dmg);
      const col = hitArmor ? "#38bdf8" : isCrit ? "#fbbf24" : "#ffffff";
      spawnFloatingText(label, x, y, col, isCrit ? 24 : 18);
    }

    if (enemy.hp <= 0) {
      onEnemyDefeated();
    }
    updateHUD();
  }

  function onEnemyDefeated() {
    let goldMult = 1 + state.souls * 0.05;
    const pet = getEquippedPetObj();
    if (pet && (pet.bonusType === "gold" || pet.bonusType === "all")) goldMult *= 1 + pet.bonusVal;
    const ench = getActiveEnchantObj();
    if (ench) goldMult *= ench.multGold;
    if (skillActives[4] > 0) goldMult *= 3; // Totem of Greed

    if (enemy.isDungeon && enemy.dungeonData) {
      const d = enemy.dungeonData;
      window.SFX.playBossKill();
      if (d.rewardType === "gold") state.gold += d.rewardVal;
      if (d.rewardType === "emerald") state.emeralds += d.rewardVal;
      if (d.rewardType === "soul") state.souls += d.rewardVal;
      showToast(`🏆 DUNGEON CLEAR! +${fmt(d.rewardVal)} ${d.rewardType.toUpperCase()}`, "#fbbf24");
      spawnEnemy();
      saveGame();
      return;
    }

    const baseReward = Math.floor((14 + state.stage * 9) * Math.pow(1.36, state.stage - 1) * goldMult);
    state.gold += baseReward;
    state.xp += enemy.isBoss ? 8 : 1;

    // Drop Emerald (12% dari monster biasa, 100% dari Boss)
    if (enemy.isBoss || Math.random() < 0.12) {
      const emGain = enemy.isBoss ? 3 : 1;
      state.emeralds += emGain;
      if (!enemy.isBoss) showToast(`❇️ +${emGain} Emerald Dropped!`, "#34d399");
    }

    if (enemy.isBoss) {
      window.SFX.playBossKill();
      const soulGain = Math.max(1, Math.floor(state.stage * 0.8));
      state.souls += soulGain;

      // Peluang Drop Skill Baru dari Boss (35%)
      const lockedIdx = state.unlockedSkills.findIndex((v) => !v);
      let skillMsg = "";
      if (lockedIdx !== -1 && Math.random() < 0.35) {
        state.unlockedSkills[lockedIdx] = true;
        skillMsg = ` • 📖 NEW SKILL: ${DATA.skills[lockedIdx].name}!`;
      }
      showToast(`👑 BOSS SLAIN! +${fmt(baseReward)} Gold • +${soulGain} 🔮 Souls${skillMsg}`, "#c084fc");
    }

    // Maju Wave / Stage
    if (state.wave < 10) {
      state.wave++;
    } else {
      state.wave = 1;
      state.stage++;
    }

    saveGame();
    spawnEnemy();
  }

  // ==========================================
  // INTERAKSI TAP & SKILL
  // ==========================================
  arenaEl.addEventListener("pointerdown", (e) => {
    window.SFX.init();
    const rect = arenaEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dealDamage(getTapDamage(), true, x, y);
  });

  function renderSkillsDock() {
    const dock = document.getElementById("skills-dock");
    dock.innerHTML = "";
    DATA.skills.forEach((sk, idx) => {
      const unlocked = state.unlockedSkills[idx];
      const btn = document.createElement("div");
      btn.className = `skill-slot ${unlocked ? "" : "locked"} ${skillActives[idx] > 0 ? "active" : ""}`;
      btn.innerHTML = `
        <span class="skill-icon">${unlocked ? sk.icon : "🔒"}</span>
        <span class="skill-name">${sk.name}</span>
        ${skillCDs[idx] > 0 ? `<div class="skill-cd-overlay">${Math.ceil(skillCDs[idx])}s</div>` : ""}
      `;
      btn.onclick = () => useSkill(idx);
      dock.appendChild(btn);
    });
  }

  function useSkill(idx) {
    if (!state.unlockedSkills[idx] || skillCDs[idx] > 0) return;
    window.SFX.playSkill();
    const sk = DATA.skills[idx];
    const ench = getActiveEnchantObj();
    const cdr = ench && ench.cdr ? 1 - ench.cdr : 1;
    skillCDs[idx] = sk.cd * cdr;
    skillActives[idx] = sk.dur;

    if (idx === 1) {
      // Armor Break
      enemy.armor = Math.floor(enemy.armor * 0.2);
      showToast("🔨 ARMOR SHATTERED -80%!", "#38bdf8");
    } else if (idx === 3) {
      // Meteor Rain
      enemy.stunTimer = 3.0;
      dealDamage(getTapDamage() * 45, false);
      screenShake = 16;
      showToast("☄️ METEOR STORM! Boss Stunned 3s!", "#f97316");
    } else if (idx === 5) {
      // Void Slash
      const cut = Math.floor(enemy.hp * 0.35);
      enemy.hp = Math.max(1, enemy.hp - cut);
      screenShake = 18;
      showToast(`🌌 VOID SLASH! -${fmt(cut)} HP!`, "#c084fc");
    } else {
      showToast(`${sk.icon} ${sk.name.toUpperCase()} ACTIVATED!`, "#fbbf24");
    }
    renderSkillsDock();
    updateHUD();
  }

  // ==========================================
  // QUICK UPGRADES & ENCHANTMENT TABLE
  // ==========================================
  document.getElementById("q-upg-sword").onclick = () => {
    const cost = getSwordCost();
    if (state.gold >= cost) {
      state.gold -= cost;
      state.swordLv++;
      saveGame();
      updateHUD();
    }
  };

  document.getElementById("q-upg-crit").onclick = () => {
    const cost = getCritCost();
    if (state.gold >= cost) {
      state.gold -= cost;
      state.critLv++;
      saveGame();
      updateHUD();
    }
  };

  document.getElementById("q-enchant").onclick = () => {
    if (state.xp < 10) {
      showToast("✨ Butuh 10 XP untuk Enchant!", "#f43f5e");
      return;
    }
    state.xp -= 10;
    const pick = DATA.enchants[Math.floor(Math.random() * DATA.enchants.length)];
    state.activeEnchant = pick.id;
    window.SFX.playGacha();
    showToast(`📘 ENCHANTED: ${pick.name} (${pick.desc})`, "#38bdf8");
    saveGame();
    updateHUD();
  };

  // ==========================================
  // MODAL UI: ARMORY SHOP, GACHA PET, DUNGEON
  // ==========================================
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalTabs = document.getElementById("modal-tabs");
  const modalContent = document.getElementById("modal-content");

  document.getElementById("modal-close").onclick = () => modalOverlay.classList.add("hidden");

  // 1. ROYAL ARMORY SHOP
  document.getElementById("btn-shop").onclick = () => openShop("weapons");

  function openShop(tab) {
    modalOverlay.classList.remove("hidden");
    modalTitle.textContent = "🛒 ROYAL ARMORY";
    modalTabs.innerHTML = `
      <button class="tab-btn ${tab === "weapons" ? "active" : ""}" data-t="weapons">⚔️ WEAPONS</button>
      <button class="tab-btn ${tab === "allies" ? "active" : ""}" data-t="allies">🛡️ ALLIES</button>
      <button class="tab-btn ${tab === "skills" ? "active" : ""}" data-t="skills">📖 SKILLS</button>
    `;
    modalTabs.querySelectorAll(".tab-btn").forEach((b) => (b.onclick = () => openShop(b.dataset.t)));
    modalContent.innerHTML = "";

    if (tab === "weapons") {
      DATA.weapons.forEach((w, idx) => {
        const owned = idx <= state.weaponIdx;
        const isNext = idx === state.weaponIdx + 1;
        const div = document.createElement("div");
        div.className = "card-item";
        div.innerHTML = `
          <div class="card-info">
            <h4 style="color:#${w.color.toString(16).padStart(6, "0")}">${w.name} (${w.mult}x DMG)</h4>
            <p>${w.desc}</p>
          </div>
          <button class="buy-btn ${owned ? "equipped" : ""}" ${!isNext || state.gold < w.cost ? "disabled" : ""}>
            ${owned ? "OWNED" : isNext ? `🪙 ${fmt(w.cost)}` : "LOCKED"}
          </button>
        `;
        if (isNext) {
          div.querySelector("button").onclick = () => {
            if (state.gold >= w.cost) {
              state.gold -= w.cost;
              state.weaponIdx = idx;
              window.SFX.playGacha();
              saveGame();
              openShop("weapons");
              updateHUD();
            }
          };
        }
        modalContent.appendChild(div);
      });
    } else if (tab === "allies") {
      DATA.allies.forEach((a, idx) => {
        const lv = state.allies[idx];
        const cost = Math.floor(a.baseCost * Math.pow(1.18, lv));
        const div = document.createElement("div");
        div.className = "card-item";
        div.innerHTML = `
          <div class="card-info">
            <h4>${a.icon} ${a.name} (Lv.${lv})</h4>
            <p>Base DPS: ${fmt(a.baseDps)}/s</p>
          </div>
          <button class="buy-btn" ${state.gold < cost ? "disabled" : ""}>🪙 ${fmt(cost)}</button>
        `;
        div.querySelector("button").onclick = () => {
          if (state.gold >= cost) {
            state.gold -= cost;
            state.allies[idx]++;
            saveGame();
            openShop("allies");
            updateHUD();
          }
        };
        modalContent.appendChild(div);
      });
    } else if (tab === "skills") {
      DATA.skills.forEach((sk, idx) => {
        const unlocked = state.unlockedSkills[idx];
        const canAfford = sk.costType === "gold" ? state.gold >= sk.cost : state.souls >= sk.cost;
        const iconCost = sk.costType === "gold" ? "🪙" : "🔮";
        const div = document.createElement("div");
        div.className = "card-item";
        div.innerHTML = `
          <div class="card-info">
            <h4>${sk.icon} ${sk.name}</h4>
            <p>${sk.desc}</p>
          </div>
          <button class="buy-btn ${unlocked ? "equipped" : ""}" ${unlocked || !canAfford ? "disabled" : ""}>
            ${unlocked ? "LEARNED" : `${iconCost} ${fmt(sk.cost)}`}
          </button>
        `;
        if (!unlocked) {
          div.querySelector("button").onclick = () => {
            if (sk.costType === "gold" && state.gold >= sk.cost) state.gold -= sk.cost;
            else if (sk.costType === "soul" && state.souls >= sk.cost) state.souls -= sk.cost;
            else return;
            state.unlockedSkills[idx] = true;
            window.SFX.playGacha();
            saveGame();
            renderSkillsDock();
            openShop("skills");
            updateHUD();
          };
        }
        modalContent.appendChild(div);
      });
    }
  }

  // 2. GACHA PET SUMMON
  document.getElementById("btn-gacha").onclick = openGacha;

  function openGacha() {
    modalOverlay.classList.remove("hidden");
    modalTitle.textContent = "🎲 EMERALD PET SUMMON";
    modalTabs.innerHTML = "";
    modalContent.innerHTML = `
      <div class="card-item" style="border-color:#34d399; background:rgba(16,185,129,0.12)">
        <div class="card-info">
          <h4>Summon Companion Pet</h4>
          <p>Gunakan Emeralds untuk memanggil Pet pendamping permanen!</p>
        </div>
        <button id="do-summon-btn" class="buy-btn" style="background:#059669" ${state.emeralds < 5 ? "disabled" : ""}>
          ❇️ 5 SUMMON
        </button>
      </div>
    `;

    document.getElementById("do-summon-btn").onclick = () => {
      if (state.emeralds < 5) return;
      state.emeralds -= 5;
      const r = Math.random();
      let acc = 0;
      let won = DATA.pets[0];
      for (const p of DATA.pets) {
        acc += p.rate;
        if (r <= acc) {
          won = p;
          break;
        }
      }
      if (!state.ownedPets.includes(won.id)) state.ownedPets.push(won.id);
      state.equippedPet = won.id;
      window.SFX.playGacha();
      showToast(`🎉 SUMMONED [${won.rarity}]: ${won.icon} ${won.name}!`, "#34d399");
      saveGame();
      openGacha();
      updateHUD();
    };

    DATA.pets.forEach((p) => {
      const owned = state.ownedPets.includes(p.id);
      const eq = state.equippedPet === p.id;
      const div = document.createElement("div");
      div.className = "card-item";
      div.innerHTML = `
        <div class="card-info">
          <h4>${p.icon} ${p.name} <span style="font-size:10px;color:#34d399">[${p.rarity} - ${Math.round(p.rate * 100)}%]</span></h4>
          <p>${p.desc}</p>
        </div>
        <button class="buy-btn ${eq ? "equipped" : ""}" ${!owned || eq ? "disabled" : ""}>
          ${eq ? "EQUIPPED" : owned ? "EQUIP" : "LOCKED"}
        </button>
      `;
      if (owned && !eq) {
        div.querySelector("button").onclick = () => {
          state.equippedPet = p.id;
          saveGame();
          openGacha();
          updateHUD();
        };
      }
      modalContent.appendChild(div);
    });
  }

  // 3. DUNGEON BOSS RUSH
  document.getElementById("btn-dungeon").onclick = () => {
    modalOverlay.classList.remove("hidden");
    modalTitle.textContent = "⚔️ HARDCORE DUNGEONS";
    modalTabs.innerHTML = "";
    modalContent.innerHTML = "";

    DATA.dungeons.forEach((d) => {
      const unlocked = state.stage >= d.reqStage;
      const div = document.createElement("div");
      div.className = "card-item";
      div.innerHTML = `
        <div class="card-info">
          <h4>🏰 ${d.name} (Req: Stage ${d.reqStage})</h4>
          <p>${d.desc}</p>
        </div>
        <button class="buy-btn" style="background:#e11d48" ${!unlocked ? "disabled" : ""}>
          ${unlocked ? "ENTER" : `STAGE ${d.reqStage}`}
        </button>
      `;
      if (unlocked) {
        div.querySelector("button").onclick = () => {
          modalOverlay.classList.add("hidden");
          spawnEnemy(d);
          showToast(`⚔️ ENTERED ${d.name.toUpperCase()}!`, "#f43f5e");
        };
      }
      modalContent.appendChild(div);
    });
  };

  // Toggle Audio
  document.getElementById("btn-audio").onclick = (e) => {
    const muted = window.SFX.toggleMute();
    e.target.textContent = muted ? "🔇" : "🔊";
  };

  // ==========================================
  // UPDATE TAMPILAN HUD
  // ==========================================
  function updateHUD() {
    document.getElementById("ui-gold").textContent = fmt(state.gold);
    document.getElementById("ui-souls").textContent = fmt(state.souls);
    document.getElementById("ui-emeralds").textContent = fmt(state.emeralds);
    document.getElementById("ui-xp").textContent = fmt(state.xp);

    const biomeIdx = Math.min(Math.floor((state.stage - 1) / 3), DATA.biomes.length - 1);
    document.getElementById("ui-biome").textContent = DATA.biomes[biomeIdx].name;
    document.getElementById("ui-stage").textContent = state.stage;
    document.getElementById("ui-wave").textContent = enemy.isDungeon ? "DUNGEON" : `${state.wave}/10`;

    document.getElementById("ui-tap-dmg").textContent = fmt(getTapDamage());
    document.getElementById("ui-dps").textContent = fmt(getDps());
    document.getElementById("ui-crit").textContent = Math.round(getCritChance() * 100) + "%";

    const badge = document.getElementById("ui-enemy-badge");
    if (enemy.isBoss) {
      badge.className = "badge-boss";
      badge.textContent = "BOSS";
    } else if (enemy.isMc) {
      badge.className = "badge-mc";
      badge.textContent = "MC MOB";
    } else {
      badge.className = "badge-normal";
      badge.textContent = "ELITE";
    }

    document.getElementById("ui-enemy-name").textContent = enemy.name;
    document.getElementById("ui-enemy-trait").textContent = enemy.trait ? `[${enemy.trait}]` : "";

    const hpPct = (enemy.hp / enemy.maxHp) * 100;
    document.getElementById("ui-enemy-hp-fill").style.width = `${hpPct}%`;
    const armorPct = enemy.maxArmor > 0 ? (enemy.armor / enemy.maxArmor) * 100 : 0;
    document.getElementById("ui-enemy-armor-fill").style.width = `${armorPct}%`;

    const hpStr = enemy.armor > 0 ? `${fmt(enemy.hp)} (+${fmt(enemy.armor)} 🛡️)` : `${fmt(enemy.hp)} / ${fmt(enemy.maxHp)}`;
    document.getElementById("ui-enemy-hp-text").textContent = hpStr;

    // Timer Boss atau Fuse Creeper
    const timerWrap = document.getElementById("boss-timer-wrap");
    if (enemy.isBoss) {
      timerWrap.classList.remove("hidden");
      document.getElementById("ui-boss-timer-fill").style.width = `${(bossTimer / bossMaxTimer) * 100}%`;
      document.getElementById("ui-boss-timer-text").textContent = `⏳ ${bossTimer.toFixed(1)}s`;
    } else if (enemy.fuseMax > 0) {
      timerWrap.classList.remove("hidden");
      document.getElementById("ui-boss-timer-fill").style.width = `${(enemy.fuseTimer / enemy.fuseMax) * 100}%`;
      document.getElementById("ui-boss-timer-text").textContent = `🧨 FUSE: ${enemy.fuseTimer.toFixed(1)}s`;
    } else {
      timerWrap.classList.add("hidden");
    }

    // Quick Bar
    document.getElementById("ui-sword-lv").textContent = state.swordLv;
    document.getElementById("ui-sword-cost").textContent = `🪙 ${fmt(getSwordCost())}`;
    document.getElementById("ui-crit-lv").textContent = state.critLv;
    document.getElementById("ui-crit-cost").textContent = `🪙 ${fmt(getCritCost())}`;

    const ench = getActiveEnchantObj();
    document.getElementById("ui-active-enchant").textContent = ench ? ench.name : "No Enchant";
  }

 // ==========================================
 // GAME LOOP 60 FPS (PIXI TICKER)
 // ==========================================
  let secAccum = 0;
  let whirlAccum = 0;

  app.ticker.add((delta) => {
    const dt = delta / 60;
    const cx = app.screen.width / 2;
    const cy = app.screen.height / 2;

    // Animasi Idle & Screen Shake Musuh
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.03;
    const hitScale = enemyHitFlash > 0 ? 1 - enemyHitFlash * 0.12 : 1;
    enemySprite.scale.set(pulse * hitScale);
    enemySprite.alpha = enemyHitFlash > 0 ? 0.75 : 1;
    if (enemyHitFlash > 0) enemyHitFlash = Math.max(0, enemyHitFlash - dt * 8);

    let shakeX = 0;
    let shakeY = 0;
    if (screenShake > 0) {
      shakeX = (Math.random() - 0.5) * screenShake * 2;
      shakeY = (Math.random() - 0.5) * screenShake * 2;
      screenShake = Math.max(0, screenShake - dt * 35);
    }
    enemySprite.x += (cx + shakeX - enemySprite.x) * 0.25;
    enemySprite.y = cy + shakeY + Math.sin(performance.now() * 0.003) * 6;

    // Pet Orb Mengorbit Musuh
    const pet = getEquippedPetObj();
    if (pet) {
      petOrb.visible = true;
      const orbAngle = performance.now() * 0.003;
      petOrb.clear();
      petOrb.beginFill(0x34d399);
      petOrb.drawCircle(cx + Math.cos(orbAngle) * 110, cy + Math.sin(orbAngle) * 45, 9);
      petOrb.endFill();
    } else {
      petOrb.visible = false;
    }

    // Partikel Latar
    ambientParticles.forEach((p) => {
      p.y += p.vy;
      if (p.y < 0) {
        p.y = app.screen.height;
        p.x = Math.random() * app.screen.width;
      }
    });

    // Partikel Tebasan
    for (let i = slashParticles.length - 1; i >= 0; i--) {
      const p = slashParticles[i];
      p.life -= dt * 4.5;
      p.alpha = Math.max(0, p.life);
      if (p.vx) {
        p.x += p.vx;
        p.y += p.vy;
      }
      if (p.life <= 0) {
        p.parent.removeChild(p);
        slashParticles.splice(i, 1);
      }
    }

    // Floating Damage Numbers
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.y += t.vy;
      t.life -= dt * 1.4;
      t.alpha = Math.max(0, t.life);
      if (t.life <= 0) {
        textLayer.removeChild(t);
        floatingTexts.splice(i, 1);
      }
    }

    // Combo Timer
    if (combo > 0) {
      comboTimer -= dt;
      const comboEl = document.getElementById("combo-display");
      comboEl.classList.remove("hidden");
      document.getElementById("ui-combo-count").textContent = combo;
      if (comboTimer <= 0) {
        combo = 0;
        comboEl.classList.add("hidden");
      }
    }

    // Cooldown & Durasi Skill
    let needDockRender = false;
    for (let i = 0; i < 6; i++) {
      if (skillCDs[i] > 0) {
        const prev = Math.ceil(skillCDs[i]);
        skillCDs[i] = Math.max(0, skillCDs[i] - dt);
        if (Math.ceil(skillCDs[i]) !== prev) needDockRender = true;
      }
      if (skillActives[i] > 0) {
        skillActives[i] = Math.max(0, skillActives[i] - dt);
        if (skillActives[i] === 0) needDockRender = true;
      }
    }
    if (needDockRender) renderSkillsDock();

    // Skill Whirlwind Auto-Slash
    if (skillActives[0] > 0) {
      whirlAccum += dt;
      if (whirlAccum >= 0.085) {
        whirlAccum = 0;
        dealDamage(getTapDamage() * 0.75, true, cx + (Math.random() - 0.5) * 90, cy + (Math.random() - 0.5) * 90);
      }
    }

    // Timer Boss & Fuse Creeper
    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
    } else {
      if (enemy.isBoss) {
        bossTimer -= dt;
        if (bossTimer <= 0) {
          if (enemy.isDungeon) {
            showToast("💀 DUNGEON FAILED! Waktu habis!", "#f43f5e");
            spawnEnemy();
          } else {
            showToast("⏳ BOSS ESCAPED! Upgrade senjatamu dulu!", "#f43f5e");
            state.wave = Math.max(1, state.wave - 1);
            spawnEnemy();
          }
        }
      }
      if (enemy.fuseMax > 0) {
        enemy.fuseTimer -= dt;
        if (enemy.fuseTimer <= 0) {
          // Creeper meledak: HP musuh reset penuh & regen Armor!
          enemy.hp = enemy.maxHp;
          enemy.armor = enemy.maxArmor;
          enemy.fuseTimer = enemy.fuseMax;
          screenShake = 18;
          showToast("💥 CREEPER EXPLODED! Musuh pulih penuh!", "#f43f5e");
        }
      }
    }

    // Tick Per Detik: Ally DPS + Regenerasi Darah Musuh (Hardcore!)
    secAccum += dt;
    if (secAccum >= 1.0) {
      secAccum = 0;
      const dps = getDps();
      if (dps > 0) dealDamage(dps, false);

      // Regenerasi HP Musuh jika tidak sedang terkena Stun
      if (enemy.regen > 0 && enemy.hp > 0 && enemy.hp < enemy.maxHp && enemy.stunTimer <= 0) {
        const heal = Math.floor(enemy.maxHp * enemy.regen);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      }
      updateHUD();
    }
  });

  // Start Game!
  renderSkillsDock();
  spawnEnemy();
})();