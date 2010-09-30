/*
    cujo base
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo');

if (!window.cujoConfig)
    window.cujoConfig = {};

//  cujoConfig params
//      noCssTransExt: don't look for extensions to css transitions in css files
//      ieHtml5Tags: the list of html5 tags to pre-define for IE

(function () {

var
    d = dojo,
    toString = Object.prototype.toString,
    // grab a reference to the real dojo.provide and dojo._xdResourceLoaded (we're gonna hijack them!)
    origDojoProvide = d.provide,
    origXdLoaded = d._xdResourceLoaded,
    // set of modules being waited for (hashmap of arrays of waiters)
    waitees = {},
    // flag to ignore the current dojo.provide (the dojo xd loader is so messed up)
    xdIgnore = false,
    // unfortunately, dojo's xd loader doesn't allow us to determine when modules are loaded
    // so we have to track them separately:
    loadedModules = {};

if (!dojo._isXDomain) {
    // if this isn't xd, we can trust that modules already in dojo._loadedModules are truly loaded
    var m = d._loadedModules;
    for (var p in m) {
        loadedModules[p] = m.hasOwnProperty(p);
    }
}

/***** core cujo functions *****/

// can't use many dojo functions (or any cujo stuff) in here since it's likely not loaded, yet!

// hijack dojo.provide to detect loading of modules
d.provide = function (/*String*/ resourceName) {
    // do dojo stuff (use apply to future-proof: in case dojo adds new arguments)
    var result = origDojoProvide.apply(d, arguments);
    // if we're not being called by the dumb-ass dojo._xdResourceLoaded function
    if (!xdIgnore) {
        loadedModules[resourceName] = true;
        // iterate waiters (if any)
        var waiters = waitees[resourceName];
        if (waiters) {
            // get the new list of active waiters (waiters are removed once executed)
            var active = [],
                i = waiters.length;
            while (--i >= 0) {
                var waiter = waiters[i];
                // decrement waiter and see if it's no longer waiting (count == 0)
                if (--waiter.count == 0) {
                    // execute waiter func
                    execWaiter(waiter);
                }
                else {
                    // waiter is still sctive, add to newList
                    active[active.length] = waiter;
                }
            }
            // if there are no more waiters, remove the waitee entry from the hashmap
            if (active.length == 0) {
                delete waitees[resourceName];
            }
            else {
                waitees[resourceName] = active;
            }
        }
    }
    return result;
};

if (origXdLoaded) {
    dojo._xdResourceLoaded = function () {
        xdIgnore = true;
        try {
            var result = origXdLoaded.apply(dojo, arguments);
        }
        finally {
            xdIgnore = false;
        }
        return result;
    }
}

function isArray (o) {
    return toString.call(o) == '[object Array]';
}

function isString (o) {
    return toString.call(o) == '[object String]';
}

cujo.isLoaded = function (/* Array|String */ moduleNames) {
    var result = true;
    if (!isArray(moduleNames)) {
        result = loadedModules[moduleNames];
    }
    else {
        var i = moduleNames.length;
        while (--i >= 0 && result) {
            result = loadedModules[moduleNames[i]];
        }
    }
    return !!result;
};

cujo.wait = function (/* Array|String */ moduleNames, /* Function */ func, /* Object? */ context) {
    // TODO: return a promise instead of taking a function and a context
    // ensure that the moduleNames argument is an array
    if (!isArray(moduleNames)) {
        moduleNames = [moduleNames];
    }
    // create function tracker (aka "waiter") object
    var waiter = {
            func: func,
            context: context,
            count: moduleNames.length // we need to wait for all modules
        };
    // for each module
    var i = moduleNames.length;
    while (--i >= 0) {
        var moduleName = moduleNames[i];
        // if module is already loaded
        if (loadedModules[moduleName]) {
            waiter.count--;
        }
        else {
            // add module name to hashmap if it doesn't already exist
            if (!waitees[moduleName]) {
                waitees[moduleName] = [waiter];
            }
            else {
                waitees[moduleName].push(waiter);
            }
        }

    }
    // if all the modules are already loaded
    if (waiter.count == 0) {
        execWaiter(waiter);
    }
};

function execWaiter (waiter) {
    var context = waiter.context || d.global,
        func = isString(waiter.func) ? context[waiter.func] : waiter.func;
    // setTimeout assures that the resource has been fully defined
    // and exceptions don't interrupt the current execution "thread"
    // TODO: catch exceptions and rethrow them with a better debugging message
    setTimeout(function () { func.call(context); }, 0);
}

function Promise (canceler) {
    // creates a simple, promise-like interface until dojo.Deferred is available
    var dfd,
        thens = [],
        resolution,
        result;
    this.then = function (resolved, error, progress) {
        thens.push({resolved: resolved, error: error, progress: progress});
        return this;
    };
    this.cancel = function () { complete('cancel'); };
    this.resolve = function (res) { complete('resolve', res); };
    this.reject = function (err) { complete('reject', err); };
    function complete (type, res) {
        resolution = type;
        result = res;
        // did dojo.Deferred load before we had a resolution? if so, execute
        if (dfd) {
            dfd[resolution](result);
        }
    }
    function defaultCanceler () { return 'Promise canceled.'; }
    // wait for dojo.Deferred
    cujo.wait('dojo._base.Deferred', function () {
        dfd = new dojo.Deferred(canceler || defaultCanceler),
            chain = dfd;
        for (var i = 0, len = thens.length; i < len; i++) {
            var then = thens[i];
            chain = chain.then(then.resolved, then.error, then.progress);
        }
        // did we get a resolution before dojo.Deferred loaded? if so, execute
        if (resolution) {
            dfd[resolution](result);
        }
    });
}

cujo.Promise = Promise;

