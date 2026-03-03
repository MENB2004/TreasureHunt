const express = require("express");
const router = express.Router();
const { registerTeam, loginTeam } = require("../controllers/authController");

router.post("/register", registerTeam);
router.post("/login", loginTeam);

module.exports = router;