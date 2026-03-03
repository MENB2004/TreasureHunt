const Admin = require("../models/Admin");
const Team = require("../models/Team");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// REGISTER ADMIN
exports.registerAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const exists = await Admin.findOne({ username });
        if (exists) return res.status(400).json({ message: "Admin exists" });

        const hashed = await bcrypt.hash(password, 10);

        await Admin.create({
            username,
            password: hashed,
            role: "superadmin"
        });

        res.json({ message: "Admin registered" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LOGIN ADMIN
exports.loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(400).json({ message: "Invalid credentials" });

        const match = await bcrypt.compare(password, admin.password);
        if (!match) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({ token });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL TEAMS
exports.getAllTeams = async (req, res) => {
    const teams = await Team.find().select("-password");
    res.json(teams);
};

// LOCK TEAM
exports.lockTeam = async (req, res) => {
    const team = await Team.findById(req.params.teamId);
    team.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    await team.save();
    const io = req.app.get("io");
    io.emit("monitorUpdate");
    io.emit("leaderboardUpdate");
    res.json({ message: "Team locked for 5 minutes" });
};

// UNLOCK TEAM
exports.unlockTeam = async (req, res) => {
    const team = await Team.findById(req.params.teamId);
    team.lockedUntil = null;
    await team.save();
    const io = req.app.get("io");
    io.emit("monitorUpdate");
    io.emit("leaderboardUpdate");
    res.json({ message: "Team unlocked" });
};

// FORCE MOVE TEAM
exports.advanceTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });
        if (team.currentPhase === "finished") {
            return res.status(400).json({ message: "Team already finished" });
        }

        team.currentIndex += 1;

        if (team.currentIndex >= 10) {
            team.currentPhase = "finished";
            team.finishTime = new Date();
            team.totalTime = team.finishTime - (team.startTime || team.finishTime);
        }

        await team.save();
        const io = req.app.get("io");
        io.emit("monitorUpdate");
        io.emit("leaderboardUpdate");

        res.json({ message: "Team advanced manually" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const EventConfig = require("../models/EventConfig");
const Clue = require("../models/Clue");

const TOTAL_CLUES = 10;
const PAIRS = 4;
const POOL_SIZE = 8;
const TIME_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours

// START ALL TEAMS (global game start)
exports.startAllTeams = async (req, res) => {
    try {
        // Fetch clue pools
        const physicalClues = await Clue.find({ type: "physical" }).sort({ difficulty: 1, _id: 1 });
        const technicalClues = await Clue.find({ type: "technical" }).sort({ difficulty: 1, _id: 1 });
        const finalClues = await Clue.find({ type: "final" }).sort({ difficulty: 1, _id: 1 });

        if (physicalClues.length < POOL_SIZE || technicalClues.length < POOL_SIZE) {
            return res.status(400).json({
                message: `Need at least ${POOL_SIZE} physical and ${POOL_SIZE} technical clues. Found: ${physicalClues.length}P, ${technicalClues.length}T`
            });
        }
        if (finalClues.length < 2) {
            return res.status(400).json({ message: "Need at least 2 final clues." });
        }

        // Find all teams that haven't started yet
        const teams = await Team.find({ clueSequence: { $size: 0 } });

        let offset = 0;
        // Count already-started teams to continue offset rotation
        const alreadyStarted = await Team.countDocuments({ clueSequence: { $not: { $size: 0 } } });
        offset = alreadyStarted % POOL_SIZE;

        for (const team of teams) {
            const sequence = [];
            for (let i = 0; i < PAIRS; i++) {
                sequence.push(physicalClues[(offset + i) % POOL_SIZE]._id);
                sequence.push(technicalClues[(offset + i) % POOL_SIZE]._id);
            }
            sequence.push(finalClues[0]._id);
            sequence.push(finalClues[1]._id);

            team.clueSequence = sequence;
            team.currentPhase = "active";
            team.currentIndex = 0;
            team.startTime = new Date();
            await team.save();

            offset = (offset + 1) % POOL_SIZE;
        }

        // Mark game as started in EventConfig (upsert)
        let config = await EventConfig.findOne();
        if (!config) config = new EventConfig();
        config.gameStarted = true;
        config.gameStartTime = new Date();
        await config.save();

        const io = req.app.get("io");
        io.emit("monitorUpdate");
        io.emit("leaderboardUpdate");
        io.emit("gameStarted");

        res.json({ message: `Game started for ${teams.length} team(s).`, teamsStarted: teams.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.pauseEvent = async (req, res) => {
    try {
        let config = await EventConfig.findOne();
        if (!config) config = new EventConfig();
        config.isPaused = true;
        await config.save();
        res.json({ message: "Event paused" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resumeEvent = async (req, res) => {
    try {
        let config = await EventConfig.findOne();
        if (!config) config = new EventConfig();
        config.isPaused = false;
        await config.save();
        res.json({ message: "Event resumed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// LIVE MONITOR DATA
exports.getLiveMonitor = async (req, res) => {
    try {
        const teams = await Team.find().select("-password");

        const monitorData = teams.map(team => ({
            teamId: team._id,
            teamName: team.teamName,
            phase: team.currentPhase,
            progress: team.currentPhase === "finished" ? 10 : team.currentIndex,
            lockedUntil: team.lockedUntil || null,
            isLocked: team.lockedUntil && new Date() < team.lockedUntil,
            elapsedTime: team.startTime ? Date.now() - team.startTime : 0,
            finished: team.currentPhase === "finished"
        }));

        res.json(monitorData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTeamStatus = async (req, res) => {
    try {
        const team = req.team
            ? await Team.findById(req.team._id).populate("clueSequence")
            : null;

        if (!team) return res.status(404).json({ message: "Team not found" });

        // Get event config
        const config = await EventConfig.findOne();
        const eventPaused = config ? config.isPaused : false;
        const gameStarted = config ? config.gameStarted : false;
        const gameStartTime = config ? config.gameStartTime : null;

        // ─── Auto-finish if 3h time limit exceeded ───────────────
        let timeExpired = false;
        if (
            gameStartTime &&
            team.currentPhase === "active" &&
            Date.now() > new Date(gameStartTime).getTime() + TIME_LIMIT_MS
        ) {
            team.currentPhase = "finished";
            team.finishTime = new Date();
            team.totalTime = team.finishTime - team.startTime;
            await team.save();
            timeExpired = true;
        }

        // Resolve current clue from clueSequence (new system)
        let currentClue = null;
        if (team.clueSequence && team.clueSequence.length > team.currentIndex && team.currentPhase === "active") {
            const clueDoc = team.clueSequence[team.currentIndex];
            if (clueDoc) {
                const { answer, ...rest } = clueDoc.toObject ? clueDoc.toObject() : clueDoc;
                currentClue = rest;
            }
        }

        res.json({
            teamName: team.teamName,
            startTime: team.startTime,
            finishTime: team.finishTime,
            totalTime: team.totalTime,
            currentPhase: team.currentPhase,
            currentIndex: team.currentIndex,
            wrongAttempts: team.wrongAttempts,
            isLocked: team.lockedUntil && new Date() < team.lockedUntil,
            isFinished: team.currentPhase === "finished",
            eventPaused,
            gameStarted,
            gameStartTime,
            timeLimit: TIME_LIMIT_MS,
            timeExpired,
            currentClue,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET EVENT STATUS (lightweight — used by admin countdown)
exports.getEventStatus = async (req, res) => {
    try {
        const config = await EventConfig.findOne();
        res.json({
            gameStarted: config ? config.gameStarted : false,
            gameStartTime: config ? config.gameStartTime : null,
            timeLimit: TIME_LIMIT_MS,
            isPaused: config ? config.isPaused : false,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// MAP TRACKING DATA
exports.getMapData = async (req, res) => {
    try {
        const teams = await Team.find().select("teamName locationLogs");

        const mapData = teams.map(team => {
            const latestLog = team.locationLogs.length > 0
                ? team.locationLogs[team.locationLogs.length - 1]
                : null;

            return {
                teamName: team.teamName,
                latestLocation: latestLog || null
            };
        });

        res.json(mapData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ─── TEAM CRUD ─────────────────────────────────────────────────────────────

// CREATE TEAM (by admin)
exports.createTeam = async (req, res) => {
    try {
        const { teamName, password } = req.body;
        if (!teamName || !password) {
            return res.status(400).json({ message: "teamName and password are required" });
        }

        const exists = await Team.findOne({ teamName });
        if (exists) return res.status(400).json({ message: "Team already exists" });

        const hashed = await bcrypt.hash(password, 10);
        const team = await Team.create({ teamName, password: hashed });
        res.status(201).json({ message: "Team created", teamId: team._id, teamName: team.teamName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET SINGLE TEAM
exports.getTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId).select("-password");
        if (!team) return res.status(404).json({ message: "Team not found" });
        res.json(team);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE TEAM (name / password)
exports.updateTeam = async (req, res) => {
    try {
        const { teamName, password } = req.body;
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        if (teamName) team.teamName = teamName;
        if (password) team.password = await bcrypt.hash(password, 10);

        await team.save();
        res.json({ message: "Team updated", teamName: team.teamName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE TEAM
exports.deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });
        res.json({ message: "Team deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// RESET TEAM PROGRESS
exports.resetTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.teamId);
        if (!team) return res.status(404).json({ message: "Team not found" });

        team.currentPhase = "physical";
        team.currentIndex = 0;
        team.startTime = null;
        team.finishTime = null;
        team.totalTime = null;
        team.wrongAttempts = 0;
        team.physicalSet = [];
        team.technicalSet = [];
        team.lockedUntil = null;
        team.locationLogs = [];

        await team.save();

        const io = req.app.get("io");
        io.emit("monitorUpdate");
        io.emit("leaderboardUpdate");

        res.json({ message: "Team reset successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};