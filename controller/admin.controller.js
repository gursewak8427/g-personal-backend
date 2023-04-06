const AdminModel = require("../models/admin");
const StudentModel = require("../models/student");
const SchoolModel = require("../models/schools");
const AgentModel = require("../models/agent");

const CountryModel = require("../models/country");
const StateModel = require("../models/state");
const CityModel = require("../models/city");
const DocsRequiredModel = require("../models/docsRequired")

const SchoolNamesModel = require("../models/schoolNames");
const AssessmentForm = require("../models/assessmentForm");
const QueriesForm = require("../models/queriesform");

const moment = require('moment');
const Constants = require("../helper/constants");
const { sendCustomEmail } = require("../helper/sendCustomEmail");
const { io } = require("../app");
const fs = require("fs");
const csv = require("csvtojson");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId, ObjectID } = require("bson");
const { trim } = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { default: axios } = require("axios");
const { appendFileHistory } = require("./historyController");
const {
  sendForgotPasswordEmail,
} = require("../helper/sendForgotPasswordEmail");
const saltRounds = 10;

const appendNotification = async (model, users, msg, url, body = "") => {
  // send msg
  await model.updateMany(
    model == AdminModel
      ? {
        role: { $in: users },
      }
      : {},
    {
      $push: {
        notifications: {
          message: msg,
          redirectUrl: url,
          body,
          created: Date.now(),
        },
      },
      $inc: {
        unseenNotifications: 1,
      },
    }
  );

  // get admin token
  let adminData = await model.findOne();

  try {
    let ENDPOINT = "https://learn-global-backend.onrender.com/notification";
    // let ENDPOINT = "http://localhost:3006/notification"

    const response = await axios.post(ENDPOINT, {
      title: msg,
      body: body,
      token: adminData.web_push_token,
      redirectUrl: url,
    });

    console.log({ response });
  } catch (error) {
    console.log({ error1: error });
  }
};

const verifyToken = async (req, res) => {
  const { userId } = req.userData;

  var userDetails = await AdminModel.findOne({ _id: userId });
  var totalAgentsUnapproved = await AgentModel.find({ status: "PENDING" });
  console.log({ token: req.body.token });
  if (req.body?.token) {
    setWebPushToken(userId, req.body.token);
  }
  if (!userDetails) {
    res.json({
      status: "0",
      message: "Admin not found",
    });
    return;
  }

  req.userData.permissions = userDetails.permissions;
  req.userData.firstName = userDetails.first_name;
  req.userData.notificationsCount = userDetails.notifications.length;

  var totalAssessmentForms = await AssessmentForm.find({ status: "PENDING" });
  var totalSearchQueryForms = await QueriesForm.find({ status: "PENDING" });

  res.json({
    status: "1",
    message: "Verified",
    details: {
      userData: req.userData,
      totalAgentsUnapproved: totalAgentsUnapproved.length,
      totalAssessmentForms: totalAssessmentForms.length,
      totalSearchQueryForms: totalSearchQueryForms.length,
    },
  });
};