cujo._loadedCss = [];

cujo.requireCss = function (/* String */ module, /* Object? */ options) {
    // TODO: work-around IE's 31 stylesheet limit
    // TODO: don't download the same resource more than once in IE (even if cache directives are missing)
    // FF 3.x and Safari 4 won't fetch the css file twice if we xhr it after creating the link element
    // TODO: test Opera, Chrome, and 3.0 browsers

    var opts = dojo.mixin({}, cujo.cssxOptions, options),
        lastDot = module.lastIndexOf('.'),
        path = dojo.moduleUrl(module.substr(0, lastDot)) + module.substr(lastDot + 1) + '.css',
//        path = dojo._getModuleSymbols(module).join("/") + '.css',
        //themePath = dojo.moduleUrl('', [cujo._moduleToThemePath(module, 'css'), 'css'].join('.')),
        attrs = {
            rel: 'stylesheet',
            type: 'text/css',
            href: path
        },
        promise = new Promise(function () { return 'requireCss canceled: ' + module; });

    // create link node
    var link = getDoc().createElement('link'),
        id = 'cujoCss' + cujo._loadedCss.length;
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', path);
    link.setAttribute('id', id);
    cujo._getHeadElement().appendChild(link);

    // TODO: change this so that the dev can wait for just xhr if cssx is turned off?
    cujo.wait(['dojo._base.xhr', 'cujo._base.cssx'], function () {

        var dfd = dojo.xhr('GET', {url: path, sync: false});

        if (false !== opts.cssx) {
            dfd
                .addCallback(function (resp) {
                    // TODO: when can we get rid of this bulky memory waster?
                    cujo._loadedCss[id] = cujo._loadedCss.push({
                        id: id,
                        node: link,
                        module: module,
                        options: options,
                        cssText: resp
                    });
                    cujo.cssx.processCss(resp, opts);
                    promise.resolve({link: link, cssText: resp});
                })
                .addErrback(function (err) {
                    cujo._loadedCss[id].error = err;
                    promise.reject(err);
                });
        }

    });

    return promise;

};

// TODO: cujo.requireHtml
cujo.requireHtml = function (/* String */ module, /* Object? */ options) {};

cujo.getHtml = function (/* String */ module) {
    // TODO: incorporate i18n and theming
    var lastDot = module.lastIndexOf('.'),
        path = [module.substr(0, lastDot), module.substr(lastDot + 1)];
    return dojo.cache(path[0], path[1] + '.html');
    //return dojo.cache('', [cujo._moduleToThemePath(module, 'html'), 'html'].join('.'));
};

cujo.setThemePath = function (/* String */ name, /* String */ type, /* String */ path, /* Object? */ options) {
//    options = dojo.mixin({}, defaultDef.options, options);
//    if (path.substr(path.length - 1) != '/') {
//        path = path + '/';
//    }
//    var defs = themeDefs[name];
//    if (!defs) {
//        defs = themeDefs[name] = {};
//    }
//    defs[type] = { path: path, options: options };
};

cujo.setTheme = function (/* String */ name) {
//    theme = name;
};

cujo.getThemePath = cujo._moduleToThemePath = function (/* String */ module, /* String */ type) {
//    var defs = themeDefs[theme],
//        path = defs[type].path;
//    if (defs[type].options.expand) {
//        module = module.replace(/\./g, '/');
//    }
//    return path + module;
};

cujo._getHeadElement = function (/* DOMDocument? */ doc) {
    //  summary:
    //      Finds the HEAD element (or the body element if the head wasn't found).
    //  doc: DOMDocument?
    //      Searches the supplied document, or the currently-scoped dojo document if omitted.
    doc = doc || getDoc();
    var node = doc.documentElement.firstChild;
    while (node && (node.nodeType != 1 || !node.tagName.match(/head|body/i))) {
        node = node.nextSibling;
    }
    return node;
};

function getDoc () {
    return dojo.doc || window['document'];
}

var theme = 'default',
    defaultDef = {path: './', options: {expand: true}},
    themeDefs = {
        'default': {
            css: defaultDef,
            html: defaultDef,
            img: defaultDef
        }
    };

})();

// Note: don't abbreviate here: the builder script will not see these without the full 'dojo.require'
dojo.require('cujo._base.lang');
dojo.require('cujo._base.notify');
dojo.require('cujo._base.dom');
dojo.require('cujo._base.sniff');
dojo.require('cujo._base.stylesheet');
dojo.require('cujo._base.CssTextParser');
dojo.require('cujo._base.CssDomParser');
dojo.require('cujo._base.cssx');

dojo.require('cujo._base.cssx.alpha');
dojo.require('cujo._base.cssx.transition');

/* IE shims */
// Note: it *IS* ok to sniff for older versions of IE.  Only a noob would claim otherwise.

if (dojo.isIE < 9) {

    //  Add HTML5 tags to IE's DOM implementation.
    //  I learned this concept from Paul Irish. http://paulirish.com/
    //  To modify and/or reduce this set, specify them in cujoConfig.ieHtml5Tags.
    //  Note: this cannot be moved to a dojo.require since it absolutely has to run before the BODY
    //      tag is rendered.  In cross-domain or debug situations, this is not guaranteed with dojo.require.
    (cujoConfig.ieHtml5Tags||'abbr,article,aside,audio,canvas,datalist,details,dialog,eventsource,figure,footer,header,hgroup,mark,menu,meter,nav,output,progress,section,time,video').replace(/[^,]+/g,function(n){document.createElement(n);return n});

    // Note: these files are always dynamically loaded, unless you explicitly place them into a build!
    dojo['require']('cujo._base.cssx.ieSelector');
        dojo['require']('cujo._base.cssx.ieLayout');

}
