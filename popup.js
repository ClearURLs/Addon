var exception = "off";
var resultFormRestore;

function saveOptions(key, result) {
   console.log("Save with key"+key+" the result: "+result);
    browser.storage.local.set({
      key: result
    });
};

function restoreOptions(key)
{
  resultFormRestore = null;
  function setCurrentChoise(_result)
  {
    console.log("Reload config with key: "+key+" and result: ");
    resultFormRestore = _result;
    console.log(resultFormRestore);
  };

  function onError(error) {
    console.log(`Error: ${error}`);
  };

  var getting = browser.storage.local.get(key);
  getting.then(setCurrentChoise, onError);
  return resultFormRestore;
}

  function changeStatus(){
    var status = restoreOptions("globalStatus");
    console.log("status: "+status);
    var element = $("#globalStatus");

    if(status == null){
      saveOptions("globalStatus", true);
      status = true;
    }    

    if(status){
      status = saveOptions("globalStatus", false);
      element.removeClass().addClass("status statusDisabled");
    }else{
      status = saveOptions("globalStatus", true);
      element.removeClass().addClass("status statusEnabled");
    }
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
  $("#globalStatus").on("click", changeStatus);
  $("#exception").on("click", handleException);
});