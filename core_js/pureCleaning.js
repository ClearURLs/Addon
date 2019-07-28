/*
* ClearURLs
* Copyright (c) 2017-2019 Kevin Röbert
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

/**
* Cleans given links. Also do automatic redirection.
*
* @param  {[type]} url url as string
* @return {Array}     redirectUrl or none
*/
function pureCleaning(url) {
    var cleanURL = url;

    for (var i = 0; i < providers.length; i++) {
        var result = {
            "changes": false,
            "url": "",
            "redirect": false,
            "cancel": false
        };

        if(providers[i].matchURL(cleanURL))
        {
            result = removeFieldsFormURL(providers[i], cleanURL);
            cleanURL = result.url;
        }

        if(result.redirect)
        {
            return result.url;
        }
    }

    return cleanURL;
}
