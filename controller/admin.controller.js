const AdminModel = require("../models/admin")
const StudentModel = require("../models/student")
const SchoolModel = require("../models/schools")
const AgentModel = require("../models/agent")
const Constants = require("../helper/constants")
const { io } = require("../app")
const fs = require('fs');
const csv = require("csvtojson");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("bson")
const saltRounds = 10

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        let admin = await AdminModel.findOne({ email })
        if (!admin) {
            res.json({
                status: 0,
                message: "Email Id is not exist",
                details: {
                    error: "Admin email id is wrong"
                }
            })
        } else {
            bcrypt.compare(password, admin.password, function (err, result) {
                if (err) {
                    res.json({
                        status: "0",
                        message: "Server Error Occured",
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

                // generate jwt token
                let jwtSecretKey = process.env.JWT_SECRET_KEY;
                let data = {
                    time: Date(),
                    userId: admin._id,
                    email: admin.email,
                }

                const token = jwt.sign(data, jwtSecretKey);

                res.json({
                    status: 1,
                    message: "Admin Login Successfully",
                    details: {
                        token: token,
                        admin: {
                            email: admin.email,
                            id: admin._id
                        }
                    }
                })

            });
        }


    } catch (error) {
        console.log(error)
        res.json({
            message: "Data Not Uploaded"
        })
    }
}

const adminRegister = async (req, res) => {
    try {
        const { email, password } = req.body;
        let admin = await AdminModel.findOne({ email })
        if (admin) {
            res.json({
                status: 0,
                message: "Email Id is already exists",
                details: {
                    error: "This email is already used by another admin"
                }
            })
        } else {
            bcrypt.hash(password, saltRounds, async function (err, hash) {
                // Store hash in your password DB.
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


                let admin = new AdminModel({
                    email,
                    password: hash
                })

                await admin.save();

                res.json({
                    status: 1,
                    message: "Admin Register Successfully",
                    details: {
                        admin: {
                            email: admin.email,
                            id: admin._id
                        }
                    }
                })
            });

        }


    } catch (error) {
        console.log(error)
        res.json({
            message: "Data Not Uploaded"
        })
    }
}
const getStudents = async (req, res) => {
    try {
        var students = [];
        let data = req.body;

        // pagination variables
        let perPage = 5;
        let totalPages = 0;
        let currentPage = data.currentPage;

        if (data?.agentId) {
            let totalStudents = await StudentModel.find({ agent_id: data.agentId })
            students = await StudentModel.find({ agent_id: data.agentId }).skip((perPage * (currentPage - 1)) || 0).limit(perPage)

            totalPages = parseFloat(totalStudents.length / perPage)
            if (totalStudents.length % perPage != 0) {
                totalPages++;
            }

        } else {
            let totalStudents = await StudentModel.find()
            students = await StudentModel.find().skip((perPage * (currentPage - 1)) || 0).limit(perPage)
            totalPages = parseFloat(totalStudents.length / perPage)

            if (totalStudents.length % perPage != 0) {
                totalPages++;
            }

        }


        res.json({
            status: 1,
            message: "Students List Find Successfully",
            details: { students, totalPages, currentPage }
        })


    } catch (error) {
        console.log(error)
        res.json({
            message: "Server error occured",
            details: { error }
        })
    }
}

const getAgents = async (req, res) => {
    try {
        let data = req.body;

        // pagination variables
        let perPage = 5;
        let totalPages = 0;
        let currentPage = data.currentPage;

        let totalagents = await AgentModel.find()
        let agents = await AgentModel.find().skip((perPage * (currentPage - 1)) || 0).limit(perPage)

        totalPages = parseFloat(totalagents.length / perPage)
        if (totalagents.length % perPage != 0) {
            totalPages++;
        }

        res.json({
            status: 1,
            message: "Agent List Find Successfully",
            details: { agents, totalPages, currentPage }
        })

    } catch (error) {
        console.log(error)
        res.json({
            message: "Server error occured",
            details: { error }
        })
    }
}


const toggleStatus = async (req, res) => {
    try {
        const { agentId } = req.body;
        let agent = await AgentModel.findOne({ _id: agentId });
        if (!agent) {
            res.json({
                status: "0",
                message: "Agent not found.",
                details: {
                    error: "This email is already used by another Student",
                },
            });
        } else {
            let agentdata = await AgentModel.findByIdAndUpdate(
                agentId,
                { status: agent.status == "APPROVED" ? "UN_APPROVED" : "APPROVED" },
            );
            await agentdata.save();
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
}


const uploadDataAsync = async (dataArr) => {
    try {
        if (dataArr[0] == 348) {
            throw new Error('Uh oh!');
        }
        let newEmp = new SchoolModel({
            number: dataArr[0],
            first_name: dataArr[1],
            last_name: dataArr[2],
            gender: dataArr[3],
            employment_status: dataArr[4],
            annual_salary: dataArr[5],
            tax_file_no: dataArr[6],
        })
        await newEmp.save();
        return true;
    } catch (error) {
        return false;
    }
}

const uploadcsvdata = async (req, res) => {
    res.json({
        file: req.file
    })
    return;
    io.on('connection', (socket) => {
        console.log("Connected")
        socket.emit("FromAPI", "Successfully connected to socket")
        try {
            //convert csvfile to jsonArray
            const fileName = req.file.filename
            csv()
                .fromFile(req.file.path)
                .then(async (jsonObj) => {
                    let addedSchools = []
                    let finalObj = []


                    for (var index = 0; index < jsonObj.length; index++) {
                        // skip row which havn't school name
                        // if (jsonObj[index]["school_name"] == "") continue;

                        if (addedSchools.includes(jsonObj[index]["school_name"])) {
                            let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

                            var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[item])
                            var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[item])

                            finalObj[myindex]["school_programs"].push({
                                "program_name": jsonObj[index]["program_name"],
                                "description": jsonObj[index]["description"],
                                "duration": parseFloat(jsonObj[index]["duration"]) || 0,
                                "grade_score": parseFloat(jsonObj[index]["grade_score"]) || 0,
                                "overall_band": parseFloat(jsonObj[index]["overall_band"]) || 0,
                                "pte_score": parseFloat(jsonObj[index]["pte_score"]) || 0,
                                "tofel_point": parseFloat(jsonObj[index]["tofel_point"]) || null,
                                "ielts_listening": parseFloat(jsonObj[index]["ielts_listening"]) || 0,
                                "ielts_speaking": parseFloat(jsonObj[index]["ielts_speaking"]) || 0,
                                "ielts_writting": parseFloat(jsonObj[index]["ielts_writting"]) || 0,
                                "ielts_reading": parseFloat(jsonObj[index]["ielts_reading"]) || 0,
                                "new_stream": new_stream,
                                "stream_id": parseFloat(jsonObj[index]["stream_id"]) || 0,
                                "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
                                "tution_fee_per_semester": parseFloat(jsonObj[index]["tution_fee_per_semester"]) || 0,
                                "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                                "intake_id": jsonObj[index]["intake_id"],
                                "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                                "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
                                "program_level": program_level,
                                "other_comment": jsonObj[index]["Others Comment"],
                                "foundation_fee": parseFloat(jsonObj[index]["Foundation Fee"]) || 0,
                                "module": parseFloat(jsonObj[index]["module"]) || 0,
                                "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
                                "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                                "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                                "currency": jsonObj[index]["currency"],
                                "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
                            })
                        } else {
                            addedSchools.push(jsonObj[index]["school_name"])

                            var type = jsonObj[index]["type"].split(",").map(item => Constants.type[item])

                            finalObj.push(
                                {
                                    "school_name": jsonObj[index]["school_name"],
                                    "school_about": jsonObj[index]["school_about"],
                                    "school_location": jsonObj[index]["school_location"],
                                    "country": jsonObj[index]["country"],
                                    "type": type.join(" "),
                                    "school_order": jsonObj[index]["type"].split(",")[1],
                                    "total_student": parseFloat(jsonObj[index]["total_student"]) || 0,
                                    "international_student": parseFloat(jsonObj[index]["international_student"]) || 0,
                                    "accomodation_feature": Boolean(jsonObj[index]["accomodation_feature"]),
                                    "work_permit_feature": Boolean(jsonObj[index]["work_permit_feature"]),
                                    "program_cooporation": Boolean(jsonObj[index]["program_cooporation"]),
                                    "work_while_study": Boolean(jsonObj[index]["work_while_study"]),
                                    "condition_offer_letter": Boolean(jsonObj[index]["condition_offer_letter"]),
                                    "library": Boolean(jsonObj[index]["library"]),
                                    "founded": parseFloat(jsonObj[index]["founded"]) || 0,
                                    "school_programs": [],
                                }
                            )
                        }
                    }

                    // console.log(finalObj);
                    // let newSchools = await SchoolModel.insertMany(finalObj)
                    socket.emit("FromAPI", "Final Object Created Successfully")

                    var finalData = []
                    var resultData = []
                    var updated = false;
                    for (var i = 0; i < finalObj.length; i++) {
                        // add only school
                        var singleSchool = finalObj[i]

                        // find alerady school 
                        var newSchool = await SchoolModel.findOne({ school_name: singleSchool.school_name })
                        if (!newSchool) {
                            newSchool = await SchoolModel(singleSchool)
                            updated = false;
                        } else {
                            newSchool.school_name = singleSchool.school_name
                            newSchool.school_about = singleSchool.school_about
                            newSchool.school_location = singleSchool.school_location
                            newSchool.country = singleSchool.country
                            newSchool.type = singleSchool.type
                            newSchool.school_order = singleSchool.school_order
                            newSchool.total_student = singleSchool.total_student
                            newSchool.international_student = singleSchool.international_student
                            newSchool.accomodation_feature = singleSchool.accomodation_feature
                            newSchool.work_permit_feature = singleSchool.work_permit_feature
                            newSchool.program_cooporation = singleSchool.program_cooporation
                            newSchool.work_while_study = singleSchool.work_while_study
                            newSchool.condition_offer_letter = singleSchool.condition_offer_letter
                            newSchool.library = singleSchool.library
                            newSchool.founded = singleSchool.founded
                            newSchool.school_programs = singleSchool.school_programs
                            updated = true;
                        }
                        console.log("added", i)

                        newSchool.school_programs = []
                        try {
                            await newSchool.save();
                            if (updated) {
                                resultData.push("Updated")
                            } else {
                                resultData.push("Uploaded")
                            }
                            socket.emit("FromAPI", `index : ${i} is uplaoded`)
                        } catch (error) {
                            socket.emit("FromAPI", `index : ${i} have errors`)
                            if (error.name === "ValidationError") {

                                let errorsData = {};
                                Object.keys(error.errors).forEach((key) => {
                                    errorsData[key] = error.errors[key].message;
                                });

                                console.log({ "error1": errorsData })
                                resultData.push("Failed")
                                singleSchool.school_programs.map(_ => resultData.push("--"))
                                continue;
                            }
                        }
                        for (var j = 0; j < singleSchool.school_programs.length; j++) {
                            // console.log("j", j)
                            // if (i == 0 && j == 0) {
                            //     singleSchool.school_programs[j].program_name = ""
                            // }
                            try {
                                newSchool.school_programs.push(singleSchool.school_programs[j])
                                // if (i == 0 && j == 0) {
                                //     console.log({ newSchool })
                                // }
                                await newSchool.save();
                                if (updated) {
                                    resultData.push("Updated")
                                } else {
                                    resultData.push("Uploaded")
                                }
                                // console.log(`added ${i} => ${j}`)
                            } catch (error) {
                                if (error.name === "ValidationError") {
                                    newSchool.school_programs.pop()
                                    let errorsData = {};
                                    Object.keys(error.errors).forEach((key) => {
                                        errorsData[key] = error.errors[key].message;
                                    });

                                    console.log({ "error2": errorsData })
                                    resultData.push("Failed")
                                }
                            }

                        }

                        finalData.push(newSchool)
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
                        }
                    })
                });
        } catch (error) {
            console.log(error)
            res.json({
                message: "Data Not Uploaded"
            })
        }
    })
    //   io.emit("FromAPI", { response: "File is started to uplaoding data on the server" })

}

