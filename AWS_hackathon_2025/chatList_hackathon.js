// Variable Declarations (Kept as requested)
const currentUser = prompt("Enter your name:");
const textarea = document.querySelector("textarea");
const chatContainer = document.querySelector(".chatContainer");
const b = document.querySelector("b"); // Represents the current user's name element

const toName = document.querySelector(".toName"); 

const onlineUsersContainer = document.querySelector(".onlineUsersContainer");
const onlineUsers = document.querySelector(".onlineUsers");

const chattingRoom = document.querySelector(".chattingRoom");

const percentage = document.querySelector(".percentage");
const abusivePeople = document.querySelector(".abusivePeople");

b.textContent = currentUser;

let socket = null;
const URL = "wss://zxq4bnrdae.execute-api.us-east-1.amazonaws.com/production/";

let isConnected = false;

let to = "";
let currentChatPartner = "";

let noOfAbusivePeople = 0;
let nop = 0;

// CENTRAL DATA STOREHI
const grouped = {}; 
let allChatMessages = [];

// ----------------------------------------------------------------------
// --- Message Rendering and Update Functions ---

// 1. Renders a single message element in the main chat window
const renderMessages = (msg, sender, isOutgoing = false) => {
    const li = document.createElement("li");
    
    li.classList.add(isOutgoing ? "outgoingMessageList" : "incomingMessageList");
    
    const span = document.createElement("span");
    span.textContent = msg;
    span.classList.add(isOutgoing ? "outgoingMessage" : "incomingMessage");
    
    li.appendChild(span);
    chatContainer.appendChild(li);
    
    // Scroll to bottom after adding message
    window.requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
};

// 2. Clears and re-renders ALL relevant messages in the main chat window
function updateChatView(partnerName) {
    if (!partnerName) return;

    // Set the display name for the chat window
    toName.textContent = partnerName; 
    to = partnerName;
    currentChatPartner = partnerName;

    // Clear the container
    chatContainer.innerHTML = '';

    // Filter messages for the current conversation
    const conversationMessages = allChatMessages.filter(m =>
        (m.sender === b.textContent && m.receiver === partnerName) || 
        (m.sender === partnerName && m.receiver === b.textContent)
    );

    // Sort messages by timestamp
    const sortedAndFilteredMessages = conversationMessages.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // Render messages
    sortedAndFilteredMessages.forEach(message => {
        const isOutgoing = message.sender === b.textContent;
        renderMessages(
            message.message, 
            partnerName, 
            isOutgoing
        );
    });
}

// ----------------------------------------------------------------------
// --- Chat List Element Management (with Sorting) ---

function renderSingleChatListItem(partnerName, latestMessage) {
    
    if (partnerName === b.textContent) return; 

    const chatContent = document.createElement("div");
    chatContent.classList.add("chatContent");
    
    // ATTACH CLICK HANDLER HERE
    chatContent.addEventListener('click', () => {
        currentChatPartner = partnerName;
        to = partnerName;
        toName.textContent = partnerName;
        updateChatView(currentChatPartner);
    });

    const nameNmessages = document.createElement("div");
    nameNmessages.classList.add("nameNmessages");
    
    const picDiv = document.createElement("div");
    picDiv.classList.add("images");
    const images = document.createElement("img");
    images.src = "profileuser.jpg";
    picDiv.appendChild(images);
    
    const nameDiv = document.createElement("div");
    nameDiv.classList.add("friends");
    nameDiv.textContent = partnerName; 

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("messageFromFriends");
    msgDiv.textContent = latestMessage.message;

    // Time formatting logic
    const latestDate = new Date(latestMessage.timestamp);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const day = days[latestDate.getDay()];
    const hours = latestDate.getHours().toString().padStart(2, "0");
    const minutes = latestDate.getMinutes().toString().padStart(2, "0");
    const formattedTime = `${day} ${hours}:${minutes}`;

    const createTime = document.createElement("div")
    createTime.classList.add("createTime")
    createTime.textContent = formattedTime;
    createTime.style.color = "gray";

    const createTimeContainer = document.createElement("div");
    createTimeContainer.classList.add("createTimeContainer");
    createTimeContainer.appendChild(createTime)

    nameNmessages.appendChild(nameDiv);
    nameNmessages.appendChild(msgDiv);

    chatContent.appendChild(picDiv);
    chatContent.appendChild(nameNmessages);
    chatContent.appendChild(createTimeContainer)

    chattingRoom.appendChild(chatContent); 
}

// Updates existing item and moves it to the top
function updateChatListPreview(messageObj) {
    const partnerName = (messageObj.sender === b.textContent) ? messageObj.receiver : messageObj.sender;

    const existingChatContent = Array.from(document.querySelectorAll(".chatContent")).find(
        chat => chat.querySelector(".friends").textContent === partnerName
    );

    if (existingChatContent) {
        const msgDiv = existingChatContent.querySelector(".messageFromFriends");
        const timeDiv = existingChatContent.querySelector(".createTime");

        msgDiv.textContent = messageObj.message;
        
        const latestDate = new Date(messageObj.timestamp);
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const day = days[latestDate.getDay()];
        const hours = latestDate.getHours().toString().padStart(2, "0");
        const minutes = latestDate.getMinutes().toString().padStart(2, "0");
        timeDiv.textContent = `${day} ${hours}:${minutes}`;

        chattingRoom.prepend(existingChatContent);
        
    } else {
        renderSingleChatListItem(partnerName, messageObj);
        
        const newElement = Array.from(document.querySelectorAll(".chatContent")).find(
            chat => chat.querySelector(".friends").textContent === partnerName
        );
        if(newElement) {
            chattingRoom.prepend(newElement);
        }
    }
}

