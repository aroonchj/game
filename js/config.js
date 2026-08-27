window.CONFIG = {
  SUPABASE_URL: window.SUPABASE_URL,
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY,
  PLAYER_MAX_HP: 200,
  ROBE_COLORS: [0xf4efe6, 0xd4af37, 0xc53030, 0x1f242d],
  CLASS_DATA: [
    { name: 'กระบี่เมฆา', qName: 'ตัดเมฆา', eName: 'หมื่นกระบี่', rName: 'จักรพรรดิ' },
    { name: 'ดาบสุริยัน', qName: 'เพลิงผลาญ', eName: 'คลื่นสุริยัน', rName: 'มังกรเพลิง' },
    { name: 'หมัดมังกร', qName: 'คลื่นปราณ', eName: 'ฝ่ามือมังกร', rName: 'มิติมังกร' },
    { name: 'ธนูพฤกษา', qName: 'ศรทะลวง', eName: 'พายุใบไม้', rName: 'ฝนธนู' }
  ],
  VIP_DATA: [
    { level: 0, title: 'จอมยุทธ์พเนจร', cost: 0, atkBonus: 1.0, defBonus: 1.0, expBonus: 1.0, speedBonus: 1.0 },
    { level: 1, title: 'ผู้กล้าฝึกหัด', cost: 100, atkBonus: 1.1, defBonus: 1.1, expBonus: 1.15, speedBonus: 1.05 },
    { level: 2, title: 'ผู้เยี่ยมยุทธ์', cost: 250, atkBonus: 1.15, defBonus: 1.15, expBonus: 1.25, speedBonus: 1.10 },
    { level: 3, title: 'จอมยุทธ์เลื่องชื่อ', cost: 500, atkBonus: 1.22, defBonus: 1.20, expBonus: 1.35, speedBonus: 1.15 },
    { level: 4, title: 'ยอดฝีมือไร้พ่าย', cost: 900, atkBonus: 1.30, defBonus: 1.25, expBonus: 1.50, speedBonus: 1.20 },
    { level: 5, title: 'ปรมาจารย์ยุทธจักร', cost: 1500, atkBonus: 1.40, defBonus: 1.35, expBonus: 1.70, speedBonus: 1.25 },
    { level: 6, title: 'ราชันย์กระบี่', cost: 2400, atkBonus: 1.50, defBonus: 1.45, expBonus: 2.00, speedBonus: 1.30 },
    { level: 7, title: 'เซียนพิภพ', cost: 3600, atkBonus: 1.65, defBonus: 1.55, expBonus: 2.30, speedBonus: 1.35 },
    { level: 8, title: 'มหาเทพจุติ', cost: 5200, atkBonus: 1.80, defBonus: 1.70, expBonus: 2.70, speedBonus: 1.40 },
    { level: 9, title: 'จักรพรรดิสวรรค์', cost: 7500, atkBonus: 2.00, defBonus: 1.85, expBonus: 3.20, speedBonus: 1.50 },
    { level: 10, title: 'เทพบรรพกาลไร้ขอบเขต', cost: 11000, atkBonus: 2.50, defBonus: 2.20, expBonus: 4.00, speedBonus: 1.65 }
  ],
  RARITY_TIERS: {
    white: { name: 'ธรรมดา', color: '#e2e8f0', mult: 1.0 },
    green: { name: 'ยุทธภพ', color: '#48bb78', mult: 1.3 },
    blue: { name: 'วิญญาณ', color: '#4299e1', mult: 1.7 },
    purple: { name: 'ล้ำค่า', color: '#9f7aea', mult: 2.2 },
    orange: { name: 'เทพยุทธ์', color: '#ed8936', mult: 2.9 },
    red: { name: 'เซียนสวรรค์', color: '#f56565', mult: 3.8 },
    pink: { name: 'บรรพกาล', color: '#ed64a6', mult: 5.0 }
  },
  EQUIP_BASE: {
    'helm_lv1': { baseName: 'หมวกสาน', slot: 'helm', reqLvl: 1, baseHp: 30, baseDef: 4 },
    'armor_lv1': { baseName: 'ชุดผ้าป่าน', slot: 'armor', reqLvl: 1, baseHp: 25, baseDef: 6 },
    'boots_lv1': { baseName: 'รองเท้าฟาง', slot: 'boots', reqLvl: 1, baseDef: 3, baseSpeed: 1.02 },

    'helm_lv5': { baseName: 'หมวกหนังหมาป่า', slot: 'helm', reqLvl: 5, baseHp: 65, baseDef: 9 },
    'armor_lv5': { baseName: 'เสื้อเกราะหนังสัตว์', slot: 'armor', reqLvl: 5, baseHp: 80, baseDef: 14 },
    'boots_lv5': { baseName: 'รองเท้าหนังสัตว์', slot: 'boots', reqLvl: 5, baseDef: 7, baseSpeed: 1.05 },

    'helm_lv10': { baseName: 'รัดเกล้าหยกวายุ', slot: 'helm', reqLvl: 10, baseHp: 120, baseDef: 18 },
    'armor_lv10': { baseName: 'เสื้อคลุมวิญญาณ', slot: 'armor', reqLvl: 10, baseHp: 150, baseDef: 28 },
    'bracer_lv10': { baseName: 'ปลอกแขนพยัคฆ์', slot: 'bracer', reqLvl: 10, baseAtk: 14, baseDef: 7 },

    'helm_lv15': { baseName: 'หมวกเหล็กแม่ทัพ', slot: 'helm', reqLvl: 15, baseHp: 200, baseDef: 30 },
    'armor_lv15': { baseName: 'เกราะเหล็กไหล', slot: 'armor', reqLvl: 15, baseHp: 260, baseDef: 48 },
    'bracer_lv15': { baseName: 'ปลอกแขนอัญมณี', slot: 'bracer', reqLvl: 15, baseAtk: 24, baseDef: 12 },

    'armor_lv20': { baseName: 'เกราะสุริยันเพลิง', slot: 'armor', reqLvl: 20, baseHp: 380, baseDef: 70 },
    'bracer_lv20': { baseName: 'ปลอกแขนอัคนี', slot: 'bracer', reqLvl: 20, baseAtk: 42, baseDef: 18 },

    'armor_lv30': { baseName: 'เกราะมังกรสวรรค์', slot: 'armor', reqLvl: 30, baseHp: 580, baseDef: 105 },

    'helm_lv40': { baseName: 'มงกุฎเกล็ดมังกร', slot: 'helm', reqLvl: 40, baseHp: 800, baseDef: 110, baseAtk: 35 },
    'boots_lv40': { baseName: 'สนับแข้งท่องดารา', slot: 'boots', reqLvl: 40, baseDef: 50, baseSpeed: 1.25 },
    'wpn_dragon_pink': { baseName: 'กระบี่มังกรไร้พ่าย', slot: 'weapon', reqLvl: 40, baseAtk: 180, baseHp: 250 }
  }
};

window.QUEST_LIST = [
  { id: 1, title: 'ภารกิจที่ 1: กำจัดหมาป่าทมิฬ (Lv.1 - 3)', targetType: 'wolf', reqCount: 3, curCount: 0, rewardExp: 180, rewardMoney: 80, done: false },
  { id: 2, title: 'ภารกิจที่ 2: ปราบโจรป่าไผ่ (Lv.10 - 15)', targetType: 'bandit', reqCount: 3, curCount: 0, rewardExp: 450, rewardMoney: 180, done: false },
  { id: 3, title: 'ภารกิจที่ 3: ท้าประลองโกเลมศิลาแดง (Lv.25 - 30)', targetType: 'golem', reqCount: 2, curCount: 0, rewardExp: 900, rewardMoney: 350, done: false },
  { id: 4, title: 'ภารกิจมหากาพย์: ล่ามังกรศิลาพันปี (Boss Lv.50)', targetType: 'boss', reqCount: 1, curCount: 0, rewardExp: 3500, rewardMoney: 1500, done: false }
];
