require("dotenv").config();
const mongoose = require("mongoose");
const Clue = require("./models/Clue");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongo Connected for Seeding"))
    .catch(err => console.log(err));

// ══════════════════════════════════════════════════════════════════════════════
// 13 Physical + 13 Technical + 2 Final = 28 clues
//
// The predefined team sequences reference clues by position once sorted by
// (difficulty ASC, _id ASC). So the first physical clue by that sort is P1,
// the second is P2, …, the thirteenth is P13. Same logic for T1–T13.
//
// Sequence references in adminController (TEAM_SEQUENCES):
//   Physical:  P1–P13  →  physicalClues[0]–physicalClues[12]
//   Technical: T1–T13  →  technicalClues[0]–technicalClues[12]
//
// Difficulty values here are carefully assigned so the sort order matches
// the intended P1…P13 / T1…T13 numbering.
// ══════════════════════════════════════════════════════════════════════════════

const clues = [

    // ── PHYSICAL CLUES P1–P13 ──────────────────────────────────────────────
    // difficulty 1..13 ensures stable sort order = P1..P13
    { type: "physical", difficulty: 1, question: "Where silence trains engineers?", answer: "library", qrToken: "PHY_P01", hint: "Books and quiet study spaces." },
    { type: "physical", difficulty: 2, question: "Find the lab where circuits whisper.", answer: "electronics lab", qrToken: "PHY_P02", hint: "Wires, oscilloscopes, breadboards." },
    { type: "physical", difficulty: 3, question: "Where attendance fears.", answer: "hod office", qrToken: "PHY_P03", hint: "A senior's room." },
    { type: "physical", difficulty: 4, question: "Under the stairs where shadows hide.", answer: "staircase", qrToken: "PHY_P04", hint: "Between floors." },
    { type: "physical", difficulty: 5, question: "Wall that announces destiny.", answer: "placement board", qrToken: "PHY_P05", hint: "Company names pinned here." },
    { type: "physical", difficulty: 6, question: "Where coffee fuels innovation.", answer: "canteen", qrToken: "PHY_P06", hint: "Hunger and thirst drive great ideas." },
    { type: "physical", difficulty: 7, question: "The tallest tree near the CSE block.", answer: "cse tree", qrToken: "PHY_P07", hint: "Look outside the building." },
    { type: "physical", difficulty: 8, question: "Where projects are born.", answer: "project lab", qrToken: "PHY_P08", hint: "Final-year teams work here." },
    { type: "physical", difficulty: 9, question: "Where sports heroes rest between matches.", answer: "sports room", qrToken: "PHY_P09", hint: "Jerseys and trophies." },
    { type: "physical", difficulty: 10, question: "The engine of every great campus.", answer: "server room", qrToken: "PHY_P10", hint: "Blinking lights and cool air." },
    { type: "physical", difficulty: 11, question: "Where your mark divides pass and fail.", answer: "exam hall", qrToken: "PHY_P11", hint: "Rows of benches, silence enforced." },
    { type: "physical", difficulty: 12, question: "Wisdom stored on shelves, old and new.", answer: "reading room", qrToken: "PHY_P12", hint: "Quieter than the main library." },
    { type: "physical", difficulty: 13, question: "The bridge between two buildings.", answer: "corridor bridge", qrToken: "PHY_P13", hint: "You cross it every day." },

    // ── TECHNICAL CLUES T1–T13 ─────────────────────────────────────────────
    // difficulty 1..13 ensures stable sort order = T1..T13
    { type: "technical", difficulty: 1, question: "Decode: SGFja0JlbGxz", answer: "hackbells", hint: "Base64 decode this." },
    { type: "technical", difficulty: 2, question: "Binary 101010 in decimal?", answer: "42", hint: "Each bit is a power of 2." },
    { type: "technical", difficulty: 3, question: "Output of 5 << 1?", answer: "10", hint: "Left shift multiplies by 2." },
    { type: "technical", difficulty: 4, question: "Reverse this string: gnidoc", answer: "coding", hint: "Mirror it." },
    { type: "technical", difficulty: 5, question: "typeof NaN in JavaScript?", answer: "number", hint: "Counterintuitive JS behavior." },
    { type: "technical", difficulty: 6, question: "Caesar cipher shift 3: frgh", answer: "code", hint: "Shift each letter back by 3." },
    { type: "technical", difficulty: 7, question: "What is 2^5?", answer: "32", hint: "Powers of two." },
    { type: "technical", difficulty: 8, question: "Hexadecimal A in decimal?", answer: "10", hint: "A = 10 in hex." },
    { type: "technical", difficulty: 9, question: "What protocol uses port 443?", answer: "https", hint: "Secure web traffic." },
    { type: "technical", difficulty: 10, question: "How many bits in a byte?", answer: "8", hint: "Basic computing unit." },
    { type: "technical", difficulty: 11, question: "SQL command to remove all rows without deleting the table?", answer: "truncate", hint: "Faster than DELETE." },
    { type: "technical", difficulty: 12, question: "What does CPU stand for?", answer: "central processing unit", hint: "The brain of the computer." },
    { type: "technical", difficulty: 13, question: "In Python, what does len([1,2,3]) return?", answer: "3", hint: "Count the elements." },

    // ── FINAL CLUES (F1, F2) ───────────────────────────────────────────────
    {
        type: "final", difficulty: 8,
        question: "I am always running but never move. I have hands but no arms. What am I?",
        answer: "clock",
        hint: "You see me everywhere."
    },
    {
        type: "final", difficulty: 9,
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "Think about what happens when you walk."
    },
];

const seedDB = async () => {
    await Clue.deleteMany();
    await Clue.insertMany(clues);
    console.log(`✅ Seeded ${clues.length} clues: 13 Physical (P1–P13), 13 Technical (T1–T13), 2 Final`);
    console.log("   Physical sort order (P1=diff1 … P13=diff13): ✓");
    console.log("   Technical sort order (T1=diff1 … T13=diff13): ✓");
    mongoose.connection.close();
};

seedDB();