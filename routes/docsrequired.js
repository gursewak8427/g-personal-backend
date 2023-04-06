const router = require("express").Router();

const { getDocsRequired, updateRequiredDocuments, getEmbacyDocsRequired, addRequiredDocuments, deleteDocs } = require("../controller/docsRequiredController");

router.get("/country/:countryName", getDocsRequired);
router.post("/", addRequiredDocuments);
router.post("/delete", deleteDocs);
router.patch("/getEmbacyDocsRequired", getEmbacyDocsRequired);

// router.get("/state/:countryId", getState);
// router.get("/city/:stateId", getCity);

module.exports = router;
