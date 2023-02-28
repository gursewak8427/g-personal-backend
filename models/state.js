const { Schema, model } = require("mongoose");

const countrySchema = new Schema({
    stateId: {
        type: String,
    },
    stateName: {
        type: String,
    },
    countryId: {
        type: String,
    },
});

// Compile model from schema
module.exports = StateModel = model("state", countrySchema);
