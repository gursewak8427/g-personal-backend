const StudentModel = require("../models/student");
const SchoolModel = require("../models/schools");
const EnrollModel = require("../models/enrolls");
const CountryModel = require("../models/country");

const AssessmentForm = require("../models/assessmentForm");
const QueriesForm = require("../models/queriesform");
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10;
const nodemailer = require("nodemailer");
const { sendConfirmationEmail } = require("../helper/sendConfirmationEmail");
const { ObjectId } = require("bson");

const { OAuth2Client } = require("google-auth-library");
const { response } = require("express");
const {
  sendForgotPasswordEmail,
} = require("../helper/sendForgotPasswordEmail");
const { default: axios } = require("axios");
const clientID = "101406365885572651064";
const client = new OAuth2Client(
  "274923150880-nekcgsfga504ohr2k2ccs6qpm3hdqoc0.apps.googleusercontent.com"
);
// clientSecret = "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"

const appendNotification = async (
  model,
  users,
  msg,
  url,
  body = "",
  userId = null
) => {
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

  if (userId) {
    var user = await model.findOne({ _id: userId });
  } else {
    var user = await model.findOne();
  }

  try {
    // let ENDPOINT = "https://learnglobal-backend.onrender.com/notification"
    let ENDPOINT = "http://localhost:3006/notification";

    console.log({ user });

    let token = [user.web_push_token];

    if (model == StudentModel) {
      token = [user.web_push_token, user.device_token];
    }

    console.log({ token });

    const response = await axios.post(ENDPOINT, {
      title: msg,
      body: body,
      token: token,
      redirectUrl: url,
    });

    console.log({ response });
  } catch (error) {
    console.log({ error1: error });
  }
};

const testNotification = async (req, res) => {
  let userId = req.body.userId;
  let msg = "Test Notification";
  let url = "https://learn-global.onrender.com/d/student";
  await appendNotification(StudentModel, [], msg, url, "", userId);
  res.json({ success: "1", message: "Test Notification Send" });
};

const appendHistory = async (model, userId, userRole, text) => {
  // get admin token
  try {
    let userData = await model.findById(userId);
    userData.history.push({
      text: text,
      created: Date.now(),
      action_created_by_user_id: userId,
      action_created_by_user_role: userRole,
    });
    await userData.save();

    return {
      status: "1",
      message: "History Added Successfully",
    };
  } catch (error) {
    console.log({ error });
    return {
      status: "0",
      message: "History added failed",
      details: {
        error: error,
      },
    };
  }
};

const verifyToken = async (req, res) => {
  const { userId } = req.userData;
  console.log({ userId });
  var userDetails = await StudentModel.findOne({ _id: userId });

  if (!userDetails) {
    res.json({
      status: "0",
      message: "User not found",
    });
    return;
  }

  if (req.body?.token) {
    userDetails.web_push_token = req.body.token;
  }

  await userDetails.save();

  // req.userData.permissions = userDetails.permissions;
  // req.userData.firstName = userDetails.first_name;
  // req.userData.notificationsCount = userDetails.notifications.length;

  // var totalAssessmentForms = await AssessmentForm.find({ status: "PENDING" })
  // var totalSearchQueryForms = await QueriesForm.find({ status: "PENDING" })

  req.userData.firstName = userDetails.first_name;
  req.userData.notificationsCount = userDetails.notifications.length;

  res.json({
    status: "1",
    message: "Verified and web push token saved successfully",
    details: {
        userData: req.userData,
        // totalAgentsUnapproved: totalAgentsUnapproved.length,
        // totalAssessmentForms: totalAssessmentForms.length,
        // totalSearchQueryForms: totalSearchQueryForms.length,
    }
  });
};

async function verifyGoogleAuthToken(token) {
  //   const fetch = await import("node-fetch");
  const res = await fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + token
  );
  return res.json();
}

const studentGoogleLogin = async (req, res) => {
  var myres = await verifyGoogleAuthToken(req.body.tokens.idToken);
  if (myres) {
    if (req.body.uid == myres.sub) {
      // check email is already register or not
      // yes
      // jwt amd login

      // no
      // register jwt and login
      let student = await StudentModel.findOne({ email: req.body.email });
      if (student) {
        // login now
        // generate jwt token

        if (student.loginProvider != "google") {
          res.json({
            status: "0",
            message: "You are not register with google",
          });
          return;
        }

        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          time: Date(),
          userId: student._id.toString(),
          email: student.email,
        };

        const token = jwt.sign(data, jwtSecretKey);

        res.json({
          status: "1",
          message: "Student Login Successfully",
          details: {
            token: token,
            student: {
              email: student.email,
              id: student._id,
            },
          },
        });
        return;
      } else {
        let student = new StudentModel({
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          phone: req.body.phone || "",
          loginProvider: req.body.loginProvider,
          googleId: req.body.uid,
          emailVerified: "VERIFIED",
          device_token: req.body?.deviceToken || "",
        });

        await student.save();

        // generate jwt token
        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          time: Date(),
          userId: student._id.toString(),
          email: student.email,
        };

        const token = jwt.sign(data, jwtSecretKey);

        res.json({
          status: "1",
          message: "Student Register Successfully",
          details: {
            token,
            student: {
              email: student.email,
              id: student._id,
            },
          },
        });
        return;
      }
      return;
    }

    res.json({
      status: "0",
      message: "Invalid Login",
    });
    return;
  }

  res.json({
    status: "0",
    message: "UID not found",
  });
};

