const router = require("express").Router();

const { studentLogin, studentRegister, studentConfirmEmail, resendEmail, getEmailVerification, studentSearch } = require("../controller/student.controller");
const checkAuth = require("../helper/checkAuth");

router.post("/login", studentLogin)
router.post("/register", studentRegister)
router.post("/confirm", checkAuth, studentConfirmEmail)
router.post("/resend_confirmation_email", checkAuth, resendEmail)
router.get("/get_email_verification", checkAuth, getEmailVerification)
router.post("/search", studentSearch)

module.exports = router;