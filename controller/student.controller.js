const StudentModel = require("../models/student")
const SchoolModel = require("../models/schools")
const fs = require('fs');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10
const nodemailer = require("nodemailer");
const { sendConfirmationEmail } = require("../helper/sendConfirmationEmail");

const studentLogin = async (req, res) => {
    try {
        const { data, password } = req.body;
        let student = await StudentModel.findOne({ $or: [{ phone: data }, { email: data }] })
        if (!student) {
            res.json({
                status: 0,
                message: "Phone number is not exist",
                details: {
                    error: "Student phone number is wrong"
                }
            })
        } else {
            bcrypt.compare(password, student.password, function (err, result) {
                if (err) {
                    res.json({
                        status: 0,
                        message: "Server error occured",
                        details: {
                            error: err
                        }
                    })
                    return;
                }


                if (!result) {
                    res.json({
                        status: "0",
                        message: "Password is wrong",
                    })
                    return;
                }

                // // now check email verification
                // if (student.emailVerified == "UN_VERIFIED") {
                //     res.json({
                //         status: "0",
                //         message: "Please confirm your email",
                //     })
                //     return;
                // }

                // generate jwt token
                let jwtSecretKey = process.env.JWT_SECRET_KEY;
                let data = {
                    time: Date(),
                    userId: student._id,
                    email: student.email,
                }

                const token = jwt.sign(data, jwtSecretKey);

                res.json({
                    status: 1,
                    message: "Student Login Successfully",
                    details: {
                        token: token,
                        student: {
                            email: student.email,
                            id: student._id,
                            emailVerified: student.emailVerified
                        }
                    }
                })

            });
        }


    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

const studentRegister = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;

        if (!email || email == "") {
            res.json({
                status: "0",
                message: "Email is required",
            })
            return;
        }
        if (!phone || phone == "") {
            res.json({
                status: "0",
                message: "Phone is required",
            })
            return;
        }

        let student = await StudentModel.findOne({ $or: [{ phone }, { email }] })
        if (student) {
            let error = []
            if (student.phone == phone) {
                error.push("phone")
            }
            if (student.email == email) {
                error.push("email")
            }
            res.json({
                status: "0",
                message: error.join(" and ") + " is already used",
            })
        } else {
            if (!password) {
                res.json({
                    status: "0",
                    message: "Password is required",
                })
                return;
            }
            bcrypt.hash(password, saltRounds, async function (err, hash) {
                // Store hash in your password DB.
                if (err) {
                    res.json({
                        status: "0",
                        message: "Server error occured",
                        details: {
                            error: err
                        }
                    })
                    return;
                }

                if (password?.length < 6) {
                    res.json({
                        status: "0",
                        name: "ValidationError",
                        message: "Password must have minimum 6 characters",
                    })
                    return;
                }

                let student = new StudentModel({
                    email,
                    password: hash,
                    firstName, lastName, phone
                })

                try {

                    let response = await student.save();
                    console.log(response)

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
                            details: { error: errorsData }
                        })
                        return;

                    }

                    console.log(error)
                    return;
                }



                // generate jwt token
                let jwtSecretKey = process.env.JWT_SECRET_KEY;
                let data = {
                    time: Date(),
                    userId: student._id.toString(),
                    email: student.email,
                }

                console.log("data")
                console.log(data)

                const token = jwt.sign(data, jwtSecretKey);

                sendConfirmationEmail(firstName, email, token, "http://localhost:3000/student");

                res.json({
                    status: "1",
                    message: "Student Register Successfully",
                    details: {
                        student: {
                            email: student.email,
                            id: student._id
                        }
                    }
                })
                return;
            });

        }


    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

const studentConfirmEmail = async (req, res) => {
    const { userId } = req.userData
    console.log({ data: req.userData })

    try {
        await StudentModel.findByIdAndUpdate(userId, {
            emailVerified: "VERIFIED",
        })

        res.json({
            status: "1",
            message: "Email Verified Successfully",
            userId
        })
    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }

}

