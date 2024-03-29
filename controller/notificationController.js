const AgentModel = require("../models/agent")
const AdminModel = require("../models/admin")
const StudentModel = require("../models/student")
const { sendEmail } = require("../helper/sendEmail")
const fs = require('fs');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const saltRounds = 10
var generatorPassword = require('generate-password');

const admin = require("firebase-admin")
var firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": "learn-global",
        "private_key_id": "bbffe34bf80ccf073b34da4cd78ca6a90f5c677e",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC9JDe0EEENkRFJ\nKFh4ip69vvHgd4s95Gk/pF2C+Rry7yJus6cc+2P71d9iX1mOeDHzY47KRJ0m/Idj\nD11C5SQNQLPQ+Zg3thzTQF+IOJ3it74urTsgRzHFPVu94DsSs4HflEv20/1d1Fws\nT7VysV5zWkBTcuNjM3lbEQCh5WpHaceURY6SXCSh1XV2DhiNesfsgziq/YUMY+rD\nctPOnSRyJ5YftHYsRrP86mn5ClbBfQuXRFPn/Mw2aiFnelSgzmnCVUQGPG2GRaU4\ncHsPIjkFKgIvczOythiLZEtD2E7t45uOEdOGUZBBK/MuX18flESYPdHYPKOtVJqM\nfXvaSBzPAgMBAAECggEANIHE6vpmLM98ZnxKTzBgUBmdiSx2nbh2lWHaSd1Ao3dK\nbkP2XP/W6lcdu+/vazMn3sLhJXq1y9hn91KRF9yHzRwMrzNTFAg86VJiEu1wuzs6\nEzgpBVVuViyp9sS0cYUexUQkcIG6QR2OdwirvQrLRyejWuc2g9gK1QKb09Xd0rPq\nS3hc7KXesCLeCfBax35yOx3tzbOJGs2vIyslkrel20KIrzrBAlZOZfqhYmV035R2\nz53N/TF8kwfuRxX/8DpuiFuYO0y8OvaWWSB4qi1lN6rNVeGKXcBoV1Ploy2WjwMS\nsxpjdUtIx/ET+c1Ru1LVED3ZjGgDdbVpcVoDqxYY3QKBgQD4nLu1Ep30egpul/sY\nz31Ex41UP+VYIWcusapLAM+65juoJXYpIBc1ZAarvJpMDe0E58r6uO5AfnkLYrvQ\nabpPi8V/d/B0/ZX8Ouy5PPVmdQvMktIDnDsC4N048Pbs7DEKPwiO4s4xgJ7nyRHI\nou8fLPsC82vY8Zx6XjZZyH5nEwKBgQDCwxKbU4jsv5jKgXtVA6jSs2Ciu7dc6o3U\nA2YY++G1Z4dSsZiKrVfDJZzl0wjK1wCqafujDm8DM6ro6CQdkHWGqwLU8WYkdCGN\nmSDBvAbMFuV7eLjocs21P6Qp7T4g1BsToajd+0GZ9aZS+8CuR2SFFFFW4tLcu+PQ\nXAtUyzt+1QKBgAxRP5+OB5NoRIIMN52YEh3JQUBOVh+SsBkJJmXG6YPaClSfXoZV\nF7FGfmod0ws3mWmnzk+zv+IkIf0lbCa8RkXQp/1TxO8W7Ups5POciJAF9oqxL4SM\nRgQzfeJnVeSRIzDdxJ/Hru2W8MiNFrt5Dx3dTaZsxwgdmGIbrtet7k1PAoGAYbln\n+LAtoD1y+QmHTN0NNMv0zTLLir/Wcm9SJ28bjd5otEGQfOUFiFGzLE57tuuy1c9g\nCC0R3tVqCHuSw5LcpbnhLeAClIAA5f/Tw+IItxc2BoJIpboVJcDNKox0BBzpiSww\ng1GzVQFBd5oC0G/aLDxJpAMkMsXERaQpu15OeBECgYBwtD8AaYyCvuan1Myw54II\nAbhBaVxVPigM/SYEIlcum+CrGhe6KTWs9AB4jl1hAMbbzDRCTCUFaKVSkWrvtAQo\n9bD0ZQJHfiv7Yzad1eN7SrhYZ+6HTHRiBU7peeYnDrWcGbP8mNxJahZGGX6LXqFC\nPVl2Autea6426QEAHaWQ3w==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-j0d6u@learn-global.iam.gserviceaccount.com",
        "client_id": "101406365885572651064",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-j0d6u%40learn-global.iam.gserviceaccount.com"
    }),
    databaseURL: "https://learn-global.firebaseio.com"
})

const sendNotification = async (req, res) => {
    // send msg
    try {
        console.log({
            notificationBody: req.body
        })

        let tokens = req.body.token
        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index];
            if (token == "") continue;
            const message = {
                notification: {
                    title: req.body.title,
                    body: req.body.body,
                },
                data: {
                    url: "https://learnglobal.co.in/" + req.body.redirectUrl,
                },
                token: token
            }

            await sendPushNotification(message)
        }


        res.json({
            status: "1",
            message: "Notification sent successfully",
        })
    } catch (error) {
        res.json({
            status: "0",
            message: error.message,
        })
    }
}

const sendPushNotification = async (message) => {
    try {
    return response = await admin.messaging().send(message);
    } catch (error) {
        console.log(error);
        return error;
    }
}

module.exports = { sendNotification }