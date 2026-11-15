window.GAME_DATA = {
  biomes: [
    { name: "WHISPERING WOODS", bgTop: 0x0f291e, bgBot: 0x07130e, accent: 0x34d399 },
    { name: "FORGOTTEN CRYPTS", bgTop: 0x1e1b38, bgBot: 0x090814, accent: 0xa78bfa },
    { name: "DEEP DARK CAVERNS", bgTop: 0x06232b, bgBot: 0x020b0e, accent: 0x22d3ee },
    { name: "INFERNAL NETHER", bgTop: 0x3b0d0c, bgBot: 0x120303, accent: 0xf97316 },
    { name: "THE END ABYSS", bgTop: 0x260c38, bgBot: 0x09020f, accent: 0xe879f9 }
  ],

  // Musuh reguler dengan scaling HP tinggi, Armor, dan Trait khusus
  enemies: [
    { name: "Corrupted Slime", biome: 0, color: 0x4ade80, shape: "slime", hpMult: 1.2, armorPct: 0, trait: "" },
    { name: "Thorn Stalker", biome: 0, color: 0x16a34a, shape: "spike", hpMult: 1.45, armorPct: 0.15, trait: "ARMORED" },
    { name: "Mossy Creeper", biome: 0, color: 0x22c55e, shape: "creeper", hpMult: 1.6, armorPct: 0, trait: "FUSE 12s", mc: true, fuse: 12 },
    { name: "Forest Golem", biome: 0, color: 0x65a30d, shape: "golem", hpMult: 2.1, armorPct: 0.45, trait: "HEAVY ARMOR" },
    { name: "Bog Witch", biome: 0, color: 0x84cc16, shape: "hood", hpMult: 1.75, armorPct: 0.1, trait: "REGEN 2%/s", regen: 0.02 },

    { name: "Crypt Skeleton", biome: 1, color: 0xe2e8f0, shape: "skull", hpMult: 1.5, armorPct: 0.25, trait: "BONE SHIELD" },
    { name: "Wraith Assassin", biome: 1, color: 0x818cf8, shape: "ghost", hpMult: 1.65, armorPct: 0, trait: "DODGE 15%", dodge: 0.15 },
    { name: "Cursed Knight", biome: 1, color: 0x6366f1, shape: "golem", hpMult: 2.3, armorPct: 0.6, trait: "IRON PLATE" },
    { name: "Stray Archer", biome: 1, color: 0x94a3b8, shape: "skull", hpMult: 1.85, armorPct: 0.2, trait: "FROST", mc: true },
    { name: "Necro Acolyte", biome: 1, color: 0xc084fc, shape: "hood", hpMult: 2.0, armorPct: 0.15, trait: "REGEN 3%/s", regen: 0.03 },

    { name: "Sculk Lurker", biome: 2, color: 0x06b6d4, shape: "spider", hpMult: 1.9, armorPct: 0.3, trait: "SCULK", mc: true },
    { name: "Charged Creeper", biome: 2, color: 0x38bdf8, shape: "creeper", hpMult: 2.2, armorPct: 0.2, trait: "FUSE 10s", mc: true, fuse: 10 },
    { name: "Obsidian Guard", biome: 2, color: 0x1e1b4b, shape: "golem", hpMult: 2.8, armorPct: 0.85, trait: "OBSIDIAN", mc: true },
    { name: "Echo Phantom", biome: 2, color: 0x2dd4bf, shape: "ghost", hpMult: 2.1, armorPct: 0.1, trait: "DODGE 20%", dodge: 0.2 },
    { name: "Deep Shambler", biome: 2, color: 0x0e7490, shape: "spike", hpMult: 2.5, armorPct: 0.4, trait: "REGEN 3%/s", regen: 0.03 },

    { name: "Nether Blaze", biome: 3, color: 0xfb923c, shape: "blaze", hpMult: 2.2, armorPct: 0.25, trait: "BURNING", mc: true },
    { name: "Wither Skeleton", biome: 3, color: 0x334155, shape: "skull", hpMult: 2.6, armorPct: 0.5, trait: "WITHER", mc: true },
    { name: "Piglin Brute", biome: 3, color: 0xf43f5e, shape: "golem", hpMult: 3.1, armorPct: 0.75, trait: "BERSERK", mc: true },
    { name: "Magma Colossus", biome: 3, color: 0xea580c, shape: "slime", hpMult: 2.9, armorPct: 0.6, trait: "REGEN 4%/s", regen: 0.04 },
    { name: "Hellfire Fiend", biome: 3, color: 0xdc2626, shape: "spike", hpMult: 2.7, armorPct: 0.35, trait: "HARDENED" },

    { name: "Obsidian Enderman", biome: 4, color: 0xa855f7, shape: "enderman", hpMult: 2.8, armorPct: 0.4, trait: "TELEPORT", mc: true, dodge: 0.22 },
    { name: "Shulker Sentinel", biome: 4, color: 0xd946ef, shape: "golem", hpMult: 3.4, armorPct: 1.0, trait: "MAX SHELL", mc: true },
    { name: "Void Stalker", biome: 4, color: 0x7e22ce, shape: "spider", hpMult: 3.0, armorPct: 0.5, trait: "REGEN 4%/s", regen: 0.04 },
    { name: "Astral Devourer", biome: 4, color: 0xf0abfc, shape: "ghost", hpMult: 3.3, armorPct: 0.6, trait: "VOID SHIELD" },
    { name: "Ender Guardian", biome: 4, color: 0x4c1d95, shape: "spike", hpMult: 3.8, armorPct: 0.9, trait: "TITAN ARMOR", mc: true }
  ],

  // Boss epik (muncul tiap Wave 5 & 10) — Super keras!
  bosses: [
    { name: "ELDER TREANT", biome: 0, color: 0x15803d, shape: "boss_titan", hpMult: 14, armorPct: 0.5, regen: 0.015, trait: "REGEN + ARMOR" },
    { name: "LICH KING MALAKOR", biome: 1, color: 0x7c3aed, shape: "boss_lich", hpMult: 18, armorPct: 0.75, regen: 0.02, trait: "SOUL SHIELD" },
    { name: "THE WARDEN", biome: 2, color: 0x0891b2, shape: "boss_warden", hpMult: 24, armorPct: 1.0, regen: 0.02, trait: "SONIC ARMOR", mc: true },
    { name: "WITHER STORM", biome: 3, color: 0x1e293b, shape: "boss_wither", hpMult: 30, armorPct: 1.2, regen: 0.025, trait: "3-HEAD REGEN", mc: true },
    { name: "VOID ENDER DRAGON", biome: 4, color: 0xc026d3, shape: "boss_dragon", hpMult: 40, armorPct: 1.5, regen: 0.03, trait: "END CRYSTAL", mc: true }
  ],

  weapons: [
    { id: "w0", name: "Rusty Blade", mult: 1, cost: 0, color: 0x94a3b8, desc: "Pedang awal pemula." },
    { id: "w1", name: "Iron Broadsword", mult: 2.5, cost: 250, color: 0xe2e8f0, desc: "Baja tempa standar kerajaan." },
    { id: "w2", name: "Crimson Katana", mult: 7, cost: 1800, color: 0xf43f5e, desc: "Tebasan cepat berdarah." },
    { id: "w3", name: "Enchanted Diamond Sword", mult: 22, cost: 14000, color: 0x38bdf8, desc: "Pedang berlian Sharpness V.", mc: true },
    { id: "w4", name: "Netherite Soul Cleaver", mult: 75, cost: 110000, color: 0xf97316, desc: "Ditempa dari Ancient Debris.", mc: true },
    { id: "w5", name: "Abyssal Dragon Slayer", mult: 260, cost: 950000, color: 0xd946ef, desc: "Menembus zirah naga terkeras." },
    { id: "w6", name: "Celestial Zenith", mult: 950, cost: 8500000, color: 0xfbbf24, desc: "Cahaya bintang penghancur dimensi." }
  ],

  allies: [
    { id: "a0", name: "Shadow Scout", baseDps: 8, baseCost: 50, icon: "🗡️" },
    { id: "a1", name: "Elven Sniper", baseDps: 45, baseCost: 350, icon: "🏹" },
    { id: "a2", name: "Iron Golem", baseDps: 240, baseCost: 2400, icon: "🤖", mc: true },
    { id: "a3", name: "Arcane Pyromancer", baseDps: 1350, baseCost: 18000, icon: "🔥" },
    { id: "a4", name: "Snow Golem Turret", baseDps: 7800, baseCost: 135000, icon: "❄️", mc: true },
    { id: "a5", name: "Void Dragon Knight", baseDps: 48000, baseCost: 1100000, icon: "🐉" }
  ],

  skills: [
    { id: "s0", name: "Whirlwind", icon: "🌪️", cd: 18, dur: 5, costType: "gold", cost: 200, desc: "Auto-slash 12x/detik selama 5d." },
    { id: "s1", name: "Armor Break", icon: "🔨", cd: 25, dur: 0, costType: "gold", cost: 1200, desc: "Hancurkan 80% Armor musuh seketika!" },
    { id: "s2", name: "Battle Fury", icon: "🔥", cd: 30, dur: 8, costType: "soul", cost: 3, desc: "Tap Damage 3.5x lipat selama 8d." },
    { id: "s3", name: "Meteor Rain", icon: "☄️", cd: 40, dur: 0, costType: "soul", cost: 8, desc: "Ledakkan 45x Tap DMG + Stun 3d." },
    { id: "s4", name: "Totem of Greed", icon: "🗿", cd: 45, dur: 10, costType: "soul", cost: 15, desc: "Gold & XP 3x lipat selama 10d." },
    { id: "s5", name: "Void Slash", icon: "🌌", cd: 60, dur: 0, costType: "soul", cost: 25, desc: "Potong 35% HP musuh saat ini!" }
  ],

  // Pool Gacha Pet / Companion (pakai Emeralds)
  pets: [
    { id: "p0", name: "Wolf Pup", rarity: "COMMON", rate: 0.45, icon: "🐺", bonusType: "tap", bonusVal: 0.25, desc: "+25% Tap Damage" },
    { id: "p1", name: "Allay Spirit", rarity: "COMMON", rate: 0.30, icon: "🧚", bonusType: "gold", bonusVal: 0.35, desc: "+35% Gold Drop", mc: true },
    { id: "p2", name: "Crimson Fox", rarity: "RARE", rate: 0.15, icon: "🦊", bonusType: "crit", bonusVal: 0.08, desc: "+8% Critical Chance" },
    { id: "p3", name: "Mini Warden", rarity: "EPIC", rate: 0.07, icon: "👾", bonusType: "dps", bonusVal: 0.75, desc: "+75% Ally DPS", mc: true },
    { id: "p4", name: "Baby Ender Dragon", rarity: "MYTHIC", rate: 0.03, icon: "🐲", bonusType: "all", bonusVal: 1.5, desc: "+150% ALL Damage & Gold!", mc: true }
  ],

  // Enchantment Table (pakai XP)
  enchants: [
    { id: "e1", name: "Sharpness V", desc: "+60% Tap Damage", multTap: 1.6, multGold: 1, armorPen: 0 },
    { id: "e2", name: "Smite V", desc: "+100% Armor Penetration", multTap: 1.15, multGold: 1, armorPen: 0.5 },
    { id: "e3", name: "Looting III", desc: "+80% Gold & Emerald Drop", multTap: 1, multGold: 1.8, armorPen: 0 },
    { id: "e4", name: "Mending", desc: "-25% Cooldown Semua Skill", multTap: 1.1, multGold: 1.1, armorPen: 0.15, cdr: 0.25 }
  ],

  // Dungeon Mode (Boss Rush Berhadiah Besar)
  dungeons: [
    { id: "d1", name: "Goblin Vault", reqStage: 2, hpScale: 35, rewardType: "gold", rewardVal: 5000, desc: "Kalahkan Guardian dalam 20d untuk 5,000 Gold." },
    { id: "d2", name: "Emerald Mines", reqStage: 5, hpScale: 180, rewardType: "emerald", rewardVal: 15, desc: "Kalahkan Cave Titan untuk 15 Emeralds Gacha!" },
    { id: "d3", name: "Ancient City Trial", reqStage: 10, hpScale: 950, rewardType: "soul", rewardVal: 12, desc: "Ujian Warden Kuno! Hadiah 12 Boss Souls." }
  ]
};
