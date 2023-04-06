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
    getNotifications,
    getAgentEnrolledList,
    agentGetStudentProfile,
} = require("../controller/agent.controller");

router.post("/login", agentLogin);
router.post("/register", agentRegister);
router.get("/getprofile", checkAuth, agentGetProfile);
router.post("/verifyToken", checkAuth, agentVerifyToken);
router.post("/update", checkAuth, upload.fields([{ name: "business_certificate_file" }, { name: "company_logo_file" }]), agentUpdateProfile);
router.post("/addstudent", checkAuth, agentAddStudent); // register student
router.post("/register_enroll", checkAuth, agentAddStudent); // register and enroll student
router.post("/getstudents", checkAuth, agentGetStudents);
router.post("/getnotifications", checkAuth, getNotifications);

// 14 March, 2023 APIs
router.get("/getAgentEnrolledList", checkAuth, getAgentEnrolledList);

// 3 Apr, 2023 APIs
router.post("/agentGetStudentProfile", checkAuth, agentGetStudentProfile);


module.exports = router;
