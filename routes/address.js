const router = require("express").Router();

const { getCountry, getState, getCity } = require("../controller/addressController");

router.get("/country", getCountry);
router.get("/state/:countryId", getState);
router.get("/city/:stateId", getCity);

module.exports = router;
