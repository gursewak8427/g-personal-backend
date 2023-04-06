const { Schema, model } = require("mongoose");

const countrySchema = new Schema({
    countryId: {
        type: String,
    },
    countryPhoneCode: {
        type: String,
    },
    countryName: {
        type: String,
    },
    countrySortName: { // this is countryId while adding new currency details
        type: String,
    },
    countryLogo: {
        type: String,
    },
    countryCode: { // this is currency code
        type: String,
        default: ""
    },
    plusPrice: {
        type: String,
    },
    countryDescription: {
        type: String,
        default: ""
    },
    countryVideo: {
        type: String,
        default: ""
    },
});

// Compile model from schema
module.exports = CountryModel = model("country", countrySchema);
