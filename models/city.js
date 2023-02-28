const { Schema, model } = require("mongoose");

const countrySchema = new Schema({
    cityId: {
        type: String,
    },
    cityName: {
        type: String,
    },
    stateId: {
        type: String,
    },
});

// Compile model from schema
module.exports = CityModel = model("city", countrySchema);
