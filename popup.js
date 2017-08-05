var status = "on";
var exception = "off";

  function changeStatus(){
    var element = $("#statusBtn");
    var val = "Global Enable";

    if(status == "on"){
      val = " Global Disable";
      status = "off";
      element.removeClass().addClass("disable");
    }else{
      status = "on";
      element.removeClass().addClass("enable");
    }
    element.html(val);
  };

  function handleException(){
    var element = $("#exception");
    var val = "Enable on page";

    if(exception == "off"){
      val = "Disable on page";
      exception = "on";
      element.removeClass().addClass("disable");
    }else{
      exception = "off";
      element.removeClass().addClass("enable");
    }
    element.html(val);
  };

$(document).ready(function(){
  $("#status").on("click", changeStatus);
  $("#exception").on("click", handleException);
});