/*jshint esversion: 6 */
/*
 * This script is responsible for the communication between background and content_scripts.
 */

/**
 * [handleMessage description]
 * @param  request      The message itself. This is a JSON-ifiable object.
 * @param  sender       A runtime.MessageSender object representing the sender of the message.
 * @param  sendResponse A function to call, at most once, to send a response to the message. The function takes a single argument, which may be any JSON-ifiable object. This argument is passed back to the message sender.
 */
function handleMessage(request, sender, sendResponse)
{
    var fn = window[request.function];

    if(typeof fn === "function")
    {
        var response = fn.apply(null, request.params);

        sendResponse({response});
    }
}

browser.runtime.onMessage.addListener(handleMessage);
