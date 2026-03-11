import type { TestScenario } from "../../utils/seed-messages";

/**
 * Realistic WhatsApp Group Scenario - Morning Task Plans and End-of-Day Updates
 * This fixture contains real messages from a F&B operations team (TIB/AQ Group)
 * Testing task extraction from structured daily update formats
 */

// Teresa - Social Media Manager
const teresaMorningPlan = `🌞 MORNING TASK PLAN

Name: Teresa
Date: 3/3/2026

Top 3 Priorities 

1. Manage instagram (post 10 stories, reply to DM, comment on people's post, etc)
2. Manage influencers
3. Manage other social media

Other open tasks
1. Help other departments with design tasks
2. AQ wifi card design (revision)`;

// Yanuar - Operations/Training
const yanuarMorningPlan = `🌞 MORNING TASK PLAN

Name: Yanuar Rizky
Date: 03/03/2026

Top 3 Priorities

1. Submission doc Box requirements for repacking according to ship to kitchen orders 

2. Fanned Cut and plating video tutorial for training content 

3. Order based on data (Request data to SIT: AQK spending and each outlet during February)`;

// Mery - Finance (EOD and Morning)
const meryEODPrevDay = `🌙 END-OF-DAY UPDATE

Name: Mery
Date: 02 March 2026

Completed Today

1. Prepared and imported bank statements as of 28 February for:
• BNI Saving
• BNI Operational
• BRI 300
• BRI 301
• BRI 305`;

const meryMorningPlan = `🌞 MORNING TASK PLAN

Name: Mery
Date: 03 March 2026

Top 3 Priorities

1. Continue Reconcile all bank statement per February

2. Continue petty cash central and all outlet (TIB, AQ1, AQ2, AQ3, AQKJ, AQK, TIBPK)

3. Set up daily payments, ensure all payments are scheduled and processed correctly`;

const meryEODToday = `🌙 END-OF-DAY UPDATE

Name: Mery
Date: 03 March 2026

Completed Today

1. Reconcile bank statements as of 28 February for:
• BNI Saving
• BNI Operational (5 left)
• BRI 300
• BRI 301
• BRI 305
• BRI 304
• BRI Saving (11 left)

2. Reconcile gopay 

3. Continue Petty Cash Statement as of 28 February.

4. Set up daily payments for suppliers.

5. Updated payment status and followed up with the Purchasing team.

6. Money received and money spent on bank period 22-28feb

Pending
• Reconcile petty cash and bank statement BCA
• Continue Register Asset February

Issues / Blockers
• N/A`;

// Rolan - Finance (Morning and EOD)
const rolanMorningPlan = `🌞 MORNING TASK PLAN

Name: Rolan 
Date: 03/03/2026

Top 3 Priorities 

1. Reconcile TIB & AQ Invoices with Tspoonlab data.

2. Sync data to Xero and ensure all draft entries are accurate.

3. Input daily sales and payment for AQ & TIB into Xero`;

const rolanEOD = `🌙 END-OF-DAY UPDATE

Name: Rolan
Date: 03/03/2026

Completed Today  

• Reconcile TIB & AQ Invoices with Tspoonlab data. 

• Sync data to Xero and ensure all draft entries are accurate

• Double checking all payment invoice for today`;

// Ayu - Cash Management
const ayuMorningPlan = `🌞 MORNING TASK PLAN

Name: Ayu 
Date: 03/03/2026

Top 3 Priorities 

1. Update and Calculate cash Sales From All outlets 

2. Deposit Cash Sales At Bank

3. Double Check Daily Payment Invoices 

Other Open Tasks`;

const ayuEOD = `🌙 END-OF-DAY UPDATE

Name: Ayu
Date: 03/03/2026

Completed Today  

• Update and Calculate Cash Sales from All Outlet

• Scanning and Checking Invoices Using New Software

• Double Check Daily Payment Invoices

• Checking Monthly Supplier Payment

• Organize Small Money For AQBW

• Deposit Cash Sales At Bank

Pending
• N/A

Issues / Blockers:
• N/A

Important Notes:
• N/A

Thank You`;

// Malik - HR/Operations
const malikMorningPlan = `🌞 MORNING TASK PLAN

Name: Malik
Date: 03/03/2026

Top 3 Priorities

1. Team Check Ins with Bentung Kitchen

2. Team Check Ins Data Visual
	period 12 Feb-27 Feb

3. Review Performance Table Plan

Other Open Tasks`;

const malikEOD = `🌙 END-OF-DAY UPDATES

Name: Malik
Date: 03/03/2026

Completed Today:  

• Team Check ins
	Bentuyung Kitchen

• Team Check-in Reports

• Visual Recap for Team Daily Check ins
	12-27 Feb 2026`;

