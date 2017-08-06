function init()
{
  setStatus();
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


$(document).ready(function(){
  init();
  //Hier neue ID des Mülleimers
  $("#globalStatus").on("click", changeStatus);
});