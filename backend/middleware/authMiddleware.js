const jwt = require("jsonwebtoken");
const Team = require("../models/Team");

const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")) {

            token = req.headers.authorization.split(" ")[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.team = await Team.findById(decoded.id).select("-password");

            next();
        } else {
            res.status(401).json({ message: "Not authorized" });
        }

    } catch (error) {
        res.status(401).json({ message: "Token failed" });
    }
};

module.exports = protect;