/*
* ClearURLs
* Copyright (c) 2017-2020 Kevin Röbert
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*jshint esversion: 6 */
function checkRule() {
    let resURL;
    try {
        resURL = document.getElementById("void_roebert_eu_iframe").contentWindow.location.href;
    } catch(e) {
        resURL = "error";
    }

    let segment = $('#rules_filter_test');

    if(resURL === 'https://kevinroebert.gitlab.io/ClearUrls/void/index.html') {
        segment.addClass('positive');
        segment.append('<i class="large smile outline icon"></i>');
        segment.append('<div class="content"><p>The tracking filter function of ClearURLs works correctly.</p></div>');
    } else {
        segment.addClass('warning');
        segment.append('<i class="large frown outline icon"></i>');
        segment.append('<div class="content"><p>The tracking filter function of ClearURLs does <b>not</b> work properly. ' +
        'Maybe the addon is disabled or the rules could not be downloaded.</p></div>');
    }
}

function checkRedirection() {
    let resURL;
    try {
        resURL = document.getElementById("redirect_roebert_eu_iframe").contentWindow.location.href;
    } catch(e) {
        resURL = "error";
    }

    let segment = $('#redirection_filter_test');

    if(resURL === 'https://kevinroebert.gitlab.io/ClearUrls/void/index.html') {
        segment.addClass('positive');
        segment.append('<i class="large smile outline icon"></i>');
        segment.append('<div class="content"><p>The redirection function of ClearURLs works correctly.</p></div>');
    } else {
        segment.addClass('warning');
        segment.append('<i class="large frown outline icon"></i>');
        segment.append('<div class="content"><p>The redirection function of ClearURLs does <b>not</b> work properly. ' +
        'Maybe the addon is disabled or the rules could not be downloaded.</p></div>');
    }
}

function checkBlock() {
    let segment = $('#block_filter_test');

    $('#block_roebert_eu_img')
    .on('load', function() {
        segment.addClass('warning');
        segment.append('<i class="large frown outline icon"></i>');
        segment.append('<div class="content"><p>The block function of ClearURLs does <b>not</b> work properly. ' +
        'Maybe the addon is disabled or the rules could not be downloaded.</p></div>');
    })
    .on('error', function() {
        segment.addClass('positive');
        segment.append('<i class="large smile outline icon"></i>');
        segment.append('<div class="content"><p>The block function of ClearURLs works correctly.</p></div>');
    })
    .attr("src", 'https://kevinroebert.gitlab.io/ClearUrls/void/block.svg');
}

function checkIssue253() {
    let segment = $('#issue_253_test');

    $('#i253_roebert_eu_img')
    .on('load', function() {
        segment.addClass('negative');
        segment.append('<i class="large frown outline icon"></i>');
        segment.append('<div class="content"><p>Your ClearURLs version is vulnerable to the problem from <a href="https://gitlab.com/KevinRoebert/ClearUrls/-/issues/253">Issue 253</a>. ' +
        'Please update your ClearURLs installation to version <b>1.8.3 or higher</b>.</p></div>');
    })
    .on('error', function() {
        segment.addClass('positive');
        segment.append('<i class="large smile outline icon"></i>');
        segment.append('<div class="content"><p>Your ClearURLs version is not vulnerable to the problem from <a href="https://gitlab.com/KevinRoebert/ClearUrls/-/issues/253">Issue 253</a>.</p></div>');
    })
    .attr("src", 'https://kevinroebert.gitlab.io/ClearUrls/void/index.html?url=https%3A%2F%2Fkevinroebert.gitlab.io%2FClearUrls%2Fi253.html');
}

$(window).on('load', function () {
    try {
        checkRule();
    } catch(e) {}
    try {
        checkRedirection();
    } catch(e) {}
    try {
        checkBlock();
    } catch(e) {}
    try {
        checkIssue253();
    } catch(e) {}
});