const adminLogin = async (req, res) => {
  try {
    const { email, password, mooment } = req.body;
    console.log(req.body);
    let admin = await AdminModel.findOne({ email });
    if (!admin) {
      res.json({
        status: 0,
        message: "Email Id is not exist",
        details: {
          error: "Admin email id is wrong",
        },
      });
    } else {
      bcrypt.compare(password, admin.password, async (err, result) => {
        if (err) {
          res.json({
            status: "0",
            message: "Server Error Occured",
            details: {
              error: err,
            },
          });
          return;
        }

        if (!result) {
          res.json({
            status: "0",
            message: "Password is wrong",
          });
          return;
        }

        // login if admin have token-preserve
        if (req?.body?.tokenPreserve) {
          // generate jwt token
          let jwtSecretKey2 = process.env.JWT_SECRET_KEY;
          let data = {
            time: Date(),
            userId: admin._id,
            email: admin.email,
            permissions: admin.permissions,
            role: admin.role,
          };

          const token2 = jwt.sign(data, jwtSecretKey2, { expiresIn: '1d' });

          res.json({
            status: 1,
            message: "Login Successfully",
            details: {
              mode: "LOGIN", // LOGIN, 2FA
              token: token2,
            },
          });

          return;
        }

        // send verification code
        //   let email = admin.email
        let email = "support@landmarkimmigration.com";

        // generate a random 5 digit number
        let randomString = 12345;
        // let randomString = Math.floor(Math.random() * 90000) + 10000;
        // let randomString = (Math.random() + 1).toString(36).substring(7);
        let subject = "Learn Global Verification Code for Admin Login";
        let html = `
                    <p>This verification code is valid for 5min</p>
                    <h1>Verification code : ${randomString}</h1>
                `;
        await sendCustomEmail(email, subject, html);

        // generate jwt token
        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          time: Date(),
          userId: admin._id,
          email: admin.email,
        };

        const token = jwt.sign(data, jwtSecretKey, { expiresIn: "10m" });

        admin.verificationCode.code = randomString;
        admin.verificationCode.token = token;

        await admin.save();

        // generate jwt token
        let data2 = {
          // time: Date(),
          userId: admin._id,
          email: admin.email,
        };


        const token3 = jwt.sign(
          {
            data: data2,
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // set the expiration time to 30 days from now
          }, jwtSecretKey);


        console.log({ token323232: token3 })

        res.json({
          status: 1,
          message: "Verification Code send successfully",
          details: {
            mode: "2FA",
            token: token3,
          },
        });
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      message: "Verification code not send",
    });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { code, email } = req.body;
    let admin = await AdminModel.findOne({ email });
    if (!admin) {
      res.json({
        status: 0,
        message: "Email Id is not exist",
        details: {
          error: "Admin email id is wrong",
        },
      });
    } else {
      // GET TOKEN and password

      // match code
      if (admin.verificationCode.code == "") {
        res.json({
          status: "0",
          message: "Verification Code Expired",
        });
        return;
      }

      if (admin.verificationCode.code != code) {
        res.json({
          status: "0",
          message: "Invalid Verification code",
        });
        return;
      }

      try {
        const token = admin.verificationCode.token;
        // console.log("token")
        // console.log(token)
        jwt.verify(
          token,
          process.env.JWT_SECRET_KEY,
          async (err, decodedToken) => {
            if (err) {
              if (err.name == "TokenExpiredError") {
                res.json({ status: "0", message: "Code Expired" });
                return;
              }
              res.json({
                status: "0",
                message: "Server Error",
                details: { error },
              });
              return;
            }

            // generate jwt token
            let jwtSecretKey = process.env.JWT_SECRET_KEY;
            let data = {
              time: Date(),
              userId: admin._id,
              email: admin.email,
              permissions: admin.permissions,
              role: admin.role,
            };

            const loginToken = jwt.sign(data, jwtSecretKey, {
              expiresIn: "1d",
            });

            // remove verification code from db
            admin.verificationCode.code = "";
            admin.verificationCode.token = "";

            await admin.save();

            res.json({
              status: "1",
              message: "Login Successfully",
              details: {
                token: loginToken,
                email: admin.email,
              },
            });
          }
        );
      } catch (error) {
        res.json({ status: "0", message: "Server Error", details: { error } });
        return;
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      message: "Verification code not send",
    });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { email, first_name, last_name, password, role } = req.body;

    if (password == "" || !password || !email || email == "") {
      res.json({
        status: "0",
        message: "Email and password is required",
      });
      return;
    }

    let admin = await AdminModel.findOne({ email });
    if (admin) {
      res.json({
        status: 0,
        message: "Email is already exists",
      });
    } else {
      bcrypt.hash(password, saltRounds, async function (err, hash) {
        // Store hash in your password DB.
        if (err) {
          res.json({
            status: 0,
            message: "Server error occured",
            details: {
              error: err,
            },
          });
          return;
        }

        let admin = new AdminModel({
          email,
          password: hash,
          first_name,
          last_name,
          role: role,
          created: new Date().toLocaleString(),
        });

        await admin.save();

        res.json({
          status: 1,
          message:
            role == "SUBADMIN"
              ? "Sub Admin Register Successfully"
              : "Counselor Register Successfully",
          details: {
            admin: {
              email: admin.email,
              id: admin._id,
              phone: admin.phone,
            },
          },
        });
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Data Not Uploaded",
    });
  }
};

const getStudents = async (req, res) => {
  try {
    console.log("Data Student Fetching....");
    var students = [];
    let data = req.body;

    // pagination variables
    let perPage = 5;
    let totalPages = 0;
    let currentPage = data.currentPage;

    if (data?.agentId) {
      let totalStudents = await StudentModel.find({
        agent_id: ObjectId(data.agentId),
      })
        .populate("agent_id")
        .sort({ createdAt: "-1" });
      students = await StudentModel.find({ agent_id: ObjectId(data.agentId) })
        .populate("agent_id")
        .sort({ createdAt: "-1" })
        .skip(perPage * (currentPage - 1) || 0)
        .limit(perPage);

      totalPages = parseInt(totalStudents.length / perPage);
      if (totalStudents.length % perPage != 0) {
        totalPages++;
      }
    } else {
      let totalStudents = await StudentModel.find()
        .populate("agent_id")
        .sort({ createdAt: "-1" });
      students = await StudentModel.find()
        .populate("agent_id")
        .sort({ createdAt: "-1" })
        .skip(perPage * (currentPage - 1) || 0)
        .limit(perPage);
      totalPages = parseInt(totalStudents.length / perPage);

      if (totalStudents.length % perPage != 0) {
        totalPages++;
      }
    }

    res.json({
      status: 1,
      message: "Students List Find Successfully",
      details: { students, totalPages, currentPage },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const getAgents = async (req, res) => {
  try {
    let data = req.body;

    // pagination variables
    let perPage = 5;
    let totalPages = 0;
    let currentPage = data.currentPage;

    var q1 = {};
    if (data.status != 0) {
      q1 = { status: data.status == "pending" ? "PENDING" : "REJECT" };
    }

    let totalagents = await AgentModel.find(q1);
    let agents = await AgentModel.find(q1)
      .skip(perPage * (currentPage - 1) || 0)
      .limit(perPage);

    totalPages = parseInt(totalagents.length / perPage);
    if (totalagents.length % perPage != 0) {
      totalPages++;
    }

    res.json({
      status: 1,
      message: "Agent List Find Successfully",
      details: { agents, totalPages, currentPage },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const { agentId, status } = req.body;
    let agent = await AgentModel.findOne({
      _id: agentId != "" ? ObjectId(agentId) : "",
    });
    if (!agent) {
      res.json({
        status: "0",
        message: "Agent not found.",
        details: {
          error: "This email is already used by another Student",
        },
      });
    } else {
      let agentdata = await AgentModel.findByIdAndUpdate(agentId, { status });
      await agentdata.save();
      let msg = `Your Id is ${status == "APPROVED" ? "approved" : "rejected"
        } as Agent`;
      let url = "/d/agent/profile";
      await appendNotification(AgentModel, [], msg, url);
    }
    res.json({
      status: "1",
      message: "Status Changed",
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};

const uploadDataAsync = async (dataArr) => {
  try {
    if (dataArr[0] == 348) {
      throw new Error("Uh oh!");
    }
    let newEmp = new SchoolModel({
      number: dataArr[0],
      first_name: dataArr[1],
      last_name: dataArr[2],
      gender: dataArr[3],
      employment_status: dataArr[4],
      annual_salary: dataArr[5],
      tax_file_no: dataArr[6],
    });
    await newEmp.save();
    return true;
  } catch (error) {
    return false;
  }
};

const uploadcsvdata = async (req, res) => {
  res.json({
    file: req.file,
  });
  return;
  io.on("connection", (socket) => {
    console.log("Connected");
    socket.emit("FromAPI", "Successfully connected to socket");
    try {
      //convert csvfile to jsonArray
      const fileName = req.file.filename;
      csv()
        .fromFile(req.file.path)
        .then(async (jsonObj) => {
          let addedSchools = [];
          let finalObj = [];

          for (var index = 0; index < jsonObj.length; index++) {
            // skip row which havn't school name
            // if (jsonObj[index]["school_name"] == "") continue;

            if (addedSchools.includes(jsonObj[index]["school_name"])) {
              let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

              var new_stream = jsonObj[index]["new_stream"]
                .split(",")
                .map((item) => Constants.new_stream[item]);
              var program_level = jsonObj[index]["program_level"]
                .split(",")
                .map((item) => Constants.program_level[item]);

              finalObj[myindex]["school_programs"].push({
                program_id: uuidv4(),
                program_name: jsonObj[index]["program_name"],
                description: jsonObj[index]["description"],
                duration: parseFloat(jsonObj[index]["duration"]) || 0,
                grade_score: parseFloat(jsonObj[index]["grade_score"]) || 0,
                overall_band: parseFloat(jsonObj[index]["overall_band"]) || 0,
                pte_score: parseFloat(jsonObj[index]["pte_score"]) || 0,
                tofel_point: parseFloat(jsonObj[index]["tofel_point"]) || null,
                ielts_listening:
                  parseFloat(jsonObj[index]["ielts_listening"]) || 0,
                ielts_speaking:
                  parseFloat(jsonObj[index]["ielts_speaking"]) || 0,
                ielts_writting:
                  parseFloat(jsonObj[index]["ielts_writting"]) || 0,
                ielts_reading: parseFloat(jsonObj[index]["ielts_reading"]) || 0,
                new_stream: new_stream,
                stream_id: parseFloat(jsonObj[index]["stream_id"]) || 0,
                application_fee:
                  parseFloat(jsonObj[index]["application_fee"]) || 0,
                tution_fee_per_semester:
                  parseFloat(jsonObj[index]["tution_fee_per_semester"]) || 0,
                acceptance_letter:
                  parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                intake_id: jsonObj[index]["intake_id"],
                visa_processing_days:
                  parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                process_days: parseFloat(jsonObj[index]["process_days"]) || 0,
                program_level: program_level,
                other_comment: jsonObj[index]["Others Comment"],
                foundation_fee:
                  parseFloat(jsonObj[index]["Foundation Fee"]) || 0,
                module: parseFloat(jsonObj[index]["module"]) || 0,
                english_language:
                  parseFloat(jsonObj[index]["english_language"]) || 0,
                program_sort_order:
                  parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                cost_of_living:
                  parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                currency: jsonObj[index]["currency"],
                acceptable_band:
                  parseFloat(jsonObj[index]["acceptable_band"]) || 0,
              });
            } else {
              addedSchools.push(jsonObj[index]["school_name"]);

              var type = jsonObj[index]["type"]
                .split(",")
                .map((item) => Constants.type[item]);

              finalObj.push({
                school_name: jsonObj[index]["school_name"],
                school_about: jsonObj[index]["school_about"],
                school_location: jsonObj[index]["school_location"],
                country: jsonObj[index]["country"],
                type: type.join(" "),
                school_order: jsonObj[index]["type"].split(",")[1],
                total_student: parseFloat(jsonObj[index]["total_student"]) || 0,
                international_student:
                  parseFloat(jsonObj[index]["international_student"]) || 0,
                accomodation_feature: Boolean(
                  jsonObj[index]["accomodation_feature"]
                ),
                work_permit_feature: Boolean(
                  jsonObj[index]["work_permit_feature"]
                ),
                program_cooporation: Boolean(
                  jsonObj[index]["program_cooporation"]
                ),
                work_while_study: Boolean(jsonObj[index]["work_while_study"]),
                condition_offer_letter: Boolean(
                  jsonObj[index]["condition_offer_letter"]
                ),
                library: Boolean(jsonObj[index]["library"]),
                founded: parseFloat(jsonObj[index]["founded"]) || 0,
                school_programs: [],
              });
            }
          }

          // console.log(finalObj);
          // let newSchools = await SchoolModel.insertMany(finalObj)
          socket.emit("FromAPI", "Final Object Created Successfully");

          var finalData = [];
          var resultData = [];
          var updated = false;
          for (var i = 0; i < finalObj.length; i++) {
            // add only school
            var singleSchool = finalObj[i];

            // find alerady school
            var newSchool = await SchoolModel.findOne({
              school_name: singleSchool.school_name,
            });
            if (!newSchool) {
              newSchool = await SchoolModel(singleSchool);
              updated = false;
            } else {
              newSchool.school_name = singleSchool.school_name;
              newSchool.school_about = singleSchool.school_about;
              newSchool.school_location = singleSchool.school_location;
              newSchool.country = singleSchool.country;
              newSchool.type = singleSchool.type;
              newSchool.school_order = singleSchool.school_order;
              newSchool.total_student = singleSchool.total_student;
              newSchool.international_student =
                singleSchool.international_student;
              newSchool.accomodation_feature =
                singleSchool.accomodation_feature;
              newSchool.work_permit_feature = singleSchool.work_permit_feature;
              newSchool.program_cooporation = singleSchool.program_cooporation;
              newSchool.work_while_study = singleSchool.work_while_study;
              newSchool.condition_offer_letter =
                singleSchool.condition_offer_letter;
              newSchool.library = singleSchool.library;
              newSchool.founded = singleSchool.founded;
              newSchool.school_programs = singleSchool.school_programs;
              updated = true;
            }
            console.log("added", i);

            newSchool.school_programs = [];
            try {
              await newSchool.save();
              if (updated) {
                resultData.push("Updated");
              } else {
                resultData.push("Uploaded");
              }
              socket.emit("FromAPI", `index : ${i} is uplaoded`);
            } catch (error) {
              socket.emit("FromAPI", `index : ${i} have errors`);
              if (error.name === "ValidationError") {
                let errorsData = {};
                Object.keys(error.errors).forEach((key) => {
                  errorsData[key] = error.errors[key].message;
                });

                console.log({ error1: errorsData });
                resultData.push("Failed");
                singleSchool.school_programs.map((_) => resultData.push("--"));
                continue;
              }
            }
            for (var j = 0; j < singleSchool.school_programs.length; j++) {
              // console.log("j", j)
              // if (i == 0 && j == 0) {
              //     singleSchool.school_programs[j].program_name = ""
              // }
              try {
                newSchool.school_programs.push(singleSchool.school_programs[j]);
                // if (i == 0 && j == 0) {
                //     console.log({ newSchool })
                // }
                await newSchool.save();
                if (updated) {
                  resultData.push("Updated");
                } else {
                  resultData.push("Uploaded");
                }
                // console.log(`added ${i} => ${j}`)
              } catch (error) {
                if (error.name === "ValidationError") {
                  newSchool.school_programs.pop();
                  let errorsData = {};
                  Object.keys(error.errors).forEach((key) => {
                    errorsData[key] = error.errors[key].message;
                  });

                  console.log({ error2: errorsData });
                  resultData.push("Failed");
                }
              }
            }

            finalData.push(newSchool);
          }

          fs.unlink("uploads/" + fileName, (err) => {
            if (err) {
              console.log("File Deleted Failed.");
            }
          });

          res.json({
            message: "Data Uploaded Successfully",
            details: {
              schools: finalData,
              results: resultData,
            },
          });
        });
    } catch (error) {
      console.log(error);
      res.json({
        message: "Data Not Uploaded",
      });
    }
  });
  //   io.emit("FromAPI", { response: "File is started to uplaoding data on the server" })
};

const getSchools = async (req, res) => {
  try {
    console.log(req.body);

    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 3006;

    if (host === "localhost") {
      var fullUrl = `${protocol}://${host}:${port}`;
    } else {
      var fullUrl = `${protocol}://${host}:${port}`;
    }
    // const fullUrl = `${protocol}://${host}`

    var schools = [];
    let data = req.body;

    var q1 = [];
    if (data?.countryId) {
      // query of country
      const cntryDtl = await CountryModel.findOne({
        countryId: data.countryId,
      });
      q1.push({ country: cntryDtl.countryName });
    }
    if (data?.stateId) {
      // query of state
      const stateDtl = await StateModel.findOne({ stateId: data.stateId });
      q1.push({ state: stateDtl.stateName });
    }
    if (data?.cityId) {
      // query of city
      const cityDtl = await CityModel.findOne({ cityId: data.cityId });
      q1.push({ city: cityDtl.cityName });
    }
    // #newFilter
    if (data?.filter_type) {
      if (data?.filter_type === "PUBLIC_COLLEGE") {
        q1.push({ type: "Public College" });
      }
      if (data?.filter_type === "PUBLIC_UNIVERSITY") {
        q1.push({ type: "Public University" });
      }
      if (data?.filter_type === "PRIVATE_COLLEGE") {
        q1.push({ type: "Private College" });
      }
      if (data?.filter_type === "PRIVATE_UNIVERSITY") {
        q1.push({ type: "Private University" });
      }
    }
    if (data?.filter_total_students) {
      if (data?.filter_total_students.min && data?.filter_total_students.max) {
        q1.push({
          $and: [
            { total_student: { $gte: data?.filter_total_students.min } },
            { total_student: { $lte: data?.filter_total_students.max } },
          ],
        });
      }
      if (data?.filter_total_students.min && !data?.filter_total_students.max) {
        q1.push({
          $and: [{ total_student: { $gte: data?.filter_total_students.min } }],
        });
      }
      if (!data?.filter_total_students.min && data?.filter_total_students.max) {
        q1.push({
          $and: [{ total_student: { $lte: data?.filter_total_students.max } }],
        });
      }
    }
    if (data?.filter_international_students) {
      if (
        data?.filter_international_students.min &&
        data?.filter_international_students.max
      ) {
        q1.push({
          $and: [
            {
              international_student: {
                $gte: data?.filter_international_students.min,
              },
            },
            {
              international_student: {
                $lte: data?.filter_international_students.max,
              },
            },
          ],
        });
      }
      if (
        data?.filter_international_students.min &&
        !data?.filter_international_students.max
      ) {
        q1.push({
          $and: [
            {
              international_student: {
                $gte: data?.filter_international_students.min,
              },
            },
          ],
        });
      }
      if (
        !data?.filter_international_students.min &&
        data?.filter_international_students.max
      ) {
        q1.push({
          $and: [
            {
              international_student: {
                $lte: data?.filter_international_students.max,
              },
            },
          ],
        });
      }
    }

    // filter Founded
    if (data?.filter_founded) {
      if (data?.filter_founded.min && data?.filter_founded.max) {
        q1.push({
          $and: [
            { founded: { $gte: data?.filter_founded.min } },
            { founded: { $lte: data?.filter_founded.max } },
          ],
        });
      }
      if (data?.filter_founded.min && !data?.filter_founded.max) {
        q1.push({
          $and: [{ founded: { $gte: data?.filter_founded.min } }],
        });
      }
      if (!data?.filter_founded.min && data?.filter_founded.max) {
        q1.push({
          $and: [{ founded: { $lte: data?.filter_founded.max } }],
        });
      }
    }

    // true false
    if (data?.filter_accomodation_features === true) {
      q1.push({ accomodation_feature: true });
    }
    if (data?.filter_accomodation_features === false) {
      q1.push({ accomodation_feature: false });
    }

    // true false
    if (data?.filter_work_permit_feature === true) {
      q1.push({ work_permit_feature: true });
    }
    if (data?.filter_work_permit_feature === false) {
      q1.push({ work_permit_feature: false });
    }
    // true false
    if (data?.filter_program_cooporation === true) {
      q1.push({ program_cooporation: true });
    }
    if (data?.filter_program_cooporation === false) {
      q1.push({ program_cooporation: false });
    }

    // true false
    if (data?.filter_work_while_study === true) {
      q1.push({ work_while_study: true });
    }
    if (data?.filter_work_while_study === false) {
      q1.push({ work_while_study: false });
    }

    // true false
    if (data?.filter_condition_offer_letter === true) {
      q1.push({ condition_offer_letter: true });
    }
    if (data?.filter_condition_offer_letter === false) {
      q1.push({ condition_offer_letter: false });
    }

    // true false
    if (data?.filter_library === true) {
      q1.push({ library: true });
    }
    if (data?.filter_library === false) {
      q1.push({ library: false });
    }

    // true false
    if (data?.filter_top_status === true) {
      q1.push({ top_status: true });
    }
    if (data?.filter_top_status === false) {
      q1.push({ top_status: false });
    }

    console.log({ q1 });
    // res.json(q1)
    // return;

    if (data?.searchItem) {
      // check search item inside school_name, location, country, program_name etc.
      q1.push({
        $or: [
          { school_name: { $regex: data.searchItem, $options: "i" } },
          { school_location: { $regex: data.searchItem, $options: "i" } },
          { country: { $regex: data.searchItem, $options: "i" } },
        ],
      });
    }

    // pagination variables
    let perPage = 25;
    let totalPages = 0;
    let currentPage = data.currentPage;

    // get schoolnames with matching address
    var total_schools = await SchoolModel.aggregate([
      {
        $match: q1.length != 0 ? { $and: q1 } : {},
      },
    ]);

    schools = await SchoolModel.aggregate([
      {
        $match: q1.length != 0 ? { $and: q1 } : {},
      },
      {
        $lookup: {
          from: "countries",
          localField: "country",
          foreignField: "countryName",
          as: "countryDetails",
        },
      },
      {
        $unwind: {
          path: "$countryDetails",
        },
      },
      {
        $lookup: {
          from: "states",
          let: {
            stateName: "$state",
            countryId: "$countryDetails.countryId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$stateName", "$$stateName"] },
                    { $eq: ["$countryId", "$$countryId"] },
                  ],
                },
              },
            },
          ],
          as: "stateDetails",
        },
      },
      {
        $unwind: "$stateDetails",
      },
      {
        $lookup: {
          from: "cities",
          let: {
            cityName: "$city",
            stateId: "$stateDetails.stateId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$cityName", "$$cityName"] },
                    { $eq: ["$stateId", "$$stateId"] },
                  ],
                },
              },
            },
          ],
          as: "cityDetails",
        },
      },
      {
        $unwind: "$cityDetails",
      },
      {
        $lookup: {
          from: "schoolnames",
          let: {
            localSchoolNameField: "$school_name",
            localCountryField: "$countryDetails.countryId",
            localStateField: "$stateDetails.stateId",
            localCityField: "$cityDetails.cityId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$schoolName", "$$localSchoolNameField"] },
                    { $eq: ["$country", "$$localCountryField"] },
                    { $eq: ["$state", "$$localStateField"] },
                    { $eq: ["$city", "$$localCityField"] },
                  ],
                },
              },
            },
          ],
          // localField: "school_details.school_name",
          // foreignField: "schoolName",
          as: "school_meta_details",
        },
      },
      {
        $unwind: {
          path: "$school_meta_details",
        },
      },
      {
        $skip: perPage * (currentPage - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    // schools = await SchoolModel.aggregate([
    //     {
    //         $match: { $and: [q1, q2] }
    //     },
    //     {
    //         $lookup: {
    //             "from": "schoolnames",
    //             "localField": "school_name",
    //             "foreignField": "schoolName",
    //             "as": "school_meta_details"
    //         }
    //     },
    //     {
    //         $lookup: {
    //             "from": "schoolnames",
    //             "localField": "school_name",
    //             "foreignField": "schoolName",
    //             "as": "school_meta_details"
    //         }
    //     },
    //     {
    //         $unwind: "$school_meta_details"
    //     },
    //     {
    //         $lookup: {
    //             "from": "countries",
    //             "localField": "school_meta_details.country",
    //             "foreignField": "countryId",
    //             "as": "countryDetails"
    //         }
    //     },
    //     {
    //         $lookup: {
    //             "from": "cities",
    //             "localField": "school_meta_details.city",
    //             "foreignField": "cityId",
    //             "as": "cityDetails"
    //         }
    //     },
    //     {
    //         $lookup: {
    //             "from": "states",
    //             "localField": "school_meta_details.state",
    //             "foreignField": "stateId",
    //             "as": "stateDetails"
    //         }
    //     },
    //     {
    //         $skip: perPage * (currentPage - 1)
    //     },
    //     {
    //         $limit: perPage
    //     },
    // ])

    let finalSchools = schools;

    // for (let index = 0; index < schools.length; index++) {
    //     let singleSchool = schools[index];
    //     singleSchool = {
    //         city: singleSchool.city,
    //         countryLogo: singleSchool.countryLogo,
    //         schoolLogo: singleSchool.schoolLogo,
    //         state: singleSchool.state,
    //         ...singleSchool.school_details,
    //         country: singleSchool.countryDetails,
    //         state: singleSchool.stateDetails,
    //         city: singleSchool.cityDetails,
    //     }

    //     finalSchools.push(singleSchool)
    // }

    totalPages = parseFloat(total_schools.length / perPage);
    if (total_schools.length % perPage != 0) {
      totalPages = parseInt(totalPages);
      totalPages++;
    }

    res.json({
      status: 1,
      message: "Schools List Find Successfully",
      details: {
        schools: finalSchools,
        totalPages,
        currentPage,
        baseUrl: fullUrl + "/uploads/agent/",
      },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const getSchoolsPrograms = async (req, res) => {
  try {
    let perPage = 10;
    let { currentPage } = req.body;
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 3006;

    if (host == "localhost") {
      var fullUrl = `${protocol}://${host}:${port}`;
    } else {
      var fullUrl = `${protocol}://${host}:${port}`;
    }
    // const fullUrl = `${protocol}://${host}`

    var schools = [];
    let data = req.body;

    var q1 = [];
    var q2 = []; // for inside search programs

    if (data?.countryId) {
      // query of country
      const cntryDtl = await CountryModel.findOne({
        countryId: data.countryId,
      });
      q1.push({ country: cntryDtl.countryName });
    }
    if (data?.schoolId) {
      // query of country
      q1.push({ _id: ObjectId(data.schoolId) });
    }
    if (data?.stateId) {
      // query of state
      const stateDtl = await StateModel.findOne({ stateId: data.stateId });
      q1.push({ state: stateDtl.stateName });
    }
    if (data?.cityId) {
      // query of city
      const cityDtl = await CityModel.findOne({ cityId: data.cityId });
      q1.push({ city: cityDtl.cityName });
    }

    // For Inside school_programs use Q2 not Q1 =================================================================
    if (data?.searchItem) {
      // check search item inside school_name, location, country, program_name etc.
      q2.push({
        $or: [
          {
            "school_programs.program_name": {
              $regex: `${data.searchItem.toString().trim()}`,
              $options: "i",
            },
          },
          {
            "school_programs.program_name": {
              $regex: `^${data.searchItem.toString().trim()}`,
              $options: "i",
            },
          },
          // { 'country': { $regex: data.searchItem, $options: 'i' } },
        ],
      });
    }

    // filter Founded
    // if (data?.filter_duration) {
    //     if (data?.filter_duration.min && data?.filter_duration.max) {
    //         q1.push({
    //             $and: [
    //                 { 'duration': { $gte: data?.filter_duration.min } },
    //                 { 'duration': { $lte: data?.filter_duration.max } },
    //             ]
    //         })
    //     }
    //     if (data?.filter_duration.min && !data?.filter_duration.max) {
    //         q1.push({
    //             $and: [
    //                 { 'duration': { $gte: data?.filter_duration.min } },
    //             ]
    //         })
    //     }
    //     if (!data?.filter_duration.min && data?.filter_duration.max) {
    //         q1.push({
    //             $and: [
    //                 { 'duration': { $lte: data?.filter_duration.max } },
    //             ]
    //         })
    //     }
    // }

    if (data?.filter_grade_score) {
      if (data?.filter_grade_score.min && data?.filter_grade_score.max) {
        q2.push({
          $and: [
            { grade_score: { $gte: data?.filter_grade_score.min } },
            { grade_score: { $lte: data?.filter_grade_score.max } },
          ],
        });
      }
      if (data?.filter_grade_score.min && !data?.filter_grade_score.max) {
        q2.push({
          $and: [{ grade_score: { $gte: data?.filter_grade_score.min } }],
        });
      }
      if (!data?.filter_grade_score.min && data?.filter_grade_score.max) {
        q2.push({
          $and: [{ grade_score: { $lte: data?.filter_grade_score.max } }],
        });
      }
    }

    if (data?.filter_overall_band) {
      if (data?.filter_overall_band.min && data?.filter_overall_band.max) {
        q2.push({
          $and: [
            { overall_band: { $gte: data?.filter_overall_band.min } },
            { overall_band: { $lte: data?.filter_overall_band.max } },
          ],
        });
      }
      if (data?.filter_overall_band.min && !data?.filter_overall_band.max) {
        q2.push({
          $and: [{ overall_band: { $gte: data?.filter_overall_band.min } }],
        });
      }
      if (!data?.filter_overall_band.min && data?.filter_overall_band.max) {
        q2.push({
          $and: [{ overall_band: { $lte: data?.filter_overall_band.max } }],
        });
      }
    }

    if (data?.filter_pte_score) {
      if (data?.filter_pte_score.min && data?.filter_pte_score.max) {
        q2.push({
          $and: [
            { pte_score: { $gte: data?.filter_pte_score.min } },
            { pte_score: { $lte: data?.filter_pte_score.max } },
          ],
        });
      }
      if (data?.filter_pte_score.min && !data?.filter_pte_score.max) {
        q2.push({
          $and: [{ pte_score: { $gte: data?.filter_pte_score.min } }],
        });
      }
      if (!data?.filter_pte_score.min && data?.filter_pte_score.max) {
        q2.push({
          $and: [{ pte_score: { $lte: data?.filter_pte_score.max } }],
        });
      }
    }

    if (data?.filter_tofel_point) {
      if (data?.filter_tofel_point.min && data?.filter_tofel_point.max) {
        q2.push({
          $and: [
            { tofel_point: { $gte: data?.filter_tofel_point.min } },
            { tofel_point: { $lte: data?.filter_tofel_point.max } },
          ],
        });
      }
      if (data?.filter_tofel_point.min && !data?.filter_tofel_point.max) {
        q2.push({
          $and: [{ tofel_point: { $gte: data?.filter_tofel_point.min } }],
        });
      }
      if (!data?.filter_tofel_point.min && data?.filter_tofel_point.max) {
        q2.push({
          $and: [{ tofel_point: { $lte: data?.filter_tofel_point.max } }],
        });
      }
    }

    if (data?.filter_application_fee) {
      if (
        data?.filter_application_fee.min &&
        data?.filter_application_fee.max
      ) {
        q2.push({
          $and: [
            { application_fee: { $gte: data?.filter_application_fee.min } },
            { application_fee: { $lte: data?.filter_application_fee.max } },
          ],
        });
      }
      if (
        data?.filter_application_fee.min &&
        !data?.filter_application_fee.max
      ) {
        q2.push({
          $and: [
            { application_fee: { $gte: data?.filter_application_fee.min } },
          ],
        });
      }
      if (
        !data?.filter_application_fee.min &&
        data?.filter_application_fee.max
      ) {
        q2.push({
          $and: [
            { application_fee: { $lte: data?.filter_application_fee.max } },
          ],
        });
      }
    }

    if (data?.filter_cost_of_living) {
      if (data?.filter_cost_of_living.min && data?.filter_cost_of_living.max) {
        q2.push({
          $and: [
            { cost_of_living: { $gte: data?.filter_cost_of_living.min } },
            { cost_of_living: { $lte: data?.filter_cost_of_living.max } },
          ],
        });
      }
      if (data?.filter_cost_of_living.min && !data?.filter_cost_of_living.max) {
        q2.push({
          $and: [{ cost_of_living: { $gte: data?.filter_cost_of_living.min } }],
        });
      }
      if (!data?.filter_cost_of_living.min && data?.filter_cost_of_living.max) {
        q2.push({
          $and: [{ cost_of_living: { $lte: data?.filter_cost_of_living.max } }],
        });
      }
    }

    if (data?.acceptance_letter) {
      if (data?.acceptance_letter.min && data?.acceptance_letter.max) {
        q2.push({
          $and: [
            { acceptance_letter: { $gte: data?.acceptance_letter.min } },
            { acceptance_letter: { $lte: data?.acceptance_letter.max } },
          ],
        });
      }
      if (data?.acceptance_letter.min && !data?.acceptance_letter.max) {
        q2.push({
          $and: [{ acceptance_letter: { $gte: data?.acceptance_letter.min } }],
        });
      }
      if (!data?.acceptance_letter.min && data?.acceptance_letter.max) {
        q2.push({
          $and: [{ acceptance_letter: { $lte: data?.acceptance_letter.max } }],
        });
      }
    }

    if (data?.filter_acceptance_letter) {
      if (
        data?.filter_acceptance_letter.min &&
        data?.filter_acceptance_letter.max
      ) {
        q2.push({
          $and: [
            { acceptance_letter: { $gte: data?.filter_acceptance_letter.min } },
            { acceptance_letter: { $lte: data?.filter_acceptance_letter.max } },
          ],
        });
      }
      if (
        data?.filter_acceptance_letter.min &&
        !data?.filter_acceptance_letter.max
      ) {
        q2.push({
          $and: [
            { acceptance_letter: { $gte: data?.filter_acceptance_letter.min } },
          ],
        });
      }
      if (
        !data?.filter_acceptance_letter.min &&
        data?.filter_acceptance_letter.max
      ) {
        q2.push({
          $and: [
            { acceptance_letter: { $lte: data?.filter_acceptance_letter.max } },
          ],
        });
      }
    }

    if (data?.filter_visa_processing_days) {
      if (
        data?.filter_visa_processing_days.min &&
        data?.filter_visa_processing_days.max
      ) {
        q2.push({
          $and: [
            {
              visa_processing_days: {
                $gte: data?.filter_visa_processing_days.min,
              },
            },
            {
              visa_processing_days: {
                $lte: data?.filter_visa_processing_days.max,
              },
            },
          ],
        });
      }
      if (
        data?.filter_visa_processing_days.min &&
        !data?.filter_visa_processing_days.max
      ) {
        q2.push({
          $and: [
            {
              visa_processing_days: {
                $gte: data?.filter_visa_processing_days.min,
              },
            },
          ],
        });
      }
      if (
        !data?.filter_visa_processing_days.min &&
        data?.filter_visa_processing_days.max
      ) {
        q2.push({
          $and: [
            {
              visa_processing_days: {
                $lte: data?.filter_visa_processing_days.max,
              },
            },
          ],
        });
      }
    }

    if (data?.filter_proccess_days) {
      if (data?.filter_proccess_days.min && data?.filter_proccess_days.max) {
        q2.push({
          $and: [
            { process_days: { $gte: data?.filter_proccess_days.min } },
            { process_days: { $lte: data?.filter_proccess_days.max } },
          ],
        });
      }
      if (data?.filter_proccess_days.min && !data?.filter_proccess_days.max) {
        q2.push({
          $and: [{ process_days: { $gte: data?.filter_proccess_days.min } }],
        });
      }
      if (!data?.filter_proccess_days.min && data?.filter_proccess_days.max) {
        q2.push({
          $and: [{ process_days: { $lte: data?.filter_proccess_days.max } }],
        });
      }
    }

    if (data?.filter_credentials) {
      // query of city
      q2.push({ credentials: data?.filter_credentials });
    }

    if (data?.filter_program_level) {
      // query of city
      q2.push({ program_level: data?.filter_program_level });
    }

    if (data?.filter_foundation_fee) {
      if (data?.filter_foundation_fee.min && data?.filter_foundation_fee.max) {
        q2.push({
          $and: [
            { foundation_fee: { $gte: data?.filter_foundation_fee.min } },
            { foundation_fee: { $lte: data?.filter_foundation_fee.max } },
          ],
        });
      }
      if (data?.filter_foundation_fee.min && !data?.filter_foundation_fee.max) {
        q2.push({
          $and: [{ foundation_fee: { $gte: data?.filter_foundation_fee.min } }],
        });
      }
      if (!data?.filter_foundation_fee.min && data?.filter_foundation_fee.max) {
        q2.push({
          $and: [{ foundation_fee: { $lte: data?.filter_foundation_fee.max } }],
        });
      }
    }

    if (data?.filter_acceptable_band) {
      q2.push({ acceptable_band: data?.filter_acceptable_band });
    }

    if (data?.filter_module) {
      q2.push({ module: data?.filter_module });
    }

    if (data?.filter_few_seats_status == true) {
      q2.push({ few_seats_status: true });
    }

    if (data?.filter_few_seats_status == false) {
      q2.push({ few_seats_status: false });
    }

    if (data?.filter_top_status == true) {
      q2.push({ top_status: true });
    }

    if (data?.filter_top_status == false) {
      q2.push({ top_status: false });
    }

    if (data?.filter_foundation_fee) {
      if (data?.filter_foundation_fee.min && data?.filter_foundation_fee.max) {
        q2.push({
          $and: [
            { foundation_fee: { $gte: data?.filter_foundation_fee.min } },
            { foundation_fee: { $lte: data?.filter_foundation_fee.max } },
          ],
        });
      }
      if (data?.filter_foundation_fee.min && !data?.filter_foundation_fee.max) {
        q2.push({
          $and: [{ foundation_fee: { $gte: data?.filter_foundation_fee.min } }],
        });
      }
      if (!data?.filter_foundation_fee.min && data?.filter_foundation_fee.max) {
        q2.push({
          $and: [{ foundation_fee: { $lte: data?.filter_foundation_fee.max } }],
        });
      }
    }

    // END - For Inside school_programs use Q2 not Q1 =================================================================

    // console.log({ q1, q2: q2[0]["$or"] });

    // Without pagination and without grouping the data
    var totalData = await SchoolModel.aggregate([
      {
        $match: q1.length != 0 ? { $and: q1 } : {},
      },
      {
        $unwind: {
          path: "$school_programs",
        },
      },
      {
        $match: q2.length != 0 ? { $and: q2 } : {},
      },
    ]);

    var my_data = await SchoolModel.aggregate([
      {
        $match: q1.length != 0 ? { $and: q1 } : {},
      },
      {
        $unwind: {
          path: "$school_programs",
        },
      },
      {
        $match: q2.length != 0 ? { $and: q2 } : {},
      },
      {
        $skip: perPage * (currentPage - 1)
      },
      {
        $limit: perPage
      },
      {
        $group: {
          _id: "$_id",
          school_name: { $first: "$school_name" },
          school_about: { $first: "$school_about" },
          school_location: { $first: "$school_location" },
          country: { $first: "$country" },
          city: { $first: "$city" },
          state: { $first: "$state" },
          type: { $first: "$type" },
          total_student: { $first: "$total_student" },
          international_student: { $first: "$international_student" },
          accomodation_feature: { $first: "$accomodation_feature" },
          work_permit_feature: { $first: "$work_permit_feature" },
          program_cooporation: { $first: "$program_cooporation" },
          work_while_study: { $first: "$work_while_study" },
          condition_offer_letter: { $first: "$condition_offer_letter" },
          library: { $first: "$library" },
          founded: { $first: "$founded" },
          school_programs: {
            $push: {
              program_id: "$school_programs.program_id",
              program_name: "$school_programs.program_name",
              description: "$school_programs.description",
              duration: "$school_programs.duration",
              duration_sem_per_year: "$school_programs.duration_sem_per_year",
              grade_score: "$school_programs.grade_score",
              overall_band: "$school_programs.overall_band",
              pte_score: "$school_programs.pte_score",
              tofel_point: "$school_programs.tofel_point",
              ielts_listening: "$school_programs.ielts_listening",
              ielts_speaking: "$school_programs.ielts_speaking",
              ielts_writting: "$school_programs.ielts_writting",
              ielts_reading: "$school_programs.ielts_reading",
              new_stream: "$school_programs.new_stream",
              stream_id: "$school_programs.stream_id",
              other_fees: "$school_programs.other_fees",
              application_fee: "$school_programs.application_fee",
              min_tution_fee_per_semester:
                "$school_programs.min_tution_fee_per_semester",
              max_tution_fee: "$school_programs.max_tution_fee",
              cost_of_living: "$school_programs.cost_of_living",
              currency: "$school_programs.currency",
              acceptance_letter: "$school_programs.acceptance_letter",
              // intake_id: "$school_programs.intake_id",
              visa_processing_days: "$school_programs.visa_processing_days",
              process_days: "$school_programs.process_days",
              credentials: "$school_programs.credentials",
              program_level: "$school_programs.program_level",
              other_comment: "$school_programs.other_comment",
              foundation_fee: "$school_programs.foundation_fee",
              acceptable_band: "$school_programs.acceptable_band",
              module: "$school_programs.module",
              english_language: "$school_programs.english_language",
              program_sort_order: "$school_programs.program_sort_order",
              few_seats_status: "$school_programs.few_seats_status",
              intakes_data: "$school_programs.intakes_data",
              top_status: "$school_programs.top_status",
            },
          },
        },
      },
    ]);

    let totalPages = parseFloat(totalData.length / perPage);
    if (totalData.length % perPage != 0) {
      totalPages = parseInt(totalPages);
      totalPages++;
    }

    console.log({
      l1: totalData.length,
      l2: my_data.length,
      totalPages,
    })

    res.json({
      status: 1,
      message: "School Programs List Find Successfully",
      details: {
        totalData: my_data,
        totalPages
      },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const toggleIntakeStatus = async (req, res) => {
  const { sId, pId, index } = req.body;
  var school = await SchoolModel.findOne({ _id: ObjectId(sId) });

  var myIndex = null;
  for (let indexx = 0; indexx < school.school_programs.length; indexx++) {
    if (school.school_programs[indexx].program_name == pId) {
      myIndex = indexx;
    }
  }

  console.log({ myIndex });

  if (myIndex != null) {
    var oldStatus = school.school_programs[myIndex].status;
    console.log({
      oldStatus,
      name: school.school_programs[myIndex].program_name,
    });
    var arr = oldStatus.split(",");
    arr[index] = arr[index] == "1" ? "0" : "1";
    console.log({ arr });
    school.school_programs[myIndex].status = arr.join(",");
    await school.save();
    res.json({
      message: "Status Changed",
    });
  } else {
    res.json({
      message: "Something error, index not find",
    });
  }
};

const getschoolnameidandcountrieslist = async (req, res) => {
  const { schoolId } = req.body;

  if (schoolId) {
    var schoolDtl = await SchoolModel.findOne({
      _id: schoolId,
    });
  }

  var countries = await CountryModel.find();
  // var states = await StateModel.find()
  // var cities = await CityModel.find()

  res.json({
    status: "1",
    countryNameList: countries,
    cityNameList: [],
    stateNameList: [],
    activeCountry: schoolId ? schoolDtl.country.toLowerCase() : "",
  });
};

const getschoolnames = async (req, res) => {
  const { countryId, stateId, cityId } = req.body;

  var query = [];
  if (countryId) {
    query.push({ country: countryId });
  }
  if (stateId) {
    query.push({ state: stateId });
  }
  if (cityId) {
    query.push({ city: cityId });
  }

  console.log({ query });
  var schoolNamesList = await SchoolNamesModel.find(
    query.length == 0
      ? {}
      : {
        $and: query,
      }
  );
  // var states = await StateModel.find()
  // var cities = await CityModel.find()

  res.json({
    status: "1",
    schoolNamesList,
  });
};

const toggleFewSeatsStatus = async (req, res) => {
  const { sId, pId } = req.body;
  var school = await SchoolModel.findOne({ _id: sId });

  var myIndex = null;
  for (let indexx = 0; indexx < school.school_programs.length; indexx++) {
    if (school.school_programs[indexx].program_name == pId) {
      myIndex = indexx;
    }
  }

  console.log({ myIndex, sId, pId });
  if (myIndex != null) {
    school.school_programs[myIndex].few_seats_status =
      !school.school_programs[myIndex].few_seats_status;
    console.log(school.school_programs[myIndex].few_seats_status);
    await school.save();
    res.json({
      message: "Few Seats Status Changed",
    });
  } else {
    res.json({
      message: "Something error, index not find",
    });
  }
};

const toggletopstatus = async (req, res) => {
  const { sId, pId } = req.body;
  var school = await SchoolModel.findOne({ _id: sId });

  var myIndex = null;
  for (let indexx = 0; indexx < school.school_programs.length; indexx++) {
    if (school.school_programs[indexx].program_name == pId) {
      myIndex = indexx;
    }
  }

  console.log({ myIndex, sId, pId });
  if (myIndex != null) {
    school.school_programs[myIndex].top_status =
      !school.school_programs[myIndex].top_status;
    console.log(school.school_programs[myIndex].top_status);
    await school.save();
    res.json({
      message: "Top Status Changed",
    });
  } else {
    res.json({
      message: "Something error, index not find",
    });
  }
};

const addCountry = async (req, res) => {
  try {
    const { country } = req.body;
    if (req.files?.image) {
      var fileName = req.files?.image[0].filename;
    } else {
      var fileName = "";
    }

    var oldCountry = await CountryModel.findOne({
      countryName: country.toLowerCase(),
    });

    if (oldCountry) {
      res.json({ message: "country already added", status: "0" });
      return;
    }

    var newCountry = new CountryModel({
      countryName: country.toLowerCase() || "",
      countryFlag: fileName,
    });

    await newCountry.save();

    res.json({
      message: "country upload successfully",
      status: "1",
      details: { newCountry },
    });
  } catch (error) {
    console.log(error);
    res.json({ message: "Server Error", status: "0" });
  }
};

const updateCountry = async (req, res) => {
  try {
    const { id } = req.body;
    if (req?.files) {
      console.log(req.files);
      if (req.files.image) {
        var fileName = req.files?.image[0].filename;
      } else {
        var fileName = "";
      }
    }

    var oldCountry = await CountryModel.findOne({
      _id: id,
    });

    if (!oldCountry) {
      res.json({ message: "country not found", status: "0" });
      return;
    }

    oldCountry.countryFlag = fileName;

    await oldCountry.save();

    res.json({
      message: "country Updated successfully",
      status: "1",
      details: { updatedCountry: oldCountry },
    });
  } catch (error) {
    console.log(error);
    res.json({ message: "Server Error", status: "0" });
  }
};

const addSchoolname = async (req, res) => {
  const { schoolName, countryId, stateId, cityId } = req.body;

  if (req.files?.schoolLogo) {
    var schoolLogoName = req.files?.schoolLogo[0].filename;
  } else {
    var schoolLogoName = "";
  }
  if (req.files?.countryLogo) {
    var countryLogoName = req.files?.countryLogo[0].filename;
  } else {
    var countryLogoName = "";
  }

  var oldSchool = await SchoolNamesModel.findOne({
    schoolName: trim(schoolName.toLowerCase()) || "",
    country: trim(countryId),
    state: trim(stateId),
    city: trim(cityId),
  });

  if (oldSchool) {
    res.json({ message: "School Name already added", status: "0" });
    return;
  }

  var newSchoolName = new SchoolNamesModel({
    schoolName: trim(schoolName.toLowerCase()) || "",
    country: trim(countryId),
    state: trim(stateId),
    city: trim(cityId),
    schoolLogo: schoolLogoName,
    countryLogo: countryLogoName,
  });

  console.log({ newSchoolName });

  await newSchoolName.save();

  var newSchoolDetails = await SchoolNamesModel.aggregate([
    {
      $match: {
        _id: newSchoolName._id,
      },
    },
    {
      $lookup: {
        from: "countries",
        localField: "country",
        foreignField: "countryId",
        as: "countryDetails",
      },
    },
    {
      $lookup: {
        from: "cities",
        localField: "city",
        foreignField: "cityId",
        as: "cityDetails",
      },
    },
    {
      $lookup: {
        from: "states",
        localField: "state",
        foreignField: "stateId",
        as: "stateDetails",
      },
    },
  ]);

  console.log({ newSchoolDetails });

  res.json({
    message: "school name upload successfully",
    status: "1",
    details: { newSchoolName: newSchoolDetails[0] },
  });
};

const updateSchoolName = async (req, res) => {
  try {
    const { id } = req.body;

    var oldSchool = await SchoolNamesModel.findOne({
      _id: id,
    });

    if (!oldSchool) {
      res.json({ message: "country not found", status: "0" });
      return;
    }
    if (req?.files) {
      if (req.files?.schoolLogo) {
        oldSchool.schoolLogo = req.files?.schoolLogo[0].filename;
      }
      if (req.files?.countryLogo) {
        // findAll
        let allSchools = await SchoolNamesModel.updateMany(
          { country: oldSchool.country },
          { countryLogo: req.files?.countryLogo[0].filename }
        );
        console.log("updates", allSchools);
        // oldSchool.countryLogo = req.files?.countryLogo[0].filename
      }
    }
    // oldSchool.countryName = countryName
    // oldSchool.state = state
    // oldSchool.city = city

    await oldSchool.save();

    var newSchoolDetails = await SchoolNamesModel.aggregate([
      {
        $match: {
          _id: oldSchool._id,
        },
      },
      {
        $lookup: {
          from: "countries",
          localField: "country",
          foreignField: "countryId",
          as: "countryDetails",
        },
      },
      {
        $lookup: {
          from: "cities",
          localField: "city",
          foreignField: "cityId",
          as: "cityDetails",
        },
      },
      {
        $lookup: {
          from: "states",
          localField: "state",
          foreignField: "stateId",
          as: "stateDetails",
        },
      },
    ]);

    res.json({
      message: "School Detail Updated successfully",
      status: "1",
      details: { updatedSchoolName: newSchoolDetails[0] },
    });
  } catch (error) {
    console.log(error);
    res.json({ message: "Server Error", status: "0" });
  }
};

const deleteSchoolName = async (req, res) => {
  try {
    const { id } = req.params;
    await SchoolNamesModel.findByIdAndDelete(id);
    res.json({ message: "School Deleted successfully", status: "1" });
  } catch (error) {
    console.log(error);
    res.json({ message: "Server Error", status: "0" });
  }
};

const countriesList = async (req, res) => {
  var list = await CountryModel.find();
  res.json({
    status: "1",
    message: "List founded",
    details: {
      list,
    },
  });
};

const schoolNamesList = async (req, res) => {
  var list = await SchoolNamesModel.aggregate([
    {
      $lookup: {
        from: "countries",
        localField: "country",
        foreignField: "countryId",
        as: "countryDetails",
      },
    },
    {
      $lookup: {
        from: "cities",
        localField: "city",
        foreignField: "cityId",
        as: "cityDetails",
      },
    },
    {
      $lookup: {
        from: "states",
        localField: "state",
        foreignField: "stateId",
        as: "stateDetails",
      },
    },
  ]);
  res.json({
    status: "1",
    message: "List founded",
    details: {
      list,
    },
  });
};

const adminList = async (req, res) => {
  try {
    var students = [];
    let data = req.body;

    // pagination variables
    let perPage = 5;
    let totalPages = 0;
    let currentPage = data.currentPage;

    let totalStudents = await AdminModel.find({ role: { $ne: "ADMIN" } });
    students = await AdminModel.find({ role: { $ne: "ADMIN" } })
      .skip(perPage * (currentPage - 1) || 0)
      .limit(perPage);
    totalPages = parseInt(totalStudents.length / perPage);

    if (totalStudents.length % perPage != 0) {
      totalPages++;
    }

    res.json({
      status: 1,
      message: "Employee List Find Successfully",
      details: { list: students, totalPages, currentPage },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { userId, permissions } = req.body;
    if (userId == "" || !userId || !permissions) {
      res.json({
        status: "0",
        message: "UserId or Permissions are missing",
      });
      return;
    }

    let admin = await AdminModel.findOne({ _id: userId });
    if (!admin) {
      res.json({
        status: 0,
        message: "User Not Found",
      });
    } else {
      admin.permissions = permissions;
      await admin.save();

      res.json({
        status: "1",
        message: "Permissions Update Successfully",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Data Not Uploaded",
    });
  }
};

const getAgentCounts = async (req, res) => {
  try {
    let totalagents = await AgentModel.find({ status: "UN_APPROVED" });

    res.json({
      status: 1,
      message: "Find Successfully",
      details: { unapprovedAgents: totalagents.length },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const getNotifications = async (req, res) => {
  console.log(req.userData);
  const { userId } = req.userData;

  const adminData = await AdminModel.findById(userId);

  res.json({
    status: "1",
    message: "Notifications get successfully",
    details: {
      notifications: adminData.notifications.reverse(),
      unseenNotifications: adminData.unseenNotifications,
    },
  });
};

// setWebPushToken
const setWebPushToken = async (userId, token) => {
  const adminData = await AdminModel.findOne({ _id: userId });
  adminData.web_push_token = token;
  console.log({ adminData });
  adminData.save();

  return true;
};

const getAssessmentForms = async (req, res) => {
  try {
    var students = [];
    let data = req.body;

    // pagination variables
    let perPage = 5;
    let totalPages = 0;
    let currentPage = data.currentPage;

    let totalStudents = await AssessmentForm.find().sort({ createdAt: "-1" });
    students = await AssessmentForm.find()
      .sort({ createdAt: "-1" })
      .skip(perPage * (currentPage - 1) || 0)
      .limit(perPage);
    totalPages = parseInt(totalStudents.length / perPage);

    if (totalStudents.length % perPage != 0) {
      totalPages++;
    }

    res.json({
      status: 1,
      message: "Form List Find Successfully",
      details: { students, totalPages, currentPage },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const getSearchQueryForms = async (req, res) => {
  try {
    var students = [];
    let data = req.body;

    // pagination variables
    let perPage = 5;
    let totalPages = 0;
    let currentPage = data.currentPage;

    let totalStudents = await QueriesForm.find().sort({ createdAt: "-1" });
    students = await QueriesForm.find()
      .sort({ createdAt: "-1" })
      .skip(perPage * (currentPage - 1) || 0)
      .limit(perPage);
    totalPages = parseInt(totalStudents.length / perPage);

    if (totalStudents.length % perPage != 0) {
      totalPages++;
    }

    res.json({
      status: 1,
      message: "Form List Find Successfully",
      details: { students, totalPages, currentPage },
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: "Server error occured",
      details: { error },
    });
  }
};

const findIntakes = async (req, res) => {
  const { countryId, schoolId, programId } = req.body;
  console.log(req.body);

  // if (!countryId && !schoolId && !programId) {
  //     res.json({
  //         status: "0",
  //         message: "Country Id is requried"
  //     })
  //     return
  // }

  var q1 = [];
  if (countryId) {
    console.log({ countryId });
    const cntryDtl = await CountryModel.findOne({ countryId: countryId });
    var countryName = cntryDtl.countryName;
    q1.push({ country: countryName });
  }

  if (schoolId) {
    q1.push({ school_name: schoolId });
  }

  var globalIntake = [];

  var schoolsList = await SchoolModel.aggregate([
    {
      $match:
        q1.length == 0
          ? {}
          : {
            $and: q1,
          },
    },
  ]);

  // console.log({ schoolsList })
  console.log({ q1 });

  for (let schoolIndex = 0; schoolIndex < schoolsList.length; schoolIndex++) {
    const school = schoolsList[schoolIndex];
    // console.log({ schoolIndex })
    for (
      let programIndex = 0;
      programIndex < school.school_programs.length;
      programIndex++
    ) {
      // console.log({ programIndex })
      const program = school.school_programs[programIndex];

      if (programId) {
        if (program.program_id != programId) continue;

        if (schoolId && programId) {
          var schoolName = school.school_name;
          var programName = program.program_name;
        }
      }

      if (program.intakes_data.length == 0) continue;

      for (
        let intekeIndex = 0;
        intekeIndex < program.intakes_data.length;
        intekeIndex++
      ) {
        // console.log({ intekeIndex })
        let intakeData = program.intakes_data[intekeIndex];
        // console.log({ intakeData })
        let demoIntake = {
          year: 0,
          months: [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
          ],
        };
        if (intakeData) {
          demoIntake.year = intakeData.year;

          for (
            let monthIndex = 0;
            monthIndex < intakeData.months.length;
            monthIndex++
          ) {
            // console.log({ months: intakeData.months })
            if (intakeData.months[monthIndex] == true) {
              demoIntake.months[monthIndex] = true;
            }
          }
        }

        let findIndex = -1;
        for (
          let globalIntakeIndex = 0;
          globalIntakeIndex < globalIntake.length;
          globalIntakeIndex++
        ) {
          // console.log({ globalIntakeIndex })
          if (globalIntake[globalIntakeIndex].year == demoIntake.year) {
            findIndex = globalIntakeIndex;
            break;
          }
        }

        if (findIndex == -1) {
          globalIntake.push(demoIntake);
        } else {
          for (
            let monthIndex = 0;
            monthIndex < demoIntake.months.length;
            monthIndex++
          ) {
            if (demoIntake.months[monthIndex] == true) {
              globalIntake[findIndex].months[monthIndex] = true;
            }
          }
        }
      }
    }
  }

  // console.log({ globalIntake })
  res.json({
    status: "1",
    message: "intakes data get",
    details: {
      globalIntake,
      meta_data: {
        schoolName,
        programName,
      },
    },
  });
};

const updateIntakes = async (req, res) => {
  const { countryId, schoolId, programId, intakesData } = req.body;
  console.log(req.body);

  var q1 = [];

  if (countryId) {
    const cntryDtl = await CountryModel.findOne({ countryId: countryId });
    var countryName = cntryDtl.countryName;
    q1.push({ country: countryName });
  }

  if (schoolId) {
    q1.push({ school_name: schoolId });
  }

  console.log({ updateQ1: q1 });

  try {
    var schoolsList = await SchoolModel.aggregate([
      {
        $match:
          q1.length == 0
            ? {}
            : {
              $and: q1,
            },
      },
    ]);

    console.log({ schoolsList });
    console.log({ q1 });

    for (let index = 0; index < schoolsList.length; index++) {
      const school = schoolsList[index];
      let findSchool = await SchoolModel.findById(school._id);
      for (
        let programIndex = 0;
        programIndex < findSchool.school_programs.length;
        programIndex++
      ) {
        if (programId) {
          if (
            findSchool.school_programs[programIndex].program_id != programId
          ) {
            continue;
          }
        }
        findSchool.school_programs[programIndex].intakes_data = intakesData;
      }
      let response = await findSchool.save();
      console.log({ response });
    }
  } catch (error) {
    console.log({ error });
  }

  res.json({
    status: "1",
    message: "Updated intakes",
    details: {
      schoolsList,
    },
  });
};
const getSingleSchool = async (req, res) => {
  const { schoolId } = req.body;

  let countries = await CountryModel.find();

  let schoolDetails = await SchoolModel.findById(schoolId);

  res.json({
    status: "1",
    message: "Single School Data Founded",
    details: {
      countries,
      schoolDetails,
    },
  });
};
const getSingleProgram = async (req, res) => {
  const { schoolId, programId } = req.body;

  let countries = await CountryModel.find();

  let schoolDetails = await SchoolModel.aggregate([
    {
      $match: {
        _id: ObjectId(schoolId),
      },
    },
    {
      $unwind: "$school_programs",
    },
    {
      $match: {
        "school_programs.program_id": programId,
      },
    },
  ]);

  if (schoolDetails.length == 0) {
    res.json({
      status: "0",
      message: "School Not Found",
    });
    return;
  }

  res.json({
    status: "1",
    message: "Single Program Data Founded",
    details: {
      programDetail: schoolDetails[0].school_programs,
    },
  });
};

const toggletopstatusschool = async (req, res) => {
  const { sId } = req.body;
  var school = await SchoolModel.findOne({ _id: sId });

  school.top_status = !school.top_status;
  await school.save();
  res.json({
    message: "Top Status Changed",
  });
};

// const topcolleges = async (req, res) => {

//     var school = await SchoolModel.aggregate([{
//         $match: {
//             'type': { $regex: "college", $options: 'i' },
//             'top_status': true,
//         },
//     }])

//     res.json({
//         status: "1",
//         message: "Top Colleges Find",
//         details: {
//             schools: school
//         }
//     })
// }
// const topuniversities = async (req, res) => {

//     var school = await SchoolModel.aggregate([{
//         $match: {
//             'type': { $regex: "university", $options: 'i' },
//             'top_status': true,
//         },
//     }])

//     res.json({
//         status: "1",
//         message: "Top University Find",
//         details: {
//             schools: school
//         }
//     })
// }

const topcategorydata = async (req, res) => {
  const protocol = req.protocol;
  const host = req.hostname;
  const url = req.originalUrl;
  const port = process.env.PORT || 3006;

  if (host === "localhost") {
    var fullUrl = `${protocol}://${host}:${port}`;
  } else {
    var fullUrl = `${protocol}://${host}:${port}`;
  }

  var schools = await SchoolModel.aggregate([
    {
      $match: {
        top_status: true,
      },
    },
    {
      $lookup: {
        from: "schoolnames",
        localField: "school_name",
        foreignField: "schoolName",
        as: "school_meta_details",
      },
    },
    {
      $unwind: "$school_meta_details",
    },
    {
      $project: {
        "school_meta_details.schoolLogo": 1,
        school_name: 1,
        total_student: 1,
      },
    },
  ]);

  var programs = await SchoolModel.aggregate([
    {
      $unwind: {
        path: "$school_programs",
      },
    },
    {
      $match: {
        "school_programs.top_status": true,
      },
    },
    {
      $lookup: {
        from: "schoolnames",
        localField: "school_name",
        foreignField: "schoolName",
        as: "school_meta_details",
      },
    },
    {
      $unwind: "$school_meta_details",
    },
    {
      $project: {
        _id: 1,
        "school_programs.program_id": 1,
        "school_programs.program_name": 1,
        country: 1,
        total_student: 1,
        "school_meta_details.schoolLogo": 1,
      },
    },
  ]);

  var finalPrograms = [];

  for (let index = 0; index < programs.length; index++) {
    const singleProgram = programs[index];
    finalPrograms.push({
      school_id: singleProgram._id,
      program_id: singleProgram.school_programs.program_id,
      course_name: singleProgram.school_programs.program_name,
      country: singleProgram.country,
      available_students: 0,
      total_student: singleProgram.total_student,
      school_logo: singleProgram.school_meta_details.schoolLogo,
    });
  }

  res.json({
    status: "1",
    message: "Top Category data Find",
    details: {
      schools,
      programs: finalPrograms,
      countries: [],
      baseUrl: fullUrl + "/uploads/agent",
    },
  });
};

const getSingleProgramDetail = async (req, res) => {
  const { schoolId, programId } = req.body;
  var programDetails = await SchoolModel.aggregate([
    {
      $match: {
        _id: ObjectId(schoolId),
      },
    },
    {
      $unwind: {
        path: "$school_programs",
      },
    },
    {
      $match: {
        "school_programs.program_id": programId,
      },
    },
  ]);

  res.json({
    status: "1",
    message: "Single Program Detail found",
    details: {
      programDetails: programDetails[0],
    },
  });
};

const getSingleSchoolDetails = async (req, res) => {
  const { schoolId } = req.body;
  var schoolDetails = await SchoolModel.aggregate([
    {
      $match: {
        _id: ObjectId(schoolId),
      },
    },
    {
      $lookup: {
        from: "schoolnames",
        localField: "school_name",
        foreignField: "schoolName",
        as: "school_meta_details",
      },
    },
    {
      $unwind: "$school_meta_details",
    },
  ]);

  res.json({
    status: "1",
    message: "Single Program Detail found",
    details: {
      schoolDetails: schoolDetails[0],
    },
  });
};

// getDashboardCounts api
const getDashboardCounts = async (req, res) => {
  // Total Agent
  let totalAgents = await AgentModel.find();
  totalAgents = totalAgents.length;
  // Approved Agent
  let approvedAgents = -1;
  // Unapproved Agent
  let unApprovedAgents = -1;
  // Agent Student
  let agentStudents = await StudentModel.find({ agent_id: { $ne: null } });
  agentStudents = agentStudents.length;
  // Total Student
  let totalStudents = await StudentModel.find();
  totalStudents = totalStudents.length;
  // Block Student
  let blockStudents = await StudentModel.find({ status: "BLOCKED" });
  blockStudents = blockStudents.length;
  // Unblock Student
  let unBlockStudents = await StudentModel.find({ status: { $ne: "BLOCKED" } });
  unBlockStudents = unBlockStudents.length;
  // Total Schools
  let totalSchools1 = await SchoolModel.find();
  totalSchools = totalSchools1.length;
  // Total Programs
  let totalPrograms = totalSchools1.reduce(
    (prev, curr) => prev + curr.school_programs.length,
    0
  );

  res.json({
    status: "1",
    message: "Dashboard Data Founded",
    details: {
      totalAgents,
      approvedAgents,
      unApprovedAgents,
      agentStudents,
      totalStudents,
      blockStudents,
      unBlockStudents,
      totalSchools,
      totalPrograms,
    },
  });
};

const getEnrollPrograms = async (req, res) => {
  const { type } = req.body;

  const protocol = req.protocol;
  const host = req.hostname;
  const url = req.originalUrl;
  const port = process.env.PORT || 3006;

  if (host === "localhost") {
    var fullUrl = `${protocol}://${host}:${port}`;
  } else {
    var fullUrl = `${protocol}://${host}:${port}`;
  }



  var forInProcessing = [
    "IN_PROCESSING",
    "OL_RECEIVED",
    "TUTION_FEES_PROCESSING",
    "FILE_LODGED",
    "FILE_LODGED_DOCS_PROCESSING",
    "VISA_AWAITED",
  ]

  var forClosed = [
    "VISA_APPROVED",
  ]

  var forDocRejectedFiles = [
    "OL_REJECTED",
    "DOCUMENTS_REJECT",
    "TUTION_FEES_REJECTED",
    "FILE_LODGED_DOCS_REJECTED",
  ]

  var forPermanentRejectedFiles = [
    "VISA_REJECTED",
  ]

  var forPendingFiles = [
    "FEES_AND_DOC_PENDING",
    "FEES_PENDING",
    "DOCUMENTS_PENDING",
  ]

  console.log({ type })
  // get enrolledList details
  let enrolledList = await EnrollModel.aggregate([
    {
      $match:
        type != "ALL"
          ? type == "PENDING" ? {
            enroll_status: { $in: forPendingFiles },
          } : type == "IN_PROCESSING" ? {
            enroll_status: { $in: forInProcessing },
          } : type == "DOC_REJECTED" ? {
            enroll_status: { $in: forDocRejectedFiles },
          } : type == "PERMANENT_REJECTED" ? {
            enroll_status: { $in: forPermanentRejectedFiles },
          } : type == "CLOSED" ? {
            enroll_status: { $in: forClosed },
          } : {
            enroll_status: type,
          }
          : {},
    },
    {
      $lookup: {
        from: "schools",
        localField: "school_id",
        foreignField: "_id",
        as: "school_details",
      },
    },
    {
      $unwind: {
        path: "$school_details",
      },
    },
    {
      $lookup: {
        from: "students",
        localField: "student_id",
        foreignField: "_id",
        as: "student_details",
      },
    },
    {
      $unwind: {
        path: "$student_details",
      },
    },
    {
      $unwind: {
        path: "$school_details.school_programs",
      },
    },
    {
      $match: {
        $expr: {
          $eq: ["$school_details.school_programs.program_id", "$program_id"],
        },
      },
    },
    {
      $lookup: {
        from: "countries",
        localField: "school_details.country",
        foreignField: "countryName",
        as: "school_details.countryDetails",
      },
    },
    {
      $unwind: {
        path: "$school_details.countryDetails",
      },
    },
    {
      $lookup: {
        from: "states",
        let: {
          stateName: "$school_details.state",
          countryId: "$school_details.countryDetails.countryId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$stateName", "$$stateName"] },
                  { $eq: ["$countryId", "$$countryId"] },
                ],
              },
            },
          },
        ],
        as: "school_details.stateDetails",
      },
    },
    {
      $unwind: "$school_details.stateDetails",
    },
    {
      $lookup: {
        from: "cities",
        let: {
          cityName: "$school_details.city",
          stateId: "$school_details.stateDetails.stateId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$cityName", "$$cityName"] },
                  { $eq: ["$stateId", "$$stateId"] },
                ],
              },
            },
          },
        ],
        as: "school_details.cityDetails",
      },
    },
    {
      $unwind: "$school_details.cityDetails",
    },
    {
      $lookup: {
        from: "schoolnames",
        let: {
          localSchoolNameField: "$school_details.school_name",
          localCountryField: "$school_details.countryDetails.countryId",
          localStateField: "$school_details.stateDetails.stateId",
          localCityField: "$school_details.cityDetails.cityId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$schoolName", "$$localSchoolNameField"] },
                  { $eq: ["$country", "$$localCountryField"] },
                  { $eq: ["$state", "$$localStateField"] },
                  { $eq: ["$city", "$$localCityField"] },
                ],
              },
            },
          },
        ],
        // localField: "school_details.school_name",
        // foreignField: "schoolName",
        as: "school_details.school_meta_details",
      },
    },
    {
      $unwind: {
        path: "$school_details.school_meta_details",
      },
    },
    {
      $sort: {
        updatedAt: -1,
      },
    },
  ]);

  res.json({
    status: "1",
    message: "Enrolled Programs details found",
    details: {
      files: enrolledList,
      baseUrl: fullUrl + "/uploads/agent/",
    },
  });
};

const updateEnrollStatus = async (req, res) => {
  try {
    const { fileId, status } = req.body;
    let file = await EnrollModel.findOne({ _id: ObjectId(fileId) });
    if (!file) {
      res.json({
        status: "0",
        message: "File Not Found",
        details: {
          error: "File Not Found",
        },
      });
      return;
    }

    const { userId, role } = req.userData;
    var userRole = role;
    if (status == "FEES_PENDING") {
      await appendFileHistory({
        fileId,
        userId,
        userRole,
        content: "File Approved, Pay fees for further Processing",
      });
    }
    if (status == "CLOSED") {
      await appendFileHistory({
        fileId,
        userId,
        userRole,
        content: "Your file was closed",
      });
    }

    file.enroll_status = status;
    await file.save();
    res.json({
      status: "1",
      message: "Status Updated",
      details: {
        status: status,
      },
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: "0",
      message: "Server Error",
      details: {
        error: err.message,
      },
    });
  }
};
const updateStudentRemark = async (req, res) => {
  try {
    const { fileId, status } = req.body;
    let file = await EnrollModel.findOne({ _id: ObjectId(fileId) });
    if (!file) {
      res.json({
        status: "0",
        message: "File Not Found",
        details: {
          error: "File Not Found",
        },
      });
      return;
    }

    // const { userId, role } = req.userData;
    // var userRole = role;
    // if (status == "FEES_PENDING") {
    //   await appendFileHistory({
    //     fileId,
    //     userId,
    //     userRole,
    //     content: "File Approved, Pay fees for further Processing",
    //   });
    // }
    // if (status == "CLOSED") {
    //   await appendFileHistory({
    //     fileId,
    //     userId,
    //     userRole,
    //     content: "Your file was closed",
    //   });
    // }

    file.student_remark = status;
    await file.save();
    res.json({
      status: "1",
      message: "Status Updated",
      details: {
        status: status,
      },
    });
  } catch (err) {
    console.log(err);
    res.json({
      status: "0",
      message: "Server Error",
      details: {
        error: err.message,
      },
    });
  }
};


const sendRemark = async (req, res) => {
  try {
    const { fileId, content } = req.body;
    const { userId, role } = req.userData;
    var userRole = role;
    if (!role) {
      userRole = "AGENT";
    }

    let historyResponse = await appendFileHistory({
      fileId,
      userId,
      userRole,
      content,
    });
    console.log({ historyResponse });
    res.json(historyResponse);
  } catch (err) {
    console.log(err);
    res.json({
      status: "0",
      message: "Server Error",
      details: {
        error: err.message,
      },
    });
  }
};

const getProfile = async (req, res) => {
  const { userId } = req.userData;
  const user = await AdminModel.findById(userId);
  res.json({
    status: "1",
    message: "Profile Fetched",
    details: {
      user,
    },
  });
};

const updateProfile = async (req, res) => {
  const { userId } = req.userData;
  const { firstName, lastName, phone } = req.body;

  const user = await AdminModel.findByIdAndUpdate(userId, {
    first_name: firstName,
    last_name: lastName,
    phone: phone,
  });

  res.json({
    status: "1",
    message: "Profile Updated Successfully",
  });
};

const changePassword = async (req, res) => {
  try {
    const { userId } = req.userData;
    const { oldPassword, newPassword } = req.body;

    const user = await AdminModel.findById(userId);

    bcrypt.compare(oldPassword, user.password, async (err, result) => {
      if (err) {
        res.json({
          status: "0",
          message: "Server Error Occured",
          details: {
            error: err,
          },
        });
        return;
      }

      if (!result) {
        res.json({
          status: "0",
          message: "Old Password is wrong",
        });
        return;
      }

      bcrypt.hash(newPassword, saltRounds, async function (err, hash) {
        // Store hash in your password DB.
        if (err) {
          res.json({
            status: 0,
            message: "Server error occured",
            details: {
              error: err,
            },
          });
          return;
        }

        user.password = hash;

        await user.save();

        res.json({
          status: 1,
          message: "Password Updated Successfully",
        });
        return;
      });
    });
  } catch (err) {
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: {
        error: err.message,
      },
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let admin = await AdminModel.findOne({ email });

    if (!admin) {
      res.json({ status: "0", message: "Email not found" });
      return;
    }

    if (admin.loginProvider == "google") {
      res.json({
        status: "0",
        message: "This email is associated with Google Login",
      });
      return;
    }

    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 3006;

    if (host === "localhost") {
      var fullUrl = `${protocol}://${host}:${port}`;
    } else {
      var fullUrl = `${protocol}://${host}:${port}`;
    }

    // generate jwt token
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let data = {
      time: Date(),
      userId: admin._id,
      email: admin.email,
      role: admin.role,
    };

    const token = jwt.sign(data, jwtSecretKey);

    let ENDPOINT = "https://learnglobal.co.in";
    // let ENDPOINT = "http://localhost:3006";

    await sendForgotPasswordEmail(
      admin.first_name,
      admin.email,
      token,
      `${ENDPOINT}/d/admin`
    );

    res.json({
      status: "1",
      message: "Forgot Password Email send successfully",
      details: {
        email: admin.email,
      },
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: {
        error,
      },
    });
  }
};

const setNewPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId, email } = req.userData;

    console.log({ newPassword, data: req.userData });

    if (newPassword?.length < 6) {
      res.json({
        status: "0",
        name: "ValidationError",
        message: "Password must have minimum 6 characters",
      });
      return;
    }

    let admin = await AdminModel.findOne({ _id: userId });

    if (!admin) {
      res.json({ status: "0", message: "admin Not Found" });
      return;
    }

    if (admin.email != email) {
      res.json({
        status: "0",
        message: "Invalid Email",
        details: {
          error: `User find with id ${userId} have different email ${admin.email} to ${email}`,
        },
      });
      return;
    }

    bcrypt.hash(newPassword, saltRounds, async function (err, hash) {
      // Store hash in your password DB.
      if (err) {
        res.json({
          status: "0",
          message: "Server error occured",
          details: {
            error: err,
          },
        });
        return;
      }

      admin.password = hash;

      let response = await admin.save();
      console.log(response);

      res.json({
        status: "1",
        message: "Password Changed Successfully",
        details: {
          admin: admin,
        },
      });
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: {
        error,
      },
    });
  }
};