const studentLogin = async (req, res) => {
  try {
    const { data, password } = req.body;
    console.log(req.body);
    let student = await StudentModel.findOne({
      $or: [{ phone: data }, { email: data }],
    });
    if (!student) {
      res.json({
        status: 0,
        message: "Student not exist",
      });
    } else {
      console.log({ password: student.password, password2: password });

      if (student.loginProvider == "google") {
        res.json({
          status: "0",
          message: "You account is associated with Google",
        });
        return;
      }

      bcrypt.compare(password, student.password, async function (err, result) {
        if (err) {
          console.log(err.message);
          res.json({
            status: 0,
            message: "Server error occured",
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

        // // now check email verification
        if (student.emailVerified == "UN_VERIFIED") {
          res.json({
            status: "0",
            message: "Please verify your email",
          });
          return;
        }

        // generate jwt token
        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          time: Date(),
          userId: student._id,
          email: student.email,
        };

        const token = jwt.sign(data, jwtSecretKey);

        if (req.body?.deviceToken) {
          student.device_token = req.body?.deviceToken || "";
        }

        await student.save();

        res.json({
          status: 1,
          message: "Student Login Successfully",
          details: {
            token: token,
            student: {
              email: student.email,
              id: student._id,
              emailVerified: student.emailVerified,
            },
          },
        });
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};

const studentRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || email == "") {
      res.json({
        status: "0",
        message: "Email is required",
      });
      return;
    }
    if (!phone || phone == "") {
      res.json({
        status: "0",
        message: "Phone is required",
      });
      return;
    }

    let student = await StudentModel.findOne({ $or: [{ phone }, { email }] });
    if (student) {
      let error = [];
      if (student.phone == phone) {
        error.push("phone");
      }
      if (student.email == email) {
        error.push("email");
      }
      res.json({
        status: "0",
        message: error.join(" and ") + " is already used",
      });
    } else {
      if (!password) {
        res.json({
          status: "0",
          message: "Password is required",
        });
        return;
      }
      bcrypt.hash(password, saltRounds, async function (err, hash) {
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

        if (password?.length < 6) {
          res.json({
            status: "0",
            name: "ValidationError",
            message: "Password must have minimum 6 characters",
          });
          return;
        }

        let student = new StudentModel({
          email,
          password: hash,
          firstName,
          lastName,
          phone,
          device_token: req.body?.deviceToken || "",
        });

        try {
          let response = await student.save();
          console.log(response);
        } catch (error) {
          if (error.name === "ValidationError") {
            let errorsData = {};
            Object.keys(error.errors).forEach((key) => {
              errorsData[key] = error.errors[key].message;
            });

            res.json({
              status: "0",
              name: "ValidationError",
              message: "Validation Error",
              details: { error: errorsData },
            });
            return;
          }

          console.log(error);
          return;
        }

        // generate jwt token
        let jwtSecretKey = process.env.JWT_SECRET_KEY;
        let data = {
          time: Date(),
          userId: student._id.toString(),
          email: student.email,
        };

        console.log("data");
        console.log(data);

        const token = jwt.sign(data, jwtSecretKey);
        // let ENDPOINT = "https://learnglobal-backend.onrender.com";
        let ENDPOINT = "http://localhost:3000";

        sendConfirmationEmail(firstName, email, token, ENDPOINT + "/d/student");

        let msg = `Student Register (${student.email})`;
        let url = `/d/admin/studentprofile?id=${student._id}`;
        await appendNotification(AdminModel, [], msg, url);
        let historyResponse = await appendHistory(
          StudentModel,
          student._id,
          "STUDENT",
          "Registration successful"
        );
        console.log({ historyResponse });

        res.json({
          status: "1",
          message: "Student Register Successfully",
          details: {
            student: {
              email: student.email,
              id: student._id,
            },
          },
        });
        return;
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};

const studentConfirmEmail = async (req, res) => {
  const { userId } = req.userData;
  console.log({ data: req.userData });

  try {
    await StudentModel.findByIdAndUpdate(userId, {
      emailVerified: "VERIFIED",
    });

    res.json({
      status: "1",
      message: "Email Verified Successfully",
      userId,
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

const resendEmail = async (req, res) => {
  fre;
  const { userId, email } = req.userData;
  console.log({ userId });
  let student = await StudentModel.findOne({ _id: userId });

  if (!student) {
    res.json({
      status: "0",
      message: "Student Not Found",
    });
    return;
  }

  // generate jwt token
  let jwtSecretKey = process.env.JWT_SECRET_KEY;
  let data = {
    time: Date(),
    userId: userId,
    email: student.email,
  };

  const token = jwt.sign(data, jwtSecretKey);
  // let ENDPOINT = "https://learnglobal-backend.onrender.com";
  let ENDPOINT = "http://localhost:3000";

  sendConfirmationEmail(
    student.firstName,
    student.email,
    token,
    ENDPOINT + "/d/student"
  );
  console.log("Email sending...");
  res.json({
    status: "1",
    message: "Confirmation Email send successfully",
    details: {
      email: student.email,
    },
  });
};

const getEmailVerification = async (req, res) => {
  const { userId } = req.userData;
  let student = await StudentModel.findOne({ _id: userId });

  if (!student) {
    res.json({
      status: "0",
      message: "Student Not Found",
    });
    return;
  }

  if (student.emailVerified == "VERIFIED") {
    res.json({
      status: "1",
      message: "Email is verified",
      details: {
        student: student,
      },
    });
  } else {
    res.json({
      status: "0",
      message: "Email is not verified",
      student: student,
    });
  }
};

const studentSearch = async (req, res) => {
  var perPage = 10;
  var currentPage = parseInt(req.query.page);
  if (!currentPage) currentPage = 1;

  const {
    highest_education,
    country_to_go,
    exam,
    new_stream,
    grade_score,
    school_type,
    fees,
  } = req.body;
  var highest_education_new = highest_education;
  if (highest_education == "secondary") {
    highest_education_new = "Graduate";
  }
  if (highest_education == "certificate") {
    highest_education_new = "Graduate";
  }
  if (highest_education == "diploma") {
    highest_education_new = "Graduate";
  }
  if (highest_education == "advance_diploma") {
    highest_education_new = "Graduate";
  }
  if (highest_education == "3_year_bachlor") {
    highest_education_new = "Undergraduate";
  }
  if (highest_education == "4_year_bachlor") {
    highest_education_new = "Undergraduate";
  }
  if (highest_education == "postgraduate_diploma") {
    highest_education_new = "Undergraduate";
  }
  if (highest_education == "master") {
    highest_education_new = "Undergraduate";
  }
  if (highest_education == "doctrate") {
    highest_education_new = "Undergraduate";
  }

  var examdata = {};
  if (exam.type == "IELTS") {
    var overall;
    var scoreArr = exam.score;
    var m1 = scoreArr[0];
    var m2 = scoreArr[1];
    var m3 = scoreArr[2];
    var m4 = scoreArr[3];

    var scoreSum = scoreArr.reduce((prev, curr) => {
      return prev + curr;
    }, 0);
    var scoreAvg = scoreSum / scoreArr.length;

    overall = Math.round(scoreAvg / 0.5) * 0.5;
    examdata = {
      $or: [
        { "school_programs.overall_band": { $lt: overall } },
        { "school_programs.overall_band": { $eq: overall } },
      ],
    };

    // minimum band
    var mymin = exam.score.reduce((prev, curr) => {
      return curr < prev ? curr : prev;
    });
    var overallCheckingArr = exam.score.filter((item) => item != mymin);
    var mymodule = exam.score.reduce((prev, curr) => {
      return curr == mymin ? prev + 1 : prev;
    }, 0);
    var newquery = overallCheckingArr.map((item) => {
      return {
        $or: [
          { "school_programs.overall_band": { $lt: item } },
          { "school_programs.overall_band": { $eq: item } },
        ],
      };
    });
    if (overallCheckingArr.length != 0) {
      newquery = { $and: [...newquery] };
    } else {
      newquery = {};
    }
  } else if (exam.type == "PTE") {
    examdata = {
      $or: [
        { "school_programs.pte_score": { $lt: parseFloat(exam.score) } },
        { "school_programs.pte_score": { $eq: parseFloat(exam.score) } },
      ],
    };
  } else if (exam.type == "TOFEL") {
    examdata = {
      $or: [
        { "school_programs.tofel_point": { $lt: parseFloat(exam.score) } },
        { "school_programs.tofel_point": { $eq: parseFloat(exam.score) } },
      ],
    };
  }

  // if (mymin < 6 && mymodule < 4) {
  //     var accpetanceQuery = []
  // } else {
  //     var accpetanceQuery = []
  // }

  // console.log({ overall, skip: (currentPage - 1) * perPage, currentPage, perPage });

  // var newtotalData = await SchoolNamesModel

  if (country_to_go || country_to_go != "") {
    var countryDtl = await CountryModel.findOne({ countryId: country_to_go });
    var countryName = countryDtl.countryName;
  }

  var totalData = await SchoolModel.aggregate([
    {
      $unwind: {
        path: "$school_programs",
      },
    },
    {
      $match: {
        country: countryName ? countryName : "",
        $and: [
          new_stream && new_stream.length != 0
            ? {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          "$school_programs.new_stream",
                          new_stream,
                        ],
                      },
                    },
                    0,
                  ],
                },
              }
            : {},
          highest_education_new && highest_education_new != ""
            ? {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          "$school_programs.program_level",
                          [highest_education_new],
                        ],
                      },
                    },
                    0,
                  ],
                },
              }
            : {},
          { ...examdata },
          mymin < 6 && mymodule < 4
            ? {
                $or: [
                  { "school_programs.acceptable_band": { $lt: mymin } },
                  { "school_programs.acceptable_band": { $eq: mymin } },
                ],
                $or: [
                  { "school_programs.module": { $gt: mymodule } },
                  { "school_programs.module": { $eq: mymodule } },
                ],
              }
            : {},
          school_type ? { type: { $regex: school_type, $options: "i" } } : {},
          fees
            ? {
                $or: [
                  {
                    $and: [
                      {
                        "school_programs.min_tution_fee_per_semester": {
                          $lte: parseFloat(fees.min || 0),
                        },
                      },
                      {
                        "school_programs.max_tution_fee": {
                          $gte: parseFloat(fees.min || 0),
                        },
                      },
                    ],
                  },
                  fees.max
                    ? {
                        $and: [
                          {
                            "school_programs.min_tution_fee_per_semester": {
                              $lte: parseFloat(fees.max || 100000000),
                            },
                          },
                          {
                            "school_programs.max_tution_fee": {
                              $gte: parseFloat(fees.max || 100000000),
                            },
                          },
                        ],
                      }
                    : {},
                ],
              }
            : {},
          grade_score || parseFloat(grade_score) == 0
            ? {
                $or: [
                  {
                    "school_programs.grade_score": {
                      $lt: parseFloat(grade_score),
                    },
                  },
                  {
                    "school_programs.grade_score": {
                      $eq: parseFloat(grade_score),
                    },
                  },
                ],
              }
            : {},
        ],
      },
    },
    {
      $group: {
        _id: "$_id",
        school_name: { $first: "$school_name" },
        school_about: { $first: "$school_about" },
        school_location: { $first: "$school_location" },
        country: { $first: "$country" },
        state: { $first: "$state" },
        city: { $first: "$city" },
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
            visa_processing_days: "$school_programs.visa_processing_days",
            process_days: "$school_programs.process_days",
            program_level: "$school_programs.program_level",
            credentials: "$school_programs.credentials",
            other_comment: "$school_programs.other_comment",
            foundation_fee: "$school_programs.foundation_fee",
            acceptable_band: "$school_programs.acceptable_band",
            module: "$school_programs.module",
            english_language: "$school_programs.english_language",
            program_sort_order: "$school_programs.program_sort_order",
            few_seats_status: "$school_programs.few_seats_status",
          },
        },
      },
    },
    { $skip: (currentPage - 1) * perPage },
    { $limit: perPage },
  ]);

  var totalData_all = await SchoolModel.aggregate([
    {
      $unwind: {
        path: "$school_programs",
      },
    },
    {
      $match: {
        country: countryName ? countryName : "",
        $and: [
          new_stream && new_stream.length != 0
            ? {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          "$school_programs.new_stream",
                          new_stream,
                        ],
                      },
                    },
                    0,
                  ],
                },
              }
            : {},
          highest_education_new && highest_education_new != ""
            ? {
                $expr: {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: [
                          "$school_programs.program_level",
                          [highest_education_new],
                        ],
                      },
                    },
                    0,
                  ],
                },
              }
            : {},
          { ...examdata },
          mymin < 6 && mymodule < 4
            ? {
                $or: [
                  { "school_programs.acceptable_band": { $lt: mymin } },
                  { "school_programs.acceptable_band": { $eq: mymin } },
                ],
                $or: [
                  { "school_programs.module": { $gt: mymodule } },
                  { "school_programs.module": { $eq: mymodule } },
                ],
              }
            : {},
          school_type ? { type: { $regex: school_type, $options: "i" } } : {},
          fees
            ? {
                $or: [
                  {
                    $and: [
                      {
                        "school_programs.min_tution_fee_per_semester": {
                          $lte: parseFloat(fees.min || 0),
                        },
                      },
                      {
                        "school_programs.max_tution_fee": {
                          $gte: parseFloat(fees.min || 0),
                        },
                      },
                    ],
                  },
                  fees.max
                    ? {
                        $and: [
                          {
                            "school_programs.min_tution_fee_per_semester": {
                              $lte: parseFloat(fees.max || 100000000),
                            },
                          },
                          {
                            "school_programs.max_tution_fee": {
                              $gte: parseFloat(fees.max || 100000000),
                            },
                          },
                        ],
                      }
                    : {},
                ],
                // [
                // { $and: [{ 'school_programs.min_tution_fee_per_semester': { $lt: parseFloat(fees.min) } }, { 'school_programs.min_tution_fee_per_semester': { $eq: parseFloat(fees.min) } }] },
                // { $and: [{ 'school_programs.max_tution_fee': { $qt: parseFloat(fees.max) } }, { 'school_programs.max_tution_fee': { $eq: parseFloat(fees.max) } }] }
                // ]
              }
            : {},
          grade_score || parseFloat(grade_score) == 0
            ? {
                $or: [
                  {
                    "school_programs.grade_score": {
                      $lt: parseFloat(grade_score),
                    },
                  },
                  {
                    "school_programs.grade_score": {
                      $eq: parseFloat(grade_score),
                    },
                  },
                ],
              }
            : {},
        ],
      },
    },
    {
      $group: {
        _id: "$_id",
        school_name: { $first: "$school_name" },
        school_about: { $first: "$school_about" },
        school_location: { $first: "$school_location" },
        country: { $first: "$country" },
        state: { $first: "$state" },
        city: { $first: "$city" },
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
            visa_processing_days: "$school_programs.visa_processing_days",
            process_days: "$school_programs.process_days",
            program_level: "$school_programs.program_level",
            credentials: "$school_programs.credentials",
            other_comment: "$school_programs.other_comment",
            foundation_fee: "$school_programs.foundation_fee",
            acceptable_band: "$school_programs.acceptable_band",
            module: "$school_programs.module",
            english_language: "$school_programs.english_language",
            program_sort_order: "$school_programs.program_sort_order",
            few_seats_status: "$school_programs.few_seats_status",
          },
        },
      },
    },
  ]);

  var totalSchools = totalData_all.length;
  var totalPrograms = totalData_all.reduce((prev, curr) => {
    return prev + curr.school_programs.length;
  }, 0);
  var noMore = totalData.length < perPage ? true : false;
  res.json({
    status: "1",
    message: "Data find successfully",
    details: {
      schools: totalData,
      totalSchools,
      totalPrograms,
      noMore,
    },
  });
};
const getNotifications = async (req, res) => {
  console.log(req.userData);
  const { userId } = req.userData;

  const adminData = await StudentModel.findById(userId);

  res.json({
    status: "1",
    message: "Notifications get successfully",
    details: {
      notifications: adminData.notifications.reverse(),
      unseenNotifications: adminData.unseenNotifications,
    },
  });
};
const getHistory = async (req, res) => {
  console.log(req.userData);
  if (req.userData.role == "ADMIN") {
    var userId = req.query.id;
    var adminId = req.userData.userId;
  } else {
    var { userId } = req.userData;
  }

  const studentdata = await StudentModel.findById(userId);

  // const studentdata = await StudentModel.aggregate([
  //     {
  //         $match: {
  //             _id: ObjectId(userId)
  //         }
  //     },
  //     {
  //         $lookup: {
  //             from: "students",
  //             localField: "action_created_by_user_id",
  //             foreignField: "_id",
  //             as: "user"
  //         }
  //     },
  //     {
  //         $addFields: {
  //             user: {
  //                 $cond: {
  //                     if: { $eq: ["$action_created_by_user_role", "STUDENT"] },
  //                     then: { $arrayElemAt: ["$user", 0] },
  //                     else: null
  //                 }
  //             }
  //         }
  //     },
  //     {
  //         $lookup: {
  //             from: "admins",
  //             localField: "action_created_by_user_id",
  //             foreignField: "_id",
  //             as: "admin"
  //         }
  //     },
  //     {
  //         $addFields: {
  //             user: {
  //                 $cond: {
  //                     if: { $eq: ["$action_created_by_user_role", "ADMIN"] },
  //                     then: { $arrayElemAt: ["$admin", 0] },
  //                     else: "$user"
  //                 }
  //             }
  //         }
  //     },
  // ])

  // let historyArr = studentdata.history

  res.json({
    status: "1",
    message: "History get successfully",
    details: {
      history: studentdata.history.reverse(),
    },
  });
};

