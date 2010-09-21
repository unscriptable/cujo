/*
    cujo.cssx
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.cssx');
dojo.provide('cujo.cssx');

cujo.cssxOptions = {
    cssx: true,
    cssTrans: true,
    followImports: true
};
// TODO: merge cujoConfig options into cujo.cssxOptions
// TODO: signal onEnd so that processors can free resources

cujo.cssx = cujo._base.cssx = (function () {

    var
        // node for sniffing features. (we need this since the body won't exist until after this runs!)
        testNode,
        // processors waiting to be prepared
        procs = [],
        // processing callbacks
        textCb = {
            onSheet: [],
            onRule: [],
            onEndRule: [],
            onAtRule: [],
            onImport: [],
            onSelector: [],
            onProperty: []
        },
        domCb = {
            onSheet: [],
            onRule: [],
            onImport: [],
            onSelector: [],
            onProperty: []
        },
        textParser,
        domParser,
        // current style sheet being processed
        currText = null,
        currSs,
        // cssx stylesheets (these are typically disabled until needed at run-time)
        cssxSs = {},
        // cssx external props (these couldn't be stored in a stylesheet because they're not supported by the browser)
        cssxProps = {},
        // safety safety safety!
        undefined;

    /***** common private functions *****/

    function assertCallback (methodName) {
        if (currText == null && currSs == null) {
            throw new Error(methodName + ' must be called from within a cssx callback.');
        }
    }

    function assertCssxName (cssxName) {
        if (!cssxName) {
            throw new Error('Cssx processor does not have a cssxName.');
        }
    }

    function sniffProp (propName, testVariants) {
        if (!testNode) {
            testNode = dojo.create('DIV');
        }
        return cujo.sniff.cssProp(propName, testVariants, testNode);
    }

    function sniffVal (propName, testVal, testVariants) {
        if (!testNode) {
            testNode = dojo.create('DIV');
        }
        return cujo.sniff.cssValue(propName, testVal, testVariants, testNode);
    }

    function sniffGcs (propName, testVal, testVariants) {
        if (!testNode) {
            testNode = dojo.create('DIV');
        }
        return cujo.sniff.gcsValue(propName, testVal, testVariants, document.body);
    }

    /* temp to fix issue in which selectors could be split to fix unsupported selectors (IE) */
    // TODO: remove after re-designing cssx
    //var _selSplits = {};
    function saveSplitSelectors (sel, splits) {
        if (!currText._selSplits) currText._selSplits = {};
        currText._selSplits[sel] = splits;
    }
    function getSplitSelectors (sel) {
        if (!currText._selSplits) currText._selSplits = {};
        return currText._selSplits[sel];
    }


    // check which css property we're going to hijack (all support outlineColor, FF supports counter-reset)
    // create functions to process values before inserting or retrieving from css
// TODO: determine JIT (and remove browser sniff), since sniffGcs isn't available at load time
//    if (sniffGcs('counterReset', '_cujo_test 27', false)) {
    if (!dojo.isWebKit) {
        var
            proxyProp = 'counterReset',
            proxyCss = 'counter-reset',
            proxyGet = function (val) { var m = val.match(/cujo-cssx\s+(\d+)/); return m ? parseInt(m[1]) : undefined; },
            proxySet = function (val) { return 'cujo-cssx ' + val; };
    }
    else /*if(proxyProp = sniffProp('animationName', true))*/ {
        // you're extremely unlikely to be using transitions and animations at the same time, so we're hijacking it
        var
            proxyProp = sniffProp('animationName', true),
            proxyCss = cujo.uncamelize(proxyProp), //'animation-name',
            proxyGet = function (val) { return val ? parseInt(val.replace(/^\D*/, '')) : void 0; },
            proxySet = function (val) { console.log('setting', val); return 'cujo-cssx-' + val; };
    }
