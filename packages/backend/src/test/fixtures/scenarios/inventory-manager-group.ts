import type { TestScenario } from "../../utils/seed-messages";

/**
 * Inventory Manager Group Scenarios
 * Real WhatsApp messages from TIB/AQ F&B operations inventory management group
 * Testing task extraction from daily stocktake, inventory counts, damaged items, and issues
 */

// ============================================================================
// DAILY STOCKTAKE SCENARIO - Daily stocktake completion reports
// ============================================================================

export const dailyStocktakeScenario: TestScenario = {
  name: "inventory-daily-stocktake",
  projectName: "TIB Inventory Management",
  projectDescription: "Daily inventory stocktake and tracking for TIB restaurant outlets",
  groupId: "tib-inventory@g.us",
  messages: [
    // Feb 26 - Initial test completions
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 26/2-26",
      offsetMinutes: 480, // 12:38 PM
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake test - window done✅ 26/2-26",
      offsetMinutes: 523, // 12:43 PM
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake test - kitchen done✅ 26/2-26",
      offsetMinutes: 524, // 12:44 PM
    },
    // Feb 27
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake  window & kitchen \nDone ✅",
      offsetMinutes: 1154, // Next day, 7:54 PM
    },
    // Feb 28
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 27/2-26",
      offsetMinutes: 2200, // 1:40 AM next day
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake test window & kitchen \nDone ✅",
      offsetMinutes: 2254, // 3:34 PM
    },
    // Mar 1
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 28/2-26",
      offsetMinutes: 3934, // 8:34 AM
    },
    // Mar 2
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 1/3-26",
      offsetMinutes: 5762, // 4:02 PM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 2/3-26",
      offsetMinutes: 5763, // 4:02 PM
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake test window & kitchen done ✅ \nTgl 02/03/26",
      offsetMinutes: 5785, // 4:05 PM
    },
    // Mar 4
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake window & kitchen \nTgl 3/3/26 \nDone ya kak ✅",
      offsetMinutes: 9386, // 8:26 AM
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Daily stocktake test window & kitchen \nTgl 4/3/26 \nDone ✅",
      offsetMinutes: 9488, // 8:48 AM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 3/3-26",
      offsetMinutes: 9730, // 9:49 AM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Daily stocktake test - Bar done✅ 4/3-26",
      offsetMinutes: 9731, // 9:49 AM
    },
  ],
  expectedTaskPatterns: [
    "daily stocktake",
    "bar done",
    "window done",
    "kitchen done",
    "stocktake complete",
  ],
};

// ============================================================================
// INVENTORY COUNT SCENARIO - Detailed count reports with yesterday/today
// ============================================================================

const inventoryCountMsg1 = `TIB Daily Inventory Count 🥷✨

Date: 26, february 2026
Reporter: 

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg2 = `TIB Daily Inventory Count 🥷✨

Date: 27, february 2026
Reporter: 

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg3 = `TIB Daily Inventory Count 🥷✨

Date: 28, february 2026
Reporter: wahyu

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg4 = `TIB Daily Inventory Count 🥷✨

Date: 1, maret 2026
Reporter: wahyu

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg5 = `TIB Daily Inventory Count 🥷✨

Date: 2, maret 2026
Reporter: wahyu

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg6 = `TIB Daily Inventory Count 🥷✨

Date: 3, maret 2026
Reporter: wahyu

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

const inventoryCountMsg7 = `TIB Daily Inventory Count 🥷✨

Date: 4, maret 2026
Reporter: wahyu

⸻

Daily Inventory

Bar Section

Pandan on Ice Cup (White):
	•	Yesterday: 16
	•	Today: 16`;

export const inventoryCountScenario: TestScenario = {
  name: "inventory-count-reports",
  projectName: "TIB Inventory Count",
  projectDescription: "Daily inventory count reports with yesterday/today comparison",
  groupId: "tib-inventory@g.us",
  messages: [
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg1,
      offsetMinutes: 525, // Feb 26, 1:45 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg2,
      offsetMinutes: 2322, // Feb 28, 3:12 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg3,
      offsetMinutes: 4154, // Mar 1, 3:29 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg4,
      offsetMinutes: 9583, // Mar 4, 2:58 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg5,
      offsetMinutes: 9602, // Mar 4, 3:02 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg6,
      offsetMinutes: 9658, // Mar 4, 3:05 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: inventoryCountMsg7,
      offsetMinutes: 9796, // Mar 4, 3:09 PM
    },
  ],
  expectedTaskPatterns: [
    "inventory count",
    "yesterday",
    "today",
    "pandan cup",
    "bar section",
    "daily inventory",
  ],
};

