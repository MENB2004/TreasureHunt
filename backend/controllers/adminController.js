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

const TOTAL_CLUES = 9;
const TIME_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours

// ── 10 predefined team sequences ───────────────────────────────────────────
// Tokens: "Pn" = nth physical clue (1-based, sorted difficulty ASC, _id ASC)
//         "Tn" = nth technical clue (same sort)
//         "F"  = the single final clue
// Each row has exactly 9 tokens: 8 P/T in any order, then "F" last.
const TEAM_SEQUENCES = [
    // Team 1
    ["P1", "T1", "P11", "P21", "P6", "T2", "P16", "P3", "F"],
    // Team 2
    ["P2", "P12", "T2", "P22", "P7", "P17", "T3", "P4", "F"],
    // Team 3
    ["P3", "P13", "P23", "T3", "P8", "P18", "P5", "T4", "F"],
    // Team 4
    ["T4", "P4", "P14", "P24", "P9", "T1", "P19", "P6", "F"],
    // Team 5
    ["P5", "P15", "T1", "P1", "P10", "P20", "P7", "T3", "F"],
    // Team 6
    ["P6", "T2", "P16", "P2", "P11", "P21", "T4", "P8", "F"],
    // Team 7
    ["P7", "P17", "P3", "T3", "P12", "T1", "P22", "P9", "F"],
    // Team 8
    ["T2", "P8", "P18", "P4", "P13", "T4", "P23", "P10", "F"],
    // Team 9
    ["P9", "P19", "T4", "P5", "P14", "P24", "P11", "T2", "F"],
    // Team 10
    ["P10", "P20", "P6", "T1", "P15", "T3", "P1", "P12", "F"],
    // Team 11
    ["P11", "P21", "T3", "P7", "P16", "T2", "P2", "P13", "F"],
    // Team 12
    ["P12", "T4", "P22", "P8", "P17", "T1", "P3", "P14", "F"],
];

// START ALL TEAMS (global game start)
exports.startAllTeams = async (req, res) => {
    try {
        // Fetch clue pools sorted by difficulty ASC, _id ASC (deterministic order)
        // P1 = physicalClues[0] (lowest difficulty), P24 = physicalClues[23], etc.
        const physicalClues = await Clue.find({ type: "physical" }).sort({ difficulty: 1, _id: 1 });
        const technicalClues = await Clue.find({ type: "technical" }).sort({ difficulty: 1, _id: 1 });
        const finalClues = await Clue.find({ type: "final" }).sort({ difficulty: 1, _id: 1 });

        // Validate pool sizes — sequences reference up to P24, T4, and F
        if (physicalClues.length < 24) {
            return res.status(400).json({
                message: `Need at least 24 physical clues. Found: ${physicalClues.length}. Please re-seed.`
            });
        }
        if (technicalClues.length < 4) {
            return res.status(400).json({
                message: `Need at least 4 technical clues. Found: ${technicalClues.length}. Please re-seed.`
            });
        }
        if (finalClues.length < 1) {
            return res.status(400).json({ message: "Need at least 1 final clue. Please re-seed." });
        }

        // Only assign to teams that haven't started yet; sort by _id (creation order)
        const teams = await Team.find({ clueSequence: { $size: 0 } }).sort({ _id: 1 });
        const alreadyStarted = await Team.countDocuments({ clueSequence: { $not: { $size: 0 } } });

        for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            const seqIdx = (alreadyStarted + i) % TEAM_SEQUENCES.length;
            const tokens = TEAM_SEQUENCES[seqIdx]; // e.g. ["P1","T1","P11",…,"F"]

            const sequence = [];
            for (const tok of tokens) {
                let clueDoc;
                if (tok === "F") {
                    clueDoc = finalClues[0];
                } else if (tok.startsWith("P")) {
                    const idx = parseInt(tok.slice(1), 10) - 1; // 1-based → 0-based
                    clueDoc = physicalClues[idx];
                } else if (tok.startsWith("T")) {
                    const idx = parseInt(tok.slice(1), 10) - 1;
                    clueDoc = technicalClues[idx];
                }
                if (!clueDoc) {
                    return res.status(400).json({
                        message: `Sequence ${seqIdx + 1} references "${tok}" but the clue does not exist in the DB. Re-seed first.`
                    });
                }
                sequence.push(clueDoc._id);
            }

            team.clueSequence = sequence;
            team.currentPhase = "active";
            team.currentIndex = 0;
            team.startTime = new Date();
            await team.save();
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
        const teams = await Team.find().populate("clueSequence").select("-password");

        const monitorData = teams.map(team => {
            let currentClue = null;
            if (team.clueSequence && team.clueSequence.length > team.currentIndex && team.currentPhase === "active") {
                const clueDoc = team.clueSequence[team.currentIndex];
                if (clueDoc) {
                    const { answer, ...rest } = clueDoc.toObject ? clueDoc.toObject() : clueDoc;
                    currentClue = rest;
                }
            }

            return {
                teamId: team._id,
                teamName: team.teamName,
                phase: team.currentPhase,
                currentClue,
                progress: team.currentPhase === "finished" ? 10 : team.currentIndex,
                lockedUntil: team.lockedUntil || null,
                isLocked: team.lockedUntil && new Date() < team.lockedUntil,
                elapsedTime: team.startTime ? Date.now() - team.startTime : 0,
                finished: team.currentPhase === "finished"
            };
        });

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

// RESET ALL TEAMS (restart the game from scratch)
exports.resetAllTeams = async (req, res) => {
    try {
        // Reset every team to clean waiting state
        await Team.updateMany({}, {
            $set: {
                clueSequence: [],
                physicalSet: [],
                technicalSet: [],
                currentPhase: "waiting",
                currentIndex: 0,
                startTime: null,
                finishTime: null,
                totalTime: null,
                wrongAttempts: 0,
                locationLogs: [],
                lockedUntil: null,
            }
        });

        // Clear game flags in EventConfig
        let config = await EventConfig.findOne();
        if (!config) config = new EventConfig();
        config.gameStarted = false;
        config.gameStartTime = null;
        config.isPaused = false;
        await config.save();

        const io = req.app.get("io");
        io.emit("monitorUpdate");
        io.emit("leaderboardUpdate");
        io.emit("gameReset"); // teams listening can redirect to waiting screen

        res.json({ message: "Game reset. All teams returned to waiting state." });
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