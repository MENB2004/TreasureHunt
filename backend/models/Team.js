const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
    teamName: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Ordered 10-clue sequence for this team (4P + 4T interleaved + 2F)
    clueSequence: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clue" }],

    // Legacy sets (kept for compat, unused by game logic)
    physicalSet: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clue" }],
    technicalSet: [{ type: mongoose.Schema.Types.ObjectId, ref: "Clue" }],

    // "waiting" | "active" | "finished"
    currentPhase: { type: String, default: "waiting" },
    currentIndex: { type: Number, default: 0 },

    startTime: Date,
    finishTime: Date,
    totalTime: Number,

    wrongAttempts: { type: Number, default: 0 },

    locationLogs: [
        {
            clueId: { type: mongoose.Schema.Types.ObjectId, ref: "Clue" },
            latitude: Number,
            longitude: Number,
            locationName: String,
            timestamp: Date
        }
    ],
});

module.exports = mongoose.model("Team", teamSchema);
