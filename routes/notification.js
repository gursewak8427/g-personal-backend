const router = require("express").Router();

const checkAuth = require("../helper/checkAuth");
const { sendNotification } = require("../controller/notificationController");

router.post("/", sendNotification);

module.exports = router;
