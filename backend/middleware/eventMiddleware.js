const EventConfig = require("../models/EventConfig");

const checkEventActive = async (req, res, next) => {
    try {
        const config = await EventConfig.findOne();

        if (!config) {
            return res.status(400).json({ message: "Event not configured" });
        }

        if (config.isPaused) {
            return res.status(400).json({ message: "Event is paused by admin" });
        }

        const now = new Date();

        if (now < config.eventStart) {
            return res.status(400).json({ message: "Event not started yet" });
        }

        if (now > config.eventEnd) {
            return res.status(400).json({ message: "Event has ended" });
        }

        next();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = checkEventActive;