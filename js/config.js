window.CONFIG = {
  SUPABASE_URL: window.SUPABASE_URL || "https://mflemycqwksuktvktlko.supabase.co",
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mbGVteWNxd2tzdWt0dmt0bGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTA1MjksImV4cCI6MjEwMzM2NjUyOX0.8SCV1ZDz3lOulzzh7jONZj73McRwn-duAaaoGC6XTso",

  PLAYER_MAX_HP: 200,

  ROBE_COLORS: [0xf4efe6, 0xd4af37, 0xc53030, 0x1f242d],

  CLASS_DATA: [
    { name: 'กระบี่เมฆา', atkName: 'กระบี่ลม', qName: 'ตัดเมฆา', eName: 'หมื่นกระบี่', rName: 'จักรพรรดิ' },
    { name: 'ดาบสุริยัน', atkName: 'ดาบเพลิง', qName: 'เพลิงผลาญ', eName: 'คลื่นสุริยัน', rName: 'มังกรเพลิง' },
    { name: 'หมัดมังกร', atkName: 'หมัดสุญญา', qName: 'คลื่นปราณ', eName: 'ฝ่ามือมังกร', rName: 'มิติมังกร' },
    { name: 'ธนูพฤกษา', atkName: 'ศรสายลม', qName: 'ศรทะลวง', eName: 'พายุใบไม้', rName: 'ฝนธนู' }
  ],

  // สิทธิพิเศษ VIP 1 - 10
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

  // ระดับไอเทม 7 ขั้น (Tier / Colors)
  RARITY_COLORS: {
    white: '#e2e8f0',
    green: '#48bb78',
    blue: '#4299e1',
    purple: '#9f7aea',
    orange: '#ed8936',
    red: '#f56565',
    pink: '#ed64a6'
  },

  // ฐานข้อมูลไอเทมทั้งหมดในเกม
  EQUIP_DATABASE: {
    // หมวก
    'helm_common': { name: 'หมวกสานฝึกหัด', tier: 'white', slot: 'helm', reqLvl: 1, hp: 40, def: 4 },
    'helm_green': { name: 'หมวกเหล็กสำริด', tier: 'green', slot: 'helm', reqLvl: 5, hp: 90, def: 10 },
    'helm_blue': { name: 'รัดเกล้าหยกวายุ', tier: 'blue', slot: 'helm', reqLvl: 15, hp: 180, def: 22 },
    'helm_purple': { name: 'หมวกศึกแม่ทัพประจิม', tier: 'purple', slot: 'helm', reqLvl: 30, hp: 320, def: 45 },
    'helm_boss_pink': { name: 'มงกุฎเกล็ดมังกรสวรรค์', tier: 'pink', slot: 'helm', reqLvl: 45, hp: 750, def: 95, atk: 40 },

    // เสื้อเกราะ
    'armor_common': { name: 'ชุดผ้าป่านธรรมดา', tier: 'white', slot: 'armor', reqLvl: 1, hp: 30, def: 6 },
    'armor_green': { name: 'เสื้อเกราะหนังเสือดาว', tier: 'green', slot: 'armor', reqLvl: 8, hp: 110, def: 18 },
    'armor_purple': { name: 'เกราะเหล็กไหลพันปี', tier: 'purple', slot: 'armor', reqLvl: 25, hp: 280, def: 55 },
    'armor_boss_red': { name: 'เกราะเซียนสุริยันเผาผลาญ', tier: 'red', slot: 'armor', reqLvl: 40, hp: 600, def: 110 },

    // ปลอกแขน
    'bracer_blue': { name: 'ปลอกแขนพยัคฆ์เหิน', tier: 'blue', slot: 'bracer', reqLvl: 12, atk: 18, def: 8 },
    'bracer_orange': { name: 'ปลอกแขนอัคนีผลาญภพ', tier: 'orange', slot: 'bracer', reqLvl: 35, atk: 55, def: 20 },

    // สนับแข้ง
    'boots_green': { name: 'รองเท้าหนังสัตว์ป่า', tier: 'green', slot: 'boots', reqLvl: 3, def: 8, speed: 1.05 },
    'boots_boss_pink': { name: 'สนับแข้งท่องดาราบรรพกาล', tier: 'pink', slot: 'boots', reqLvl: 45, def: 45, speed: 1.30 },

    // อาวุธเทพ
    'wpn_dragon_pink': { name: 'กระบี่บรรพกาลไร้พ่าย', tier: 'pink', slot: 'weapon', reqLvl: 50, atk: 180, hp: 200 }
  }
};
