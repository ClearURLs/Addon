"use strict";

const { decodeRedirectTarget, compileDeclaredRedirect } = (() => {
    const modules = new Map();
    function define(name, dependencies, factory) {
        const exports = {};
        const imports = dependencies.map(dependency => {
            if (dependency === "require") return undefined;
            if (dependency === "exports") return exports;
            if (!modules.has(dependency)) throw new Error("Unsupported redirect module dependency: " + dependency);
            return modules.get(dependency);
        });
        factory(...imports);
        modules.set(name, exports);
    }

/*
 * ClearURLs
 * Copyright (c) 2017-2026 Kevin Röbert.
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
define("redirect/percentEscapes", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodePercent = decodePercent;
    function decodePercent(value) {
        try {
            return decodeURIComponent(value);
        }
        catch (_a) {
            return null;
        }
    }
});
/*
 * ClearURLs
 * Copyright (c) 2017-2026 Kevin Röbert.
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
define("redirect/url", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.urlComponentBoundary = void 0;
    exports.isValidRedirectInput = isValidRedirectInput;
    exports.parseUrlWithHost = parseUrlWithHost;
    const rawControls = /[\u0000-\u001f\u007f-\u009f]/;
    const unpairedSurrogate = /[\ud800-\udbff](?![\udc00-\udfff])|(?:^|[^\ud800-\udbff])[\udc00-\udfff]/;
    exports.urlComponentBoundary = /[/\\?#]/;
    function isValidRedirectInput(value) {
        return value.length > 0 && !rawControls.test(value) && !unpairedSurrogate.test(value);
    }
    // Use the parsed URL for validation while retaining the captured text for redirects.
    function parseUrlWithHost(value) {
        try {
            const url = new URL(value);
            return url.hostname ? url : null;
        }
        catch (_a) {
            return null;
        }
    }
});
/*
 * ClearURLs
 * Copyright (c) 2017-2026 Kevin Röbert.
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
define("redirect/declared", ["require", "exports", "redirect/percentEscapes", "redirect/url"], function (require, exports, percentEscapes_1, url_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRedirectOperation = getRedirectOperation;
    exports.validateDeclaredTarget = validateDeclaredTarget;
    exports.decodeDeclaredRedirect = decodeDeclaredRedirect;
    const httpPrefix = /^https?:\/\//i;
    const schemePrefix = /^[a-z][a-z\d+.-]*:/i;
    const bareHostWithPort = /^(?:[^:]+\.[^:]*|localhost):\d+$/i;
    function decodeBase64(value, format) {
        if (value === '') {
            return '';
        }
        const urlSafe = format === 'base64url';
        const alphabet = urlSafe ? /^[a-z\d_-]+={0,2}$/i : /^[a-z\d+/]+={0,2}$/i;
        if (!alphabet.test(value))
            return null;
        const input = urlSafe ? value.replace(/-/g, '+').replace(/_/g, '/') : value;
        try {
            const binary = atob(input);
            const canonical = btoa(binary);
            // A round trip checks padding and unused bits. Base64url also permits omitted padding.
            if (input !== canonical && (!urlSafe || input !== canonical.replace(/=+$/, '')))
                return null;
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
            return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
        }
        catch (_a) {
            return null;
        }
    }
    function encodeBase64(value) {
        const bytes = new TextEncoder().encode(value);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binary);
    }
    const operations = {
        urlDecode: percentEscapes_1.decodePercent,
        formDecode: (value) => (0, percentEscapes_1.decodePercent)(value.replace(/\+/g, ' ')),
        base64Decode: (value) => decodeBase64(value, 'base64'),
        base64UrlDecode: (value) => decodeBase64(value, 'base64url'),
        urlEncode: encodeURIComponent,
        base64Encode: encodeBase64,
    };
    function isOperationName(name) {
        return Object.prototype.hasOwnProperty.call(operations, name);
    }
    function getRedirectOperation(name) {
        return typeof name === 'string' && isOperationName(name)
            ? operations[name]
            : undefined;
    }
    function applyDecodeStep(value, step) {
        switch (step) {
            case 'percent': return operations.urlDecode(value);
            case 'form': return operations.formDecode(value);
            case 'base64': return operations.base64Decode(value);
            case 'base64url': return operations.base64UrlDecode(value);
            default: return null;
        }
    }
    function completeMissingScheme(value, scheme) {
        var _a;
        const networkPath = value.startsWith('//');
        const rest = networkPath ? value.slice(2) : value;
        const authority = (_a = rest.split(url_1.urlComponentBoundary, 1)[0]) !== null && _a !== void 0 ? _a : '';
        if (!authority)
            return null;
        if (!networkPath) {
            // In a bare authority, a dotted host or localhost can use a numeric port.
            if (authority.includes('@') || (schemePrefix.test(value) && !bareHostWithPort.test(authority)))
                return null;
        }
        const target = networkPath ? scheme + ':' + value : scheme + '://' + value;
        const parsed = (0, url_1.parseUrlWithHost)(target);
        return parsed && !/^\.+$/.test(parsed.hostname) ? target : null;
    }
    function validateDeclaredTarget(value, defaultScheme) {
        if (!(0, url_1.isValidRedirectInput)(value)) {
            return null;
        }
        if (httpPrefix.test(value)) {
            return (0, url_1.parseUrlWithHost)(value) ? value : null;
        }
        return defaultScheme === undefined ? null : completeMissingScheme(value, defaultScheme);
    }
    function decodeDeclaredRedirect(value, options) {
        const { decode: steps, defaultScheme } = options;
        const supportedScheme = defaultScheme === undefined || defaultScheme === 'http' || defaultScheme === 'https';
        if (!Array.isArray(steps) || !supportedScheme)
            return null;
        for (const step of steps) {
            const decoded = applyDecodeStep(value, step);
            // Each declared layer can expose raw controls before the target is parsed.
            if (decoded === null || !(0, url_1.isValidRedirectInput)(decoded))
                return null;
            value = decoded;
        }
        return validateDeclaredTarget(value, defaultScheme);
    }
});
define("redirect/declaredRule", ["require", "exports", "redirect/declared", "redirect/url"], function (require, exports, declared_1, url_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.compileRedirectRule = compileRedirectRule;
    const ruleFields = ['id', 'match', 'preprocessors', 'replacePattern', 'defaultScheme'];
    const matcherFields = ['regex', 'caseSensitive'];
    const preprocessorFields = ['type', 'inputs'];
    const maxPreprocessors = 16;
    function isRecord(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
    function readOwn(record, key) {
        return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
    }
    function hasOnlyFields(record, fields) {
        return Object.keys(record).every(key => fields.indexOf(key) >= 0);
    }
    function compileMatcher(value) {
        if (!isRecord(value) || !hasOnlyFields(value, matcherFields)) {
            return null;
        }
        const pattern = readOwn(value, 'regex');
        const caseSensitive = readOwn(value, 'caseSensitive');
        const isValidCasing = caseSensitive === undefined || typeof caseSensitive === 'boolean';
        if (typeof pattern !== 'string' || !pattern || !isValidCasing) {
            return null;
        }
        try {
            return { pattern, expression: new RegExp(pattern, caseSensitive === false ? 'i' : '') };
        }
        catch (_a) {
            return null;
        }
    }
    function compileInputs(inputs) {
        if (inputs === 'all') {
            return 'all';
        }
        if (!Array.isArray(inputs)) {
            return null;
        }
        const indexes = new Set();
        for (const index of inputs) {
            if (typeof index !== 'number' || !Number.isSafeInteger(index) || index < 1 || indexes.has(index - 1)) {
                return null;
            }
            // Catalog capture numbers start at one. Match arrays passed to the resolver start at zero.
            indexes.add(index - 1);
        }
        return Array.from(indexes);
    }
    function compilePreprocessors(value) {
        if (value === undefined) {
            return [];
        }
        if (!Array.isArray(value) || value.length > maxPreprocessors) {
            return null;
        }
        const steps = [];
        for (const step of value) {
            if (!isRecord(step) || !hasOnlyFields(step, preprocessorFields)) {
                return null;
            }
            const transform = (0, declared_1.getRedirectOperation)(readOwn(step, 'type'));
            const inputs = compileInputs(readOwn(step, 'inputs'));
            if (transform === undefined || inputs === null) {
                return null;
            }
            steps.push({ transform, inputs });
        }
        return steps;
    }
    function compileTemplate(value) {
        const template = value === undefined ? '§1§' : value;
        if (typeof template !== 'string' || !(0, url_2.isValidRedirectInput)(template)) {
            return null;
        }
        const parts = [];
        const placeholders = /§(\d+)§/g;
        let cursor = 0;
        for (let match = placeholders.exec(template); match !== null; match = placeholders.exec(template)) {
            const captureNumber = Number(match[1]);
            if (!Number.isSafeInteger(captureNumber) || captureNumber < 1) {
                return null;
            }
            parts.push(template.slice(cursor, match.index), { captureIndex: captureNumber - 1 });
            cursor = placeholders.lastIndex;
        }
        parts.push(template.slice(cursor));
        return parts;
    }
    function compileRecipe(rule) {
        const defaultScheme = readOwn(rule, 'defaultScheme');
        if (defaultScheme !== undefined && defaultScheme !== 'http' && defaultScheme !== 'https') {
            return null;
        }
        const preprocessors = compilePreprocessors(readOwn(rule, 'preprocessors'));
        const template = compileTemplate(readOwn(rule, 'replacePattern'));
        return preprocessors === null || template === null ? null : { defaultScheme, preprocessors, template };
    }
    function isSafeCapture(value) {
        // An empty participating group is meaningful when the template supplies the URL structure.
        return typeof value === 'string' && (value === '' || (0, url_2.isValidRedirectInput)(value));
    }
    function applyPreprocessor(captures, step) {
        const indexes = step.inputs === 'all' ? captures.keys() : step.inputs;
        for (const index of indexes) {
            if (index >= captures.length) {
                return false;
            }
            const capture = captures[index];
            if (capture === undefined) {
                continue;
            }
            const transformed = step.transform(capture);
            if (transformed === null || !isSafeCapture(transformed)) {
                return false;
            }
            captures[index] = transformed;
        }
        return true;
    }
    function renderTemplate(parts, captures) {
        let target = '';
        for (const part of parts) {
            if (typeof part === 'string') {
                target += part;
                continue;
            }
            const capture = captures[part.captureIndex];
            if (capture === undefined) {
                return null;
            }
            target += capture;
        }
        return target;
    }
    function resolveTarget(recipe, captures) {
        if (captures.some(capture => capture !== undefined && !isSafeCapture(capture))) {
            return null;
        }
        const processed = [...captures];
        for (const step of recipe.preprocessors) {
            if (!applyPreprocessor(processed, step)) {
                return null;
            }
        }
        const target = renderTemplate(recipe.template, processed);
        return target === null ? null : (0, declared_1.validateDeclaredTarget)(target, recipe.defaultScheme);
    }
    /** Compile a catalog redirect without retaining mutable input configuration. */
    function compileRedirectRule(input) {
        if (!isRecord(input) || !hasOnlyFields(input, ruleFields)) {
            return null;
        }
        const id = readOwn(input, 'id');
        if (typeof id !== 'string' || !/^[a-z0-9_-]+$/.test(id)) {
            return null;
        }
        const matcher = compileMatcher(readOwn(input, 'match'));
        const recipe = compileRecipe(input);
        if (matcher === null || recipe === null) {
            return null;
        }
        return Object.assign(Object.assign({ id }, matcher), { resolve: captures => resolveTarget(recipe, captures) });
    }
});
/*
 * ClearURLs
 * Copyright (c) 2017-2026 Kevin Röbert.
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
define("redirect/legacy", ["require", "exports", "redirect/percentEscapes", "redirect/url"], function (require, exports, percentEscapes_2, url_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.decodeLegacyRedirect = decodeLegacyRedirect;
    const httpPrefix = /^https?:\/\//i;
    const networkScheme = /^[a-z][a-z\d+.-]*:[/\\]{2}/i;
    const knownScheme = /^(?:https?|about|blob|data|file|ftp|geo|javascript|mailto|sms|tel|urn|ws|wss):/i;
    const incompleteHttpTarget = /^https?(?:-[^/?#\\]*)?$/i;
    const encodedBareQueryWithFF = /^(https?:\/\/[^%/?#\\]+)%3F([a-z\d_.~-]+%FF)%26([a-z\d_.~-]+)%3D([a-z\d_.~-]+)$/i;
    function validateLegacyTarget(value) {
        if (httpPrefix.test(value))
            return (0, url_3.parseUrlWithHost)(value) ? value : null;
        // Incomplete HTTP URLs can resolve relative to the wrapper. Other schemes
        // must not be completed as HTTP authorities.
        if (networkScheme.test(value) || knownScheme.test(value))
            return null;
        const networkPath = value.startsWith('//');
        if (!networkPath && /^[/\\]/.test(value))
            return null;
        const target = (networkPath ? 'http:' : 'http://') + value;
        return (0, url_3.parseUrlWithHost)(target) ? target : null;
    }
    /** Use the published legacy percent-decoding behavior for regex-only rules. */
    function decodeLegacyRedirect(capture) {
        let value = capture;
        while ((0, url_3.isValidRedirectInput)(value) && !incompleteHttpTarget.test(value)) {
            const decoded = (0, percentEscapes_2.decodePercent)(value);
            if (decoded === null) {
                // The retained bare-query exception restores its delimiters without decoding %FF.
                const repaired = value.replace(encodedBareQueryWithFF, '$1?$2&$3=$4');
                return repaired !== value ? validateLegacyTarget(repaired) : null;
            }
            if (decoded === value)
                return validateLegacyTarget(value);
            value = decoded;
        }
        return null;
    }
});
/*
 * ClearURLs
 * Copyright (c) 2017-2026 Kevin Röbert.
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
define("decodeRedirectTarget", ["require", "exports", "redirect/declared", "redirect/declaredRule", "redirect/legacy", "redirect/url"], function (require, exports, declared_2, declaredRule_1, legacy_1, url_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.compileDeclaredRedirect = compileDeclaredRedirect;
    exports.decodeRedirectTarget = decodeRedirectTarget;
    /** Compile an explicit catalog redirect into a matcher and a target resolver. */
    function compileDeclaredRedirect(rule) {
        return (0, declaredRule_1.compileRedirectRule)(rule);
    }
    /**
     * Decode a redirect capture using the published legacy behavior by default.
     * Options limit decoding to the declared steps and optional scheme completion.
     * An unusable target returns null so the caller can try the next redirect rule.
     */
    function decodeRedirectTarget(capture, options) {
        if (typeof capture !== 'string' || !(0, url_4.isValidRedirectInput)(capture))
            return null;
        if (options === undefined)
            return (0, legacy_1.decodeLegacyRedirect)(capture);
        return options ? (0, declared_2.decodeDeclaredRedirect)(capture, options) : null;
    }
});

    return modules.get("decodeRedirectTarget");
})();
