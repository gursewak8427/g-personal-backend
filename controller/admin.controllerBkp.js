const AdminModel = require("../models/admin")
const StudentModel = require("../models/student")
const SchoolModel = require("../models/schools")
const AgentModel = require("../models/agent")
const Constants = require("../helper/constants")

const fs = require('fs');
const csv = require("csvtojson");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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


                if (!result) {
                    res.json({
                        status: "0",
                        message: "Password is wrong",
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
                    if (jsonObj[index]["school_name"] == "") continue;

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
                let newSchools = await SchoolModel.insertMany(finalObj)

                fs.unlink("uploads/" + fileName, (err) => {
                    if (err) {
                        console.log("File Deleted Failed.");
                    }

                });

                res.json({
                    message: "Data Uploaded Successfully",
                    details: {
                        schools: newSchools
                    }
                })
            });
    } catch (error) {
        console.log(error)
        res.json({
            message: "Data Not Uploaded"
        })
    }
}


module.exports = { adminLogin, adminRegister, getStudents, getAgents, toggleStatus, uploadcsvdata }