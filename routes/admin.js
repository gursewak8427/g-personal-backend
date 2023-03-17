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
    deleteSchoolName,
    findIntakes,
    updateIntakes,
    getSingleSchool,
    getschoolnames,
    toggletopstatus,
    toggletopstatusschool,
    topcategorydata,
    getSingleProgramDetail,
    getSingleSchoolDetails,
    getDashboardCounts,
    getEnrollPrograms,
    updateEnrollStatus,
    sendRemark,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    setNewPassword,
} = require("../controller/admin.controller");

const { addRequiredDocuments, updateRequiredDocuments } = require("../controller/docsRequiredController");

const checkAuth = require("../helper/checkAuth");

// const multer = require("multer");
const storage = multer.diskStorage({
    destination: "uploads/agent",

    filename: function (req, file, cb) {
        // request.file.buffer.toString('latin1')

        let name = `${Date.now().toString()}-${file.originalname}`;
        cb(null, name);
    },
});

var upload = multer({ storage: storage },
    { encoding: 'utf8' }
);

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
router.delete("/deleteschoolname/:id", deleteSchoolName)
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

// enrolls
router.post("/getEnrollPrograms", getEnrollPrograms)
router.patch("/updateEnrollStatus", checkAuth, updateEnrollStatus)
router.post("/sendRemark", checkAuth, sendRemark)

router.get("/getDashboardCounts", getDashboardCounts)

// ************** 14 March, 2023 **********************************
router.get("/profile", checkAuth, getProfile)
router.patch("/updateProfile", checkAuth, updateProfile)
router.patch("/changePassword", checkAuth, changePassword)
router.post("/forgotPassword", forgotPassword)
router.patch("/setNewPassword", checkAuth, setNewPassword)

router.post("/addRequiredDocuments", checkAuth, addRequiredDocuments)
router.patch("/updateRequiredDocuments", checkAuth, updateRequiredDocuments)
// ****************************************************************f

module.exports = router;