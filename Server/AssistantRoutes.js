const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');
const configData = require('./../../Head/Ui/constants/config.json');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const API_URL = configData.API_URL;
const key = "kojsnhfitonhsuth";
const iv = "odbshirnkofgfffs";
const UserContentsModule = require('./User_contents');
const aiManagementModule = require('./AI_Management');
const logpath = require('path');
const currentDir = __dirname;
const parentDir = path.join(currentDir, '..', '..', '..', '..');
const logdir = path.join(parentDir, "logs");
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');


if (!fs.existsSync(logdir)) {
    fs.mkdirSync(logdir);
}

const log_frontenddir = path.join(logdir, "frontend");
const moment = require('moment');

// Create the frontend log directory if it does not exist
if (!fs.existsSync(log_frontenddir)) {
    fs.mkdirSync(log_frontenddir);
}

const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: logpath.join(log_frontenddir, `${configData.logFilePrefix}-%DATE%.log`),
            datePattern: 'DD-MM-YYYY',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

const SECRET_KEY = 'BrilliusAI';

async function tokenRequired(req, res, next) {
    const accessToken = req.session.access_token;
    const refreshToken = req.session.refresh_token;

    if (!accessToken || !refreshToken) {
        console.error("Access token or refresh token is missing.");
        return res.redirect('/');
    }

    try {
        // Verify the access token
        const accessTokenData = jwt.verify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
        const username = accessTokenData.user_data.username;

        // Attach 'username' to the request object
        req.username = username;


        // Call the next middleware or route handler
        next();
    } catch (accessTokenError) {
        if (accessTokenError.name === 'TokenExpiredError') {
            // Access token expired, try refreshing using the refresh token
            try {
                const sessionId = req.session.sessionId
                const devicehash = req.session.devicehash
                data = {
                    sessionId: sessionId,
                    data: {
                        deviceHash: devicehash
                    }
                }
                const refreshResponse = await axios.post(API_URL + '/api/newAccessToken', data);
                const accessToken = refreshResponse.data.access_token;

                // Update the session with the new access token
                req.session.access_token = accessToken

                const accessTokenData = jwt.verify(accessToken, SECRET_KEY, { algorithms: ["HS256"] });
                const username = accessTokenData.user_data.username;

                req.username = username;
                next();
            } catch (refreshError) {
                console.error("Error refreshing access token:", refreshError.message);
                return res.redirect('/');
            }
        } else {
            console.error("Access token is invalid.");
            return res.redirect('/');
        }
    }
}

router.get('/', (req, res) => {
    // If access token or refresh token is missing or invalid, redirect to '/'
    res.sendFile(path.join(__dirname, '..', '..', '..', 'build', 'index.html'));
});

router.get('/assistant', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, '..', '..', '..', 'build', 'index.html'));
});

router.post('/getquestionsfromapi', async (req, res) => {
    const userContents = new UserContentsModule(key, iv, API_URL, logger);
    await userContents.getquestionsfromapi(req, res);
});

router.post('/createUserDirectory', tokenRequired, async (req, res) => {
    const userContents = new UserContentsModule(key, iv, API_URL, logger);
    await userContents.create_directory(req, res);
});

router.post('/getUserInfo', tokenRequired, async (req, res) => {
    const userContents = new UserContentsModule(key, iv, API_URL, logger);
    await userContents.getUserInfo(req, res);
});

router.post('/timestamps', tokenRequired, (req, res) => {
    const userContents = new UserContentsModule(key, iv, API_URL, logger);
    userContents.timestamp(req, res);
});

router.post('/upload-audio', tokenRequired, async (req, res) => {
    const userContents = new UserContentsModule(key, iv, API_URL, logger);
    await userContents.upload_audio(req, res);
});

router.post('/stt', async (req, res) => {
    const aiManagement = new aiManagementModule(key, iv, API_URL, logger);
    await aiManagement.stt(req, res);
});

router.post('/chat', async (req, res) => {
    const aiManagement = new aiManagementModule (key, iv, API_URL,logger);
    await aiManagement.chat(req, res);  
});
router.post('/chatreset', async (req, res) => {
    const aiManagement = new aiManagementModule(key, iv, API_URL, logger);
    await aiManagement.chatreset(req, res);
});
module.exports = router;