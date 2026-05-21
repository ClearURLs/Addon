"use strict";
/*
 * ClearURLs
 * Copyright (c) 2017-2022 Kevin Röbert.
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

/**
 * Models a hash parameter of a given {@link URL}.
 */
class URLHashParams {
    constructor(url) {
        Object.defineProperty(this, "_params", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._params = new Multimap();
        const hash = url.hash.slice(1);
        const params = hash.split('&');
        for (const p of params) {
            if (!p)
                continue;
            const separator = p.indexOf('=');
            const key = separator === -1 ? p : p.slice(0, separator);
            if (!key)
                continue;
            const value = separator === -1 ? null : p.slice(separator + 1);
            this._params.put(key, value);
        }
    }
    append(name, value = null) {
        this._params.put(name, value);
    }
    delete(name) {
        this._params.delete(name);
    }
    get(name) {
        const [first] = this._params.get(name);
        if (first !== undefined) {
            return first;
        }
        return null;
    }
    getAll(name) {
        return this._params.get(name);
    }
    keys() {
        return this._params.keys();
    }
    toString() {
        const rtn = [];
        this._params.forEach((key, value) => {
            if (value === null) {
                rtn.push(key);
            }
            else {
                rtn.push(key + '=' + value);
            }
        });
        return rtn.join('&');
    }
}
