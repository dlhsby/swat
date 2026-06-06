// JavaScript Document// Variables you can change
//

var MY_WEBSOCKET_URL = "ws://apents.if.its.ac.id:8001/jms";
var TOPIC_NAME = "/topic/swatTopic";
var IN_DEBUG_MODE = true;
var DEBUG_TO_SCREEN = false;

var MESSAGE_PROPERTIES = {
    "messageType": "MESSAGE_TYPE",
    "user": "USER"
};

var MESSAGE_TYPES = {
    "sendData": "DATA_SENT"
};
var connection;
var session;
var wsUrl;
var topicConsumer;
var topicProducer;

var sending = false;
var messageQueue = [];

var WEBSOCKET_URL = MY_WEBSOCKET_URL;

var screenMsg = "";

var consoleLog = function(text) {
    if (IN_DEBUG_MODE) {
        if (DEBUG_TO_SCREEN) {
            // Logging to the screen
            screenMsg = screenMsg + text + "<br>";
			alert(screenMsg);
            $("#logMsgs").html(screenMsg);
        } else {
            // Logging to the browser console
            console.log(text);
        }
    }
};

var handleException = function (e) {
    consoleLog("EXCEPTION: " + e);
};

var handleTopicMessage = function(message) {
    //var msg = JSON.parse(message.getText()); //PHP sends Json data
    consoleLog("Message Recieve: " + message.getText());
};

var sendMessage=function(message)
{
    if (!sending) {
        sending = true;
        doSend(session.createTextMessage(message));  
    }
    else {
        messageQueue.push(message);
        consoleLog("Busy sending, pushing to queue: " + message);
    }
}

var doSend = function(message) {
    message.setStringProperty(MESSAGE_PROPERTIES.user, "server");
	
    topicProducer.send(message, function() {
        sendFromQueue();
    });
    consoleLog("Message sent: " + message.getText());
};

var sendFromQueue = function() {
    if (messageQueue.length > 0) {
        consoleLog("Sending last element from queue: " + messageQueue[messageQueue.length-1]);
        var msg = messageQueue[messageQueue.length-1];
        messageQueue = [];
        doSend(session.createTextMessage(msg));
    }
    else {
        sending = false;
    }
};

var doConnect = function(isMonitoring) {
    // Connect to JMS, create a session and start it.
    //
    var jmsConnectionFactory = new JmsConnectionFactory(WEBSOCKET_URL);
    try {
        var connectionFuture = jmsConnectionFactory.createConnection(function() {
			
            if (!connectionFuture.exception) {
                try {
                    connection = connectionFuture.getValue();
                    connection.setExceptionListener(handleException);

                    consoleLog("Connected to " + WEBSOCKET_URL);
                    session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);

                    var myTopic = session.createTopic(TOPIC_NAME);
                    consoleLog("Topic created...");
					
					if(isMonitoring)
					{
                        topicConsumer = session.createConsumer(myTopic);
                        consoleLog("Topic consumer created...");

                        topicConsumer.setMessageListener(handleTopicMessage);
					}
					else
					{
                        topicProducer = session.createProducer(myTopic);
                        consoleLog("Topic producer created...");
					}
                   
                    connection.start(function() {
                        consoleLog("JMS session created");                  
                    });
                } catch (e) {
                    handleException(e);
                }
            } else {
                handleException(connectionFuture.exception);
            }
        });
    } catch (e) {
        handleException(e);
    }
};