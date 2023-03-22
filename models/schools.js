const { Schema, model, Types } = require("mongoose");

const schoolSchema = new Schema({
    school_name: {
        type: String,
        required: [true, "School name is required"],
        trim: true,
        // lowercase: true,
        // minLength: 4,
        // maxLength: 15
    },
    school_about: {
        type: String,
        trim: true,
        required: [true, "School about is required"],
    },
    school_location: {
        type: String,
        trim: true,
        required: [true, "School location is required"],
    },
    country: {
        type: String,
        trim: true,
        required: [true, "Country name is required"],
    },
    state: {
        type: String,
        trim: true,
        required: [true, "State name is required"],
    },
    city: {
        type: String,
        trim: true,
        required: [true, "City name is required"],
    },
    type: {
        type: String,
        required: [true, "School Type is required"],
    },
    school_order: {
        type: Number,
        default: 0
    },
    total_student: {
        type: Number,
        required: [true, "Total Students must be integer and required"],
    },
    international_student: {
        type: Number,
        description: "International Students must be of integer type"
    },
    accomodation_feature: {
        type: Boolean,
        description: "Accomodation Feature must be of boolean type"
    },
    work_permit_feature: {
        type: Boolean,
        description: "Work permit features Feature must be of boolean type"
    },
    program_cooporation: {
        type: Boolean,
        description: "Program Cooporation must be of boolean type"
    },
    work_while_study: {
        type: Boolean,
        description: "Work while study must be of boolean type"
    },
    condition_offer_letter: {
        type: Boolean,
        description: "Condition offer letter must be of boolean type"
    },
    library: {
        type: Boolean,
        description: "Libraray must be of boolean type"
    },
    founded: {
        type: Number,
        description: "Founded must be of Number type"
    },
    top_status: {
        type: Boolean,
        default: false,
    },
    school_programs: [
        {
            program_id: {
                type: String,
                trim: true,
                required: [true, "Program Id is required"],
            },
            program_name: {
                type: String,
                trim: true,
                required: [true, "Program name is required"],
            },
            description: {
                type: String,
                trim: true,
                // required: [true, "Program Description is required"],
            },
            duration: {
                type: Number,
            },
            duration_sem_per_year: {
                type: Number,
            },
            grade_score: {
                type: Number,
                description: "Grade Score must be of number type"
            },
            overall_band: {
                type: Number,
                description: "Overall Band must be of number type"
            },
            pte_score: {
                type: Number,
                description: "Pte Score must be of number type"
            },
            tofel_point: {
                type: Number,
                description: "Tofel Points must be of number type"
            },
            ielts_listening: {
                type: Number,
                description: "Ielts Listening must be be of number type"
            },
            ielts_speaking: {
                type: Number,
                description: "Ielts speaking must be be of number type"
            },
            ielts_writting: {
                type: Number,
                description: "Ielts writting must be be of number type"
            },
            ielts_reading: {
                type: Number,
                description: "Ielts reading must be be of number type"
            },
            new_stream: {
                type: [String],
            },
            stream_id: {
                type: Number,
                description: "Stream Id must be of number type"
            },
            other_fees: {
                type: Number,
                description: "Other Fee must be of number type"
            },
            application_fee: {
                type: Number,
                description: "Application Fee must be of number type"
            },
            min_tution_fee_per_semester: {
                type: Number,
                description: "Max Tution fee per semester must be of number type"
            },
            max_tution_fee: {
                type: Number,
                description: "Min Tution fee per semester must be of number type"
            },
            cost_of_living: {
                type: Number,
            },
            currency: {
                type: String,
            },
            acceptance_letter: {
                type: Number,
                description: "Acceptance Letter must be of number type in days"
            },
            visa_processing_days: {
                type: Number,
                description: "Visa Processing days must be of number type in days"
            },
            process_days: {
                type: Number,
                description: "Processing days must be of number type in years"
            },
            credentials: {
                type: String,
            },
            program_level: {
                type: [String],
            },
            other_comment: {
                type: String,
                trim: true,
            },
            foundation_fee: {
                type: Number,
                description: "Foundation Fee must be of number type"
            },

            acceptable_band: {
                type: Number,
                description: "Acceptable band must be of Number type"
            },
            module: {
                type: Number,
                description: "Module must be of number type"
            },
            english_language: {
                type: Number,
                description: "English Language must be of number type"
            },
            program_sort_order: {
                type: Number,
                description: "Program Sort Order must be of number type"
            },
            few_seats_status: {
                type: Boolean,
                default: false,
            },
            top_status: {
                type: Boolean,
                default: false,
            },
            intakes_data: [
                {
                    months: [Boolean],
                    year: Number,
                }
            ],
        }
    ]

});



// Compile model from schema
module.exports = SchoolModel = model("school", schoolSchema);
