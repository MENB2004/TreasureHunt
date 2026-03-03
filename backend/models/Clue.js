const mongoose = require("mongoose");

const clueSchema = new mongoose.Schema({
    type: { type: String, enum: ["physical", "technical", "final"] },
    difficulty: Number,

    question: String,
    answer: String,

    qrToken: String,   // for physical clues
    latitude: Number,
    longitude: Number,

    hint: String,
    penalty: { type: Number, default: 0 }
});

module.exports = mongoose.model("Clue", clueSchema);