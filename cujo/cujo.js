/*
    cujo base
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
// dojo.provide('cujo');

define('cujo', ['cujo/_base/lang', 'cujo/_base/notify', 'cujo/_base/dom'], function() {
	
if (!window.cujoConfig)
    window.cujoConfig = {};

//  cujoConfig params
//      noCssTransExt: don't look for extensions to css transitions in css files
//      ieHtml5Tags: the list of html5 tags to pre-define for IE

var cujo = window.cujo = {};

// (function () {

var
    d = dojo,
	op = Object.prototype,
    toString = op.toString,
    // grab a reference to the real dojo.provide (we're gonna hijack it!)
    origDojoProvide = d.provide,
    // set of modules being waited for (hashmap of arrays of waiters)
    waitees = {},
    // unfortunately, dojo's xd loader doesn't allow us to determine when modules are loaded
    // so we have to track them separately:
    loadedModules = {},
    // dojo says the document is ready
    isReady;

// mix-in all _base module properties/methods
for (var i = 0, len = arguments.length; i < len; i++) {
	var a = arguments[i];
	for (var p in a) {
		if (!(p in op)) {
			cujo[p] = a[p];
		}
	}
}

var m = d._loadedModules;
for (var p in m) {
    // mark all previously-loaded modules as loaded unless they're still "in flight"
    // Note: the xd loader is so effed up. it overloads the meaning of _xdInFlight depending on configuration
    // here, we specifically want to check if the module is defined in _xdInFlight (not just for a truthy value)
    if (!d._xdInFlight || !(p in d._xdInFlight)) loadedModules[p] = p in m;
}

/***** core cujo functions *****/

// can't use many dojo functions (or any cujo stuff) in here since it's likely not loaded, yet!