const enrollProgram = async (req, res) => {
  const { school_id, program_id } = req.body;
  var student_id = req.userData.userId;

  // get student details
  let student = await StudentModel.findOne({ _id: student_id });
  if (!student) {
    res.json({
      status: "0",
      message: "Student not found",
    });
    return;
  }

  // get program details
  let program = await SchoolModel.aggregate([
    {
      $match: {
        _id: ObjectId(school_id),
      },
    },
    {
      $unwind: {
        path: "$school_programs",
      },
    },
    {
      $match: {
        "school_programs.program_id": program_id,
      },
    },
    {
      $group: {
        _id: "$_id",
        school_name: { $first: "$school_name" },
        school_about: { $first: "$school_about" },
        school_location: { $first: "$school_location" },
        country: { $first: "$country" },
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
        program_details: {
          $first: {
            program_id: "$school_programs.program_id",
            program_name: "$school_programs.program_name",
            description: "$school_programs.description",
            duration: "$school_programs.duration",
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
            cost_of_living: "$school_programs.cost_of_living",
            currency: "$school_programs.currency",
            acceptance_letter: "$school_programs.acceptance_letter",
            intake_id: "$school_programs.intake_id",
            visa_processing_days: "$school_programs.visa_processing_days",
            process_days: "$school_programs.process_days",
            program_level: "$school_programs.program_level",
            other_comment: "$school_programs.other_comment",
            foundation_fee: "$school_programs.foundation_fee",
            acceptable_band: "$school_programs.acceptable_band",
            module: "$school_programs.module",
            english_language: "$school_programs.english_language",
            program_sort_order: "$school_programs.program_sort_order",
            few_seats_status: "$school_programs.few_seats_status",
          },
        },
      },
    },
  ]);

  if (program.length == 0) {
    res.json({
      status: "0",
      message: "Program or School is not found",
    });
    return;
  }

  if (!student) {
    res.json({
      status: "0",
      message: "Student not found",
    });
    return;
  }

  // check already enrolled program
  var enrollDetails = await EnrollModel.findOne({
    student_id: ObjectId(student_id),
    school_id: ObjectId(school_id),
    program_id,
  });

  if (enrollDetails) {
    var program_a = program[0].program_details;
    delete program[0].program_details;
    var program_b = program[0];

    res.json({
      status: "0",
      message: "You already enrolled this program",
      details: {
        ...enrollDetails._doc,
        school: program_b,
        program: program_a,
      },
    });
    return;
  }

  console.log({
    student_id: student_id,
    school_id: school_id,
    program_id: program_id,
    enroll_status: "PENDING",
  });

  let newEnroll = new EnrollModel({
    student_id: ObjectId(student_id),
    school_id: ObjectId(school_id),
    program_id: program_id,
    enroll_status: "PENDING",
  });

  try {
    await newEnroll.save();

    let msg =
      program[0].program_details.program_name +
      " Program enrolled by " +
      student.email;
    let url = `/d/admin/enroll/${newEnroll._id}`;
    await appendNotification(AdminModel, ["ADMIN"], msg, url); // last parameter body is optionally

    let text =
      "Program " +
      program[0].program_details.program_name +
      " Enrolled Successfully";
    let userRole = "STUDENT";
    await appendHistory(StudentModel, student_id, userRole, text);

    res.json({
      status: "1",
      message: "Enrolled Successfully",
      details: {
        enroll_details: newEnroll,
      },
    });
  } catch (error) {
    console.log({ error: error.message });
    res.json({
      status: "0",
      message: "Validation Error",
      details: { error },
    });
  }
};

