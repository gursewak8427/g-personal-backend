const router = require("express").Router();
const multer = require("multer");
const fs = require("fs");
const csv = require("csvtojson");

// const multer = require("multer");
const storage = multer.diskStorage({
    destination: "uploads/agent",

    filename: function (req, file, cb) {
        let name = `${Date.now().toString()}-${file.originalname}`;
        cb(null, name);
    },
});

var upload = multer({ storage: storage });


const checkAuth = require("../helper/checkAuth");
const {
    agentLogin,
    agentRegister,
    agentAddStudent,
    agentGetProfile,
    agentVerifyToken,
    agentUpdateProfile,
    agentGetStudents,
} = require("../controller/agent.controller");

router.post("/login", agentLogin);
router.post("/register", agentRegister);
router.post("/addstudent", checkAuth, agentAddStudent);
router.post("/getstudents", checkAuth, agentGetStudents);
router.get("/getprofile", checkAuth, agentGetProfile);
router.get("/verifyToken", checkAuth, agentVerifyToken);
router.post("/update", checkAuth, upload.fields([{ name: "business_certificate_file" }, { name: "company_logo_file" }]), agentUpdateProfile);

module.exports = router;
