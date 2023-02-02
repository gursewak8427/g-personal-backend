const router = require("express").Router();
const multer = require("multer");

const { adminLogin, adminRegister, getStudents, getAgents, toggleStatus, uploadcsvdata, getSchools, getSchoolsPrograms, toggleIntakeStatus } = require("../controller/admin.controller");

// const multer = require("multer");
const storage = multer.diskStorage({
    destination: "uploads/agent",

    filename: function (req, file, cb) {
        let name = `${Date.now().toString()}-${file.originalname}`;
        cb(null, name);
    },
});

var upload = multer({ storage: storage });

router.post("/login", adminLogin)
router.post("/getstudents", getStudents)
router.post("/getagents", getAgents)
router.post("/togglestatus", toggleStatus)
router.post("/uploadcsv", upload.single("csv_attachment"), uploadcsvdata)
router.post("/register", adminRegister)  
router.post("/getschools", getSchools)
router.post("/getprograms", getSchoolsPrograms)
router.post("/toggleIntakeStatus", toggleIntakeStatus)

module.exports = router;