const { Schema, model } = require("mongoose");

const docsRequiredSchema = new Schema({
    countryName: {
        type: String,
    },
    docsRequired: {
        type: [String],
    },
}, {
    timestamps: true
});

// Compile model from schema
module.exports = CountryModel = model("docsrequireds", docsRequiredSchema);
