chrome.management.onEnabled.addListener(function(e){
	var disableButton = document.getElementById("disable");
	var enableButton = document.getElementById("enable");
	chrome.browserAction.setIcon ({path: "icon_19.png"});
	enableButton.style.display = "none";
	disableButton.style.display = "block";
});
chrome.management.onDisabled.addListener(function(e){
	var disableButton = document.getElementById("disable");
	var enableButton = document.getElementById("enable");
	chrome.browserAction.setIcon ({path: "icon_19g.png"});
	disableButton.style.display = "none";
	enableButton.style.display = "block";
})

function toggle() {
	var disableButton = document.getElementById("disable");
	var enableButton = document.getElementById("enable");
	disableButton.addEventListener("click", disable, false);
	enableButton.addEventListener("click", enable, false);
	var id = "gmcgchmkljbejmhenadknkdjgjlcinld"
	chrome.management.get(id, function(ex) {
		if(ex.enabled)
			{
				chrome.browserAction.setIcon ({path: "icon_19.png"});
				enableButton.style.display = "none";
				disableButton.style.display = "block";
			}
		if(!ex.enabled)
			{
				chrome.browserAction.setIcon ({path: "icon_19g.png"});
				disableButton.style.display = "none";
				enableButton.style.display = "block";
			}
	});
}
	
function enable() {
	chrome.management.setEnabled("gmcgchmkljbejmhenadknkdjgjlcinld", true);
  window.close();
}
function disable() {
	chrome.management.setEnabled("gmcgchmkljbejmhenadknkdjgjlcinld", false);
	window.close();
}
document.addEventListener("DOMContentLoaded", toggle, false);