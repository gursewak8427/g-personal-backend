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
    countrySortName: {
        type: String,
    },
});

// Compile model from schema
module.exports = CountryModel = model("country", countrySchema);