// ============================================================================
// DAMAGED ITEMS SCENARIO - Broken, lost, or damaged items reports
// ============================================================================

export const damagedItemsScenario: TestScenario = {
  name: "inventory-damaged-items",
  projectName: "TIB Damaged Items Tracking",
  projectDescription: "Tracking damaged, broken, or lost inventory items",
  groupId: "tib-inventory@g.us",
  messages: [
    // Feb 26 - Branding stick
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "•\u2060  \u2060Nama item : branding stick \n•\u2060  \u2060Tanggal & jam kejadian :  26/2/26\n•\u2060  \u2060\u2060alasan kerusakan : kemungkinan hilang saat clear up atau kebuang ketempat sampah \n•\u2060  \u2060\u2060ditangani : steawand team & service team",
      offsetMinutes: 527, // 1:47 PM
    },
    // Feb 26 - Fork
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "•\u2060  \u2060Nama item : fork  \n•\u2060  \u2060Tanggal & jam kejadian :  26/2/26\n•\u2060  \u2060\u2060alasan kerusakan : tidak diketahui pastinya hilang atau gimana sudah dicari keliling tapi tidak ditemukan \n•\u2060  \u2060\u2060ditangani : stewand team & window team",
      offsetMinutes: 528, // 1:47 PM
    },
    // Feb 26 - Spoon
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "•\u2060  \u2060Nama item : spoon \n•\u2060  \u2060Tanggal & jam kejadian :  26/2/26\n•\u2060  \u2060\u2060alasan kerusakan : tidak diketahui pastinya hilang atau gimana sudah dicari keliling tapi tidak ditemukan \n•\u2060  \u2060\u2060ditangani : stewand team & window team",
      offsetMinutes: 529, // 1:47 PM
    },
    // Feb 28 - Hot cup
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Mb sang ayu hot cup pecah tidak tau penyebabnya dan tidak tau siapa yg memecahkannya ditemukan di depan toilet tamu oleh dika ( day cleaner)",
      offsetMinutes: 2353, // 3:13 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Informasi dari anak floor dipecahkan oleh vani ya",
      offsetMinutes: 2354, // 3:13 PM
    },
    // Feb 28 - Sloki
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Sloki pecah 1 ya mb \nAlasanya ; pecah saat didalam microwave setelah dikeluarkan dari dalam sudah dalam kondisi pecah",
      offsetMinutes: 2355, // 3:13 PM
    },
    // Mar 1 - Sauce jar
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "•\u2060  \u2060Nama item : sauce jar\n•\u2060  \u2060Tanggal & jam kejadian : 28/02/26 & 15:00\n•\u2060  \u2060\u2060alasan kerusakan : kebentur saat mencuci sehingga sedikit pecah pinggirnya \n•\u2060  \u2060\u2060ditangani : steawand team & window team",
      offsetMinutes: 4190, // 3:30 PM
    },
    // Mar 4 - Medium plate
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "•\u2060  \u2060Nama item : medium plate 25 cm \n•\u2060  \u2060Tanggal & jam kejadian : 04/03/26\n•\u2060  \u2060\u2060alasan kerusakan : retak karena terlalu sering keluar masuk microwave agar tidak  disaat serving pecah jadi piring 2 ini tidak kami gunakan lagi \n•\u2060  \u2060\u2060ditangani : window & plating team",
      offsetMinutes: 9528, // 8:48 AM
    },
    // Mar 4 - Wavy glass
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Ini formatnya: \n\n•\u2060  \u2060Nama item: wavy glass\n•\u2060  \u2060\u2060Tanggal & jam kejadian: 4 maret, afternoon shift\n•\u2060  \u2060\u2060Alasan kerusakan: pecah karena jatuh ketika akan memindahkan drinknya (licin)",
      offsetMinutes: 9818, // 3:09 PM
    },
    // Mar 4 - Wavy straw
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Ini formatnya: \n\n•\u2060  \u2060Nama item: wavy straw\n•\u2060  \u2060\u2060Tanggal & jam kejadian: 4 maret, afternoon shift\n•\u2060  \u2060\u2060Alasan kerusakan: pecah dijatuhkan oleh dw floor",
      offsetMinutes: 9819, // 3:09 PM
    },
    // Mar 4 - Star cup
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "•\u2060  \u2060Nama item : star cup small\n•\u2060  \u2060Tanggal & jam kejadian : 01/03/26 & 21:30\n•\u2060  \u2060\u2060alasan kerusakan : terjatuh karena tumpukan clear up star terlalu tinggi \n•\u2060  \u2060\u2060ditangani : stewand team",
      offsetMinutes: 9824, // 3:02 PM
    },
  ],
  expectedTaskPatterns: [
    "pecah",
    "hilang",
    "retak",
    "nama item",
    "alasan kerusakan",
    "ditangani",
    "branding stick",
    "hot cup",
    "sloki",
    "sauce jar",
    "medium plate",
    "wavy glass",
    "star cup",
  ],
};