const addCurrency = async (req, res) => {
  const { countryId, countryCode, plusPrice } = req.body;

  var olddata = await CountryModel.findOne({
    countrySortName: countryId,
    countryCode: countryCode,
  });

  if (olddata) {
    res.json({ message: "Currency details already added", status: "0" });
    return;
  }

  var data = await CountryModel.findOne({
    countrySortName: countryId,
  });

  if (!data) {
    res.json({ message: "Country Not Found", status: "0" });
    return;
  }

  console.log({ data });

  data.countryCode = countryCode;
  data.plusPrice = plusPrice;

  await data.save();

  res.json({
    message: "Currency Details Uploaded",
    status: "1",
    details: { newCurrency: data },
  });
};

const getCurrency = async (req, res) => {
  var data = await CountryModel.find({
    $and: [
      { countryCode: { $ne: undefined } },
      { countryCode: { $ne: "" } },
      { countryCode: { $ne: null } },
    ],
  });

  res.json({
    message: "List Found Successfully",
    status: "1",
    details: { list: data },
  });
};

const deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    let country = await CountryModel.findById(id);
    country.countryCode = "";
    country.plusPrice = "";
    await country.save();
    res.json({ message: "Currency Deleted successfully", status: "1" });
  } catch (error) {
    console.log(error);
    res.json({ message: "Server Error", status: "0" });
  }
};