const resendEmail = async (req, res) => {
    const { userId, email } = req.userData;
    console.log({ userId })
    let student = await StudentModel.findOne({ _id: userId })

    if (!student) {
        res.json({
            status: "0",
            message: "Student Not Found",
        })
        return;
    }

    // generate jwt token
    let jwtSecretKey = process.env.JWT_SECRET_KEY;
    let data = {
        time: Date(),
        userId: userId,
        email: student.email,
    }

    const token = jwt.sign(data, jwtSecretKey);

    sendConfirmationEmail(student.firstName, student.email, token, "http://localhost:3000/student");
    console.log("Email sending...")
    res.json({
        status: "1",
        message: "Confirmation Email send successfully",
        details: {
            email: student.email
        }
    })
}

const getEmailVerification = async (req, res) => {
    const { userId } = req.userData;
    let student = await StudentModel.findOne({ _id: userId })

    if (!student) {
        res.json({
            status: "0",
            message: "Student Not Found",
        })
        return;
    }

    if (student.emailVerified == "VERIFIED") {
        res.json({
            status: "1",
            message: "Email is verified",
        })
    } else {
        res.json({
            status: "0",
            message: "Email is not verified",
        })
    }

}


const studentSearch = async (req, res) => {
    var perPage = 1;
    var currentPage = parseInt(req.query.page);
    if (!currentPage) currentPage = 1;

    const { highest_education, country_to_go, exam, new_stream, grade_score, school_type, fees } = req.body;
    console.log(req.body)
    var highest_education_new = highest_education
    if (highest_education == 'secondary') {
        highest_education_new = "Graduate"
    }
    if (highest_education == 'certificate') {
        highest_education_new = "Graduate"
    }
    if (highest_education == 'diploma') {
        highest_education_new = "Graduate"
    }
    if (highest_education == 'advance_diploma') {
        highest_education_new = "Graduate"
    }
    if (highest_education == '3_year_bachlor') {
        highest_education_new = "Undergraduate"
    }
    if (highest_education == '4_year_bachlor') {
        highest_education_new = "Undergraduate"
    }
    if (highest_education == 'postgraduate_diploma') {
        highest_education_new = "Undergraduate"
    }
    if (highest_education == 'master') {
        highest_education_new = "Undergraduate"
    }
    if (highest_education == 'doctrate') {
        highest_education_new = "Undergraduate"
    }

    var examdata = {}
    if (exam.type == "IELTS") {
        var overall;
        var scoreArr = exam.score;
        var m1 = scoreArr[0]
        var m2 = scoreArr[1]
        var m3 = scoreArr[2]
        var m4 = scoreArr[3]

        var scoreSum = scoreArr.reduce((prev, curr) => { return prev + curr }, 0)
        var scoreAvg = scoreSum / scoreArr.length;

        overall = Math.round(scoreAvg / 0.50) * 0.50
        examdata = { $or: [{ 'school_programs.overall_band': { $lt: overall } }, { 'school_programs.overall_band': { $eq: overall } }] }

        // minimum band
        var mymin = exam.score.reduce((prev, curr) => { return curr < prev ? curr : prev })
        var overallCheckingArr = exam.score.filter(item => item != mymin)
        var mymodule = exam.score.reduce((prev, curr) => { return curr == mymin ? prev + 1 : prev }, 0)
        var newquery = overallCheckingArr.map(item => { return { $or: [{ 'school_programs.overall_band': { $lt: item } }, { 'school_programs.overall_band': { $eq: item } }] } })
        if (overallCheckingArr.length != 0) {
            newquery = { $and: [...newquery] }
        } else {
            newquery = {}
        }

    } else if (exam.type == "PTE") {
        examdata = { $or: [{ 'school_programs.pte_score': { $lt: parseFloat(exam.score) } }, { 'school_programs.pte_score': { $eq: parseFloat(exam.score) } }] }
    } else if (exam.type == "TOFEL") {
        examdata = { $or: [{ 'school_programs.tofel_point': { $lt: parseFloat(exam.score) } }, { 'school_programs.tofel_point': { $eq: parseFloat(exam.score) } }] }
    }

    // if (mymin < 6 && mymodule < 4) {
    //     var accpetanceQuery = []
    // } else {
    //     var accpetanceQuery = []
    // }

    console.log({ overall, skip: (currentPage - 1) * perPage, currentPage, perPage });

    var totalData = await SchoolModel.aggregate([
        {
            $unwind:
            {
                path: "$school_programs",
            }
        },
        {
            $match: {
                country: country_to_go,
                $and: [
                    new_stream && new_stream.length != 0 ? {
                        $expr: {
                            "$gt": [
                                {
                                    "$size": {
                                        "$setIntersection": [
                                            "$school_programs.new_stream",
                                            new_stream
                                        ]
                                    }
                                },
                                0
                            ]
                        }
                    } : {},
                    highest_education_new && highest_education_new != "" ? {
                        $expr: {
                            "$gt": [
                                {
                                    "$size": {
                                        "$setIntersection": [
                                            "$school_programs.program_level",
                                            [highest_education_new]
                                        ]
                                    }
                                },
                                0
                            ]
                        },
                    } : {},
                    { ...examdata },
                    mymin < 6 && mymodule < 4 ?
                        {
                            $or: [{ 'school_programs.acceptable_band': { $lt: mymin } }, { 'school_programs.acceptable_band': { $eq: mymin } }],
                            $or: [{ 'school_programs.module': { $gt: mymodule } }, { 'school_programs.module': { $eq: mymodule } }],
                        } : {},
                    school_type ?
                        { 'type': { $regex: school_type, $options: 'i' } } : {},
                    fees ?
                        { $or: [{ 'school_programs.tution_fee_per_semester': { $lt: parseFloat(fees) } }, { 'school_programs.tution_fee_per_semester': { $eq: parseFloat(fees) } }] } : {},
                    grade_score || parseFloat(grade_score) == 0 ? { $or: [{ "school_programs.grade_score": { $lt: parseFloat(grade_score) } }, { "school_programs.grade_score": { $eq: parseFloat(grade_score) } }] } : {}
                ]
            }
        },
        {
            $group: {
                _id: '$_id',
                school_name: { $first: '$school_name' },
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
                school_programs: {
                    $push: {
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
                        tution_fee_per_semester: "$school_programs.tution_fee_per_semester",
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
                    }
                }
            }
        },
        { $skip: (currentPage - 1) * perPage },
        { $limit: perPage }
    ])

    var totalData_all = await SchoolModel.aggregate([
        {
            $unwind:
            {
                path: "$school_programs",
            }
        },
        {
            $match: {
                country: country_to_go,
                $and: [
                    new_stream && new_stream.length != 0 ? {
                        $expr: {
                            "$gt": [
                                {
                                    "$size": {
                                        "$setIntersection": [
                                            "$school_programs.new_stream",
                                            new_stream
                                        ]
                                    }
                                },
                                0
                            ]
                        }
                    } : {},
                    highest_education_new && highest_education_new != "" ? {
                        $expr: {
                            "$gt": [
                                {
                                    "$size": {
                                        "$setIntersection": [
                                            "$school_programs.program_level",
                                            [highest_education_new]
                                        ]
                                    }
                                },
                                0
                            ]
                        },
                    } : {},
                    { ...examdata },
                    mymin < 6 && mymodule < 4 ?
                        {
                            $or: [{ 'school_programs.acceptable_band': { $lt: mymin } }, { 'school_programs.acceptable_band': { $eq: mymin } }],
                            $or: [{ 'school_programs.module': { $gt: mymodule } }, { 'school_programs.module': { $eq: mymodule } }],
                        } : {},
                    school_type ?
                        { 'type': { $regex: school_type, $options: 'i' } } : {},
                    grade_score || parseFloat(grade_score) == 0 ? { $or: [{ "school_programs.grade_score": { $lt: parseFloat(grade_score) } }, { "school_programs.grade_score": { $eq: parseFloat(grade_score) } }] } : {}
                ]
            }
        },
        {
            $group: {
                _id: '$_id',
                school_name: { $first: '$school_name' },
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
                school_programs: {
                    $push: {
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
                        tution_fee_per_semester: "$school_programs.tution_fee_per_semester",
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
                    }
                }
            }
        }
    ])


    var totalSchools = totalData_all.length;
    var totalPrograms = totalData_all.reduce((prev, curr) => { return prev + curr.school_programs.length }, 0);
    var noMore = totalData.length < perPage ? true : false
    res.json({
        status: "1",
        message: "Data find successfully",
        details: {
            schools: totalData,
            totalSchools, totalPrograms, noMore
        }
    })
}
module.exports = { studentLogin, studentRegister, studentConfirmEmail, resendEmail, getEmailVerification, studentSearch }