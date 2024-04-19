const path = require('path'); // Import the path module
const moment = require('moment'); // Import the moment library
const configData = require('../../Head/Ui/constants/config.json');
const fs = require('fs')
const axios = require('axios');
const xss = require('xss');
const userContents = require('./User_contents');
const currentDir = __dirname;
const parentDir = path.join(currentDir, '..', '..', '..', '..');
const userDirectoriesPath = path.join(parentDir, configData.mediaDest);



class AiManagement {
    constructor(key, iv, API_URL, logger) {
        this.key = key;
        this.iv = iv;
        this.API_URL = API_URL;
        this.logger = logger;
    }

    async stt(req, res) {
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
        try {
            const username = req.session.username; // Assuming you have session management middleware
            const quesNumber = xss(req.body.quesNumber);
            this.logger.info(`${username} Performing STT:`, { timestamp }); // Log the entry into the chat mode
            if (username in userContents.sessionTimestamps) {
                const sessionTimestamp = userContents.sessionTimestamps[username];
                const newuserdirectorypath = path.join(userDirectoriesPath, username);
                const video_files = fs.readdirSync(newuserdirectorypath);
                const video_names = video_files.filter((filename) =>
                    (filename.endsWith('.mp4') || filename.endsWith('.mp3')) && filename.startsWith(`${username}_${sessionTimestamp}_Question${quesNumber}`)
                );
                this.logger.info(`${username} Matching videos found: ${video_names}`, { timestamp }); // Log the matching videos found

                let data = {};

                if (video_names.length > 0) {
                    data = {
                        sessionId: req.session.sessionId,
                        data: {
                            userName: xss(username),
                            file: video_names,
                            timestamp: sessionTimestamp,
                            questionId: quesNumber
                        }
                    };
                    this.logger.info(`${username} Data for stt API: ${data}`, { timestamp }); // Log the data before making the chat API request

                    // Make a POST request to the API endpoint
                    const sttResponse = await axios.post(this.API_URL + '/api/stt', data);
                    if (sttResponse.status === 200) {
                        this.logger.info(`${username} STT request successful: ${sttResponse.data}`, { timestamp }); // Log the successful chat API request
                        return res.status(200).json(sttResponse.data);
                    } else {
                        this.logger.error(`${username} Failed to get the feedback.`, { timestamp }); // Log the failure to get the feedback
                        return res.status(sttResponse.status).json({ message: 'Failed to get the feedback' });
                    }
                } else {
                    // Handle the case where there are no video_names
                    this.logger.error(`${username} No matching video found.`, { timestamp }); // Log the case where no matching videos are found
                    return res.status(404).json({ message: 'No matching video found' });
                }
            } else {
                // Handle the case where the username is not in sessionTimestamps
                this.logger.error('Unauthorized access:', { timestamp }); // Log the unauthorized access attempt
                return res.status(401).json({ message: 'Unauthorized' });
            }
        } catch (error) {
            console.error('Error:', error.message);
            this.logger.error(`Error during stt: ${error.message}`, { timestamp }); // Log any error that occurs during the stt
            res.status(error.response.status).end();
        }

    }


    async chatreset(req, res) {
        const timestamp = moment().format('DD-MM-YYYY HH:mm:ss'); // Retrieve the current timestamp for logging
        try {
            const username = req.session.username; // Assuming you have session management middleware
            this.logger.info(`${username} Initiating chat reset.`, { timestamp }); // Log the initiation of the chat reset

            if (username) {
                let data = {};
                data = {
                    user_id: xss(username),
                };
                this.logger.info(`${username} Data for chat reset API: ${data}`, { timestamp }); // Log the data before making the chat reset API request

                // Make a POST request to the API endpoint
                const apiResponse = await axios.post(this.API_URL + '/api/chatReset', data);

                if (apiResponse.status === 200) {
                    this.logger.info(`${username} Chat reset API request successful: ${apiResponse.data}`, { timestamp }); // Log the successful chat reset API request
                    return res.status(200).json(apiResponse.data);
                } else {
                    this.logger.error(`${username} Failed to reset chat.`, { timestamp }); // Log the failure to reset the chat
                    return res.status(apiResponse.status).json({ message: 'Failed to reset the chat' });
                }
            } else {
                // Handle the case where the username is not in sessionTimestamps
                this.logger.error('Unauthorized access:', { timestamp }); // Log the unauthorized access attempt
                return res.status(401).json({ message: 'Unauthorized' });
            }
        } catch (error) {
            console.error('Error:', error.message);
            this.logger.error(`Error during chat reset: ${error.message}`, { timestamp }); // Log any error that occurs during the chat reset
            res.status(error.response.status).end();
        }
    }
}