const path = require('path');
const axios = require('axios');

// Logging
const currentDir = __dirname;
const parentDir = path.join(currentDir, '..', '..', '..', '..');
const moment = require('moment'); // Import the moment library
const fs = require('fs');
const configData = require('../../Head/Ui/constants/config.json');
const xss = require('xss');
const userDirectoriesPath = path.join(parentDir, configData.mediaDest);


class UserContents {
    static sessionTimestamps = {};


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


    async upload_audio(req, res) {
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp
        try {
            const username = req.session.username; // Assuming you have user sessions set up
            this.logger.info(`User ${username} uploading file`, { timestamp }); // Log the start of the audio upload
            if (username in UserContents.sessionTimestamps) {

                const sessionTimestamp = UserContents.sessionTimestamps[username];
                const extname = path.extname(req.files.audio.name); // Access the uploaded file via req.files
                const quesNumber = xss(req.body.quesNumber);
                const filename = `${username}_${sessionTimestamp}_Question${quesNumber}${extname}`;
                const newuserdirectorypath = path.join(userDirectoriesPath, username);
                // Define the destination path where you want to save the audio
                //const destinationPath = path.join(newuserdirectorypath, filename);
                const audioFile = req.files.audio;
                const destinationPathInS3 = `${newuserdirectorypath}/${filename}`;

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
}