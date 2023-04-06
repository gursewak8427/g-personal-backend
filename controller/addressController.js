const AgentModel = require("../models/agent");
const AdminModel = require("../models/admin");
const StudentModel = require("../models/student");
const CountryModel = require("../models/country");
const StateModel = require("../models/state");
const CityModel = require("../models/city");
const { sendEmail } = require("../helper/sendEmail");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
var generatorPassword = require("generate-password");

const getCountry = async (req, res) => {
  const countries = await CountryModel.find().sort({
    countryName: 1,
  });

  res.json({
    status: "1",
    message: "Country List Found",
    details: {
      countries,
    },
  });
};


// const updateCountry = async (req, res) => {
//   let query = []
//   if (req.files) {
//     if (req.files.countryLogo) {
//       query.push({ countryLogo: req.files.countryLogo.filename })
//     }
//   }

//   const countries = await CountryModel.findByIdAndUpdate(req.body.countryId, query)

//   res.json({
//     status: "1",
//     message: "Country List Found",
//     details: {
//       countries,
//     },
//   });
// };

const getState = async (req, res) => {
  const { countryId } = req.params;
  const state = await StateModel.find({ countryId });

  res.json({
    status: "1",
    message: "State List Found",
    details: {
      state,
    },
  });
};
const getCity = async (req, res) => {
  const { stateId } = req.params;
  const city = await CityModel.find({ stateId });

  res.json({
    status: "1",
    message: "city List Found",
    details: {
      city,
    },
  });
};

module.exports = { getCountry, getState, getCity };
