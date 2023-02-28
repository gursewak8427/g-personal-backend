const { Schema, model } = require("mongoose");

const schoolNamesSchema = new Schema({
    schoolName: {
        type: String,
        unique: true,
    },
    schoolLogo: {
        type: String,
    },
    countryLogo: {
        type: String,
    },
    country: {
        type: String,
    },
    state: {
        type: String,
    },
    city: {
        type: String,
    },
});

// Compile model from schema
module.exports = SchoolNamesModel = model("schoolNames", schoolNamesSchema);
