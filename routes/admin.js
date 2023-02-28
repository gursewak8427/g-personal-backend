const router = require("express").Router();
const multer = require("multer");

const {
    adminLogin,
    getStudents,
    getAgents,
    toggleStatus,
    uploadcsvdata,
    getSchools,
    getSchoolsPrograms,
    toggleIntakeStatus,
    toggleFewSeatsStatus,
    addCountry,
    addSchoolname,
    countriesList,
    schoolNamesList,
    verifyCode,
    registerAdmin,
    adminList,
    updatePermissions,
    verifyToken,
    getAgentCounts,
    getNotifications,
    setWebPushToken,
    getschoolnameidandcountrieslist,
    getAssessmentForms,
    getSearchQueryForms,
    updateCountry,
    updateSchoolName,
    findIntakes,
    updateIntakes,
    getSingleSchool,
    getschoolnames,
    toggletopstatus,
    toggletopstatusschool,
    topcategorydata,
    getSingleProgramDetail,
    getSingleSchoolDetails
} = require("../controller/admin.controller");
const checkAuth = require("../helper/checkAuth");

// const multer = require("multer");
const storage = multer.diskStorage({
    destination: "uploads/agent",

    filename: function (req, file, cb) {
        let name = `${Date.now().toString()}-${file.originalname}`;
        cb(null, name);
    },
});

var upload = multer({ storage: storage });

router.post("/verifyToken", checkAuth, verifyToken)
router.post("/login", adminLogin)
// router.post("/registersubadmin", registerAdmin)
router.post("/registeremployee", registerAdmin)
router.post("/employeelist", adminList)
router.post("/verifycode", verifyCode)
router.post("/getstudents", getStudents)
router.post("/getagents", getAgents)
router.post("/togglestatus", toggleStatus)
router.post("/uploadcsv", upload.single("csv_attachment"), uploadcsvdata)
router.post("/getschools", getSchools)
router.post("/getprograms", getSchoolsPrograms)
router.post("/toggleIntakeStatus", toggleIntakeStatus)
router.post("/getschoolnameidandcountrieslist", getschoolnameidandcountrieslist)
router.post("/togglefewseatsstatus", toggleFewSeatsStatus)
router.post("/addcountry", upload.fields([{ name: "image" }]), addCountry)
router.post("/updatecountrylogo", upload.fields([{ name: "image" }]), updateCountry)
router.post("/addschoolname", upload.fields([{ name: "schoolLogo" }, { name: "countryLogo" }]), addSchoolname)
router.post("/updateschoolname", upload.fields([{ name: "schoolLogo" }, { name: "countryLogo" }]), updateSchoolName)
router.get("/countries", countriesList)
router.get("/schoolnames", schoolNamesList)
router.post("/updatepermissions", updatePermissions)
router.post("/getagentcounts", getAgentCounts)
router.post("/getnotifications", checkAuth, getNotifications)
router.post("/setWebPushToken", checkAuth, setWebPushToken)
router.post("/getAssessmentForms", getAssessmentForms)
router.post("/getqueriesform", getSearchQueryForms)
router.post("/findintakes", findIntakes)
router.post("/updateintakes", updateIntakes)
router.post("/getSingleSchool", getSingleSchool)
router.post("/getschoolnames", getschoolnames)
router.post("/toggletopstatus", toggletopstatus)
router.post("/toggletopstatusschool", toggletopstatusschool)

router.get("/topcategorydata", topcategorydata)
router.post("/getSingleProgramDetail", getSingleProgramDetail)
router.post("/getSingleSchoolDetails", getSingleSchoolDetails)

module.exports = router;