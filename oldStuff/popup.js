function init()
{
  setStatus();
  changeStatistics();
  setTabcounter();
}

function setStatus()
{
  browser.storage.local.get('globalStatus', function(data){
                  //Hier neue ID des Mülleimers
    var element = $("#globalStatus");
    data = data.globalStatus;
    if(data == null){
      browser.storage.local.set({"globalStatus": true});
    }
    if(data){
                                      //Hier neue Enable Classe des Mülleimers
      element.removeClass().addClass("status statusEnabled");
    }else{
                                      //Hier neue Disable Classe des Mülleimers
      element.removeClass().addClass("status statusDisabled");
    } 
  });
}

function changeStatus(){
  browser.storage.local.get('globalStatus', function(data){
                  //Hier neue ID des Mülleimers
    var element = $("#globalStatus");
    data = data.globalStatus;      

    if(data){
      browser.storage.local.set({"globalStatus": false});
                                      //Hier neue Disable Classe des Mülleimers
      element.removeClass().addClass("status statusDisabled");
    }else{
      browser.storage.local.set({"globalStatus": true});
                                      //Hier neue Enable Classe des Mülleimers
      element.removeClass().addClass("status statusEnabled");
    } 
  });          
};

/**
 * Get the globalCounter value from the browser storage
 * @param  {(data){}    Return value form browser.storage.local.get
 */
function changeStatistics(){
  var element = $("#statistics_value");
  var globalPercentage = $("#statistics_value_global_percentage");
  var globalCounter;
  var globalURLCounter;

  browser.storage.local.get('globalCounter', function(data){   
    if(data.globalCounter){
      globalCounter = data.globalCounter;
    }
    else {
      globalCounter = 0;
    }

    element.text(globalCounter.toLocaleString());
  });

  browser.storage.local.get('globalURLCounter', function(data){   
    if(data.globalURLCounter){
      globalURLCounter = data.globalURLCounter;
    }
    else {
      globalURLCounter = 0;
    }

    globalPercentage.text(((globalCounter/globalURLCounter)*100).toFixed(3)+"%");
  });
};

function changeTabcounter() {
  var element = $('#tabcounter').is(':checked');

  browser.storage.local.set({'badgedStatus': element});
};

function setTabcounter() {
  var element = $('#tabcounter');

  browser.storage.local.get('badgedStatus', function(data) {
    if(data.badgedStatus)
    {
      element.prop('checked', true);
    }
    else if(data.badgedStatus === null || typeof(data.badgedStatus) == "undefined"){
      element.prop('checked', true);
      browser.storage.local.set({'badgedStatus': true});
    }
    else {
      element.prop('checked', false);
    }
  });
}

function resetGlobalCounter(){
  browser.storage.local.set({"globalCounter": 0});
  browser.storage.local.set({"globalURLCounter": 0});
};

$(document).ready(function(){
  init();
  //Hier neue ID des Mülleimers
  $("#globalStatus").on("click", changeStatus);
  $('.reset_counter_btn').on("click", resetGlobalCounter);
  $('#tabcounter').on('change', changeTabcounter);

  browser.storage.onChanged.addListener(changeStatistics);
});