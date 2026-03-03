const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const {
    startGame,
    getCurrentClue,
    submitAnswer,
    getLeaderboard,
    setEventTime
} = require("../controllers/gameController");

const { getTeamStatus } = require("../controllers/adminController");

const checkEventActive = require("../middleware/eventMiddleware");

// Team dashboard status — uses team JWT (protect middleware)
router.get("/status", protect, getTeamStatus);

router.get("/current-clue", protect, getCurrentClue);
router.get("/leaderboard", getLeaderboard);

router.post("/start", protect, checkEventActive, startGame);
router.post("/submit", protect, checkEventActive, submitAnswer);
router.post("/set-event-time", setEventTime);

module.exports = router;