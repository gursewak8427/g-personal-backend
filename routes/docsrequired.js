const router = require("express").Router();

const { getDocsRequired } = require("../controller/docsRequiredController");

router.get("/country/:countryName", getDocsRequired);
// router.get("/state/:countryId", getState);
// router.get("/city/:stateId", getCity);

module.exports = router;
