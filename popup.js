var status = "on";
      var exception = "off";

      function changeStatus(){
        var element = document.getElementById('status');
        var val = "Global Enable";
        if(status == "on"){
          val = " Global Disable";
          status = "off";
          element.className = "disable";
        }else{
          status = "on";
          element.className = "enable";
        }
        element.innerHTML = val;
      }

      function handleException(){
        var element = document.getElementById('exception');
        var val = "Enable on page";
        if(exception == "off"){
          val = "Disable on page";
          exception = "on";
          element.className = "disable";
        }else{
          exception = "off";
          element.className = "enable";
        }
        element.innerHTML = val;
      }