function updateUserList(setMembers){
    onlineUsers.innerHTML = "";
    let firstUser = null;
    
    setMembers.forEach( m => {
        if(m !== b.textContent){
            if (!firstUser) {
                firstUser = m;
            }
            
            const user = document.createElement("div")
            user.classList.add("user")

            const profImg = document.createElement("div")
            profImg.classList.add("profImg");

            const h1 = document.createElement("h1")
            h1.textContent = m.charAt(0);

            const onlineMarker = document.createElement("div");
            onlineMarker.classList.add("onlineMarker")

            const onlineUsersName = document.createElement("div");
            onlineUsersName.textContent = m;
            onlineUsersName.classList.add("onlineUsersName")

            onlineUsers.appendChild(user);

            user.appendChild(profImg)

            profImg.appendChild(h1)
            profImg.appendChild(onlineMarker);

            user.appendChild(onlineUsersName)

            user.addEventListener("click", () => {
                currentChatPartner = m;
                to = currentChatPartner;
                toName.textContent = currentChatPartner;
                updateChatView(currentChatPartner);
            });
        }
    });
    
    if (!currentChatPartner && firstUser) {
        updateChatView(firstUser);
    }
}

// ----------------------------------------------------------------------
// --- WebSocket Connection and Event Handling ---

function connect(){
    let setMembers = []
    isConnected = true;
    if(!socket || socket.readyState !== WebSocket.OPEN){
        socket = new WebSocket(URL);
        
        socket.addEventListener('open', () => {
             if(currentUser){
                 socket.send(JSON.stringify({"action":"setName", "name":currentUser}))
             }
             socket.send(JSON.stringify({"action":"getMessage"}))    
        })
        
        socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            if(data.members){
                setMembers = Object.values(data.members)
                updateUserList(setMembers); 
            } 
            
            //   INCOMING MESSAGE HANDLING
            else if (data.privateMessage){
                console.log("Received message:", data.privateMessage, "from:", data.from);
                console.log("Current chat partner:", currentChatPartner);
                console.log("Current user (b.textContent):", b.textContent);
                
                // 1. Create a complete message object 
                const newMessage = {
                    receiver: b.textContent,
                    sender: data.from, 
                    message: data.privateMessage, 
                    timestamp: new Date().toISOString() 
                };
                
                console.log("New message object:", newMessage);
                
                // 2. Add to the central data stores
                allChatMessages.push(newMessage);
                console.log("Total messages in allChatMessages:", allChatMessages.length);
                
                const partner = newMessage.sender;
                if (!grouped[partner]) {
                    grouped[partner] = [];
                }
                grouped[partner].push(newMessage);
                console.log("Messages with", partner, ":", grouped[partner].length);

                // 3. Update the chat list preview and move it to the top
                updateChatListPreview(newMessage);

                // 4. Render message immediately if viewing that conversation
                if (data.from === currentChatPartner) {
                    console.log("SHOULD BE RENDERING in active chat now!");
                    console.log("Chat container exists?", chatContainer !== null);
                    console.log("Chat container children before:", chatContainer.children.length);
                    
                    // Simply append the new message instead of re-rendering everything
                    renderMessages(data.privateMessage, data.from, false);
                    
                    console.log("Chat container children after:", chatContainer.children.length);
                } else {
                    console.log("ℹMessage from different user, updating chat list only");
                    console.log("data.from:", data.from, "!== currentChatPartner:", currentChatPartner);
                }
            }
            
            else if (data.result || data.highestScoresResult || data.noOfPeople || data.scoreLengths) {
                console.log(`Highest Threat: ${JSON.stringify(data.result)} highest scores:${data.highestScoresResult} no of people:${data.noOfPeople} score length:${data.scoreLengths}`);
                nop = data.noOfPeople;
                let warningCount=0;
                const result = data.result
                const countedUsers = new Set();
                for(const s of result){
                  if(s.sender){
                      if(countedUsers.has(s.sender)){
                        continue;
                      }
                      countedUsers.add(s.sender)
                      noOfAbusivePeople=countedUsers.size;
                      if(s.sender == b.textContent){
                        warningCount+=1; 
                      }
                    }
                }
                if(warningCount == 1){
                  document.querySelector(".profile").style.border = "3px solid yellow";
                }else if(warningCount == 2){
                  document.querySelector(".profile").style.border = "3px solid orange";
                }else if(warningCount == 3){
                  //  socket.send(JSON.stringify({"action":"deleteName", "name":b.textContent})) ;
                   document.querySelector(".profile").style.border = "3px solid red";
                   alert("Connection closed: User blocked for community guideline abuse.") 
                }
                const percentageOfAbuser = Math.floor((noOfAbusivePeople/nop*100).toFixed(2))
                let target = percentageOfAbuser; 
                
                const percent = document.querySelector(".percentage");
                const firstLayer = document.querySelector(".firstLayer");

                let value = 0;
                const speed = 40; 

                const animateProgress = () => {
                    const interval = setInterval(() => {
                        if (value >= target) {
                            clearInterval(interval);
                        } else {
                            value++;
                            percent.textContent = value + "%";
                            let color;
                            if (value < 33) {
                                color = '#4caf50'; 
                            } else if (value < 66) {
                                color = '#ffeb3b'; 
                            } else {
                                color = '#f44336'; 
                            }
                            firstLayer.style.background = `conic-gradient(${color} ${value * 3.6}deg, #e0e0e0 ${value * 3.6}deg)`;
                        }
                    }, speed);
                };

                animateProgress();

                abusivePeople.textContent = noOfAbusivePeople
                for (const name of data.result){
                    if(name.sender == b.textContent){
                        socket.send(JSON.stringify({"action":"getNotifications"})) 
                        console.log("Notification request sent!")
                        break;
                    } 
                }
            }

            else if (data.notifcaction){
                console.log(data.notification)
            }

            // Historical Messages
            else if (data.storedMessage && data.recepient){ 
                if(data.recepient == b.textContent){
                    
                    // 1. Group historical messages
                    for(const items of data.storedMessage){
                        const partner = items.sender === b.textContent ? items.receiver : items.sender;
                        if(!grouped[partner]){ 
                            grouped[partner] = []
                        }
                        
                        grouped[partner].push({
                            receiver : items.receiver,
                            sender: items.sender, 
                            message : items.message,
                            timestamp : items.timestamp
                        })
                    }

                    // 2. Initialize the central array with all historical messages
                    const allHistoricalMessages = [];
                    for (const key in grouped) {
                        allHistoricalMessages.push(...grouped[key]);
                    }
                    allChatMessages = allHistoricalMessages;

                    // 3. Render the initial chat list previews
                    chattingRoom.innerHTML = ''; 
                    
                    const sortedPartners = Object.keys(grouped).sort((a, b) => {
                        const latestA = grouped[a].reduce((latest, msg) => new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest, grouped[a][0]);
                        const latestB = grouped[b].reduce((latest, msg) => new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest, grouped[b][0]);
                        return new Date(latestB.timestamp) - new Date(latestA.timestamp);
                    });

                    sortedPartners.forEach(partnerName => {
                        if (partnerName === b.textContent) return;
                        const latestMsg = grouped[partnerName].reduce((latest, msg) => new Date(msg.timestamp) > new Date(latest.timestamp) ? msg : latest, grouped[partnerName][0]);
                        renderSingleChatListItem(partnerName, latestMsg);
                    });
                    
                    if (!currentChatPartner && sortedPartners.length > 0) {
                        updateChatView(sortedPartners[0]);
                    }
                }
            }
        })
        
        socket.addEventListener('close', () => {
            isConnected = false;
            console.log("WebSocket closed. Attempting reconnect in 3 seconds...");
            setTimeout(() => {
                if (currentUser) {
                    connect(); 
                }
            }, 3000); 
        })  
    } else {
        return Promise.resolve();
    }
}

