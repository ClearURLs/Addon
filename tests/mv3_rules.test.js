const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function createContext() {
    const updates = [];
    const existingRules = [
        {id: 7, action: {type: "redirect"}},
        {id: 99999, action: {type: "modifyHeaders"}}
    ];
    const context = {
        URL,
        TextEncoder,
        console: {
            log() {},
            warn() {},
            error() {}
        },
        storage: {
            ClearURLsData: {providers: {}},
            globalStatus: true,
            referralMarketing: false,
            domainBlocking: true,
            pingBlocking: true,
            localHostsSkipping: true,
            eTagFiltering: true
        },
        chrome: {
            declarativeNetRequest: {
                isRegexSupported: async () => ({isSupported: true}),
                getDynamicRules: async () => existingRules,
                updateDynamicRules: async update => updates.push(update),
                onRuleMatchedDebug: {addListener() {}}
            },
            runtime: {
                getURL: value => "chrome-extension://test/" + value
            }
        },
        getOrDefault: (object, key, fallback) =>
            object[key] === undefined ? fallback : object[key],
        getBrowser: () => "Chrome",
        handleError() {},
        loadOldDataFromStore() {},
        setBadgedStatus() {},
        saveOnExit: async () => undefined,
        changeIcon() {},
        storeHashStatus() {},
        saveOnDisk: async () => undefined,
        ensureStorageLoaded: async () => undefined,
        increaseTotalCounter() {},
        increaseBadged() {},
        localDataHash: "",
        fetch: async () => {
            throw new Error("Network access is not expected in unit tests");
        }
    };
    vm.createContext(context);
    vm.runInContext(
        fs.readFileSync(path.join(projectRoot, "clearurls.js"), "utf8"),
        context,
        {filename: "clearurls.js"}
    );
    return {context, updates};
}

function addSampleProviders(context) {
    context.storage.ClearURLsData = {
        providers: {
            cleaner: {
                urlPattern: "^https?://example\\.com/",
                rules: ["utm_source", "utm_.*"],
                referralMarketing: ["ref"],
                exceptions: ["^https?://example\\.com/allowed"],
                redirections: ["^https?://example\\.com/out\\?url=(.*)$"],
                rawRules: ["/ref=[^?]+"],
                methods: ["GET"]
            },
            blocker: {
                urlPattern: "^https?://tracker\\.example/",
                completeProvider: true
            }
        }
    };
    context.createProviders();
}

function applyRegexRedirect(rule, url) {
    const expression = new RegExp(rule.condition.regexFilter, "i");
    const replacement = rule.action.redirect.regexSubstitution.replace(
        /\\([0-9])/g,
        (match, digit) => "$" + digit
    );
    return expression.test(url) ? url.replace(expression, replacement) : url;
}

test("DNR generation preserves settings and provider semantics", () => {
    const {context} = createContext();
    addSampleProviders(context);

    const rules = context.collectDeclarativeNetRequestRules();
    const parameterRule = rules.find(
        rule => rule.action.redirect?.transform?.queryTransform
    );
    const exceptionRule = rules.find(rule => rule.action.type === "allow" && rule.priority === 1000);
    const blockRule = rules.find(rule => rule.action.type === "block" && rule.condition.regexFilter?.includes("tracker"));
    const blockedPageRule = rules.find(rule =>
        rule.action.redirect?.regexSubstitution?.includes("siteBlockedAlert.html")
    );

    assert.deepEqual(
        Array.from(parameterRule.action.redirect.transform.queryTransform.removeParams),
        ["utm_source", "ref"]
    );
    assert.equal(parameterRule.condition.requestMethods[0], "get");
    assert.ok(exceptionRule, "provider exceptions become higher-priority allow rules");
    assert.ok(blockRule, "complete providers block when domain blocking is enabled");
    assert.deepEqual(Array.from(blockedPageRule.condition.resourceTypes), ["main_frame"]);
    assert.ok(rules.some(rule => rule.priority === 2000), "local network traffic is allowed");
    assert.equal(
        rules.filter(rule => rule.condition.regexFilter?.includes("utm_.*")).length,
        2,
        "regex parameter names use scoped first/middle and last-parameter rewrites"
    );
    assert.ok(
        rules.some(rule => rule.condition.regexFilter?.includes("/ref=")),
        "raw rewrites remain scoped to their provider"
    );
    assert.ok(
        rules.some(rule => rule.action.redirect?.regexSubstitution?.startsWith(
            "chrome-extension://test/html/redirect.html?target="
        )),
        "captured redirect targets pass through the bundled decoder"
    );

    const regexParameterRules = rules.filter(
        rule => rule.condition.regexFilter?.includes("utm_.*")
    );
    assert.equal(
        regexParameterRules.reduce(
            (url, rule) => applyRegexRedirect(rule, url),
            "https://example.com/?a=1&utm_other=x&b=2"
        ),
        "https://example.com/?a=1&b=2"
    );
    assert.equal(
        regexParameterRules.reduce(
            (url, rule) => applyRegexRedirect(rule, url),
            "https://example.com/?a=1&utm_other=x"
        ),
        "https://example.com/?a=1"
    );

    const rawRule = rules.find(rule => rule.condition.regexFilter?.includes("/ref="));
    assert.equal(
        applyRegexRedirect(rawRule, "https://example.com/item/ref=tracking?item=1"),
        "https://example.com/item?item=1"
    );

    context.storage.globalStatus = false;
    assert.equal(context.collectDeclarativeNetRequestRules().length, 0);

    context.storage.globalStatus = true;
    context.storage.domainBlocking = false;
    assert.ok(!context.collectDeclarativeNetRequestRules().some(
        rule => rule.action.type === "block" && rule.condition.regexFilter?.includes("tracker")
    ));
});

