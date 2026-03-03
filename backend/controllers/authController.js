const Team = require("../models/Team");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER
exports.registerTeam = async (req, res) => {
    try {
        const { teamName, password } = req.body;

        const existing = await Team.findOne({ teamName });
        if (existing) {
            return res.status(400).json({ message: "Team already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newTeam = await Team.create({
            teamName,
            password: hashedPassword
        });

        res.status(201).json({ message: "Team registered successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// LOGIN
exports.loginTeam = async (req, res) => {
    try {
        const { teamName, password } = req.body;

        const team = await Team.findOne({ teamName });
        if (!team) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, team.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // --- AUTO-START GAME IF NOT STARTED YET ---
        if (team.clueSequence.length === 0) {
            const Clue = require("../models/Clue");
            const physicalClues = await Clue.find({ type: "physical" }).sort({ difficulty: 1, _id: 1 });
            const technicalClues = await Clue.find({ type: "technical" }).sort({ difficulty: 1, _id: 1 });
            const finalClues = await Clue.find({ type: "final" }).sort({ difficulty: 1, _id: 1 });

            if (physicalClues.length >= 8 && technicalClues.length >= 8 && finalClues.length >= 2) {
                const startedCount = await Team.countDocuments({ clueSequence: { $not: { $size: 0 } } });
                const offset = startedCount % 8;

                const sequence = [];
                for (let i = 0; i < 4; i++) {
                    sequence.push(physicalClues[(offset + i) % 8]._id);
                    sequence.push(technicalClues[(offset + i) % 8]._id);
                }
                sequence.push(finalClues[0]._id);
                sequence.push(finalClues[1]._id);

                team.clueSequence = sequence;
                team.currentPhase = "active";
                team.currentIndex = 0;
                team.startTime = new Date();

                await team.save();

                // Notify admin monitor that a team just started
                const io = req.app.get("io");
                if (io) io.emit("monitorUpdate");
            }
        }

        const token = jwt.sign(
            { id: team._id },
            process.env.JWT_SECRET,
            { expiresIn: "6h" }
        );

        res.json({
            token,
            teamId: team._id,
            teamName: team.teamName
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};