const getEnrollPrograms = async (req, res) => {
  const student_id = req.userData.userId;
  const protocol = req.protocol;
  const host = req.hostname;
  const url = req.originalUrl;
  const port = process.env.PORT || 3006;

  const fullUrl = `${protocol}://${host}:${port}`;
  // get enrolledList details
  let enrolledList = await EnrollModel.aggregate([
    {
      $match: {
        student_id: ObjectId(student_id),
      },
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
        from: "schoolnames",
        localField: "school_details.school_name",
        foreignField: "schoolName",
        as: "school_details.school_meta_details",
      },
    },
    {
      $unwind: {
        path: "$school_details.school_meta_details",
      },
    },
  ]);

  res.json({
    status: "1",
    message: "Enrolled Programs details found",
    details: {
      enrolled_list: enrolledList,
      baseUrl: fullUrl + "/uploads/agent/",
    },
  });
};

const uploadDocument = async (req, res) => {
  try {
    const { userId } = req.userData;
    console.log(req.body);
    console.log(req.file);
    var student = await StudentModel.findOne({ _id: userId });
    student.documents.push({
      document_title: req.body.title,
      document_url: req.file.filename,
    });

    let text = req.body.title + " Document Uploaded";
    let userRole = "STUDENT";
    await appendHistory(StudentModel, userId, userRole, text);

    student.save();

    res.json({
      status: "1",
      message: "Student Document Upload Successfully",
      details: {
        document: {
          document_title: req.body.title,
          document_url: req.file.filename,
        },
      },
    });
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Student Document Uploaded Failed",
      details: {
        error,
      },
    });
  }
};

