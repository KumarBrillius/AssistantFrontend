const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const fileUpload = require('express-fileupload');



// Logging
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const sessionTimestamps = {};
const  qid = [];
const questions = [];
const currentDir = __dirname;
const parentDir = path.join(currentDir, '..', '..', '..', '..');
const logdir = path.join(parentDir, "logs");
const archiveDir = path.join(parentDir, "archive");
const moment = require('moment'); // Import the moment library
const fs = require('fs');
const configData = require('../../Head/Ui/constants/config.json');
const xss = require('xss');
const userDirectoriesPath = path.join(parentDir, configData.mediaDest);



class UserContents {
    static sessionTimestamps = {};
    static qid = [];
    static questions = [];


    constructor(key, iv, API_URL, logger) {
        this.key = key;
        this.iv = iv;
        this.API_URL = API_URL;
        this.logger = logger;

    }



    async create_directory(req, res) {
        const username = req.session.username;
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
        if (!username) {
            this.logger.error('Invalid request: Username is missing', { timestamp }); // Log an error if the username is missing
            return res.status(400).json({ message: "Invalid request" });
        }

        this.logger.info(`User directory created for: ${username}`, { timestamp }); // Log the creation of the user directory for the specific username

        // Define the path where the user directory will be created (adjust this as needed)
        const userDirectoryPath = path.join(parentDir, 'data', username);

        fs.mkdir(userDirectoryPath, { recursive: true }, (err) => {
            if (err) {
                console.error("Error creating user directory:", err);
                this.logger.error(`Error creating user directory. ${err.message}`, { timestamp }); // Log the error if there's an issue creating the user directory
                return res.status(500).json({ message: "Error creating user directory" });
            }

            this.logger.info(`User directory created successfully for: ${username}`, { timestamp });

            res.status(200).json({ message: "User directory created" });
        });

    }

    async getquestionsfromapi (req, res)  {
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
        try {
            this.logger.info('Attempting to fetch questions from the API', { timestamp }); // Log the attempt to fetch questions from the API
    
            const  data = {
               sessionId  : req.session.sessionId
            }
            const questionurl = this.API_URL + '/assistant/getSelectedQuestions';
            const response = await axios.post(questionurl, data);


            if (response.status === 200) {
                const data = response.data;
                UserContents.questions.length = 0;
                UserContents.qid.length = 0;
                const questionsData = data.questions;
                
                UserContents.qid.push(...questionsData.map(questions => questions.id));
                const questionIds = UserContents.qid;

                const qidLog = [...UserContents.qid]; // Store qid values for logging without affecting the original array
                this.logger.info('Retrieved qid values:', { timestamp, qid: qidLog }); // Log the retrieved qid values

                UserContents.questions = questionsData.map(questions => questions.question)

                const questions = UserContents.questions;
                const questionsLog = [...questions]; // Store questions for logging without affecting the original array
    
                return res.status(200).json({ questions, questionIds});
            } else {
                // Redirect to the second route in case of a 500 error
                throw new Error("Failed to fetch questions from the API");
            }
        } catch (error) {
            // Handle the error and redirect to the second route if it's a 500 error
            if (error.response && error.response.status === 500) {
                this.logger.error('Failed to fetch questions from the API', { timestamp }); // Log the failure to fetch questions from the API
                return res.redirect('/getquestionsfromapidb');
            } else {
                this.logger.error(`An error occurred: ${error.message}`, { timestamp }); // Log the general error message
                return res.status(500).json({ message: `An error occurred: ${error.message}` });
            }
        }
    };
    
    
    async getUserInfo(req, res) {
        const username = req.session.username;
        console.log("username is ",username)
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
        this.logger.info(`User directory created for: ${username}`, { timestamp }); // Log the creation of the user directory for the specific username
        
        // Define the path where the user directory will be created (adjust this as needed)      
        if (!username){
            res.status(404),json({data:"user not found"})
        }else{
            this.logger.info(`User name is: ${username}`);
            console.log("username is ",[username])
            res.status(200).json({ data:[username]});
        }

    }

    async upload_audio(req, res) {
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
        console.log("111111")
        try {
            const username = req.session.username; // Assuming you have user sessions set up
            this.logger.info(`User ${username} uploading file`, { timestamp }); // Log the start of the audio upload
            if (username in UserContents.sessionTimestamps) {
                console.log("2222")
                const sessionTimestamp = UserContents.sessionTimestamps[username];
                const extname = path.extname(req.files.audio.name); // Access the uploaded file via req.files
                const quesNumber = xss(req.body.quesNumber);
                const filename = `${username}_${sessionTimestamp}_Question${quesNumber}${extname}`;
                const newuserdirectorypath = path.join(userDirectoriesPath, username);
                // Define the destination path where you want to save the audio
                //const destinationPath = path.join(newuserdirectorypath, filename);
                const audioFile = req.files.audio;
                const destinationPathInS3 = `${newuserdirectorypath}/${filename}`;
                console.log("destination path in s3",destinationPathInS3)

                await new Promise((resolve, reject) => {
                    this.logger.info(`${username} File upload in progress`, { timestamp }); // Log the file upload in progress
                    req.files.audio.mv(destinationPathInS3, (err) => {
                        if (err) {
                            console.error('Error moving file:', err);
                            this.logger.error(`Error moving audio file. ${err.message}`, { timestamp }); // Log any errors that occur during the file move
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                this.logger.info(`${username} Audio file uploaded successfully`, { timestamp }); // Log the successful audio upload
                res.sendStatus(200); // Use sendStatus to send a 200 status code
            } else {
                this.logger.error('User session not found', { timestamp }); // Log the case where the user session is not found
                res.status(401).json({ error: 'User session not found' });
            }
        } catch (error) {
            console.error('Error:', error.message);
            this.logger.error(`Error during audio upload. ${error.message}`, { timestamp }); // Log errors during the audio upload
            res.status(error.response.status).end();
        }


    }
    
    async timestamp(req,res){
        const username = req.session.username; // Retrieve username from session
        console.log("22222")
        if (!username) {
            res.status(400).json({ error: 'Username is required' });
            return;
        }
        // Check if a timestamp already exists for the username and delete it
        if (UserContents.sessionTimestamps.hasOwnProperty(username)) {
            delete UserContents.sessionTimestamps[username];
        }

        // Update the session timestamp for the username
        UserContents.sessionTimestamps[username] = Math.floor(Date.now() / 1000);
    
        console.log("session timestamps",UserContents.sessionTimestamps[username])
        res.json({ timestamp: UserContents.sessionTimestamps[username] }); // Return the session timestamp for the same username

     }
}
module.exports = UserContents;