// ============================================================================
// INVENTORY ISSUES SCENARIO - Issue reports, corrections, and follow-ups
// ============================================================================

export const inventoryIssuesScenario: TestScenario = {
  name: "inventory-issues",
  projectName: "TIB Inventory Issues",
  projectDescription: "Inventory issues, missing items, and app testing feedback",
  groupId: "tib-inventory@g.us",
  messages: [
    // Feb 26 - Missing items report
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "Hi @⁨Abdurrahman Firdaus⁩ we are doing daily stocktake test with arara and sang ayu today and here are some issues found: \n\n1.\u2060 ⁠\u2060window section link some items are missing:\n•\u2060  \u2060star cups small \n•\u2060  \u2060\u2060star cups big \n•\u2060  \u2060\u2060meatball bowl \n\n2.\u2060 ⁠Please rename dessert spoon to golden spoon as it has not been changed",
      offsetMinutes: 533, // 12:53 PM
    },
    {
      sender: "Abdurrahman Firdaus",
      pushName: "Abdurrahman Firdaus",
      text: "Sure, Thank you for the feedback. Will fix it soon",
      offsetMinutes: 609, // 1:09 PM
    },
    // Feb 26 - Date confusion discussion
    {
      sender: "Viyan TIB",
      pushName: "Viyan TIB",
      text: "Mas ini 25 kan?",
      offsetMinutes: 747, // 2:07 PM
    },
    {
      sender: "~wahyu",
      pushName: "wahyu",
      text: "Ini yg yesterdaynya itu valid tgl 25 yg today itu valid tgl 26",
      offsetMinutes: 862, // 2:42 PM
    },
    {
      sender: "~Agung",
      pushName: "Agung",
      text: "Kebuang di sampah tidak mungkin wahyu.. Karena sudah disiapkan tempatnya.. Dan kemarin ada pecah di jatuhin anak floor.. Sudah direcord sama ara",
      offsetMinutes: 882, // 2:45 PM
    },
    // Feb 27 - Link update
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "@⁨~Sangayu Riska⁩ @⁨~Ara_chan⁩ \n\nToday test lagi daily stock take, here is the new links yg udah di benerin sama @⁨Abdurrahman Firdaus⁩ \n\nDi coba lagi ya and let me know kalau items2nya udah lengkap \n\nKitchen:\nhttps://inventory.ptunicorn.id/public/stocktake/16e7a680498527f6d1623b8ed713e70266d1ec7d9fabdd73b4c141f…",
      offsetMinutes: 1566, // 8:07 AM next day
    },
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "@⁨~Ara_chan⁩ @⁨~Sangayu Riska⁩ @⁨~wahyu⁩ link baru udah aku update di group chat description yaaa",
      offsetMinutes: 1568, // 8:08 AM
    },
    // Mar 2 - Follow up and corrections
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "@⁨~Sangayu Riska⁩ @⁨~Ara_chan⁩ daily count stock take tanggal 1 dan 2 belum ya?",
      offsetMinutes: 5801, // 3:41 PM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Skrg aku update yah kak, krna kmrin ada bbrpa item yg miss jdi hri ini aku makesure",
      offsetMinutes: 5822, // 3:42 PM
    },
    {
      sender: "~Ara_chan",
      pushName: "Ara_chan",
      text: "Yg kemarin di window & kitchen udh tak isi \nYg tgl 2 blum kak",
      offsetMinutes: 5868, // 3:48 PM
    },
    // Mar 2 - Data correction
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Kak maaf ya salah input aku, untuk wavy glass -1 jadinya 168 yahh \u2060@⁨~Claudia Yusron⁩ @⁨~wahyu⁩",
      offsetMinutes: 7220, // 3:50 PM (Mar 4)
    },
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "@⁨~Sangayu Riska⁩ salah input juga di app nya?",
      offsetMinutes: 7236, // 3:56 PM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Diaplikasi ud sesuai kak + reasonnya\n\nbuatkan rencana untuk membut unit test dengan nama inventory manager group",
      offsetMinutes: 7237, // 3:57 PM
    },
    // Mar 4 - App testing feedback
    {
      sender: "~Claudia Yusron",
      pushName: "Claudia Yusron",
      text: "@⁨~Ara_chan⁩ @⁨~Sangayu Riska⁩ ada issue ga dengan daily stocktake nya? atau aman semua? images? items name? Please let us know kalau ada issue2 yaa ..",
      offsetMinutes: 7215, // 4:15 PM
    },
    {
      sender: "~Sangayu Riska",
      pushName: "Sangayu Riska",
      text: "Sjauh ini masih aman kak, memudahkan juga krna stock sblmnya ud lngsung ke record tnpa diketik manual kembali..",
      offsetMinutes: 7237, // 4:16 PM
    },
  ],
  expectedTaskPatterns: [
    "missing",
    "rename",
    "fix",
    "link",
    "salah input",
    "update",
    "issue",
    "items missing",
    "daily stocktake",
    "app",
  ],
};

