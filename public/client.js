// import * as LivechatVisitorSDK from "@livechat/livechat-visitor-sdk";

const LICENSE = 11111111
const GROUP = 0
const baseURLDialogflow = "https://api.dialogflow.com/v1/query?v=20150910";
const tokenDialogflow = "XXXXXXXXXXXXXXXX";
var BotUnHandleCount = 0;
var HumanAgentActivated = false;

const getHeadersDialogflow = () => {
  var headers = new Headers();
    headers.append('Authorization', "Bearer " + tokenDialogflow);
    return headers;
}

const getResponseDialogflow = (query) => {
  let data = {
    query : query,
    lang: 'en',
    sessionId: '12345'
  }
  
  appendMessage(query, 'visitor', null);  

    fetch(baseURLDialogflow, {
    method: 'post',
    headers: new Headers({
      'Authorization': 'Bearer ' + tokenDialogflow,
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify(data)
  }).then(function(response) {
    var result = response.json();
    console.log('\n Response = '+ result);    
    return result;
  }).then(function(data) {
    var result = JSON.stringify(data,null,4);
    console.log('Response data = '+ result);
   // return data.result.fulfillment.speech;
    var botResponse = data.result.fulfillment.speech;
    const authorType = 'agent';
    if(data.result.action.localeCompare('input.unknown') == 0)
    {
      console.log('\n Bot cannot handle this message')
      ++BotUnHandleCount;
      if(BotUnHandleCount == 2)
      {
        console.log('\n Sending message to Human agent');
        var ChatResponse = "Sorry, I can't answer, let me redirect to human agent.."
        appendMessage(ChatResponse, authorType, null);
        HumanAgentActivated = true;
        sendMessageToLiveChat(query);
      }
      else{
        appendMessage(botResponse, authorType, null);
      }
    }
    else{
      BotUnHandleCount = 0;
      appendMessage(botResponse, authorType, null);
    }
  });
}

 
// init LiveChat visitor SDK

const sdk = window.LivechatVisitorSDK.init({
  license: LICENSE,
  group: GROUP,
})

// References to DOM elements

const liveChatWindow = document.getElementById('livechat')
const offlineMessage = document.getElementById('offline-message')
const connectionMessage = document.getElementById('connection-message')
const liveChatWindowMinimized = document.getElementById('livechat-minimized')
const messageList = document.getElementById('message-list')
const sendButton = document.getElementById('send-button')
const setDataButton = document.getElementById('set-data-button')
const input = document.getElementById('message-input')
const prechatForm = document.getElementById('prechat')
const prechatEmailInput = document.getElementById('prechat_email')
const prechatNameInput = document.getElementById('prechat_name')
const minimizeButton = document.getElementById('minimize')
const queueMessage = document.getElementById('queue-message')
const queueTime = document.getElementById('queue-time')
const queueNumber = document.getElementById('queue-number')
const typingIndicator = document.getElementById('typing-indicator')
const rateGood = document.getElementById('rate-good')
const rateBad = document.getElementById('rate-bad')
const rateChat = document.getElementById('rate-chat')
const fileInput = document.getElementById('file-input')

// Agents array, 'is visitor chatting' flag

const agents = []
let chatting = false

const findAgentById = (agentId) => agents.find((agent) => agent.id === agentId)

// Append message function

const appendMessage = (text, authorType, authorId) => {
  const messageDivContainer = document.createElement('div')
  messageDivContainer.classList.add('message-container', authorType)
  if (findAgentById(authorId)) {
    const agent = findAgentById(authorId)
    const avatarImage = document.createElement('img')
    avatarImage.src = `https://${ agent.avatarUrl }`
    avatarImage.classList.add('agent-avatar')
    messageDivContainer.append(avatarImage)
  }
  const messageDiv = document.createElement('div')
  messageDiv.classList.add('message')
  messageDiv.innerHTML = '<div>' + text + '</div>'
  messageDivContainer.append(messageDiv)
  messageList.appendChild(messageDivContainer)
  messageList.scrollTop = messageList.scrollHeight
}

// show bar with 'Agent is typing' info 

const showTypingIndicator = () => {
  typingIndicator.classList.remove('hide')
}

// hide bar with 'Agent is typing' info

const hideTypingIndicator = () => {
  typingIndicator.classList.add('hide')
}


// show queue message with information about estimated waiting time and queue order number

const showQueueMessage = (time, number) => {
  queueMessage.classList.remove('hide')
  queueTime.innerHTML = time
  queueNumber.innerHTML = number
}

// hide queue message

const hideQueueMessage = () => {
  queueMessage.classList.add('hide')
}

// disable message input

const disableInput = (text) => {
  input.placeholder = text
  input.disabled = true
}

// enable message input

const enableInput = () => {
  input.placeholder = 'Write a message'
  input.disabled = false
}

// show prechat - form with questions about visitor's name and email

const showPrechat = () => {
  if (chatting) {
    return
  }
  prechatForm.classList.remove('hide')
}

// hide prechat

const hidePrechat = () => prechatForm.classList.add('hide')

const showRateChat = () => {
  rateChat.classList.remove('hide')
}

const hideRateChat = () => {
  rateChat.classList.add('hide')
}

// New message callback handler - detect author, append message

sdk.on('new_message', (data) => {
  console.log("\n new_message");
  console.log('data', data)
  const authorType = data.authorId.indexOf('@') === -1 ? 'visitor' : 'agent'
  appendMessage(data.text, authorType, data.authorId)
})

sdk.on('new_file', (data) => {
  const authorType = data.authorId.indexOf('@') === -1 ? 'visitor' : 'agent'
  appendMessage(data.url, authorType, data.authorId)
})

sdk.on('visitor_queued', (queueData) => {
  console.log("\n visitor_queued");
  showQueueMessage(queueData.waitingTime, queueData.numberInQueue)
})


// Connection status changed callback handler - toggle message about connection problems, toggle input

sdk.on('connection_status_changed', (data) => {
  console.log("\n connection_status_changed");
  if (data.status === 'connected') {
    console.log("\n Human agent connected...");
    enableInput()  
    connectionMessage.classList.add('hide')
    if (!chatting) {
      setTimeout(showPrechat, 1000)
    }
  } else {
    disableInput('Disconnected')
    connectionMessage.classList.add('disconnected')
    connectionMessage.classList.remove('hide')
    console.log("\n Human agent Disconnected...");
  }
})

// Chat ended callback handler, append system message and disable input

sdk.on('chat_ended', (data) => {
  console.log("\n chat_ended");
  appendMessage('Chat is closed', 'system')
  disableInput('Chat is closed')
  hideRateChat()
})

// Chat started callback handler - set chatting flag, hide prechat form

sdk.on('chat_started', () => {
  chatting = true
  console.log("\n chat_started");
  hidePrechat()
  hideQueueMessage()
  showRateChat()
})

// Agent changed callback handler - add agent to agent's array

sdk.on('agent_changed', (data) => {
  console.log('agent data', data)
  agents.push(data)
})

// Typing indicator callback handler, show / hide bar

sdk.on('typing_indicator', (data) => {
  console.log("\n typing_indicator");
  if (data.isTyping) {
    return showTypingIndicator()  
  }
  hideTypingIndicator()
})

// Status changed callback handler - show offline message if all agents are offline

sdk.on('status_changed', (data) => {
  console.log("\n status_changed");
  if (data.status !== 'online') {
    offlineMessage.classList.remove('hide')
    disableInput('Chat is offline')
    
  } else {
    offlineMessage.classList.add('hide')
    enableInput()
  }
})

sdk.on('new_invitation', (data) => {
  console.log("\n new_invitation");
  console.log('New invitation', data)
})

// Use sendMessage method

const sendMessageToDialogflow = (messageToSend) =>{

  getResponseDialogflow(messageToSend);

}

const sendMessageToLiveChat = (messageToSend) =>{

  sdk.sendMessage({
    customId: String(Math.random()),
    text: messageToSend,
  })

}


const sendMessage = () => {  
  const text = input.value
  console.log("\n sendMessage text = "+ text);
  if(HumanAgentActivated == true)
  {
    sendMessageToLiveChat(text);
  }
  else{
    sendMessageToDialogflow(text);
  }

  input.value = ''
}

// Maximize / minimize chat widget

const toggleMinimized = () => {
  liveChatWindow.classList.toggle('minimized');
  liveChatWindowMinimized.classList.toggle('minimized');
}

sendButton.onclick = sendMessage

minimizeButton.onclick = toggleMinimized

liveChatWindowMinimized.onclick = toggleMinimized

input.onkeydown = (event) => {
  // send message if enter was pressed
  console.log("\n onkeydown");
  if (event.which === 13) {
    sendMessage()
    return false
  }
}

setDataButton.onclick = () => {
  console.log("\n setDataButton.onclick");
  const name = prechatNameInput.value
  const email = prechatEmailInput.value
  sdk.setVisitorData({
    name, email,
  })
  prechatNameInput.disabled = true
  prechatEmailInput.disabled = true
  hidePrechat()
}

rateGood.onclick = () => {
  console.log('click')
  sdk.rateChat({ rate: 'good' })
}

rateBad.onclick = () => {
  sdk.rateChat({ rate: 'bad' })
}


fileInput.onchange = (data) => {
  console.log('> data', data)
  const file = event.target.files[0]
  sdk.sendFile({
    file,
  }).then((res) => console.log('> res', res)).catch((error) => console.log('> error', error))
}