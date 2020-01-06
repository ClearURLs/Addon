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
/*
* This script is responsible for minification of the data.min.json file and deletes also empty entries.
*/
let fs = require('fs');
const inFileLocation = process.argv.slice(2)[0];
const outFileLocation = process.argv.slice(2)[1];

if(inFileLocation === undefined || outFileLocation === undefined) {
    throw "in- and output must be set!";
}

const fileContent = fs.readFileSync(inFileLocation).toString();

/**
 * Builds a minify version of the data.min.json file.
 */
function build() {
    const data = JSON.parse(fileContent);
    let minifiedData = {"providers":{}};

    for(let provider in data.providers) {
        minifiedData.providers[provider] = {};
        let self = minifiedData.providers[provider];

        if(data.providers[provider].completeProvider === true) {
            self.completeProvider = true;
        }

        if(data.providers[provider].forceRedirection === true) {
            self.forceRedirection = true;
        }

        if(data.providers[provider].urlPattern !== "") {
            self.urlPattern = data.providers[provider].urlPattern;
        }

        if(data.providers[provider].rules.length !== 0) {
            self.rules = data.providers[provider].rules;
        }

        if(data.providers[provider].rawRules.length !== 0) {
            self.rawRules = data.providers[provider].rawRules;
        }

        if(data.providers[provider].referralMarketing.length !== 0) {
            self.referralMarketing = data.providers[provider].referralMarketing;
        }

        if(data.providers[provider].exceptions.length !== 0) {
            self.exceptions = data.providers[provider].exceptions;
        }

        if(data.providers[provider].redirections.length !== 0) {
            self.redirections = data.providers[provider].redirections;
        }
    }

    fs.writeFile(outFileLocation, JSON.stringify(minifiedData), function(err) {

        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
}

build();