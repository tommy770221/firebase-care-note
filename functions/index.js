/* eslint-disable max-len */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const axios = require("axios");
const logger = require("firebase-functions/logger");
// const {defineString} = require("firebase-functions/params");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
admin.initializeApp();
// https://firebase.google.com/docs/functions/get-started

// eslint-disable-next-line max-len
exports.helloWorld = functions.https.onCall({region: "asia-east1", cors: ["http://localhost:4200", "https://care-note-101.com"]}, async (request) => {
  // eslint-disable-next-line no-constant-condition
  if (request.auth) {
    // logger.error("Request : ", request);
    const conversation = [
      {
        role: "user",
        content: request.data.message,
      },
    ];
    const careGiverId= request.data.careGiverId;
    const carePersonId= request.data.carePersonId;
    const uid = request.data.uid;
    const apiKey = dotenv.config().parsed.OPENAI_APIKEY;
    if (!conversation || !apiKey) {
      logger.error("Invalid request : ", conversation, apiKey);
      throw new functions.https.HttpsError("invalid-arg", "API Error");
    }
    const url = dotenv.config().parsed.OPENAI_APIURL;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    const body = {
      "messages": conversation,
      "temperature": 0.2,
      "model": "gpt-4o-mini",
      "stream": false,
      "store": true,
    };
    try {
      const response = await axios.post(url, body, {headers});
      if (response.status === 200) {
        const post = {
          "careGiverId": careGiverId,
          "carePersonId": carePersonId,
          "message": response.data.choices[0].message.content,
          "createDate": admin.firestore.Timestamp.now(),
          "recordDate": admin.firestore.Timestamp.now(),
          "type": "activity",
          "id": uid,
        };
        admin.firestore().collection("activities/"+carePersonId+"/activities/"+uid).set(post);
        return {response: response.data.choices[0].message.content};
      } else {
        logger.error(response);
        throw new functions.https.HttpsError("internal", "Request failed.");
      }
    } catch (error) {
      logger.error(error);
      throw new functions.https.HttpsError("internal", "Request failed.");
    }
  } else {
    return ("Not authorized");
  }
});
