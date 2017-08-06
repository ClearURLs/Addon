var status = "enabled";
var exception = "false";

function changeStatus() {
    var text = $("#statusText");
    var button = $("#statusBtn");
    if(status == "enabled") {
		console.log("was enabled");
        text.html("Dis");
        button.removeClass("statusEnabled").addClass("statusDisabled");
        status = "disabled";
		console.log("is disabled");
    }
    else {
		console.log("was disabled");
        text.html("En");
        button.removeClass("statusDisabled").addClass("statusEnabled");
        status = "enabled";
		console.log("is enabled");
    }
};
/*
function handleException() {
    var element = $("#exception");
    var val = "Enable on page";
    
    if(exception == false) {
        val = "Disable on page";
        exception = "true";
        element.removeClass().addClass("disable");
    }
    else {
        exception = "false";
        element.removeClass().addClass("enable");
    }
    element.html(val);
};
*/
/*
$(document).ready(function() {
    $("#statusBtn").on("click", changeStatus);
    //$("#exception").on("click", handleException);
});
*/
document.addEventListener("DOMContentLoaded", function() {
    $("#statusBtn").on("click", changeStatus);
});