// Daniella - Purchasing/Supply Chain
const daniellaMorningPlan = `🌞 MORNING TASK PLAN

Name: Daniella Tasha
Date: 03/03/2026

Top 3 Priorities

1. Chicken Supplier — Trial Agreement Finalization

2. COGS Cases — Cost Control Focus
	•	Review & analyze open COGS cases: Beef, Egg, Watermelon, Rice, Passionfruit, Chicken`;

const daniellaEOD = `🌙 END OF DAY UPDATE

Name: Daniella Tasha
Date: 03/03/2026

Completed Today

	•	Final call with PT Mesari — confirmed to start chicken order today
→ Received supporting data for supplier agreement

	•	Organized chicken to R&D with Mawa

	•	Organized chiller delivery to R&D with Mawa (invoice received)

	•	Strawberry new return process announced
(Alignment meeting with Ana completed)

	•	Ordered sparepart AQG blender

	•	Ordered missing items for TIB cocktails; missing 4 menus to be continued tomorrow 

	•	Organized rice sample to Adina

	•	Organized TIB menu items with Ana to warehouse

	•	Followed up acai delivery from IndoAmazon

	•	Pulsa for all outlets completed

	•	Sent open invoices from vendors & suppliers

	•	Sent monthly mandatory payment invoices to Accounting team

	•	Sent supporting data from online transactions to Accounting

	•	Conducted research for label maker comparison and zipper bag

Pending

	•	Drafting chicken supplier agreement (PT Mesari)

	•	Chiller invoice — awaiting payment

	•	Label maker and zipper bag comparison report (to send tomorrow)

	•	Monitor first chicken order execution

	•	Follow up Accounting on submitted invoices

	•	Ongoing COGS cases: beef, egg, watermelon, rice, passionfruit, chicken

	•	Open projects: lampion, takeaway cup additional paper

Issues / Blockers
	•	N/A

Important Notes

	•	Chicken sourcing officially shifting to PT Mesari starting today

	•	Strawberry return process implemented and aligned with Ops`;

// Ana - Purchasing/Warehouse
const anaMorningPlan = `🌞 MORNING TASK PLAN

Name: Ana
Date: 3/3/2026

Top 3 Priorities

1. Organized lampion sample with Daniella 

2. Daily order with inventory app

3. Assist for printing new menu TIB

Other Open Tasks`;

const anaEOD = `🌙 END-OF-DAY UPDATE

Name: Ana
Date:3/03/2026

Completed Today  

• Organized printing new menu TIB 

• Send announcement to supplier and team for strawberries new return flow ( Meeting with Daniella)

• Send invoice to FIT

• Daily order with inventory app`;

// Kezia - Customer Service
const keziaMorningPlan = `🌞 MORNING TASK PLAN

Name: Kezia
Date: 03/03/2026

Top 3 Priorities
1. Monitor & reply WhatsApp inquiries
2. Handle bookings & confirmations
3. Check and route incoming emails

Wishing everyone a great day ❤️✨`;

const keziaEOD = `🌙 END-OF-DAY UPDATES

Name: Kezia
Date: 03/03/2026

Completed Today:  
• Monitored and responded WhatsApp inquiries 
• Processed bookings and sent confirmations
• Check and routed emails to relevant teams

Pending:
• N/A

Issues / Blockers:
• N/A`;

// Thuwii - Warehouse Operations
const thuwiiMorningPlan = `🌞MORNING TASK PLAN 

Name: Thuwii
Date: 03/03/2026

Top 3 Priorities 

• Check warehouse condition

• Prepare order req from warehouse send to all section AQ/TIB

• Create link movement item from ivenflow and share the link to every outlet`;

const thuwiiEOD = `🌙 END-OF-DAY UPDATE

Name: Thuwii
Date: 3/3/26

Completed Today

• Check warehouse condition

• Prepare order req from warehouse send to all section AQ/TIB

• Create link movement item from ivenflow and share the link to every outlet`;

// Mawa - R&D/Training
const mawaEODPrevDay = `🌙 END-OF-DAY UPDATE

Name: Mawa
Date: 2/3/2026

Completed Today

1. Training Tspoon lab with Oliver
	How create new ingredients 

	how to make a recipe on tsl

2. Updated Sarah's tasks in Asana and the R&D group.`;

const mawaMorningPlan = `🌞 MORNING TASK PLAN

Name: Mawaddah
Date: 3/3/2026

Main Tasks

Priorities (Top 3 Today)

1. Assist Sarah in documents
	Cocktails recipe

	Check the cocktails recipe on tspoon lab

	Lemongrass paste`;

