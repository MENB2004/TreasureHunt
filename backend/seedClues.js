require("dotenv").config();
const mongoose = require("mongoose");
const Clue = require("./models/Clue");

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Mongo Connected for Seeding"))
    .catch(err => console.log(err));

// 8 Physical + 8 Technical (pool for round-robin) + 2 Final
const clues = [

    // ══ PHYSICAL CLUES (P1 – P8) ══════════════════════════════════════════
    { type: "physical", difficulty: 1, question: "Where silence trains engineers?", answer: "library", qrToken: "PHY1TOKEN", hint: "Think of books and quiet study spaces." },
    { type: "physical", difficulty: 2, question: "Find the lab where circuits whisper.", answer: "electronics lab", qrToken: "PHY2TOKEN", hint: "Wires, oscilloscopes, breadboards." },
    { type: "physical", difficulty: 3, question: "Where attendance fears.", answer: "hod office", qrToken: "PHY3TOKEN", hint: "A senior's room." },
    { type: "physical", difficulty: 4, question: "Under the stairs where shadows hide.", answer: "staircase", qrToken: "PHY4TOKEN", hint: "Not inside, not outside — between floors." },
    { type: "physical", difficulty: 5, question: "Wall that announces destiny.", answer: "placement board", qrToken: "PHY5TOKEN", hint: "Company names and futures pinned here." },
    { type: "physical", difficulty: 6, question: "Where coffee fuels innovation.", answer: "canteen", qrToken: "PHY6TOKEN", hint: "Hunger and thirst drive great ideas." },
    { type: "physical", difficulty: 3, question: "The tallest tree near the CSE block.", answer: "cse tree", qrToken: "PHY7TOKEN", hint: "Look outside the building." },
    { type: "physical", difficulty: 2, question: "Where projects are born.", answer: "project lab", qrToken: "PHY8TOKEN", hint: "Final-year teams work here." },

    // ══ TECHNICAL CLUES (T1 – T8) ═════════════════════════════════════════
    { type: "technical", difficulty: 1, question: "Decode: SGFja0JlbGxz", answer: "hackbells", hint: "Base64 decode this string." },
    { type: "technical", difficulty: 2, question: "Binary 101010 in decimal?", answer: "42", hint: "Each bit is a power of 2." },
    { type: "technical", difficulty: 3, question: "Output of 5 << 1?", answer: "10", hint: "Left bit-shift multiplies by 2." },
    { type: "technical", difficulty: 4, question: "Reverse this string: gnidoc", answer: "coding", hint: "Mirror it." },
    { type: "technical", difficulty: 5, question: "typeof NaN in JavaScript?", answer: "number", hint: "Counterintuitive JS behavior." },
    { type: "technical", difficulty: 3, question: "Caesar cipher shift 3: frgh", answer: "code", hint: "Shift each letter back by 3." },
    { type: "technical", difficulty: 4, question: "What is 2^5?", answer: "32", hint: "Powers of two." },
    { type: "technical", difficulty: 2, question: "Hexadecimal A in decimal?", answer: "10", hint: "A = 10 in hex." },

    // ══ FINAL CLUES (F1, F2) ══════════════════════════════════════════════
    {
        type: "final",
        difficulty: 8,
        question: "I am always running but never move. I have hands but no arms. What am I?",
        answer: "clock",
        hint: "You see me everywhere."
    },
    {
        type: "final",
        difficulty: 9,
        question: "The more you take, the more you leave behind. What am I?",
        answer: "footsteps",
        hint: "Think about what happens when you walk."
    },
];

const seedDB = async () => {
    await Clue.deleteMany();
    await Clue.insertMany(clues);
    console.log(`✅ Seeded ${clues.length} clues: 8 Physical, 8 Technical, 2 Final`);
    mongoose.connection.close();
};

seedDB();