const submitAllDocs = async (req, res) => {
  const { userId } = req.userData;

  var student = await StudentModel.findOne({ _id: userId });
  student.status = "IN_PROCESS";
  await student.save();
  let msg = "Documents uploaded by the user " + student.email;
  let url = `/d/admin/studentprofile?id=${userId}&tab=documents`;
  await appendNotification(AdminModel, ["ADMIN"], msg, url); // last parameter body is optionally

  let text = "Submit All Documents";
  let userRole = "STUDENT";
  await appendHistory(StudentModel, userId, userRole, text);

  res.json({
    status: "1",
    message: "All Documents Submitted Successfully",
  });
};

const getDocuments = async (req, res) => {
  try {
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 3006;

    const fullUrl = `${protocol}://${host}:${port}`;

    const { userId } = req.userData;
    var student = await StudentModel.findOne({ _id: userId });

    res.json({
      status: "1",
      message: "Document Fetched",
      details: {
        documents: student.documents,
        student: student,
        baseUrl: fullUrl + "/uploads/student/",
      },
    });
  } catch (error) {
    res.json({
      status: "0",
      message: "Student Document Uploaded Failed",
      details: {
        error,
      },
    });
  }
};

const studentUpdate = async (req, res) => {
  try {
    if (req.userData.role == "ADMIN") {
      var userId = req.query.id;
      var adminId = req.userData.userId;
    } else {
      var { userId } = req.userData;
    }
    console.log(Object.keys(req.body).length);
    if (Object.keys(req.body).length == 0) {
      res.json({
        status: "0",
        message: "Nothing to Update",
      });
      return;
    }

    const attributesAllowed = [
      "firstName",
      "lastName",
      "documents",
      "doc_title",
      "reason",
    ];

    let notAllowedkeys = Object.keys(req.body).filter(
      (key) => !attributesAllowed.includes(key)
    );

    if (notAllowedkeys.length != 0) {
      res.json({
        status: "0",
        message: "Unknown fields pass",
        details: { unknown_keys: notAllowedkeys },
      });
      return;
    }

    let student = await StudentModel.findOne({ _id: userId });
    if (!student) {
      res.json({
        status: "0",
        message: "Student not found.",
      });
    } else {
      let changes = false;
      for (let index = 0; index < Object.keys(req.body).length; index++) {
        const key = Object.keys(req.body)[index];
        console.log([student[key], req.body[key]]);
        if (student[key] != req.body[key]) {
          changes = true;
        }
      }

      if (changes == false) {
        res.json({
          status: "0",
          message: "Nothing to Update",
        });
        return;
      }

      var studentdata = await StudentModel.updateOne(
        { _id: userId },
        { $set: req.body }
      );

      if (req.body.documents) {
        let adminDataForHistory = await AdminModel.findOne({ _id: adminId });
        if (!adminDataForHistory) {
          console.log(
            "Admin not found in doument status change api from admin panel in the student.controller-update-profile api"
          );
        }

        // notification
        if (req.body?.reason) {
          console.log(req.body.reason);
          var msg =
            "Your Document " +
            req.body.doc_title +
            " is Declined because of " +
            req.body.reason +
            " by " +
            adminDataForHistory.email;
          var msg_history =
            "Document " +
            req.body.doc_title +
            " is Declined because of " +
            req.body.reason +
            " by " +
            adminDataForHistory.email;
        } else {
          var msg =
            "Your Document " +
            req.body.doc_title +
            " is Approved by " +
            adminDataForHistory.email;
          var msg_history =
            "Document " +
            req.body.doc_title +
            " is Approved by " +
            adminDataForHistory.email;
        }
        var url = "/d/student/documents";
        console.log({ msg });
        await appendNotification(StudentModel, [], msg, url);
        await appendHistory(StudentModel, userId, "ADMIN", msg_history);
      } else {
        // pending.... Need to think more
        // let msg = `Student - ${student.email} Update Profile`
        // let url = "/d/admin/agentProfile?id=" + agent._id
        // await appendNotification(Pro, ["ADMIN", "SUBADMIN"], msg, url)
      }

      try {
        // await studentdata.save();
      } catch (error) {
        if (error.name === "ValidationError") {
          let errorsData = {};
          Object.keys(error.errors).forEach((key) => {
            errorsData[key] = error.errors[key].message;
          });

          res.json({
            status: "0",
            name: "ValidationError",
            message: "Validation Error",
            details: { error: errorsData },
          });
          return;
        }

        console.log(error);
        return;
      }

      res.json({
        status: "1",
        message: "Update Successfully",
        details: {
          documentsUpdate: studentdata.modifiedCount,
          fieldsUpdate: Object.keys(req.body),
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};
const studentProfile = async (req, res) => {
  try {
    if (req.userData.role == "ADMIN") {
      var userId = req.query.id;
    } else {
      var { userId } = req.userData;
    }
    let student = await StudentModel.findOne({ _id: userId });
    if (!student) {
      res.json({
        status: "0",
        message: "Student Not Found",
      });
    } else {
      res.json({
        status: "1",
        message: "Profile Fetch Successfully",
        details: {
          student,
          baseUrl: "https://learnglobal-backend.onrender.com",
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};

const fillAssessmentForm = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      destination_country,
      aggree_to_privacy_policy,
    } = req.body;

    let form = await AssessmentForm.findOne({
      // first_name: firstName,
      // last_name: lastName,
      email: email,
      phone: phone,
      destination_country,
      // aggree_to_privacy_policy,
      // created: Date.now(),
    });

    // get Country Names with ID
    // let destination_country_name = await CountryModel.findOne({ countryId: destination_country })

    if (!form) {
      let newForm = new AssessmentForm({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        destination_country,
        aggree_to_privacy_policy,
        created: Date.now(),
      });

      try {
        let response = await newForm.save();
        console.log(response);

        let msg = `Assessment form filled by ${firstName}`;
        let url = `/d/admin/assessmentforms`;
        await appendNotification(AdminModel, ["ADMIN", "SUBADMIN"], msg, url);
      } catch (error) {
        if (error.name === "ValidationError") {
          let errorsData = {};
          Object.keys(error.errors).forEach((key) => {
            errorsData[key] = error.errors[key].message;
          });

          res.json({
            status: "0",
            name: "ValidationError",
            message: "Validation Error",
            details: { error: errorsData },
          });
          return;
        }

        console.log(error);
        return;
      }

      // let msg = `Student Register (${student.email})`
      // let url = `/d/admin/studentprofile?id=${student._id}`
      // await appendNotification(AdminModel, [], msg, url)

      res.json({
        status: "1",
        message: "Assessment Form Filled Successfully",
      });
    } else {
      res.json({
        status: "1",
        message: "Assessment Form Filled Successfully",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "0",
      message: "Server Error Occured",
      details: { error },
    });
  }
};

const fillsearchqueries = async (req, res) => {
  try {
    const {
      nationality,
      highesteducation,
      grading_scheme,
      grade_avg,
      fullname,
      phone,
      email,
      destination_country,
      examType,
      scores,
    } = req.body;

    // get Country Names with ID
    let countryNationality = await CountryModel.findOne({
      countryId: nationality,
    });
    let countryDestination = await CountryModel.findOne({
      countryId: destination_country,
    });

    let form = await QueriesForm.findOne({
      // first_name: firstName,
      nationality: countryNationality.countryName,
      highesteducation,
      grading_scheme,
      grade_avg,
      phone,
      email,
      // fullname,
      // created: Date.now(),
    });

    if (!form) {
      if (examType == "IELTS") {
        var overall;
        var scoreArr = scores;

        var scoreSum = scoreArr.reduce((prev, curr) => {
          return prev + curr;
        }, 0);
        var scoreAvg = scoreSum / scoreArr.length;

        var overall = Math.round(scoreAvg / 0.5) * 0.5;
      }

      let newForm = new QueriesForm({
        nationality: countryNationality.countryName,
        highesteducation,
        grading_scheme,
        grade_avg,
        phone,
        email,
        fullname,
        destination_country: countryDestination.countryName,
        examType,
        scores,
        overall_score: overall ? overall : 0,
        created: Date.now(),
      });

      try {
        let response = await newForm.save();

        let msg = `Search Query Received`;
        let url = `/d/admin/serachqueries`;
        await appendNotification(AdminModel, ["ADMIN", "SUBADMIN"], msg, url);

        console.log(response);
      } catch (error) {
        if (error.name === "ValidationError") {
          let errorsData = {};
          Object.keys(error.errors).forEach((key) => {
            errorsData[key] = error.errors[key].message;
          });

          res.json({
            status: "0",
            name: "ValidationError",
            message: "Validation Error",
            details: { error: errorsData },
          });
          return;
        }

        console.log(error);
        return;
      }

      // let msg = `Student Register (${student.email})`
      // let url = `/d/admin/studentprofile?id=${student._id}`
      // await appendNotification(AdminModel, [], msg, url)

      res.json({
        status: "1",
        message: "Query Form Filled Successfully",
      });
    } else {
      return {
        status: "1",
        message: "Query Form Filled Successfully",
      };
    }
  } catch (error) {
    console.log(error);
    return error;
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let student = await StudentModel.findOne({
      email,
    });

    if (!student) {
      res.json({
        status: "0",
        message: "Email not found",
      });
      return;
    }

    if (student.loginProvider == "google") {
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

    const fullUrl = `${protocol}://${host}:${port}`;

    // generate jwt token
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let data = {
      time: Date(),
      userId: student._id,
      email: student.email,
    };

    const token = jwt.sign(data, jwtSecretKey);

    // let ENDPOINT = "https://learn-global.onrender.com"
    let ENDPOINT = "http://localhost:3006";

    await sendForgotPasswordEmail(
      student.firstName,
      student.email,
      token,
      `${ENDPOINT}/d/student`
    );

    res.json({
      status: "1",
      message: "Forgot Password Email send successfully",
      details: {
        email: student.email,
      },
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

const setNewPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { userId, email } = req.userData;

    console.log({
      newPassword,
      data: req.userData,
    });

    if (newPassword?.length < 6) {
      res.json({
        status: "0",
        name: "ValidationError",
        message: "Password must have minimum 6 characters",
      });
      return;
    }

    let student = await StudentModel.findOne({
      _id: userId,
    });

    if (!student) {
      res.json({
        status: "0",
        message: "Student Not Found",
      });
      return;
    }

    if (student.email != email) {
      res.json({
        status: "0",
        message: "Invalid Email",
        details: {
          error: `User find with id ${userId} have different email ${student.email} to ${email}`,
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

      student.password = hash;

      let response = await student.save();
      console.log(response);

      res.json({
        status: "1",
        message: "Password Changed Successfully",
        details: {
          student: student,
        },
      });
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

const approveProfile = async (req, res) => {
  if (req.userData.role == "ADMIN") {
    var userId = req.query.id;
  } else {
    var { userId } = req.userData;
  }
  let student = await StudentModel.findById(userId);
  if (!student) {
    res.json({
      status: "0",
      message: "Student Not Found",
    });
    return;
  }

  if (student.status == "IN_PROCESS") {
    student.status = "APPROVED";
    var msg = "Your profile was approved successfully";
    var message = "Profile Approved Successfully";
  } else {
    student.status = "IN_PROCESS";
    var msg = "Your profile was switched to In-Process";
    var message = "Profile Switched to In-Process Successfully";
  }
  await student.save();

  var url = `/d/student/`;

  await appendNotification(StudentModel, [], msg, url, "", userId);

  res.json({
    status: "1",
    message,
  });
};

const setRemark = async (req, res) => {
  // Sender ID get from token
  let senderId = req.userData.userId;
  let { userId, text } = req.body;

  // get admin token
  try {
    // get Sender Details
    let senderData = await AdminModel.findById(senderId);

    let userData = await StudentModel.findById(userId);
    userData.remarks.push({
      text: text,
      created: Date.now(),
      user_details: senderData,
    });
    await userData.save();

    res.json({
      status: "1",
      message: "Remark Added Successfully",
      details: {
        newRemark: {
          text: text,
          created: Date.now(),
          user_details: senderData,
        },
      },
    });
  } catch (error) {
    console.log({ error });
    res.json({
      status: "0",
      message: "Remark added failed",
      details: {
        error: error,
      },
    });
  }
};

const getRemarks = async (req, res) => {
  if (req.userData.role == "ADMIN") {
    var userId = req.query.id;
  } else {
    var { userId } = req.userData;
  }
  let student = await StudentModel.findOne({ _id: userId });
  if (!student) {
    res.json({
      status: "0",
      message: "Student Not Found",
    });
  } else {
    res.json({
      status: "1",
      message: "Remark Fetched Successfully",
      details: {
        remarks: student.remarks.reverse(),
      },
    });
  }
};

module.exports = {
  fillAssessmentForm,
  studentUpdate,
  studentProfile,
  getDocuments,
  uploadDocument,
  getEnrollPrograms,
  studentGoogleLogin,
  studentLogin,
  studentRegister,
  studentConfirmEmail,
  resendEmail,
  getEmailVerification,
  studentSearch,
  enrollProgram,
  fillsearchqueries,
  forgotPassword,
  setNewPassword,
  submitAllDocs,
  testNotification,
  verifyToken,
  approveProfile,
  getNotifications,
  getHistory,
  setRemark,
  getRemarks,
};
