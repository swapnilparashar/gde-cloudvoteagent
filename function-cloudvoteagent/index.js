// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  function writeToDb (agent) {
    // Get parameter from Dialogflow with the string to add to the database
    const databaseEntry = agent.parameters.technology;

    // Get the database collection 'dialogflow' and document 'agent' and store
    // the document  {entry: "<value of database entry>"} in the 'agent' document
    const dialogflowAgentRef = db.collection('dialogflow').doc(`${databaseEntry}`);
    if (!dialogflowAgentRef) {
      return db.runTransaction(t => {
      		t.set(dialogflowAgentRef, {entry: 1});
        	agent.add(`The new count is 1 for technology "${databaseEntry}" to the Firestore database.`);
      		return Promise.resolve('Write complete');
        });
    }
    return dialogflowAgentRef.get()
      .then(doc => {
        var voteCount = 1;
      	if (!doc.exists) {
          agent.add('No data found in the database!');
        } else {
          voteCount = doc.data().entry + 1;
        }
      	return db.runTransaction(t => {
      		t.set(dialogflowAgentRef, {entry: voteCount});
      		return Promise.resolve('Write complete');
    		}).then(doc => {
      			agent.add(`The new count is "${voteCount}" for technology "${databaseEntry}" to the Firestore database.`);
    		}).catch(err => {
      			console.log(`Error writing to Firestore: ${err}`);
      			agent.add(`Failed to write "${databaseEntry}" to the Firestore database.`);
    		});
      }).catch(() => {
        agent.add('Error reading entry from the Firestore database.');
        agent.add('Please add a entry to the database first by saying, "Write <your phrase> to the database"');
      });
  }

  function readFromDb (agent) {
    const databaseEntry = agent.parameters.technology;
    // Get the database collection 'dialogflow' and document 'agent'
    const dialogflowAgentDoc = db.collection('dialogflow').doc(`${databaseEntry}`);
	// const dialogflowAgentRef = db.collection('dialogflow').doc(`${databaseEntry}`);
    // agent.add(dialogflowAgentDoc + ":" + `${databaseEntry}`);
    // Get the value of 'entry' in the document and send it to the user
    return dialogflowAgentDoc.get()
      .then(doc => {
      	console.log("Before doc exists check");
        if (!doc.exists) {
          agent.add('No data found in the database!');
        } else {
          var voteCount2 = doc.data().entry;
          console.log(doc.data());
          //agent.add("test reply");
          agent.add(`The current count is "${voteCount2}" for technology "${databaseEntry}" to the Firestore database.`);
        }
        return Promise.resolve('Read complete');
      }).catch((err) => {
      	console.log(`Error reading from Firestore: ${err}`);
        agent.add('Error reading entry from the Firestore database.');
        agent.add('Please add a entry to the database first by saying, "Write <your phrase> to the database"');
      });
  }
  
  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  intentMap.set('bot.write', writeToDb);
  intentMap.set('bot.read', readFromDb);
  agent.handleRequest(intentMap);
});