// Chef Eko - Kitchen Operations
const chefEkoMorningPlan = `🌞 MORNING TASK PLAN

Name: Chef Eko
Date: 03/03/2026

Top Priorities

• Analysis Red Mark COGS Items – Step 3
	At this stage, the focus is to identify the real root cause of the red mark variance by validating data accuracy and reviewing operational execution in detail. The objective is to ensure the variance is not only identified, but clearly understood and measurable.`;

// Abdurrahman - IT/Integration
const dausMorningPlan = `🌞 MORNING TASK PLAN

Name: Muhammad Abdurrahman Firdaus
Date: 03/03/2026

Top Priorities

1. Resolve API Roadblock & Financial Integration:

• Follow up and secure the BNI/BRI API technical documentation/information to continue the direct Xero integration.

2. Inventory App (Online Purchasing):`;

// Claudia - Project Management
const claudiaMorningPlan = `🌞 MORNING TASK PLAN

Name: Claudia R Yusron
Date: 3/3/2026

Top 1 Priorities:

• TIB Inventory System (Continuation)
• Weekly calls
    - Finance Call
    - TIB Ops huddle
• AA Giveaway Ticket Activation Plan

Other tasks:`;

// Vani - HR/Admin
const vaniMorningPlan = `🌞MORNING TASK PLAN

Name: Vani
Date: 03/03/2026

Top 3 Priorities

1. Continue February's salary slip 

2. Monthly attendance report 

3. Continue preparing vitamin and medicine for each AQ Bars & TIB 

Other Open Tasks`;

// Gabriel - Finance/Accounting
const gabrielMorningPlan = `🌞 MORNING TASK PLAN

Name: Hezron Gabriel Naibaho
Date: 3/3/2026

Top 3 Priorities

1. Execute Plan for book 2025

2. Project Fixing Balance Sheet

3. Provide Data & Check Recap payment for tax consultant`;

// Michelle - Operations Manager
const michelleMorningPlan = `🌞 MORNING TASK PLAN

Name: Michelle Tannesa
Date: 03/03/2026

Top 3 Priorities

1. Daily Operational Issues
• Identify Issues
• Follow up Issues
• Ops Huddle

2. TIB Cocktails

3. Maintenance Optimization TIB`;

// Dayu - HR
const dayuMorningPlan = `🌞MORNING TASK PLAN

Name: Dayuu
Date: 3/3/2026

Top 3 Priorities

1. ABCD grading

2. Training Platform plan

3. Company event

4. Outlet visit`;

/**
 * Full realistic WhatsApp group scenario with morning task plans only
 */
export const realisticMorningTaskPlansScenario: TestScenario = {
  name: "realistic-morning-task-plans",
  projectName: "TIB/AQ F&B Operations",
  projectDescription: "Daily operations management for TIB and AQ restaurant outlets",
  groupId: "tib-aq-operations@g.us",
  messages: [
    // Morning batch (10:04 - 11:23)
    { sender: "~Teresa", pushName: "Teresa", text: teresaMorningPlan, offsetMinutes: 480 }, // 10:04
    { sender: "Yanuar TIB", pushName: "Yanuar Rizky", text: yanuarMorningPlan, offsetMinutes: 454 }, // 10:28
    { sender: "~gek mery", pushName: "Mery", text: meryEODPrevDay, offsetMinutes: 452 }, // 10:30
    { sender: "Rolan TIB", pushName: "Rolan", text: rolanMorningPlan, offsetMinutes: 447 }, // 10:35
    { sender: "~gek mery", pushName: "Mery", text: meryMorningPlan, offsetMinutes: 447 }, // 10:35
    { sender: "~Ayu Ari", pushName: "Ayu", text: ayuMorningPlan, offsetMinutes: 438 }, // 10:44
    { sender: "Malik TIB", pushName: "Malik", text: malikMorningPlan, offsetMinutes: 416 }, // 10:57
    { sender: "~Daniella Tasha", pushName: "Daniella Tasha", text: daniellaMorningPlan, offsetMinutes: 402 }, // 11:11
    { sender: "~Ana", pushName: "Ana", text: anaEOD, offsetMinutes: 402 }, // 11:11 (EOD update)
    { sender: "~Ana", pushName: "Ana", text: anaMorningPlan, offsetMinutes: 401 }, // 11:11
    { sender: "~Kezia Laurencia", pushName: "Kezia Laurencia", text: keziaMorningPlan, offsetMinutes: 389 }, // 11:23
    // Afternoon batch (11:50 - 13:26)
    { sender: "~Thuwii", pushName: "Thuwii", text: thuwiiMorningPlan, offsetMinutes: 362 }, // 11:50
    { sender: "~mawa", pushName: "Mawa", text: mawaEODPrevDay, offsetMinutes: 341 }, // 12:12 (EOD from prev day)
    { sender: "~mawa", pushName: "Mawaddah", text: mawaMorningPlan, offsetMinutes: 341 }, // 12:12
    { sender: "chef eko TIB", pushName: "Chef Eko", text: chefEkoMorningPlan, offsetMinutes: 324 }, // 12:29
    { sender: "Abdurrahman Firdaus", pushName: "Muhammad Abdurrahman Firdaus", text: dausMorningPlan, offsetMinutes: 307 }, // 12:45
    { sender: "~Claudia Yusron", pushName: "Claudia R Yusron", text: claudiaMorningPlan, offsetMinutes: 306 }, // 12:45
    { sender: "Vani TIB", pushName: "Vani", text: vaniMorningPlan, offsetMinutes: 266 }, // 13:25
    { sender: "Gabriel TIB", pushName: "Hezron Gabriel Naibaho", text: gabrielMorningPlan, offsetMinutes: 265 }, // 13:26
    { sender: "~Michelle", pushName: "Michelle Tannesa", text: michelleMorningPlan, offsetMinutes: 246 }, // 13:44
    { sender: "Dayu HR TIB", pushName: "Dayuu", text: dayuMorningPlan, offsetMinutes: 227 }, // 14:11
  ],
  expectedTaskPatterns: [
    "instagram",
    "reconcile",
    "payment",
    "inventory",
    "training",
    "warehouse",
    "COGS",
    "API",
    "salary",
  ],
};