// ----------------------------------------------------------------------
// --- Sending Message Function ---

function sendPrivateMessage (to){
    if (!to || !currentChatPartner) {
        alert("Please select a user from the online list or chat list before sending a message.");
        return;
    }
    
    const message = textarea.value.trim();
    if (!message) {return}

    console.log("Sending message:", message, "to:", to);

    // 1. Send via WebSocket
    if(isConnected){
        socket.send(JSON.stringify({"action":"sendPrivate", "message":message,"to":to}))
    }
    
    // 2. Prepare the full message object
    const outgoingMessage = {
        receiver: to, 
        sender: b.textContent, 
        message: message, 
        timestamp: new Date().toISOString() 
    };
    
    // 3. Add to central data store
    allChatMessages.push(outgoingMessage);
    if (!grouped[to]) {
        grouped[to] = [];
    }
    grouped[to].push(outgoingMessage);

    // 4. Update the chat list preview and move it to the top
    updateChatListPreview(outgoingMessage);

    // 5. Render message immediately if viewing that conversation
    if (to === currentChatPartner) {
        console.log("Rendering sent message in active chat");
        // Simply append the new message instead of re-rendering everything
        renderMessages(message, to, true);
    }
    
    textarea.value = "";
}

// ----------------------------------------------------------------------
// --- Initial Connect and Event Listener ---

const send = document.querySelector(".send")
send.addEventListener('click', () => {
    sendPrivateMessage(to)
})

textarea.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendPrivateMessage(to);
    }
});

connect()

fetch('https://hvvdlu6c6aivevlvzpibndu4wq0ktuec.lambda-url.us-east-1.on.aws/', {
        method:'GET',
        mode: "cors"

})
  .then(res=> res.json())
  .then(data => console.log(data))
