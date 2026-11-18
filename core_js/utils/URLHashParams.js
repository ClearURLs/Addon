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
        // Null entries retain empty segments without exposing them as keys.
        Object.defineProperty(this, "_params", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._params = [];
        const hash = url.hash.slice(1);
        const params = hash === '' ? [] : hash.split('&');
        for (const p of params) {
            if (p === '') {
                this._params.push(null);
                continue;
            }
            const separator = p.indexOf('=');
            const key = separator < 0 ? p : p.slice(0, separator);
            const value = separator < 0 ? null : p.slice(separator + 1);
            this._params.push([key, value]);
        }
    }
    /** Number of segments, including empty segments and duplicate entries. */
    get size() {
        return this._params.length;
    }
    append(name, value = null) {
        this._params.push([name, value]);
    }
    delete(name) {
        this.deleteMatching(key => key === name);
    }
    /** Delete matching entries and report whether any were removed. */
    deleteMatching(predicate) {
        const size = this._params.length;
        this._params = this._params.filter(param => param === null || !predicate(param[0], param[1]));
        return this._params.length < size;
    }
    get(name) {
        for (const param of this._params) {
            if (param !== null && param[0] === name)
                return param[1];
        }
        return null;
    }
    getAll(name) {
        const values = new Set();
        for (const param of this._params) {
            if (param !== null && param[0] === name)
                values.add(param[1]);
        }
        return values;
    }
    keys() {
        const keys = new Set();
        for (const param of this._params) {
            if (param !== null)
                keys.add(param[0]);
        }
        return keys.values();
    }
    toString() {
        const rtn = [];
        this._params.forEach(param => {
            if (param === null) {
                rtn.push('');
            }
            else if (param[1] !== null) {
                rtn.push(param[0] + '=' + param[1]);
            }
            else {
                rtn.push(param[0]);
            }
        });
        return rtn.join('&');
    }
}
