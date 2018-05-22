var settings = [];

var core = function (func) {
        return browser.runtime.getBackgroundPage().then(func);
};

getData();

/**
* Load only when document is ready
*/
$(document).ready(function(){
    setText();
    $(".pick-a-color").pickAColor();
    $('#reset_settings_btn').on("click", reset);
    $('#save_settings_btn').on("click", save);

    $("#badged_color input").on("change", function () {
        settings.badged_color = $(this).val();
        core(function (ref){
            ref.setData('badged_color', settings.badged_color);
            ref.setBadgedStatus();
            ref.saveOnExit();
        });
    });
});

/**
 * Reset everything.
 * Set everthing to the default values.
 */
function reset()
{
    core(function (ref){
        ref.initSettings();
        ref.saveOnExit();
        ref.reload();
    });
}

/**
 * Saves the settings.
 */
function save()
{

    core(function (ref){
        ref.setData('ruleURL', $('input[name=rule_url]').val());
        ref.setData('hashURL', $('input[name=hash_url]').val());
        ref.saveOnExit();
        ref.reload();
    });

    location.reload();
}

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
 * Get the data.
 */
function getData()
{
    core(function (ref){
        settings.badged_color = ref.getData('badged_color');
        settings.rule_url = ref.getData('ruleURL');
        settings.hash_url = ref.getData('hashURL');
    });
}

/**
 * Set the text for the UI.
 */
function setText()
{
    document.title = translate('settings_html_page_title');
    $('#page_title').text(translate('settings_html_page_title'));
    $('#badged_color_label').text(translate('badged_color_label'));
    $('input[name=badged_color]').val(settings.badged_color);
    $('#reset_settings_btn').text(translate('setting_html_reset_button'));
    $('#reset_settings_btn').prop('title', translate('setting_html_reset_button_title'));
    $('#rule_url_label').text(translate('setting_rule_url_label'));
    $('input[name=rule_url]').val(settings.rule_url);
    $('#hash_url_label').text(translate('setting_hash_url_label'));
    $('input[name=hash_url]').val(settings.hash_url);
    $('#save_settings_btn').text(translate('settings_html_save_button'));
    $('#save_settings_btn').prop('title', translate('settings_html_save_button_title'));
}
