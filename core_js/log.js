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
            "pageLength": 10,
            "language": {
                "url": getDataTableTranslation()
            }
        } ).order([3, 'desc']).draw();
    });
}

/**
 * Get the translation file for the DataTable
 */
function getDataTableTranslation()
{
    var lang = browser.i18n.getUILanguage();
    lang = lang.substring(0,2);
    var file = browser.extension.getURL('./external_js/dataTables/i18n/'+lang+'.lang');

    return file;
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
    setText();
    getLog();
    $('#reset_log_btn').on("click", resetGlobalLog);
});

/**
* Translate a string with the i18n API.
*
* @param {string} string Name of the attribute used for localization
*/
function translate(string)
{
    return browser.i18n.getMessage(string);
}

/**
 * Set the text for the UI.
 */
function setText()
{
    document.title = translate('log_html_page_title');
    $('#page_title').text(translate('log_html_page_title'));
    $('#reset_log_btn').text(translate('log_html_reset_button'));
    $('#log_html_reset_button').prop('title', translate('log_html_reset_button_title'));
    $('#head_1').text(translate('log_html_table_head_1'));
    $('#head_2').text(translate('log_html_table_head_2'));
    $('#head_3').text(translate('log_html_table_head_3'));
    $('#head_4').text(translate('log_html_table_head_4'));
}