const getSchools = async (req, res) => {
    try {
        var schools = [];
        let data = req.body;

        var q1 = {}
        var q2 = {}
        if (data?.country) {
            // query of country
            q1 = { 'country': data.country }
        }
        if (data?.searchItem) {
            // check search item inside school_name, location, country, program_name etc.
            q2 = {
                $or: [
                    { 'school_name': { $regex: data.searchItem, $options: 'i' } },
                    { 'school_location': { $regex: data.searchItem, $options: 'i' } },
                    { 'country': { $regex: data.searchItem, $options: 'i' } },
                ]
            }

        }

        // pagination variables
        let perPage = 25;
        let totalPages = 0;
        let currentPage = data.currentPage;
        var total_schools = await SchoolModel.find({ $and: [q1, q2] })
        schools = await SchoolModel.find({ $and: [q1, q2] }).skip((perPage * (currentPage - 1)) || 0).limit(perPage)

        totalPages = parseFloat(total_schools.length / perPage)
        if (total_schools.length % perPage != 0) {
            totalPages = parseInt(totalPages);
            totalPages++;
        }

        res.json({
            status: 1,
            message: "Schools List Find Successfully",
            details: { schools, totalPages, currentPage }
        })


    } catch (error) {
        console.log(error)
        res.json({
            message: "Server error occured",
            details: { error }
        })
    }
}