const getUniqueCountries = async (req, res) => {
  let uniqueCountries = await SchoolNamesModel.find().distinct("country")
  let arr = []
  console.log({ uniqueCountries })
  for (let index = 0; index < uniqueCountries.length; index++) {
    const uniqueCountry = uniqueCountries[index];
    let response = await CountryModel.find({ countryId: uniqueCountry })
    if (response) {
      if (response.length == 0) continue;
      const docs = await DocsRequiredModel.findOne({ countryName: response[0]?.countryName.toLowerCase() })
      const docs2 = await EmbacyDocsModel.findOne({ countryName: response[0]?.countryName.toLowerCase() })
      var data = { ...response[0]._doc, "documents": docs ? docs.docsRequired : [], "embassyDocuments": docs2 ? docs2.docsRequired : [] }
      arr.push(data)
    }
  }
  res.json({
    status: "1",
    message: "Unique Countries Found",
    details: {
      countries: arr
    }
  })
}


const updateEmbassyDocument = async (req, res) => {
  const { status, reason, fileId, index } = req.body;

  let fileData = await EnrollModel.findOne({ _id: fileId })
  fileData.embassy_docs[index].document_status = status == "0" ? "UN_APPROVED" : "APPROVED"

  if (status == "0") {
    fileData.enroll_status = "FILE_LODGED_DOCS_REJECTED"
  }

  console.log({ reason })

  await fileData.save();

  res.json({
    status: "0",
    message: "Document Status Change"
  })
}

