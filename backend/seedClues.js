require("dotenv").config();
const mongoose = require("mongoose");
const Clue = require("./models/Clue");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongo Connected for Seeding"))
    .catch(err => console.log(err));

// ══════════════════════════════════════════════════════════════════════════════
// 24 Physical (P1–P24) + 2 Technical (T1–T2) + 1 Final = 27 clues
//
// Sort order for assignment: difficulty ASC, _id ASC.
// difficulty 1..24 guarantees P1=first, P24=last (same for T1/T2).
// ══════════════════════════════════════════════════════════════════════════════

const clues = [

    // ── PHYSICAL CLUES P1–P24 ──────────────────────────────────────────────
    { type: "physical", difficulty: 1, question: "Where silence trains engineers?", answer: "library", qrToken: "PHY_P01", hint: "Books and quiet study spaces." },
    { type: "physical", difficulty: 2, question: "Find the lab where circuits whisper.", answer: "electronics lab", qrToken: "PHY_P02", hint: "Wires, oscilloscopes, breadboards." },
    { type: "physical", difficulty: 3, question: "Where attendance is feared.", answer: "hod office", qrToken: "PHY_P03", hint: "A senior's room." },
    { type: "physical", difficulty: 4, question: "Under the stairs where shadows hide.", answer: "staircase", qrToken: "PHY_P04", hint: "Between floors." },
    { type: "physical", difficulty: 5, question: "Wall that announces destiny.", answer: "placement board", qrToken: "PHY_P05", hint: "Company names pinned here." },
    { type: "physical", difficulty: 6, question: "Where coffee fuels innovation.", answer: "canteen", qrToken: "PHY_P06", hint: "Hunger and thirst drive great ideas." },
    { type: "physical", difficulty: 7, question: "The tallest tree near the CSE block.", answer: "cse tree", qrToken: "PHY_P07", hint: "Look outside the building." },
    { type: "physical", difficulty: 8, question: "Where projects are born.", answer: "project lab", qrToken: "PHY_P08", hint: "Final-year teams work here." },
    { type: "physical", difficulty: 9, question: "Where sports heroes rest between matches.", answer: "sports room", qrToken: "PHY_P09", hint: "Jerseys and trophies." },
    { type: "physical", difficulty: 10, question: "The engine of every great campus.", answer: "server room", qrToken: "PHY_P10", hint: "Blinking lights, cool air." },
    { type: "physical", difficulty: 11, question: "Where your mark divides pass and fail.", answer: "exam hall", qrToken: "PHY_P11", hint: "Rows of benches, silence enforced." },
    { type: "physical", difficulty: 12, question: "Wisdom stored on shelves, old and new.", answer: "reading room", qrToken: "PHY_P12", hint: "Quieter than the main library." },
    { type: "physical", difficulty: 13, question: "The bridge between two buildings.", answer: "corridor bridge", qrToken: "PHY_P13", hint: "You cross it every day." },
    { type: "physical", difficulty: 14, question: "Where wheels wait for their riders.", answer: "bicycle shed", qrToken: "PHY_P14", hint: "Two-wheeled transport parked outside." },
    { type: "physical", difficulty: 15, question: "Where ideas become posters.", answer: "printing room", qrToken: "PHY_P15", hint: "Paper, ink, and diagrams." },
    { type: "physical", difficulty: 16, question: "The room where networks are born.", answer: "networking lab", qrToken: "PHY_P16", hint: "Switches, routers, and cables." },
    { type: "physical", difficulty: 17, question: "Where machines learn.", answer: "ai lab", qrToken: "PHY_P17", hint: "GPUs and datasets." },
    { type: "physical", difficulty: 18, question: "The open floor where footsteps echo.", answer: "main hall", qrToken: "PHY_P18", hint: "Events and assemblies happen here." },
    { type: "physical", difficulty: 19, question: "Where power hides behind panels.", answer: "electrical panel room", qrToken: "PHY_P19", hint: "Circuit breakers and switches." },
    { type: "physical", difficulty: 20, question: "A room ruled by clocks and schedules.", answer: "timetable office", qrToken: "PHY_P20", hint: "Periods, rooms, and faculty." },
    { type: "physical", difficulty: 21, question: "Cool refuge on a hot day.", answer: "ac seminar hall", qrToken: "PHY_P21", hint: "Big screen, air-conditioned." },
    { type: "physical", difficulty: 22, question: "Where hardware meets hammers.", answer: "workshop", qrToken: "PHY_P22", hint: "Machines, lathe, and metal." },
    { type: "physical", difficulty: 23, question: "The garden of knowledge at the entrance.", answer: "college gate garden", qrToken: "PHY_P23", hint: "Flowers and the college name." },
    { type: "physical", difficulty: 24, question: "Where cameras watch everything.", answer: "cctv control room", qrToken: "PHY_P24", hint: "Multiple screens, one watchman." },

    // ── TECHNICAL CLUES T1–T2 ──────────────────────────────────────────────
    { type: "technical", difficulty: 1, question: "Decode: SGFja0JlbGxz", answer: "hackbells", hint: "Base64 decode this." },
    { type: "technical", difficulty: 2, question: "Binary 101010 in decimal?", answer: "42", hint: "Each bit is a power of 2." },

    // ── FINAL CLUE (F) ─────────────────────────────────────────────────────
    {
        type: "final", difficulty: 1,
        question: "I am always running but never move. I have hands but no arms. What am I?",
        answer: "clock",
        hint: "You see me everywhere."
    },
];

const seedDB = async () => {
    await Clue.deleteMany();
    await Clue.insertMany(clues);
    const p = clues.filter(c => c.type === "physical").length;
    const t = clues.filter(c => c.type === "technical").length;
    const f = clues.filter(c => c.type === "final").length;
    console.log(`✅ Seeded ${clues.length} clues: ${p} Physical (P1–P${p}), ${t} Technical (T1–T${t}), ${f} Final`);
    mongoose.connection.close();
};

seedDB();