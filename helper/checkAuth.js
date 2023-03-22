const jwt = require("jsonwebtoken");
const checkAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY
        );
        console.log({ decodedToken })
        decodedToken.token = token;
        req.userData = decodedToken;
        next();
    } catch (error) {
        // console.log(error)
        res.json({ status: "0", message: "Auth failed!", details: { error } });
    }
};

module.exports = checkAuth