// hijack dojo.provide to detect loading of modules
d.provide = function (/*String*/ resourceName) {

    // do dojo stuff
    var result = origDojoProvide.apply(d, arguments);
    
    // if we're not getting a false provide() from the xd loader (since the file is still downloading)
    // Note: the xd loader is so effed up. it overloads the meaning of _xdInFlight depending on configuration
    // here, we specifically want to check if the module has a truthy value
    if (!d._xdInFlight || !d._xdInFlight[resourceName]) {

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
                    // waiter is still active, add to newList
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

function isArray (o) {
    return toString.call(o) == '[object Array]';
}

function isString (o) {
    return toString.call(o) == '[object String]';
}

function getDoc () {
    return dojo.doc || window['document'];
}

function getHead (/* DOMDocument? */ doc) {
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
}
cujo._getHeadElement = getHead;

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
    // setTimeout assures that the resource has been fully defined (needed for xd)
    // TODO: catch exceptions and rethrow them with a better debugging message
    setTimeout(function () { func.call(context); }, 0);
}

function Promise (canceler) {
    //  summary: creates a simple, promise-like interface until dojo.Deferred is available
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

cujo.requireJs = function (/* Array|String */ moduleNames, /* Object? */ options) {
    //  summary:
    //      cujo.requireJs loads one or more javascript files via dojo.require and
    //      returns a promise that resolves when all of the files are loaded.
    //      The files execute in the order they are specified.
    //  options: TBD.
    //  EXPERIMENTAL! This method will not operate correctly during the page load
    //      when using an XD / CDN version of dojo or when the debugAtAllCosts
    //      config option is specified.  
    
    var promise = new Promise();

    var names = isArray(moduleNames) ? moduleNames : [moduleNames];
    for (var i = 0, len = names.length; i < len; i++) {
        dojo['require'](names[i]);
    }

    cujo.wait(moduleNames, function () {
        promise.resolve(moduleNames);
    });

    return promise;

};

cujo._loadedCss = [];

cujo.requireCss = function (/* String */ module, /* Object? */ options) {

    // TODO: work-around IE's 31 stylesheet limit
    // TODO: test Opera, Chrome, and 3.0 browsers

    var opts = dojo.mixin({}, cujo.cssxOptions, options),
        lastDot = module.lastIndexOf('.'),
        path = dojo.moduleUrl(module.substr(0, lastDot).toString()) + module.substr(lastDot + 1) + '.css',
        promise = new Promise(function () { return 'requireCss canceled: ' + module; });

    // check if we've already loaded this css module
    var cssDef = cujo._loadedCss[module];

    if (cssDef) {

        // we've already loaded it
        if (cssDef.link) promise.resolve(cssDef);
        // oops, we already errored
        else if (cssDef.error) promise.reject(cssDef.error);
        // oh hai! ur waiting too? can i shares ur promise?
        else promise = cssDef.promise;

    }
    else {

        cssDef = cujo._loadedCss[module] = cujo._loadedCss[cujo._loadedCss.length] = {
            id: 'cujoCss' + cujo._loadedCss.length,
            path: path,
            module: module,
            options: options,
            promise: promise
        };

        cssDef.link = createLinkNode(cssDef.path);
        cssDef.link.setAttribute('id', cssDef.id);

        if (false !== opts.cssx) {
            /*
                rules:
                - we need to insert the link in order to preserve cascade order (and to preserve @import paths)
                - we need to insert the style after the link in order to preserve order of cssx fixes
                - link requires we use an url
                - style requires raw text

                notes:
                - Firefox and Safari will only request the css file once under normal circumstances, i.e. no-cache
                    (or equiv) headers are not sent.
                - FF and Safari will request the file twice (once for link and once for xhr) if the user hits F5/CMD-R.
                    The second request for the file will return a 304 instead of a full 200 response
                - IE will only request the file once unless no-cache (or equiv) headers are sent.
                - We can extract the cssText from a stylesheet (link or style tag) in IE, but it's IE's modified version,
                    not the original. This could have saved us from having to refetch the file if not for the modification.

                options are:
                - img/onload/canvas?
            */

            cujo.wait(['cujo._base.cssx', 'dojo._base.xhr'], function () {

                var dfd = dojo.xhr('GET', {url: path, sync: false});

                dfd.addCallback(function (resp) {
                    // save the cssText until the document is ready
                    // cssx processors don't process previously-loaded css after the document is ready
                    if (!isReady) cssDef.cssText = resp;
                    // TODO: pass link tag into processCss so style tag can be inserted after it
                    opts.refNode = cssDef.link;
                    opts.position = 'after';
                    cujo.cssx.processCss(resp, opts);
                    promise.resolve(cssDef);
                    delete cssDef.promise;
                })
                .addErrback(function (err) {
                    cssDef.error = err;
                    //console.error(err);
                    promise.reject(err);
                    delete cssDef.promise;
                });

            });

        }
        else {

            promise.resolve(cssDef);

        }

    }

    return promise;

};

dojo.ready(function () {
    isReady = true;
    for (var i = 0, len = cujo._loadedCss.length; i < len; i++) {
        // remove wasted memory
        delete cujo._loadedCss[i].cssText;
    }
});

function createLinkNode (path) {
    // create link node
    var link = getDoc().createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', path);
    getHead().appendChild(link);
    return link;
}

// TODO: cujo.requireHtml
cujo.requireHtml = function (/* String */ module, /* Object? */ options) { cujo.getHtml(module); };

cujo.getHtml = function (/* String */ module) {
    // TODO: incorporate i18n and theming
    var lastDot = module.lastIndexOf('.'),
        path = [module.substr(0, lastDot), module.substr(lastDot + 1)];
    return dojo.cache(path[0], path[1] + '.html');
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

var theme = 'default',
    defaultDef = {path: './', options: {expand: true}},
    themeDefs = {
        'default': {
            css: defaultDef,
            html: defaultDef,
            img: defaultDef
        }
    };

// })();


// require(['cujo/_base/lang']);

// dojo.require('cujo._base.lang');
// dojo.require('cujo._base.notify');
// dojo.require('cujo._base.dom');
// dojo.require('cujo._base.sniff');
// dojo.require('cujo._base.stylesheet');
// dojo.require('cujo._base.CssTextParser');
// dojo.require('cujo._base.CssDomParser');
// dojo.require('cujo._base.cssx');
// 
// dojo.require('cujo._base.cssx.alpha');
// dojo.require('cujo._base.cssx.transition');

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

// In case cujo is required as 'cujo/cujo'
define('cujo/cujo', [], cujo);

return cujo;

});