/**
 * End-of-Day updates scenario
 */
export const realisticEODUpdatesScenario: TestScenario = {
  name: "realistic-eod-updates",
  projectName: "TIB/AQ F&B Operations - EOD",
  projectDescription: "End-of-day updates for TIB and AQ restaurant outlets",
  groupId: "tib-aq-operations@g.us",
  messages: [
    { sender: "~Kezia Laurencia", pushName: "Kezia", text: keziaEOD, offsetMinutes: 120 }, // 22:04
    { sender: "Rolan TIB", pushName: "Rolan", text: rolanEOD, offsetMinutes: 116 }, // 22:08
    { sender: "~gek mery", pushName: "Mery", text: meryEODToday, offsetMinutes: 79 }, // 22:45
    { sender: "~Daniella Tasha", pushName: "Daniella", text: daniellaEOD, offsetMinutes: 37 }, // 23:35
    { sender: "Malik TIB", pushName: "Malik", text: malikEOD, offsetMinutes: 26 }, // 23:46
    { sender: "~Thuwii", pushName: "Thuwii", text: thuwiiEOD, offsetMinutes: 15 }, // 23:57
    { sender: "~Ana", pushName: "Ana", text: anaEOD, offsetMinutes: 14 }, // 23:58
    { sender: "~Ayu Ari", pushName: "Ayu", text: ayuEOD, offsetMinutes: 0 }, // 00:00 (next day)
  ],
  expectedTaskPatterns: [
    "completed",
    "reconcile",
    "payment",
    "organize",
    "send",
    "check",
    "pending",
  ],
};

/**
 * Complete day cycle scenario - Morning plans followed by EOD updates
 * This tests task tracking and completion detection
 */
