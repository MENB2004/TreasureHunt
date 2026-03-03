const Clue = require("../models/Clue");

// GET ALL CLUES
exports.getAllClues = async (req, res) => {
    try {
        const clues = await Clue.find().sort({ type: 1, difficulty: 1 });
        res.json(clues);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE CLUE
exports.createClue = async (req, res) => {
    try {
        const { type, question, answer, hint, difficulty, qrToken, latitude, longitude, penalty } = req.body;

        if (!type || !question || !answer) {
            return res.status(400).json({ message: "type, question and answer are required" });
        }

        const clue = await Clue.create({
            type,
            question,
            answer,
            hint: hint || "",
            difficulty: difficulty || 1,
            qrToken: qrToken || "",
            latitude: latitude || null,
            longitude: longitude || null,
            penalty: penalty || 0,
        });

        res.status(201).json(clue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE CLUE
exports.updateClue = async (req, res) => {
    try {
        const clue = await Clue.findByIdAndUpdate(
            req.params.clueId,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!clue) return res.status(404).json({ message: "Clue not found" });
        res.json(clue);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE CLUE
exports.deleteClue = async (req, res) => {
    try {
        const clue = await Clue.findByIdAndDelete(req.params.clueId);
        if (!clue) return res.status(404).json({ message: "Clue not found" });
        res.json({ message: "Clue deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
