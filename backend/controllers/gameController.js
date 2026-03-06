const Team = require("../models/Team");
const Clue = require("../models/Clue");

const TOTAL_CLUES = 10;  // 4P + 4T interleaved + 2F
const PAIRS = 4;   // P→T pairs
const POOL_SIZE = 8;   // physical/technical pool slots (P1-P8, T1-T8)

// ─── START GAME ──────────────────────────────────────────────────────────────
exports.startGame = async (req, res) => {
    try {
        const team = await Team.findById(req.team._id);

        if (team.clueSequence.length > 0) {
            return res.status(400).json({ message: "Game already started" });
        }

        // Fetch clues sorted by difficulty then _id for stable ordering
        const physicalClues = await Clue.find({ type: "physical" }).sort({ difficulty: 1, _id: 1 });
        const technicalClues = await Clue.find({ type: "technical" }).sort({ difficulty: 1, _id: 1 });
        const finalClues = await Clue.find({ type: "final" }).sort({ difficulty: 1, _id: 1 });

        if (physicalClues.length < POOL_SIZE || technicalClues.length < POOL_SIZE) {
            return res.status(400).json({
                message: `Need at least ${POOL_SIZE} physical and ${POOL_SIZE} technical clues seeded. Found: ${physicalClues.length}P, ${technicalClues.length}T`
            });
        }
        if (finalClues.length < 2) {
            return res.status(400).json({ message: "Need at least 2 final clues seeded." });
        }

        // Determine this team's rotation offset (0-7) based on how many teams already started
        const startedCount = await Team.countDocuments({ clueSequence: { $not: { $size: 0 } } });
        const offset = startedCount % POOL_SIZE;

        // Build interleaved sequence: P[offset]→T[offset]→P[offset+1]→T[offset+1]→...
        const sequence = [];
        for (let i = 0; i < PAIRS; i++) {
            sequence.push(physicalClues[(offset + i) % POOL_SIZE]._id);
            sequence.push(technicalClues[(offset + i) % POOL_SIZE]._id);
        }
        // Append 2 final clues (same for all teams)
        sequence.push(finalClues[0]._id);
        sequence.push(finalClues[1]._id);

        team.clueSequence = sequence;
        team.currentPhase = "active";
        team.currentIndex = 0;
        team.startTime = new Date();

        await team.save();

        console.log(`[startGame] Team "${team.teamName}" offset=${offset}, sequence=[${sequence}]`);
        res.json({ message: "Game started successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── GET CURRENT CLUE ────────────────────────────────────────────────────────
exports.getCurrentClue = async (req, res) => {
    try {
        const team = await Team.findById(req.team._id);

        if (team.clueSequence.length === 0) {
            return res.status(400).json({ message: "Game not started yet" });
        }

        if (team.currentIndex >= TOTAL_CLUES) {
            return res.json({ message: "Hunt complete!" });
        }

        const clueId = team.clueSequence[team.currentIndex];
        const clue = await Clue.findById(clueId).select("-answer");

        res.json(clue);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── SUBMIT ANSWER ────────────────────────────────────────────────────────────
exports.submitAnswer = async (req, res) => {
    try {
        const { answer, qrToken, latitude, longitude } = req.body;

        const team = await Team.findById(req.team._id);

        if (team.currentPhase === "finished") {
            return res.status(400).json({ message: "Hunt already completed" });
        }
        if (team.clueSequence.length === 0) {
            return res.status(400).json({ message: "Game not started yet" });
        }
        if (team.currentIndex >= TOTAL_CLUES) {
            return res.status(400).json({ message: "No more clues" });
        }

        // ─── Time limit check ─────────────────────────────────────────
        const config = await EventConfig.findOne();
        const TIME_LIMIT_MS = 3 * 60 * 60 * 1000;
        if (config && config.gameStartTime && Date.now() > new Date(config.gameStartTime).getTime() + TIME_LIMIT_MS) {
            team.currentPhase = "finished";
            team.finishTime = new Date();
            team.totalTime = team.finishTime - team.startTime;
            await team.save();
            const io = req.app.get("io");
            io.emit("monitorUpdate");
            io.emit("leaderboardUpdate");
            return res.status(400).json({ message: "Time limit reached. Game over.", timeLimitExpired: true, finished: true });
        }

        const clueId = team.clueSequence[team.currentIndex];
        const clue = await Clue.findById(clueId);

        if (!clue) {
            return res.status(400).json({ message: "Clue not found" });
        }

        // Physical/Final clues require QR token scan, Technical requires Answer
        if (clue.type === "physical" || clue.type === "final") {
            if (!qrToken || qrToken.trim() !== clue.qrToken.trim()) {
                team.wrongAttempts += 1;
                await team.save();
                return res.status(400).json({ message: "Invalid QR Token" });
            }
        } else if (clue.type === "technical") {
            if (!answer || answer.trim().toLowerCase() !== clue.answer.trim().toLowerCase()) {
                team.wrongAttempts += 1;
                await team.save();
                return res.status(400).json({ message: "Wrong Answer" });
            }
        }

        // ✅ Correct — log physical location if coordinates provided
        if (clue.type === "physical") {
            team.locationLogs.push({
                clueId: clue._id,
                latitude: latitude || null,
                longitude: longitude || null,
                locationName: clue.question,
                timestamp: new Date()
            });
        }

        team.currentIndex += 1;

        if (team.currentIndex >= TOTAL_CLUES) {
            team.currentPhase = "finished";
            team.finishTime = new Date();
            team.totalTime = team.finishTime - team.startTime;
        }

        await team.save();

        const io = req.app.get("io");
        io.emit("monitorUpdate");
        io.emit("leaderboardUpdate");
        if (clue.type === "physical") io.emit("mapUpdate");

        res.json({
            message: "Correct! Moving to next clue.",
            finished: team.currentPhase === "finished",
            nextIndex: team.currentIndex,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
    try {
        const teams = await Team.find();

        const ranked = teams.map(team => ({
            teamName: team.teamName,
            progress: team.currentPhase === "finished" ? TOTAL_CLUES : team.currentIndex,
            totalTime: team.totalTime || null
        }));

        ranked.sort((a, b) => {
            if (b.progress !== a.progress) return b.progress - a.progress;
            if (a.totalTime && b.totalTime) return a.totalTime - b.totalTime;
            return 0;
        });

        res.json(ranked);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const EventConfig = require("../models/EventConfig");

// ─── SET EVENT TIME ───────────────────────────────────────────────────────────
exports.setEventTime = async (req, res) => {
    try {
        const { eventStart, eventEnd } = req.body;
        const start = new Date(eventStart);
        const end = new Date(eventEnd);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        await EventConfig.deleteMany();
        await EventConfig.create({ eventStart: start, eventEnd: end, isPaused: false });

        res.json({ message: "Event time configured" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};