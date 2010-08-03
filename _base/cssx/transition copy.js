/*

    Notes:
    - works on classes only
    - requires use of dojo.addClass/removeClass/toggleClass
    - djConfig.parseCssTransitions or parseOnLoad

    TODO:
    - parse text instead of browser objects?
        var match = text
                .replace(/\/\*(.|\n)*?\*\//g, '') // strip comments
                .replace(/\s*{[^}]*\b(transition)\b\s*:([^;}]*)[;|}]/g,
        function (m) {
            cujo._cssMatches[i] = [].slice.call(arguments, 1, arguments.length - 1);
            return ', ._cujo_[i=' + i++ + ']' + m;
        });

    - USE cssText instead of individual properties! see http://www.phpied.com/rendering-repaint-reflowrelayout-restyle/
    - use cujo._base.loader to only parse stylesheets that specify parseTrans: true
    - only parse styleSheets that apply to the current media type (perf improvement)?
    - try text parsing by digging into document.styleSheets and @import rules
        - document.styleSheets[0].ownerNode.textContent (style tag)
        - document.styleSheets[0].ownerNode.href (link tag)
        - document.styleSheets[0].ownerElement.innerText (IE?)
    - hook up :target, :focus, :active, and :hover events via document-wide event handler
        - scan rules for :hover, :target, etc. and keep map of rules/classes
        - when event is triggered, scan map and fire event if it's a rule we're tracking
    - when starting a new animation, check existing animations for a node to see if one or more
      properties are redundant.  If so, remove the property from the previous (older) animation
      like this: oldAnim.curve._properties[conflictingProperty] == undefined;
    - create another object that abstracts this into "message passing and callbacks"
    - For native (webkit) transitions:
        - add an id to the longest-running transition. here's how:
            - extract the durations and delays from each node
            - find the longest combo of delay and duration
            - add an incrmented unique id to the duration parameter, but limit it to 999 and divide by 10,000
            - the resulting duration will look like this: Y.00XXX seconds where Y is the original and XXX is our id
            - watch onEndTransition events waiting for our id to arrive!

*/
dojo.provide('cujo._base.cssx.transition');
dojo.provide('cujo.cssTrans');

dojo.require('dojo.fx');
dojo.require('dojo.fx.easing');

