(function () {
  // Word cloud history
  function hasExcludedWords(inputString) {
    const excludedWords = ["fuck", "bitch", "cunt", "damn", "shit", "asshole", "dick", "cock", "pussy", "badword"];

    const words = inputString.toLowerCase().split(/\b/);
    for (let i = 0; i < words.length; i++) {
      if (excludedWords.includes(words[i])) {
	return true;
      }
    }
    return false;
  }

  const excludedWords = ["bad", "nasty", "rude"];

  function saveChatHistory(str, user) {
    if (str.split(' ').length <= 3 && !hasExcludedWords(str)) {
      state.lastMessageByUser[user] = str
      const messagesArray = Object.values(state.lastMessageByUser);
      const combinedString = messagesArray.join(',');

      state.chatHistory = combinedString.slice(-5000)
    }
  }

  const returnEvent = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    keyCode: 13,
  })


  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());

  const avatarCache = {}

  // Feature messages that are marked as "done" in Q&A
  setTimeout(() => {
    const featuredQuestions = []

    internal?.QAMeeting.questionList.filter(q => q.isAnswered).forEach(q => {
      const key = `${q.name}: ${q.text}`
      if (!featuredQuestions.includes(key)) {
	featuredQuestions.push(key)
      }
    })

    setInterval(() => {
      internal?.QAMeeting.questionList.filter(q => q.isAnswered).forEach(q => {
	const key = `${q.name}: ${q.text}`
	if (!featuredQuestions.includes(key)) {
	  console.log(key)
	  console.log(avatarCache[q.name])
	  // TODO: highlight message

	  const body = {
	    "chatname": q.name,
	    "chatmessage": q.text,
	    "chatimg": avatarCache[q.name],
	    "question": true
	  }

	  let encoded = JSON.stringify(body);
	  encoded = encodeURIComponent(encoded)

	  fetch(`https://api.vdo.ninja/${roomId}/content2/null/${encoded}`);

	  featuredQuestions.push(key)
	}
      })
    }, 1000)
  }, 8000)

  if (!params.roomId) {
    params.roomId = ""
  }

  function toDataURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
	callback(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  }


  var lastMessage = {};
  var lastName = "";
  var lastImage = "";
  var messageHistory = [];

  function toDataURL(url, callback) { // not needed with Facebook I think.
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      var reader = new FileReader();
      reader.onloadend = function() {
	callback(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  }

  function processMessage(ele){

    if (ele && ele.marked){
      return;
    } else {
      ele.marked = true;
    }

    var id = ele.querySelector("div[id][class*='chat']");
    if (id && id.id){
      if (messageHistory.includes(id.id)){
	return;
      }
      messageHistory.push(id.id);
    } else {
      return;
    }

    if (document.querySelector("chat-message__container")){
      if (document.querySelector("chat-message__container").marked){
	return;
      } else {
	document.querySelector("chat-message__container").marked = true;
      }
    }


    var img = false;
    var chatimg = "";

    try{
      chatimg = ele.querySelector(".chat-item__user-avatar").src;

      img = true;
    } catch(e){
      //
    }
    var name = "";
    if (ele.querySelector(".chat-item__sender")){
      name = ele.querySelector(".chat-item__sender").innerText;
      if (name){
	name = name.trim();
      }
    }


    if (!name){

      try {
	var prev = ele.previousElementSibling;
	for (var i=0; i<50;i++){
	  if (prev.querySelector('.chat-item__sender')){
	    break;
	  } else {
	    prev = prev.previousElementSibling;
	  }
	}

	try{


	  if (prev.querySelector(".chat-item__sender")){
	    name = prev.querySelector(".chat-item__sender").innerText;

	    if (name){
	      name = name.trim();
	    }

	    chatimg = prev.querySelector(".chat-item__user-avatar").querySelector("img").src;

	  }


	} catch(e){}

      } catch(e){}
    }
    // If can't find image, use cache
    if (chatimg) {
      avatarCache[name] = chatimg
    } else if (!chatimg) {
      chatimg = avatarCache[name]
    }

    lastImage = chatimg

    var msg = "";
    try {
      msg = getAllContentNodes(ele.querySelector('.chat-message__text-content, .new-chat-message__content'));
    } catch(e){

    }
    if (msg){
      msg = msg.trim();
      if (name){
	if (msg.startsWith(name)){
	  msg = msg.replace(name, '');
	  msg = msg.trim();
	}
      }

      if (msg.startsWith('Reacted to "')) {
	// Ignore reaction messages
	return
      }

      // Do not show "Replying to" messages
      msg = msg.replace(/^Replying to ".*"\n\n/,"")
    }

    if (name){
      lastName = name;
      lastImage = chatimg;
    } else if (lastName){
      name = lastName;
      chatimg = lastImage;
    }

    var ctt = ele.querySelector(".chat-image-preview-wrapper img[src]") || "";
    if (ctt){
      ctt = ctt.src;
    }

    saveChatHistory(msg, name)

    // Raise hand in case it is a bot
    if ((
      msg === "test hands" ||
      msg === "🖐️" ||
      msg === "🖐" ||
      msg === "🖐" ||
      msg === "✋" ||
      msg === "🙋‍♀️" ||
      msg === "🙋‍♂️" ||
      msg === "🙋"
    ) && ["simulator", "host"].includes(params.mode)) {
      document.querySelector('[aria-label="Reactions"').click()
      document.querySelector('.reaction-simple-picker__block--raise-hand')?.click()
      return
    }

    if ((msg === "test yes" || msg === "Test yes") && ["simulator", "host"].includes(params.mode)) {
      const answer = ["yes","yes","yes","no"];

      const message = answer[Math.floor(Math.random() * answer.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test done" || msg === "Test done") && ["simulator", "host"].includes(params.mode)) {
      const answer = ["done"];

      const message = answer[Math.floor(Math.random() * answer.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test me" || msg === "Test me") && ["simulator", "host"].includes(params.mode)) {
      const answer = ["me"];

      const message = answer[Math.floor(Math.random() * answer.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test poll" || msg === "Test poll") && ["simulator", "host"].includes(params.mode)) {
      const answer = ["a","b","c","d", "e", "f"];

      const message = answer[Math.floor(Math.random() * answer.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test no" || msg === "Test no") && ["simulator", "host"].includes(params.mode)) {
      const answer = ["no","no","no","yes"];

      const message = answer[Math.floor(Math.random() * answer.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test from" || msg === "Test from") && ["simulator", "host"].includes(params.mode)) {
      const famousCities = [
	"Paris",
	"Paris",
	"Paris",
	"Paris",
	"Paris",
	"Paris",
	"Rome",
	"London",
	"Berlin",
	"Madrid",
	"Amsterdam",
	"Dublin",
	"Vienna",
	"Prague",
	"Athens",
	"Barcelona",
	"Florence",
	"Venice",
	"New York City",
	"New York City",
	"New York City",
	"New York City",
	"New York City",
	"New York City",
	"New York City",
	"New York City",
	"Los Angeles",
	"San Francisco",
	"Chicago",
	"Miami",
	"Las Vegas",
	"Washington D.C.",
	"Boston",
	"Seattle",
	"New Orleans",
	"Lisbon",
	"Brussels",
	"Zurich",
	"Munich",
	"Istanbul",
	"Helsinki",
	"Reykjavik",
	"Toronto",
	"Vancouver",
	"Sydney",
	"Melbourne",
	"Auckland",
	"Cape Town",
	"Cape Town",
	"Cape Town",
	"Rio de Janeiro",
	"Rio de Janeiro",
	"Rio de Janeiro",
	"Rio de Janeiro",
      ];

      const message = famousCities[Math.floor(Math.random() * famousCities.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, message)
      textarea.dispatchEvent(returnEvent)
      return
    }

    if ((msg === "test" || msg === "Test") && ["simulator", "host"].includes(params.mode)) {
      const helloMessages = [
	"👋 Hello there!",
	"Good morning!",
	"Happy to see you! 🤗",
	"Am I a robot?",
	"Good evening!",
	"Good afternoon!",
	"Heeeeyy!!!",
	"WOW",
	"This is so cool!",
	"How do you do that?",
	"How are you doing all these cool things?!",
	"Please bring me to the stage!!",
	"Hello!!! 😁",
	"Hi!! Just arrived!",
	"Glad to be here!",
	"🤗 Howdy!",
	"🤟 Rock on!",
	"Hello, superhero! 🦸",
	"Greetings!",
      ];

      // Get a random message
      const randomMessage = helloMessages[Math.floor(Math.random() * helloMessages.length)];
      const textarea = document.querySelector('.chat-box__chat-textarea')
      utils.triggerInputChange(textarea, randomMessage)
      textarea.dispatchEvent(returnEvent)
      return
    }


    // Send emojis
    if ((
      msg === "🍿"
    ) && ["simulator", "host"].includes(params.mode)) {
      document.querySelector('[aria-label="Reactions"').click()

      function randomIntFromInterval(min, max) { // min and max included
	return Math.floor(Math.random() * (max - min + 1) + min)
      }

      const reactions = Array.from(document.querySelectorAll('.reaction-simple-picker__content-wrapper'))
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length - 1)] // -1 removes raised hands
      randomReaction?.click()
      return
    }

    // Relaod page command
    if (msg === "🦒" && params?.mode === "simulator") {
      location.reload()
      return
    }

    var data = {};
    data.chatname = name;
    data.chatbadges = "";
    data.backgroundColor = "";
    data.textColor = "";
    data.chatmessage = msg;
    data.chatimg = chatimg;
    data.hasDonation = "";
    data.hasMembership = "";;
    data.contentimg = "";
    data.type = "zoom";
    data.id = Date.now() + parseInt(Math.random()*1000000);

    if (lastMessage === JSON.stringify(data)){ // prevent duplicates, as zoom is prone to it.
      return;
    }

    lastMessage = JSON.stringify(data);

    //if (data.chatimg && img){
    //	toDataURL(data.chatimg, function(dataUrl) {
    //		data.chatimg = dataUrl;
    //		pushMessage(data);
    //	});
    //} else {

    if (data.contentimg){
      try {
	toDataURL(data.contentimg, function(dataUrl) {
	  data.contentimg = dataUrl;
	  pushMessage(data);
	  return;
	});
      } catch(e){
      }
    } else {
      pushMessage(data);
    }
    //}
  }

  let roomId

  if (params.roomId.includes("https")) {
    const chatUrl = (new URLSearchParams(params.roomId.replace(/https.*\?/, "")))
    roomId = chatUrl.get('session')
  } else {
    roomId = params.roomId
  }

  // Autopin when displaying message
var serverURL = "wss://api.overlay.ninja";

socketserverForFeatured = new WebSocket(serverURL);

function setupSocketForFeatured(){
  socketserverForFeatured.onclose = function (){
    setTimeout(function(){
      conCon+=1;
      socketserverForFeatured = new WebSocket(serverURL); // version 1.x.x of the app.
      setupSocketForFeatured();
    },100*conCon);
  };
  socketserverForFeatured.onopen = function (){
    conCon = 1;
    socketserverForFeatured.send(JSON.stringify({"join":roomId, "out":3, "in":2}));
  };
  socketserverForFeatured.addEventListener('message', function (event) {
    if (event?.data === "false") {
      // Chat actions don't have data (auto, next, clear)
      return
    }
    let name = JSON.parse(event.data)?.chatname || JSON.parse(JSON.parse(event.data).value)?.chatname
    if (!name || !state.autoPinOn) { return }
    console.log(name)
    fetch(`http://localhost:3900/replacePin?name=${name}`)
  });
}

setupSocketForFeatured()


  function setupSocket(){
    socketserver.onclose = function (){
      setTimeout(function(){
	conCon+=1;
	socketserver = new WebSocket(serverURL);
	setupSocket();
      },100*conCon);
    };
    socketserver.onopen = function (){
      conCon = 1;
      socketserver.send(JSON.stringify({"join":roomId, "out":1, "in":3}));
    };
    socketserver.addEventListener('message', function (event) {
      console.log(event.data);
    });
  }

  var serverURL = "wss://api.overlay.ninja";
  socketserver = new WebSocket(serverURL);
  setupSocket();

  function pushMessage(data){
    try{
      console.log({ "message": data });
      socketserver.send(JSON.stringify(data));
    } catch(e){}
  }

  var textOnlyMode = false;

  var lastHTML = "";
  function streamPollRAW(element){
    var html = element.outerHTML;
    var data = { html: html };
    data.type = "zoom_poll";
    var json = JSON.stringify(data);
    if (lastHTML === json){ // prevent duplicates, as zoom is prone to it.
      return;
    }
    lastHTML = json;
    pushMessage(data);
  }

  var settings = {}
  function getAllContentNodes(element) {
    var resp = "";
    element.childNodes.forEach(node=>{

      if (node.childNodes.length){
	if (node.classList.contains("new-chat-message__options")){return;}
	resp += getAllContentNodes(node)
      } else if ((node.nodeType === 3) && (node.textContent.trim().length > 0)){
	if (settings.textonlymode){
	  resp += node.textContent.trim()+" ";
	} else {
	  resp += node.textContent.trim()+" ";
	}
      } else if (node.nodeType === 1){
	if (settings.textonlymode){
	  if ("alt" in node){
	    resp += node.alt.trim()+" ";
	  }
	} else {
	  resp += node.outerHTML;
	}
      }
    });
    return resp;
  }

  var questionList = [];
  function processQuestion(ele){
    var question = getAllContentNodes(ele.querySelector(".q-a-question__question-content"));
    var name = ele.querySelector(".q-a-question__q-owner-name").innerHTML;

    var hash = name+":"+question;
    hash = hash.slice(0, 500);
    if (questionList.includes(hash)){
      return;
    } else {
      questionList.push(hash);
    }

    questionList = questionList.slice(-100);

    var chatimg = ele.querySelector(".q-a-question__avatar img[src]") || ""
    if (chatimg){
      chatimg = chatimg.src;
      avatarCache[name] = chatimg
    }

    if (chatimg === "https://us02st1.zoom.us/web_client/enuunvk/image/default-avatar.png"){
      chatimg = "";
    }

    var data = {};
    data.chatname = name;
    data.chatbadges = "";
    data.backgroundColor = "";
    data.textColor = "";
    data.chatmessage = question;
    data.chatimg = chatimg;
    data.hasDonation = "";
    data.hasMembership = "";;
    data.contentimg = "";
    data.question = true;
    data.type = "zoom";

    pushMessage(data);
  }

  function onElementInserted(containerSelector) {
    var onMutationsObserved = function(mutations) {
      mutations.forEach(function(mutation) {
	if (mutation.addedNodes.length) {
	  for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
	    if (mutation.addedNodes[i].hasAttribute('class', 'chat-message__container')){
	      processMessage(mutation.addedNodes[i]);
	    }
	  }
	}
      });
    };
    var target = document.querySelector(containerSelector);
    if (!target){return;}
    var config = { childList: true, subtree: true };
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    var observer = new MutationObserver(onMutationsObserved);
    observer.observe(target, config);

  }
  console.log("social stream injected");


  setInterval(function(){
    document.querySelector('[aria-label="Chat Message List"]')?.setAttribute('id', 'chat-list-content')

    messageHistory = messageHistory.slice(-500);
    if (document.getElementById("chat-list-content")){
      if (!document.getElementById("chat-list-content").marked){
	lastName = "";
	lastImage = "";
	document.getElementById("chat-list-content").marked=true;
	onElementInserted("#chat-list-content");
      }
    }
    if (document.getElementById("poll__body")){
      streamPollRAW(document.getElementById("poll__body"));
    }


    // prevent chat box from being closed after screen-share by keeping it always open
    document.querySelector("[aria-label='open the chat pane']")?.click()

    // show latest messages always
    document.querySelector('.chat-content__unread-msg')?.click()

    if (document.getElementById('chat-list-content')) {
      document.getElementById('chat-list-content').scrollTop = 10000; // prevent chat box from stop scrolling, which makes messages stop appearing
    }

    if (document.querySelector("#q-a-meeting-container-window")){
      document.querySelectorAll("#q-a-meeting-container-window .q-a-question").forEach(ele=>{
	if (ele.ignore){return;}
	ele.ignore = true;
	processQuestion(ele);

      });
    }
  },1000);

})();