//    else {
//        throw new Error('Can\'t find a proxy property for css transitions.' );
//    }

    // cssx functions are different for browsers that support expando style objects (IE)
    // the first time any of these functions runs, these variables are set to correct impl

    var hasExpando = function () {
            return dojo.isIE;
            // TODO: get this working:
            /*var node = dojo.body();
            node.style['cujo-test'] = '';
            return !!node.style['cujo-test'];*/
        },
        getCssxSs = function (cssxName) { initCssxFuncs(); return getCssxSs(cssxName); },
        createCssxProp = function (style, name, value) { initCssxFuncs(); return createCssxProp(style, name, value); },
        getCssxValue = function (style, name) { initCssxFuncs(); return getCssxValue(style, name); },
        initCssxFuncs = function () {
            var expando = hasExpando();
            getCssxSs = expando ? _getCurrSs : _getNamedSs;
            createCssxProp = expando ? _setExpandoProp : _setExternalProp;
            getCssxValue = expando ? _getExpandoProp : _getExternalProp;
        };

    // these are the actual impl functions. don't call these directly

    function _getNamedSs (cssxName) {
        var ss = cssxSs[cssxName];
        if (!ss) {
            ss = cssxSs[cssxName] = cujo.stylesheet.createStylesheet();
            ss.disabled = true;
        }
        return ss;
    }

    function _getExternalProp (style, name) {
        var index = proxyGet(style[proxyProp]);
        return index >= 0 && cssxProps[name] && cssxProps[name][index];
    }

    function _setExternalProp (style, name, value) {
        var list = cssxProps[name];
        if (!list) {
            list = cssxProps[name] = [];
        }
        var index = list.length;
        list[index] = value;
        if (style.setProperty) {
            style.setProperty(proxyCss, proxySet(index), 'important');
        }
        else {
            style[proxyProp] = proxySet(index) + ' !important';
        }
    }

    function _getCurrSs (cssxName) {
        return currSs;
    }

    function _getExpandoProp (style, name) {
        try { var val = style[name]; } catch (ex) { val = ''; }
        return val;
    }

    function _setExpandoProp (style, name, value) {
        style[name] = value;
    }

    /***** base classes for creating css processors *****/

    function _TextProc () {}
    _TextProc.prototype = {

        type: 'text',
        activate: true,
        dontSplit: false,
        mediaTypes: null,

        onSheet: function (/* String */ ss) {},
        onRule: function (/* String|Array */ selectors, /* String */ ss) {},
        onEndRule: function (/* String|Array */ selectors, /* String */ ss) {},
        onAtRule: function (/* String */ keyword, /* String */ data, /* Boolean */ hasBlock, /* String */ ss) {},
        onImport: function (/* String */ url, /* String */ media, /* String */ ss) {},
        onSelector: function (/* String */ selector, /* String */ ss) {},
        onProperty: function (/* String */ propName, /* String */ value, /* String|Array */ selectors, /* String */ ss) {},

        appendRule: function (/* String|Array */ selectors, /* String */ propsText) {
            assertCallback('appendRule');
            if (dojo.isArray(selectors)) {
                selectors = selectors.join(',');
            }
            currText.push('\n', selectors, '{', propsText, '}');
        },

        appendText: function (/* String */ rawText) {
            assertCallback('appendText');
            currText.push('\n', rawText);
        },

        sniffCssProp: sniffProp,

        sniffCssValue: sniffVal,

        saveSplitSelectors: saveSplitSelectors,

        getSplitSelectors: getSplitSelectors

    };

    function _DomProc () {}
    _DomProc.prototype = {

        type: 'dom',
        activate: true,
        dontSplit: false,
        skipImports: false,
        cssxName: null,

        onSheet: function (/* CSSStyleSheet */ ss) {},
        onRule: function (/* CSSStyleRule */ rule, /* CSSStyleSheet */ ss) {},
        onImport: function (/* CSSStyleSheet */ importedSheet, /* CSSStyleRule */ rule, /* CSSStyleSheet */ ss) {},
        onSelector: function (/* String */ selectorText, /* CSSStyleRule */ rule, /* CSSStyleSheet */ ss) {},
        onProperty: function (/* String */ propName, /* String */ value, /* CSSStyleRule */ rule, /* CSSStyleSheet */ ss) {},

        appendRule: function (/* String */ selectorText, /* String */ propsText) {
//console.log('dom appendRule', selectorText, '{', propsText, '}');
//alert('dom appendRule' + selectorText + '{' + propsText + '}');
            assertCallback('appendRule');
            var result = cujo.stylesheet.appendRule(selectorText, propsText, currSs);
//alert(currSs.rules[currSs.rules.length - 1].style.cssText);
            return result;
        },

        sniffCssProp: sniffProp,

        sniffCssValue: sniffVal

    };

    function _CssxProc () {}
    _CssxProc.prototype = dojo.mixin(new _TextProc(), {

        createCssxProp: function (/* String */ selectorText, /* String */ name, /* String */ value) {
            assertCallback('createCssxProp');
            assertCssxName(this.cssxName);
            // get stylesheet for this processor
            var ss = getCssxSs(this.cssxName);
            // construct rule
            var rule = cujo.stylesheet.appendRule(selectorText, '', ss);
            createCssxProp(rule.style, name, value);
            return rule;
        }

    });

    function _prepareProcs () {
        // prepare any pending processors
        dojo.forEach(procs, function (proc) {
            if (dojo.isFunction(proc.activate) ? proc.activate() : proc.activate) {
                var isDom = proc.type == 'dom',
                    cbColl = isDom ? domCb : textCb,
                    proto = isDom ? _DomProc.prototype : _TextProc.prototype;
                // loop through all callback types
                for (var n in cbColl)
                    // if this proc has extended the callback, add it
                    if (n in proc && proc[n] !== proto[n])
                        cbColl[n].push(proc);
            }
        });
        // clear out list
        procs = [];
    }

    function _processCss (/* String */ rawText, /* Object */ options) {

        // helper function to loop through procs of a type
        function runProcs (coll, which) {
            return !!coll[which].length && function () {
                var args = arguments;
                dojo.forEach(coll[which], function (proc) {
                    proc[which].apply(proc, args);
                });
            }
        }

        function runImports (coll, which) {
            var procs = runProcs(coll, which);
//            return function (url, media, ss) {
            return function (importedSheet, rule, ss) {
                // TODO: check for correct media type(s) dojo.forEach(rule.media, ...)
                // xhr imported stylesheet and process it, too.
                var url = importedSheet.url;
                if (!url.indexOf('://')) {
                    // get fully-qualified url (curse you, IE!)
                    url = ss.url.substr(0, ss.url.lastIndexOf('/') + 1) + url;
                }
                dojo.xhr('GET', { url: url, sync: false, load: function (resp) { _processCss(resp, options); } });
                // run processors
                if (procs) {
                    procs.apply(null, arguments);
                }
            };
        }

        currText = [];
        currSs = null;

        // create parsers, if they don't already exist
        if (!textParser)
            textParser = new cujo.CssTextParser(dojo.mixin({}, options, {
                context: this,
                onSheet: runProcs(textCb, 'onSheet'),
                onImport: runProcs(textCb, 'onImport'),
                onAtRule: runProcs(textCb, 'onAtRule'),
                onRule: runProcs(textCb, 'onRule'),
                onEndRule: runProcs(textCb, 'onEndRule'),
                onSelector: runProcs(textCb, 'onSelector'),
                onProperty: runProcs(textCb, 'onProperty')
            }));
        if (!domParser)
            domParser = new cujo.CssDomParser(dojo.mixin({}, options, {
                context: this,
                onSheet: runProcs(domCb, 'onSheet'),
                onImport: runImports(domCb, 'onImport'),
                //onAtRule: runProcs(domCb, 'onAtRule'),
                onRule: runProcs(domCb, 'onRule'),
                onSelector: runProcs(domCb, 'onSelector'),
                onProperty: runProcs(domCb, 'onProperty')
            }));

        textParser.parse(rawText);

        currSs = cujo.stylesheet.createStylesheet(currText.join(''));

        // The following hack is brought to you by Firefox 3.0+ which doesn't allow
        // DOM manipulation of stylesheets immediately after text nodes have been inserted.
        // Therefore, we have to parse the rules collection later!
        // IE6 seems to need this to prevent from hanging it
        // TODO: is there any way to sniff the need for this hack?!? ss.rules == null ?
        // TODO: should we create a separate stylesheet instead?
        (function (ss) { setTimeout(function () { domParser.parse(ss); }, 0); })(currSs);

        currText = null;

        return currSs;

    }


    return {

        _TextProc: _TextProc,

        _DomProc: _DomProc,

        _CssxProc: _CssxProc,

        /***** public css processing registration functions *****/

        register: function (/* cujo.cssx._TextProc|cujo.cssx._DomProc */ proc) {
            //  summary: Registers a CSS processor.
            return procs.push(proc);
        },

        processCss: function (/* String */ rawText, /* Object */ options) {
            //  summary: Process a CSS file and add it to the DOM.
            //      Note: files are processed async!

            options = dojo.mixin({}, cujo.cssxOptions, options);

            // stylesheets can't be processed until the following modules are loaded!
            cujo.wait(['dojo._base.html', 'dojo._base.xhr'], function () {
                _prepareProcs();
                _processCss(rawText, options);
            });

        },

        /***** cssx properties *****/

        getCssxValue: function (/* Object */ style, /* String */ key) {
            return getCssxValue(style, key);
        },

        applyCssx: function (/* String */ cssxName) {
            assertCssxName(cssxName);
            var ss = cssxSs[cssxName];
            if (ss) {
                ss.disabled = false;
            }
        },

        unapplyCssx: function (/* String */ cssxName) {
            assertCssxName(cssxName);
            var ss = cssxSs[cssxName];
            if (ss) {
                ss.disabled = true;
            }
        }

    };

})();
