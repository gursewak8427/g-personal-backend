const jwt = require("jsonwebtoken");
const checkAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        // console.log("token")
        // console.log(token)
        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );
        req.userData = decodedToken;
        next();
    } catch (error) {
        console.log(error)
        res.status(401).json({ message: "Auth failed!", details: {error} });
    }
};

module.exports = checkAuth