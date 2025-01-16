// Import the packages we need
const dialogflow = require('@google-cloud/dialogflow');
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Your credentials
// const fs = require('fs');
// const CREDENTIALS = JSON.parse(fs.readFileSync('./weather-app.json'));
const CREDENTIALS = {
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
    universe_domain: process.env.UNIVERSE_DOMAIN,
};

// Your google dialogflow project-id
const PROJECID = CREDENTIALS.project_id;

// Configuration for the client
const CONFIGURATION = {
    credentials: {
        private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.CLIENT_EMAIL,
    },
};

// Create a new session
const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);

// Detect intent method
const detectIntent = async (languageCode, queryText, sessionId) => {
    let sessionPath = sessionClient.projectAgentSessionPath(PROJECID, sessionId);

    // The text query request.
    let request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: queryText,
                languageCode: languageCode,
            },
        },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    return {
        fulfillmentText: result.fulfillmentText,
        parameters: result.parameters.fields
    };
};

// Start the webapp
const webApp = express();

// Webapp settings
webApp.use(express.urlencoded({ extended: true }));
webApp.use(express.json());
webApp.use(cors())
// Server Port
const PORT = process.env.PORT || 8080;

// Home route
webApp.get('/', (req, res) => {
    res.send('Hello World!');
});

// Dialogflow route
webApp.post('/dialogflow', async (req, res) => {
    let languageCode = req.body.languageCode;
    let queryText = req.body.queryText;
    let sessionId = req.body.sessionId;

    let responseData = await detectIntent(languageCode, queryText, sessionId);
    res.send(responseData.response);
});

// Dialogflow webhook route
webApp.post('/dialogflow-webhook', async (req, res) => {
    const { queryText, sessionId, locationLatLong, languageCode = 'en' } = req.body;

    try {
        const dialogflowResponse = await detectIntent(languageCode, queryText, sessionId);
        let fulfillmentText;

        if (dialogflowResponse?.parameters?.weather) {
            // Extract parameters
            const location = dialogflowResponse?.parameters?.location
                ? dialogflowResponse?.parameters?.location?.stringValue
                : '';

            const days = dialogflowResponse?.parameters?.days
                ? dialogflowResponse?.parameters.days?.numberValue
                : 1;
            const date = dialogflowResponse?.parameters?.date
                ? dialogflowResponse?.parameters?.date?.stringValue
                : new Date().toISOString().split('T')[0];

            let baseUrl;
            if (location) {
                baseUrl = days > 1
                    ? `https://api.openweathermap.org/data/2.5/forecast`
                    : `https://api.openweathermap.org/data/2.5/weather`;
            } else {
                baseUrl = days > 1
                    ? `https://api.openweathermap.org/data/2.5/forecast?lat=${locationLatLong?.latitude}&lon=${locationLatLong?.longitude}`
                    : `https://api.openweathermap.org/data/2.5/weather?lat=${locationLatLong?.latitude}&lon=${locationLatLong?.longitude}`
            }

            const weatherResponse = await axios.get(baseUrl, {
                params: {
                    q: location,
                    appid: process.env.WEATHER_API_KEY,
                    cnt: days > 1 ? days : 1,
                    units: 'metric',
                },
            });

            // const weatherData = {
            //     temperature: weatherResponse.data?.main?.temp,
            //     condition: weatherResponse.data?.weather[0]?.description,
            // };

            let responseData;
            if (days > 1) {
                responseData = weatherResponse.data.list.map((day) => ({
                    date: day.dt_txt,
                    temperature: day.main.temp,
                    condition: day.weather[0].description,
                }));
            } else {
                responseData = {
                    date: date,
                    temperature: weatherResponse.data.main.temp,
                    condition: weatherResponse.data.weather[0].description,
                };
            }

            // Format the response for Dialogflow
            fulfillmentText = `The weather in ${location ? location : days > 1 ? weatherResponse?.data?.city?.name : weatherResponse?.data?.name
                } is ${Array.isArray(responseData)
                    ? `as follows:\n${responseData
                        .map((day) => `${day?.date}: ${day?.condition}, ${day?.temperature}°C`)
                        .join('\n')}`
                    : `${responseData.condition} with a temperature of ${responseData.temperature}°C.`
                }`;
        } else {
            fulfillmentText = dialogflowResponse?.fulfillmentText;
        }

        res.status(200).json({ fulfillmentText });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send({ fulfillmentText: 'An error occurred. Please try again later.' });
    }
});

// Start the server
webApp.listen(PORT, () => {
    console.log(`Server is up and running at ${PORT}`);
});