const getSchoolsPrograms = async (req, res) => {
    try {
        let data = req.body;

        /*
            1) School Name
            2) country name
            3) serach program name

            then find only programs of filters
        */

        var totalData = await SchoolModel.aggregate([
            {
                $unwind:
                {
                    path: "$school_programs",
                }
            },
            {
                $match: {
                    $and: [
                        data?.schoolName ?
                            { 'school_name': data?.schoolName } : {},
                        data?.country ?
                            { 'country': data?.country } : {},
                        data?.searchItem ?
                            { 'school_programs.program_name': { $regex: data.searchItem, $options: 'i' } } : {},
                    ]
                },
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
                            status: "$school_programs.status",
                        }
                    }
                }
            }
        ])

        res.json({
            status: 1,
            message: "School Programs List Find Successfully",
            details: {
                totalData
            }
        })


    } catch (error) {
        console.log(error)
        res.json({
            message: "Server error occured",
            details: { error }
        })
    }
}

const toggleIntakeStatus = async (req, res) => {
    const { sId, pId, index } = req.body;
    var school = await SchoolModel.findOne({ _id: sId })

    var myIndex = null;
    for (let indexx = 0; indexx < school.school_programs.length; indexx++) {
        if (school.school_programs[indexx].program_name == pId) {
            myIndex = indexx;
        }
    }

    console.log({ myIndex })

    if (myIndex != null) {
        var oldStatus = school.school_programs[myIndex].status;
        console.log({ oldStatus, name: school.school_programs[myIndex].program_name });
        var arr = oldStatus.split(",")
        arr[index] = arr[index] == "1" ? "0" : "1"
        console.log({ arr })
        school.school_programs[myIndex].status = arr.join(",")
        await school.save();
        res.json({
            message: "Status Changed"
        })
    } else {
        res.json({
            message: "Something error, index not find"
        })
    }

}

module.exports = { adminLogin, adminRegister, getStudents, getAgents, toggleStatus, uploadcsvdata, getSchools, getSchoolsPrograms, toggleIntakeStatus }