const router = require("express").Router();
const multer = require("multer");
const { getAssessmentForms } = require("../controller/admin.controller");
const { createOrder, studentLogin, getHistory, studentRegister, studentConfirmEmail, resendEmail, getEmailVerification, studentSearch, enrollProgram, studentGoogleLogin, getEnrollPrograms, uploadDocument, getDocuments, studentUpdate, studentProfile, fillAssessmentForm, fillsearchqueries, forgotPassword, setNewPassword, submitAllDocs, testNotification, verifyToken, approveProfile, getNotifications, setRemark, getRemarks, handlePayment, landingPage } = require("../controller/student.controller");
const checkAuth = require("../helper/checkAuth");

// const multer = require("multer");
const storage = multer.diskStorage({
    destination: "uploads/student",

    filename: function (req, file, cb) {
        let name = `${Date.now().toString()}-${file.originalname}`;
        cb(null, name);
    },
});

var upload = multer({ storage: storage });

router.post("/verifyToken", checkAuth, verifyToken)
router.post("/login", studentLogin)
router.post("/student_google_login", studentGoogleLogin)
router.post("/register", studentRegister)
router.post("/confirm", checkAuth, studentConfirmEmail)
router.post("/resend_confirmation_email", checkAuth, resendEmail)
router.get("/get_email_verification", checkAuth, getEmailVerification)
router.post("/search", studentSearch)
router.patch("/", checkAuth, studentUpdate)
router.get("/", checkAuth, studentProfile)
router.post("/forgotpassword", forgotPassword)
router.post("/setnewpassword", checkAuth, setNewPassword)

// Enroll's routes
router.post("/enroll", checkAuth, enrollProgram)
router.post("/getenrollprograms", checkAuth, getEnrollPrograms)

router.post("/uploaddocument", checkAuth, upload.single("document"), uploadDocument)
router.post("/getdocuments", checkAuth, getDocuments)
router.post("/fillassessmentform", fillAssessmentForm)
router.post("/fillsearchqueries", fillsearchqueries)
router.post("/submitAllDocs", checkAuth, submitAllDocs)
router.post("/approveProfile", checkAuth, approveProfile)
router.post("/getNotifications", checkAuth, getNotifications)
router.post("/getHistory", checkAuth, getHistory)
router.post("/handlePayment", handlePayment)

router.post("/setRemark", checkAuth, setRemark)
router.post("/getRemarks", checkAuth, getRemarks)


router.post("/testNotification", testNotification)

router.post("/createOrder", createOrder)

router.get("/landingPage", landingPage)

module.exports = router;