
const { ApiGatewayManagementApi } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");


// const lambdaClient = new LambdaClient({ region: "us-east-1" }); 

const dynamoDBClient = new DynamoDBClient({ region: 'us-east-1' });

const ENDPOINT = process.env.ENDPOINT;
const TABLE_NAME = process.env.TABLE_NAME;
const client = new ApiGatewayManagementApi({ endpoint: ENDPOINT });

const names = {}
const duplicate = {}

// Send a message to a single connection
const sendToOne = async (connectionId, message) => {
  try {
    await client.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    });
  } catch (error) {
    console.log("sendToOne error:", error);
    // Ignore 410 Gone (disconnected clients)
    if (error.name !== 'GoneException') {
      throw error;
    }
  }
};

// Send a message to multiple connections
const sendToAll = async (connectionIds, message) => {
  const promises = connectionIds.map(id => sendToOne(id, message));
  await Promise.all(promises);
};

const saveMessage = async (sender, receiver, message) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        userId: { S: new Date().getTime().toString() },
        sender: { S: sender },
        receiver: {S: receiver},
        message: { S: message },
      
        label:{S: ""},
        timestamp: { S: new Date().toISOString() },
      },
    };

    await dynamoDBClient.send(new PutItemCommand(params));
    console.log("Message saved:", sender, message);

    // Optional: Return all messages after insert
  } catch (err) {
    console.error("Error saving message:", err);
    return [];
  }
};





const invokeSagemakerLambda = async () => {
  try {
    const params = {
      FunctionName: "trigger_sagemaker",
      InvocationType: "Event"
    };
    await lambdaClient.send(new InvokeCommand(params));
    console.log("Invoked SageMaker trigger Lambda successfully");
  } catch (err) {
    console.error("Error invoking SageMaker Lambda:", err);
  }
};

const getAllItems = async () => {
  try {
    const result = await dynamoDBClient.send(new ScanCommand({ TableName: "Users" }));
    return result.Items || [];
  } catch (err) {
    console.error("Error fetching items:", err);
    return [];
  }
};



// Lambda handler
exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event));

  
  
  
  // console.log("Highest threat score:", highestThreatPerson);


  
 
  // Only process if requestContext exists
  if (event.requestContext) {
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (error) {
        console.log("JSON parse error:", error);
      }
    }

  const responses = await dynamoDBClient.send(new ScanCommand({ TableName: TABLE_NAME }));
  const items = responses.Items.map(item => ({
    userId: item.userId,
    sender: item.sender,
    message: item.message,
    receiver: item.receiver,
    score: item.threat_score,
    timestamp: item.timestamp
  }));
  


   

    switch (routeKey) {
      case '$connect':
        // Add new connection to the name object
        break;

      case '$disconnect':
        const disconnectedUser = names[connectionId];
        delete names[connectionId];
        // let disconnectedUser = Object.entries(names).pop();
        await sendToAll(Object.keys(names), { members: Object.values(names)});   
        await sendToAll(Object.keys(names), { type:"userLeft", leftMember:disconnectedUser });
        // await sendToOne(connectionId, { member: names[connectionId] });   
        break;

      case 'deleteName':
//         const allConnections = Object.keys(names); // store them first
        names={}
//         await sendToAll(allConnections, { members: Object.values(names) }); // broadcast the empty list
        break;

      case 'setName': 
        if(Object.values(names).includes(body.name)){
           const errorMessage = {
               action: 'error',
               message: "This name is already taken. Please choose another."
           };
           // Assuming 'sendToClient' is your function to push data back to the client
           await sendToOne(connectionId, errorMessage);
           return;
        }
        
        names[connectionId] = body.name;
        await sendToAll(Object.keys(names), { members: Object.values(names) });
        
        // await sendToAll(Object.keys(names), { members: Object.values(names) });
        // await sendToAll(Object.keys(names), { members:`${Object.values(names)} has joined the chat` });
        
        // Added optional chaining to prevent "cannot read undefined .S" errors here.
        const relatedMessages = items
        .filter(i => i.sender?.S === body.name || i.receiver?.S === body.name)
        .map(i => ({
       
          userId: i.userId?.S,
          sender: i.sender?.S,
          receiver: i.receiver?.S,
          message: i.message?.S,
          score: i.score?.S,
          timestamp: i.timestamp?.S
        }));


      // Send all related messages back
      await sendToOne(connectionId, { storedMessage: relatedMessages, recepient: body.name});
        break;

      case 'sendPrivate':
        const to = Object.keys(names).find(key => names[key] === body.to);
        await sendToOne(to, { privateMessage: ` ${body.message}`, from: names[connectionId]});  
        await saveMessage(names[connectionId], names[to], body.message);

        // await invokeSagemakerLambda()

         
        // FIX 3: Removed the line with the undefined variable 'messages', which was causing a crash.
        // await sendToOne(to, { storedMessage: ` ${messages}`, from: names[connectionId]});  
        break;

     
    

    case 'sendPublic':
      await sendToAll(Object.keys(names), { publicMessage: `${names[connectionId]}: ${body.message}`});
      break;

 case 'getMessage':
            // FIX: Replaced invalid function call with the already existing 'items' array.
            const itemsForGet = items; 
            
            // Filter and Map logic needs to safely access the score
        const highest = itemsForGet
            .filter(f => f.score?.S && parseFloat(f.score.S) > 0.50) //  : Check if score.S exists first
            .map(i => ({
                sender: i.sender.S, // NOTE: Assuming i.sender is DDB format and needs .S
                score: parseFloat(i.score.S) 
            
            }));
            
        let highestScores = 0;
        for(const item of itemsForGet){
            // : Check if score.S exists first
            if(item.score?.S && parseFloat(item.score.S) > 0.50){ 
              highestScores += parseFloat(item.score.S);
            }
        }

      
        let people = []
        let scoreLength = 0;
        let seen = new Set();
        for(const item of itemsForGet){
            // : Check if score.S exists first
            if(item.score?.S){
              scoreLength += 1;
            }
            //  Check if sender is defined before using it
            if(item.sender?.S) { // NOTE: Added .S check for consistency with the rest of your code
              if(seen.has(item.sender.S) ){
                people.push(item.sender.S);
              } else{
                seen.add(item.sender.S);
              }
            }
       }
      
      await sendToOne(connectionId, { type: "highestThreat", result: highest, highestScoresResult: highestScores, noOfPeople:seen.size, scoreLengths : scoreLength});
      break;

    case 'getNotifications':
      // const toWhom = Object.keys(names).find(key => names[key] === body.name);
      const msg = "You have been included as one of the top abusive user!!"
      await sendToOne(connectionId, {notification: msg});
      break;

    case 'deleteItem':
        const suspisciousUser = body.name;
        const deleteParams = {
            TableName: TABLE_NAME,
            FilterExpression: "sender = :sender",
            ExpressionAttributeValues: {
                ":sender": { S: suspisciousUser }
            }
        };
        break;

    case 'reloadPage':
      await sendToOne(connectionId, { action: "reload"});
      break;

    default:
      console.log(`Unhandled route: ${routeKey}`);
      break;
    }
  }

 

  // Always return 200 to avoid 500
  return { statusCode: 200, body:'OK'};
}