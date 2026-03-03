const mongoose = require("mongoose");

const eventConfigSchema = new mongoose.Schema({
    eventStart: Date,
    eventEnd: Date,
    isPaused: { type: Boolean, default: false },
    gameStarted: { type: Boolean, default: false },
    gameStartTime: { type: Date, default: null }
});


module.exports = mongoose.model("EventConfig", eventConfigSchema);