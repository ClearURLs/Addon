/**
* Get the log and display the data as table.
*/
var log = {};

var core = function (func) {
        return browser.runtime.getBackgroundPage().then(func);
};

/**
* Reset the global log
*/
function resetGlobalLog(){
    core(function (ref){
        obj = {"log": []};
        ref.setData('log', JSON.stringify(obj));
    });
    getLog();
    location.reload();
}

/**
* Get the log and display to the user
*/
function getLog()
{
    core(function (ref){
        log = ref.getData('log');

        var length = Object.keys(log.log).length;
        var row;
        if(length != 0)
        {
            for(var i=0; i<length;i++)
            {
                row = "<tr>"
                + "<td>"+log.log[i].before+"</td>"
                + "<td>"+log.log[i].after+"</td>"
                + "<td>"+log.log[i].rule+"</td>"
                + "<td>"+toDate(log.log[i].timestamp)+"</td>";
                $('#tbody').append(row);
            }
        }
        $('#logTable').DataTable({
            "pageLength": 10
        } ).order([3, 'desc']).draw();
    });
}

/**
* Convert timestamp to date
*/
function toDate(time)
{
    return new Date(time).toLocaleString();
}

/**
* Load only when document is ready
*/
$(document).ready(function(){
    getLog();
    $('#reset_log_btn').on("click", resetGlobalLog);
});