module.exports = {
  // ******* 14 March, 2023 ********
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  setNewPassword,
  // *******************************

  adminList,
  registerAdmin,
  verifyCode,
  schoolNamesList,
  countriesList,
  addSchoolname,
  addCountry,
  toggleFewSeatsStatus,
  getschoolnameidandcountrieslist,
  adminLogin,
  getStudents,
  getAgents,
  toggleStatus,
  uploadcsvdata,
  getSchools,
  getSchoolsPrograms,
  toggleIntakeStatus,
  updatePermissions,
  verifyToken,
  getAgentCounts,
  getNotifications,
  setWebPushToken,
  getAssessmentForms,
  getSearchQueryForms,
  updateCountry,
  updateSchoolName,
  deleteSchoolName,
  findIntakes,
  updateIntakes,
  getSingleSchool,
  getSingleProgram,
  getschoolnames,
  toggletopstatus,
  toggletopstatusschool,
  // topcolleges,
  // topuniversities,
  // topprograms,
  topcategorydata,
  getSingleProgramDetail,
  getSingleSchoolDetails,
  getDashboardCounts,
  getEnrollPrograms,
  updateEnrollStatus,
  updateStudentRemark,
  sendRemark,

  addCurrency,
  getCurrency,
  deleteCurrency,
  getUniqueCountries,
  updateEmbassyDocument,
};
