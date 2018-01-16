/**
 * This file writes only the version into every page.
 * @return version
 */
var version = browser.runtime.getManifest().version;
$('#version').text(version);