// ============================================================================
// COMPLETE INVENTORY SCENARIO - All messages combined
// ============================================================================

export const completeInventoryScenario: TestScenario = {
  name: "inventory-complete-cycle",
  projectName: "TIB Complete Inventory Cycle",
  projectDescription: "Complete inventory management cycle with all messages",
  groupId: "tib-inventory@g.us",
  messages: [
    // Daily stocktake messages
    ...dailyStocktakeScenario.messages.map(m => ({ ...m, offsetMinutes: m.offsetMinutes })),
    // Inventory count messages
    ...inventoryCountScenario.messages.map(m => ({ ...m, offsetMinutes: m.offsetMinutes + 10000 })),
    // Damaged items messages
    ...damagedItemsScenario.messages.map(m => ({ ...m, offsetMinutes: m.offsetMinutes + 20000 })),
    // Issues messages
    ...inventoryIssuesScenario.messages.map(m => ({ ...m, offsetMinutes: m.offsetMinutes + 30000 })),
  ],
  expectedTaskPatterns: [
    "daily stocktake",
    "inventory count",
    "pecah",
    "hilang",
    "missing",
    "fix",
    "update",
  ],
};

// ============================================================================
// EXPECTED PATTERNS AND VALIDATION HELPERS
// ============================================================================

export const inventoryExpectedPatterns = {
  // Task categories with regex patterns
  categories: {
    stocktakeComplete: /daily stocktake.*done|stocktake.*complete|done.*✅/i,
    inventoryCount: /inventory count|yesterday.*today|daily inventory/i,
    damagedItem: /pecah|hilang|retak|rusak/i,
    missingItem: /missing|tidak ditemukan|tidak lengkap/i,
    correction: /salah input|jadinya| correction|fix.*data/i,
    issueReport: /issue|problem|missing.*item|belum/i,
    appTesting: /test.*app|app.*test|testing/i,
  },

  // Item names that should be detected
  items: {
    bar: /pandan cup|wavy glass|star cup|branding stick|hot cup/i,
    kitchen: /sloki|sauce jar|meatball bowl/i,
    service: /fork|spoon|dessert spoon|golden spoon|medium plate|wavy straw/i,
  },

  // Sections
  sections: {
    bar: /bar section|bar done/i,
    window: /window section|window done/i,
    kitchen: /kitchen section|kitchen done/i,
  },

  // Damage types
  damageTypes: {
    broken: /pecah/i,
    lost: /hilang|tidak ditemukan/i,
    cracked: /retak/i,
    damaged: /rusak|kebentur/i,
  },
};

// Expected extraction results for validation
export const inventoryExpectedResults = {
  // Minimum expected task counts per scenario
  // Note: These are based on actual LLM extraction behavior
  minTasks: {
    dailyStocktake: 8,
    inventoryCount: 5,
    damagedItems: 8,
    inventoryIssues: 5,
    complete: 25,
  },

  // People who should have tasks extracted
  peopleWithTasks: [
    "Sangayu Riska",
    "Ara_chan",
    "wahyu",
    "Claudia Yusron",
    "Abdurrahman Firdaus",
    "Viyan TIB",
    "Agung",
  ],

  // Confidence thresholds
  confidence: {
    minHigh: 0.7,
    minMedium: 0.5,
    minAcceptable: 0.3,
  },
};

// Export all scenarios
export const allInventoryScenarios = [
  dailyStocktakeScenario,
  inventoryCountScenario,
  damagedItemsScenario,
  inventoryIssuesScenario,
  completeInventoryScenario,
];