test("DNR rebuild preserves the reserved ETag rule", async () => {
    const {context, updates} = createContext();
    addSampleProviders(context);

    await context.buildDeclarativeNetRequestRules();
    assert.deepEqual(Array.from(updates[0].removeRuleIds), [7]);
    assert.ok(updates[0].addRules.length > 0);
    assert.ok(!updates[0].addRules.some(rule => rule.id === 99999));
});

test("ETag setup uses the reserved rule without replacing cleaning rules", async () => {
    const {context, updates} = createContext();
    vm.runInContext(
        fs.readFileSync(path.join(projectRoot, "core_js/eTagFilter.js"), "utf8"),
        context,
        {filename: "core_js/eTagFilter.js"}
    );
    await context.setupETagFilter();
    const update = updates.at(-1);
    assert.deepEqual(Array.from(update.removeRuleIds), [99999]);
    assert.equal(update.addRules[0].id, 99999);
});

test("production request observer recognizes DNR redirects and blocks", () => {
    const {context} = createContext();
    addSampleProviders(context);
    const event = {addListener() {}};
    context.browser = {
        runtime: {
            getURL: value => "chrome-extension://test/" + value
        },
        webRequest: {
            onBeforeRequest: event,
            onBeforeRedirect: event,
            onErrorOccurred: event
        }
    };
    context.increaseBadged = () => undefined;
    context.pureCleaning = url => {
        const parsed = new URL(url);
        [...parsed.searchParams.keys()]
            .filter(key => key.startsWith("utm_"))
            .forEach(key => parsed.searchParams.delete(key));
        return parsed.toString();
    };
    vm.runInContext(
        fs.readFileSync(path.join(projectRoot, "core_js/requestObserver.js"), "utf8"),
        context,
        {filename: "core_js/requestObserver.js"}
    );

    assert.equal(context.isClearUrlsRedirect({
        url: "https://example.com/?utm_source=x&utm_other=y",
        redirectUrl: "https://example.com/?utm_other=y",
        method: "GET",
        type: "main_frame"
    }), true);
    assert.equal(context.wouldBlockRequest({
        url: "https://tracker.example/pixel",
        method: "GET",
        type: "image"
    }), true);
});

test("production catalog stays within dynamic DNR limits", {
    skip: !process.env.CLEARURLS_RULE_CATALOG
}, async () => {
    const {context} = createContext();
    context.storage.ClearURLsData = JSON.parse(
        fs.readFileSync(process.env.CLEARURLS_RULE_CATALOG, "utf8")
    );
    context.createProviders();

    const candidates = context.collectDeclarativeNetRequestRules();
    candidates
        .filter(rule => rule.condition.regexFilter)
        .forEach(rule => assert.doesNotThrow(() => new RegExp(rule.condition.regexFilter)));
    const finalRules = await context.enforceDeclarativeNetRequestLimits(candidates);
    assert.ok(finalRules.length < 1000, "catalog fits the regex-rule ceiling");
    assert.ok(
        finalRules.filter(rule => rule.action.type === "redirect").length < 5000,
        "catalog fits the unsafe dynamic-rule ceiling"
    );
    assert.ok(
        finalRules.some(rule =>
            rule.condition.regexFilter?.includes("[0-9a-f]+") &&
            rule.condition.regexFilter.includes("v1")
        ),
        "the 64-character MozAWS hash is normalized for Chrome RE2"
    );
    assert.ok(!finalRules.some(rule =>
        rule.condition.regexFilter?.includes("[0-9a-f]{64}")
    ));
});

test("bundled redirect page decodes and validates captured destinations", () => {
    let destination;
    const context = vm.createContext({
        URL,
        decodeURIComponent,
        console: {error() {}},
        window: {
            location: {
                href: "chrome-extension://test/html/redirect.html?target=" +
                    "https%253A%252F%252Fexample.com%252Fpage%253Fa%253D1%2523section",
                replace(value) {
                    destination = value;
                }
            }
        }
    });
    vm.runInContext(
        fs.readFileSync(path.join(projectRoot, "core_js/redirect.js"), "utf8"),
        context,
        {filename: "core_js/redirect.js"}
    );
    assert.equal(destination, "https://example.com/page?a=1#section");
});