(function () {


var
    // grab a reference to the configuration parameters loaded with cujoConfig
    transConfig = cujoConfig.cssTrans || {},
    // this is the supported css transitions property we detected, if any
    transProp,
    _classMap = {},
    _connects,
    _dojoOrigMethods = {};

dojo.declare('cujo.cssx.transition.Transition', cssProc._DomProc, {

    activate: function () {
        // register the Transition processor if browser doesn't support it
        if (transProp == undefined)
            transProp = this.sniffCssProp('transition', true);
        // only activate if the browser does not support the standard or a vendor-specific transition
        // or if we're using cujo extensions to transition
        return !transProp || cujoConfig.cssTransExt;
    },

    onProperty: function (/* String */ propName, /* String */ value, /* String|Array */ selectors, /* String */ ss) {
        if (propName == 'transition') {
            // TODO
            var decl = '';
            this.appendRule(selectors, decl);
        }
    }


});
cssProc.register(new cujo.cssx.transition.Transition());

cujo.cssx.transition.Transition = {

//    captureEvents: false,

    //  propName: String
    //      summary: The name of the css transition property. There is no need to modify this
    //      for different browsers. This library will figure out which proprietary variant
    //      works.  i.e. -webkit-transition for Webkit-based browsers.
    propName: 'transition',

    //  proxyName: String
    //      summary: A substitute css property to the normal, standard 'transition' css property.
    //      We need this because most browsers routinely throw out css rules they don't recognize.
    //      By using a recognized css property, we can still store transition data in css where
    //      it belongs. Also, we can store extra non-standard data here!
    //      If we use 'content' as the proxyName, the following css rule will substitute for the
    //      standard 'transition' property on browsers that don't support css transitions:
    //          .myTrans {content: 'height 1.5s ease-in 0.25s'; }
    //      Also, the following non-standard 'bounce' timing function will be used even in
    //      browsers that DO support css transitions:
    //          .myTrans2 {content: 'bottom 1s bounce-out'; }
    proxyName: 'content',

    eventName: 'transitionEnd',

    //  ignoredProxyValues: Object
    //      summary: A collection of possible values that may appear in the proxyName css property
    //      that should be ignored.  For instance, the string 'none' may appear in the computed
    //      style of nodes that have no value for 'content' n their styles. Thre is not need to
    //      change this unless you have also changed proxyName.
    ignoredProxyValues: {'none': true},

    //  inheritedProperties: String
    //      css properties that are inherited and can be involved in a transition
    //      for better performance, set this to a very small list (or none) if you
    //      don't plan to transition these. The complete list is as follows:
    //      inheritedProperties: 'border-spacing, color, font-size, font-weight, letter-spacing, line-height, text-indent, word-spacing',
    //      By default, we're using just a subset of the most likely properties
    inheritedProperties: 'color, font-size',

    onEndTransition: function () {},

    // methods

    parse: function (/* Boolean? */ force, /* DOMDocument? */ doc) {
        this._init();
        this._parseDoc(doc || dojo.doc);
    },

    release: function () {
        // TODO
    },

    // protected properties - these should not need to be changed

    // don't do -ms- the same way since IE doesn't behave the same as other browsers
    _vendorPrefixes: {
        'Moz': '-moz-', // mozilla
        'Webkit': '-webkit-', // webkit
        'O': '-o-', // opera
        'Khtml': '-khtml-', // konqueror
        'Ms': '' // IE is so b0rked (even IE 8)
    },

    _defaultParams: {property: '', duration: 0, timing: 'ease', delay: 0},

    _initialized: false,

    _inheritDetector: null,

    _useNative: false,

    // protected methods - these should not need to be changed

    _init: function () {
        // init / reset local vars
console.clear && console.clear();
        if (!this._initialized) {
            // these are one-time operations. no need to do them each time we init
            var prefix = this._getPrefix();
            if (prefix != undefined) {
                this.eventName = prefix + 'TransitionEnd';
                this.propName = prefix + 'Transition';
                this._useNative = true;
            }
            else {
                this.propName = null;
            }
            this._connectOps();
            this._fixupEasing();
            this._initialized = true;
        }
        this._inheritDetector = !!this.inheritedProperties && new RegExp(this.inheritedProperties.replace(/\s*,\s*/g, '|'), 'i');
        // TODO: disconnect before re-connecting
        //if (this.captureEvents)
        //    this._connectEndTransition();
console.log(this.eventName, this.propName, this.proxyName, this._useNative)
    },

    _parseDoc: function (doc) {
console.log('_parseDoc');var dtStart = new Date();
        var found = 0;

        dojo.forEach(doc.styleSheets, parseSheet);

        function parseSheet (ss) {
            dojo.forEach(ss.cssRules || ss.rules, function (rule) {
                // if this is an @import at-rule
                if (rule.styleSheet)
                    // dig into the imported style sheet
                    parseSheet(rule.styleSheet);
                // otherwise, it's a style rule
                else if (rule.selectorText && rule.style) {
                    // does the transition affect inherited properties?
                    if (this._inheritDetector)
                        var inheritors = !!(rule.style.cssText || '').match(this._inheritDetector);
                    // loop through selectors (comma-separated)
                    dojo.forEach(rule.selectorText.split(/\s*,\s*/g), function (selector) {
                        // loop through each class specified in selector
                        dojo.forEach(selector.match(/\.([^#:\.\s]+)/g), function (cls) {
                            cls = cls.substr(1); // TODO? fix the regexp to remove period instead of this line?
                            var preSelector = selector.replace('.' + cls, '');
                            // populate _classMap
                            if (!_classMap[cls])
                                _classMap[cls] = [];
                            _classMap[cls].push({
                                // selector to find nodes before we apply the css class
                                preSelector: inheritors ? preSelector + ',' + preSelector + ' *' : preSelector
                            });
                            found++;
                        });
                    });
                }
            });
        }
var elapsed = (new Date()) - dtStart;console.log('_parseDoc:', elapsed);
console.warn(_classMap);

    },

    _getPrefix: function () {
        //  summary: detects the supported css property for transitions, if any.
        //      Note: IE < 9 will work with standard property name, 'transition'.
        return cujo.sniff.getVendorPrefix('transition');
    },

    _connectEndTransition: function () {
        // note: e.elapsedTime and e.propertyName; e.type = 'webkitTransitionEnd' (or variant)
        _connects.push(dojo.connect(document, this.eventName, this, 'onEndTransition'));
    },

    _standardTimings: {'ease': 1, 'ease-in': 1, 'ease-out': 1, 'ease-in-out': 1},

    _parseTransitionStyles: function (/* CSSStyleDeclaration */ style) {
        //  summary: returns an array of transition style objects. Each object looks like this:
        //      {
        //          property: String (camelCase),
        //          duration: Number (msec),
        //          timing: String (camelCase),
        //          delay: Number (msec)
        //      }
        //      The _doTransition routines will append start and end properties to this object.

// TODO: Safari 4.0.4 does not populate the gcs.WebkitTransition property. It only populates the
// individual detail properties (e.g. gcs.WebkitTransitionDuration)!

console.log('_parseTransitionStyles', style);

        var
            // get css 'transition' value (and proxy value)
            transValue = style[this.propName],
            proxyValue = style[this.proxyName],
            // shortcut / reference to the default values
            defaults = this._defaultParams,
            // list of styles
            result,
            // were non-standard transition definitions found?
            nonStandard = false;

        // if we found a value and it's not in the ignores collection
        if (proxyValue && !(proxyValue in this.ignoredProxyValues)) {
            var defs = parseDefs(proxyValue);
            // only keep these if we find non-standard definitions or the browser doesn't support transitions
            if (!this._useNative || nonStandard)
                result = defs;
        }
        // only bother to parse the standard transition property if we didn't find non-standard definitions
        if (this._useNative && !nonStandard && transValue)
            result = parseDefs(transValue);

console.log('_parseTransitionStyles', result);

        return result || [];

        function parseDefs (styleValue) {
            // separate the comma-separated definitions
            // TODO: can this be optimized better????
            var defs = styleValue
                    .replace(/\s*,\s*/g, ',') // remove spaces around commas
                    .replace(/^('|")|('|")$/g, '') // remove unnecessary quotes at ends
                    .replace(/(\([^\)]*\))?([^,\(]*),/g, '$1$2;') // demarcate into semicolon-sep defs
                    .split(/\s*;\s*/g); // split

            return dojo.map(defs, function (def, i) {
                var parts = def.split(/\s+/g),
                    prev = defs[i - 1] || {};
                // detect if there is a custom timing function defined
                nonStandard = nonStandard || this._useNative && !(parts[2] in this._standardTimings);
                // attempt to grab values, defaulting to previous value or default value
                // this seems to be the way webkit does it (verify)
                return {
                        property: cujo.lang.camelize(parts[0]),
                        duration: toMsec(parts[1] || prev.duration || defaults.duration),
                        timing: cujo.lang.camelize(parts[2] || prev.timing || defaults.timing),
                        delay: toMsec(parts[3] || prev.delay || defaults.delay)
                    };
            });
        }

        function toMsec (str) {
            // remove units and convert to msec
            var val = parseFloat(str);
            return !isNaN(val) ? val * (str.indexOf('ms') < 0 ? 1000 : 1) : 0;
        }

    },


/**********

    TODO: finish refactoring from here.
    use a combo of both 'transition' or 'content' and have 'content' values override 'transition'.
    also have webkit remove 'content' once we've recorded the differences between it and 'transition' (in _parseDoc)
    if we remove 'content' then we don't have to concat and dedupe in _parseTransitionStyles! choose 'content' xor 'transition'

**********/

    _doTransition: function (node, classStr, isAddClass) {
console.log('_doTransition', arguments); var dtStart = new Date();

        // collect all selectors that map to the class(es) provided
        var selectorDefs = [];
        dojo.forEach(classStr.split(/\s+/), function (c) { if (c) selectorDefs = selectorDefs.concat(_classMap[c]); });
//console.log('selectorDefs:', selectorDefs);

        if (selectorDefs) {

            var affNodeDefs = [];

            dojo.forEach(selectorDefs, function (selDef) {
console.log('selDef:', selDef, dojo.query(selDef.preSelector, node));

                // get list of potentially-affected nodes
                affNodeDefs = dojo
                    // get possible matches
                    .query(selDef.preSelector, node)
                    // map to nodeDef structures
                    .map(function (n) { return {node: n}; })
                    // remove as many unaffected nodes as possible
                    .filter(function (nodeDef) {
                        var affNode = nodeDef.node,
                            cs = dojo.getComputedStyle(affNode), // grab starting style snapshot
                            tDefs = this._parseTransitionStyles(cs); // parse transition style
console.log('tDefs:', tDefs);
                        // if the node has a transition defined, gather affected properties
                        // but exclude ones that will not affect the node because the
                        // properties are set on the node's style directly
                        nodeDef.tDefs = dojo.filter(tDefs, function (tDef, i) {
                            if (affNode.style[tDef.property] === '') {
                                tDef.start = (tDef.property == 'opacity' ? dojo._getOpacity(affNode) : cs[tDef.property]) || 0;
                                return true;
                            }
                        });
                        var found = tDefs.length > 0;
                        // turn off native css transitions if we've got some (we must have founc non-standard timings)
                        if (this._useNative && found) {
                            nodeDef.prevTransition = affNode.style.transition;
                            affNode.style.transition = '';
                        }
                        // webkit bug (?) browser won't do transition if content property set
                        if (dojo.isWebKit && found) {
                            nodeDef.prevContent = affNode.style.content;
                            affNode.style.content = '';
                        }
                        // choose this node if we found applicable transitions
                        return tDefs.length > 0;
                    }, this)
                    .concat(affNodeDefs);

            }, this);
console.log('affNodeDefs', affNodeDefs);

            // TODO: for native CSS Transition implementations, mark the afected nodes so we can track onEndTransition events

            // apply the css change (add/remove the class) like normal dojo.addClass/removeClass
            _dojoOrigMethods[isAddClass ? 'addClass' : 'removeClass'].call(dojo, node, classStr);
//console.log('applied orig method:' , isAddClass ? 'addClass' : 'removeClass', node, classStr);

            // get a final snapshot of each affected node
            // remove any properties or nodes that are unaffected (i.e. they didn't change)
            // this loop must be fast to avoid UI flicker in IE???
            affNodeDefs = dojo.filter(affNodeDefs, function (nodeDef) {
                var snapshot = {},
                    cs = dojo.getComputedStyle(nodeDef.node);
                nodeDef.tDefs = dojo.filter(nodeDef.tDefs, function (tDef) {
                    var value = cs[tDef.property];
                    // if property changed
                    if (tDef.start != value) {
                        // record end value
                        tDef.end = value;
                        // apply the initial property value asap (before IE repaints?)
                        dojo.style(nodeDef.node, tDef.property, tDef.start);
                        return true;
                    }
                });
                return nodeDef.tDefs.length > 0;
            });

            // TODO? do we want to combine separate nodeDefs before proceeding?
            // TODO? or do we want to combine the selectorDefs into one combined query and let acme/sizzle pre-combine the nodes?

            // create the animation(s), separated by unique combos of duration and delay
            var animations = [];
            dojo.forEach(affNodeDefs, function (nodeDef) {
                var anim;
                dojo.forEach(nodeDef.tDefs, function (tDef) {
console.log('tDef', tDef);
                    // detect if we need to create another animation
                    if (!anim || anim.duration != tDef.duration || anim.delay != tDef.delay) {
                        anim = dojo.animateProperty({
                            node: nodeDef.node,
                            duration: tDef.duration,
                            easing: dojo.fx.easing[tDef.timing], // TODO: convert this from cubic-bezier func, if specified.
                            properties: {} // to be filled below
                        });
                        anim.delay = tDef.delay; // hack since animations don't have a delay property
                        anim.nodeDef = nodeDef; // we use this to combine animations
                        animations.push(anim);
                    }
                    // colors are handled differently from other properties
                    // TODO: parse units and determine color in a previous loop?
                    var isColor = tDef.property.toLowerCase().indexOf('color') >= 0;
                    anim.properties[tDef.property] = {
                        start: isColor ? tDef.start : parseFloat(tDef.start),
                        end: isColor ? tDef.end : parseFloat(tDef.end),
                        units: isColor ? '' : tDef.start.replace(/[^a-z%]/ig, '')
                    };
                });
            });
//console.warn(animations);
            // Combine animations according to the sum of their duration and delay
            // (these will end at the same time and will share the same onEndTransition)
            // According to some research by J Resig, more than 64 setTimeouts is a performance
            // issue for non-webkit browsers. On the other hand, looping over hundreds of nodes
            // in javascript is also slow. Conclusion: it's not feasible to fix the performance
            // issues when transitioning large numbers of nodes.  Instead, we'll just combine them
            // into groups that make it easy to behave like the native implementations.
            function grouper (a, b) { return a.duration - b.duration || a.delay - b.delay; }
            var anims = [],
                nodeDefs = [];
            dojo.forEach(animations.sort(grouper), function (anim, i, all) {
//console.log('here', anim, i);
                anims.push(anim);
                nodeDefs.push(anim.nodeDef);
                var next = all[i + 1];
                if (!next || next.duration != anim.duration || next.delay != anim.delay) {
                    dojo.fx
                        .combine(anims)
                        .play(anim.delay)
                        .onEnd = dojo.hitch(this, '_onEndAnimation', nodeDefs);
                    anims = [];
                    nodeDefs = [];
                }
            }, this);

        }
        else {

            // apply the css change (add/remove the class) like normal dojo.addClass/removeClass
            _dojoOrigMethods[isAddClass ? 'addClass' : 'removeClass'].call(dojo, node, classStr);

        }
var elapsed = (new Date()) - dtStart; console.log('_doTransition total time:', elapsed);
    },

    // at the end of the animation, restore node.style properties to ''
    _onEndAnimation: function (nodeDefs) {
//console.log('onEnd', nodeDefs)
        dojo.forEach(nodeDefs, function (nodeDef) {
            dojo.forEach(nodeDef.tDefs, function (tDef) {
                dojo.style(nodeDef.node, tDef.property, '');
            });
            this._cleanNode(nodeDef);
        }, this);
        //if (this.captureEvents) {
        //    dojo.forEach(affectedRules, function (rule) {
        //        var e = {
        //                elapsedTime: rule.parsedStyle.duration,
        //                propertyName: rule.parsedStyle.property
        //            };
        //        this.onEndTransition(e);
        //    });
        //}
    },

    // node cleanup
    _cleanNode: function (nodeDef) {
        var affNode = nodeDef.node;
        // restore transition if we disabled it
        if (typeof nodeDef.prevTransition != 'undefined')
            affNode.style.transition = nodeDef.prevTransition;
        // webkit bug (?) browser won't do transition if content property set
        if (typeof nodeDef.prevContent != 'undefined') {
            affNode.style.content = nodeDef.prevContent;
        }
    },

    _connectOps: function () {

        // grab original methods
        _dojoOrigMethods.addClass = dojo.addClass;
        _dojoOrigMethods.removeClass = dojo.removeClass;

        var self = this;
        // create new dojo.addClass
        dojo.addClass = function (node, classStr) {
//console.log('new addClass');
            self._doTransition(node, classStr, true);
        };

        // create new dojo.addClass
        dojo.removeClass = function (node, classStr) {
//console.log('new removeClass');
            self._doTransition(node, classStr, false);
        };

    },

    _fixupEasing: function () {
        // css transitions support shorcut notation for -in-out timing functions so let's
        // fix-up the dojo easing functions to match
        var e = dojo.fx.easing, fixups = [];
        for (var p in e) {
            if (p.substr(-5) == 'InOut')
                fixups.push(p.substr(0, p.length - 5));
        }
    },

    _connectEvents: function () {
        // TODO: finish by hooking animation events or webkit's event (spoof onBegin?)
        // ********************************************************************************
    },

    _disconnectEvents: function () {
    }

};


dojo.addOnLoad(function () {
    // check if we need to parse the styleSheets
    if (djConfig.parseCssTransitions || cujo.cssTrans.parseOnLoad) {
        cujo.cssTrans.parse(false, dojo.doc);
    }

});

dojo.addOnUnload(function () {

    if (_dojoOrigMethods.addClass)
        dojo.addClass = _dojoOrigMethods.addClass;
    if (_dojoOrigMethods.removeClass)
        dojo.removeClass = _dojoOrigMethods.removeClass;
    cujo.cssTrans._disconnectEvents();
    // clean up our dojo.connects
    dojo.forEach(_connects, dojo.disconnect);

});


})();