export const realisticCompleteDayScenario: TestScenario = {
  name: "realistic-complete-day-cycle",
  projectName: "TIB/AQ Daily Operations Cycle",
  projectDescription: "Full day cycle with morning plans and end-of-day updates for task tracking",
  groupId: "tib-aq-operations@g.us",
  messages: [
    // Morning Plans (chronological order - most recent first for ingestion)
    { sender: "Dayu HR TIB", pushName: "Dayuu", text: dayuMorningPlan, offsetMinutes: 600 },
    { sender: "~Michelle", pushName: "Michelle", text: michelleMorningPlan, offsetMinutes: 580 },
    { sender: "Gabriel TIB", pushName: "Gabriel", text: gabrielMorningPlan, offsetMinutes: 560 },
    { sender: "Vani TIB", pushName: "Vani", text: vaniMorningPlan, offsetMinutes: 550 },
    { sender: "~Claudia Yusron", pushName: "Claudia", text: claudiaMorningPlan, offsetMinutes: 520 },
    { sender: "Abdurrahman Firdaus", pushName: "Daus", text: dausMorningPlan, offsetMinutes: 515 },
    { sender: "chef eko TIB", pushName: "Chef Eko", text: chefEkoMorningPlan, offsetMinutes: 500 },
    { sender: "~mawa", pushName: "Mawaddah", text: mawaMorningPlan, offsetMinutes: 480 },
    { sender: "~Thuwii", pushName: "Thuwii", text: thuwiiMorningPlan, offsetMinutes: 460 },
    { sender: "~Kezia Laurencia", pushName: "Kezia", text: keziaMorningPlan, offsetMinutes: 440 },
    { sender: "~Ana", pushName: "Ana", text: anaMorningPlan, offsetMinutes: 430 },
    { sender: "~Daniella Tasha", pushName: "Daniella", text: daniellaMorningPlan, offsetMinutes: 420 },
    { sender: "Malik TIB", pushName: "Malik", text: malikMorningPlan, offsetMinutes: 410 },
    { sender: "~Ayu Ari", pushName: "Ayu", text: ayuMorningPlan, offsetMinutes: 400 },
    { sender: "~gek mery", pushName: "Mery", text: meryMorningPlan, offsetMinutes: 390 },
    { sender: "Rolan TIB", pushName: "Rolan", text: rolanMorningPlan, offsetMinutes: 385 },
    { sender: "~gek mery", pushName: "Mery", text: meryEODPrevDay, offsetMinutes: 380 },
    { sender: "Yanuar TIB", pushName: "Yanuar", text: yanuarMorningPlan, offsetMinutes: 370 },
    { sender: "~Teresa", pushName: "Teresa", text: teresaMorningPlan, offsetMinutes: 360 },
    // EOD Updates (later in the day)
    { sender: "~Ayu Ari", pushName: "Ayu", text: ayuEOD, offsetMinutes: 120 },
    { sender: "~Ana", pushName: "Ana", text: anaEOD, offsetMinutes: 110 },
    { sender: "~Thuwii", pushName: "Thuwii", text: thuwiiEOD, offsetMinutes: 100 },
    { sender: "Malik TIB", pushName: "Malik", text: malikEOD, offsetMinutes: 90 },
    { sender: "~Daniella Tasha", pushName: "Daniella", text: daniellaEOD, offsetMinutes: 80 },
    { sender: "~gek mery", pushName: "Mery", text: meryEODToday, offsetMinutes: 70 },
    { sender: "Rolan TIB", pushName: "Rolan", text: rolanEOD, offsetMinutes: 60 },
    { sender: "~Kezia Laurencia", pushName: "Kezia", text: keziaEOD, offsetMinutes: 50 },
  ],
  expectedTaskPatterns: [
    "instagram",
    "reconcile",
    "payment",
    "inventory",
    "training",
    "warehouse",
    "COGS",
    "API",
    "salary",
    "completed",
    "pending",
  ],
};

/**
 * Expected extraction results for validation
 */
export const realisticMorningPlansExpected = {
  taskCount: { min: 30, max: 60 }, // Wide range as extraction may vary
  peopleWithTasks: [
    "Teresa",
    "Yanuar",
    "Mery",
    "Rolan",
    "Ayu",
    "Malik",
    "Daniella",
    "Ana",
    "Kezia",
    "Thuwii",
    "Mawa",
    "Chef Eko",
    "Daus",
    "Claudia",
    "Vani",
    "Gabriel",
    "Michelle",
    "Dayu",
  ],
  expectedTaskCategories: {
    socialMedia: /instagram|influencer|social/i,
    finance: /reconcile|payment|invoice|bank|xero|cash/i,
    purchasing: /supplier|order|chicken|rice|inventory/i,
    hr: /check.*in|attendance|salary|grading/i,
    operations: /warehouse|menu|blender|cocktail/i,
    it: /API|integration|app/i,
    training: /training|video|tutorial|tspoon/i,
  },
};

/**
 * Expected deduplication patterns
 * Tasks that should be detected as similar/duplicates
 */
export const expectedDuplicatePatterns = [
  // Same task mentioned in morning and EOD should be linked
  {
    pattern1: /reconcile.*bank/i,
    pattern2: /reconciled.*bank/i,
    shouldMatch: true,
  },
  {
    pattern1: /check.*warehouse/i,
    pattern2: /checked.*warehouse/i,
    shouldMatch: true,
  },
  {
    pattern1: /daily order/i,
    pattern2: /ordered.*daily/i,
    shouldMatch: true,
  },
];

// Export all realistic scenarios
export const allRealisticScenarios = [
  realisticMorningTaskPlansScenario,
  realisticEODUpdatesScenario,
  realisticCompleteDayScenario,
];
