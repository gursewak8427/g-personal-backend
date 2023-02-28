const { Schema, model } = require("mongoose");

const agentSchema = new Schema({
    email: {
        type: String,
        trim: true,
        required: [true, 'Email is Required'],
        trim: true,
        lowercase: true,
        // minLength: 4,
        // maxLength: 15
    },
    username: {
        type: String,
        required: [true, 'Username is Required'],
        trim: true,
        lowercase: true,
        // minLength: 4,
        // maxLength: 15
    },
    password: {
        type: String,
        trim: true,
        required: [true, 'Password is Required'],
        trim: true,
        minLength: 6,
    },
    first_name: {
        type: String,
        trim: true,
        required: [true, 'First Name is Required'],
    },
    last_name: {
        type: String,
        trim: true,
        required: [true, 'Last Name is Required'],
    },
    status: {
        type: String,
        trim: true,
        enum: ['REJECT', 'APPROVED', 'PENDING'],
        default: "PENDING"
    },
    street: {
        type: String,
    },
    city: {
        type: String,
        required: [true, 'City is Required'],
    },

    state: {
        type: String,
        required: [true, 'State is Required'],
    },

    country: {
        type: String,
        required: [true, 'Country is Required'],
    },

    postal_code: {
        type: Number,
        required: [true, 'Postal Code is Required'],
    },

    phone: {
        type: Number,
        required: [true, 'Phone number is Required'],
    },

    // Profile fields start

    company_name: {
        type: String,
        require: true
    },

    facebook_page_name: {
        type: String
    },

    principal_country_of_business: {
        type: String
    },

    cellphone: {
        type: String
    },

    skype_ID: {
        type: String
    },

    whatsapp_ID: {
        type: String
    },

    instagram_handle: {
        type: String
    },

    twitter_handle: {
        type: String
    },

    linkedin_URL: {
        type: String
    },

    begin_recruiting_students: {
        type: String
    },

    services: {
        type: String
    },

    canadaian_schools_represented: {
        type: String,
    },

    american_schools_represented: {
        type: String,
    },

    represents_other_countries: {
        type: String,
    },

    institutions_representing: {
        type: String
    },

    belongs_to: {
        type: String
    },

    recruit_from: {
        type: String
    },
    student_to_abroad: {
        type: String
    },
    marketing_methods: [String],
    average_fee: String,
    students_refer_to_learn_global: String,
    reference_phone: {
        type: String
    },

    reference_website: {
        type: String
    },

    business_certificate: {
        type: String,
        default: ""
    },

    business_certificate_status: {
        type: String,
        default: "PENDING"
    },

    company_logo: {
        type: String,
        default: ""
    },
    company_logo_status: {
        type: String,
        default: "PENDING"
    },
    notifications: [{
        message: String,
        redirectUrl: String,
        body: String,
        created: String,
    }],
    unseenNotifications: {
        type: Number,
        default: 0,
    },
    web_push_token: {
        type: String,
        default: "",
    },
});

// Compile model from schema
module.exports = AgentModel = model("agent", agentSchema);
