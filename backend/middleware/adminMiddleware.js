const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const protectAdmin = async (req, res, next) => {
    try {
        if (!req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No admin token provided" });
        }

        const token = req.headers.authorization.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const admin = await Admin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({ message: "Admin not found" });
        }

        req.admin = admin;
        next();

    } catch (err) {
        res.status(401).json({ message: "Admin auth failed" });
    }

    
};

module.exports = protectAdmin;