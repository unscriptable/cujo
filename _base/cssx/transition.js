/*

    Notes:
    - works on classes only
    - requires use of dojo.addClass/removeClass/toggleClass

    TODO:
    - use -webkit-animation instead of js for custom (-cujo-bounce) transitions
    - hook up :target, :focus, :active, and :hover events via document-wide event handler
        - scan rules for :hover, :target, etc. and keep map of rules/classes
        - when event is triggered, scan map and fire event if it's a rule we're tracking

*/
dojo.provide('cujo._base.cssx.transition');

dojo.require('dojo.fx');
dojo.require('dojo.fx.easing');

(function () {

/***** these are parameters that are configurable via the cujoConfig global variable *****/

var
    // shorthand
    d = dojo,
    cssx = cujo.cssx,

    cssxName = 'transition',

    // grab a reference to the configuration parameters loaded with cujoConfig
    transConfig = cujoConfig.cssTrans || {},

    //  inheritedProps: String
    //      css properties that are inherited and can be involved in a transition
    //      for better performance, set this to a very small list (or none) if you
    //      don't plan to transition these. The complete list is as follows:
    //      inheritedProps: 'border-spacing, color, font-size, font-weight, letter-spacing, line-height, text-indent, word-spacing',
    //      By default, we're using just a subset of the most likely properties
    inheritedProps = transConfig.inheritedProps || 'color, font-size';

d.declare('cujo.cssx.transition.Check', cssx._CssxProc, {

    cssxName: cssxName,

    activate: function () {
        // only activate if the browser does not support the standard
        // or we're not excluding cujo cssx extensions
        // _init() defines prefix
        this._init();
        return prefix !== '' || !cujoConfig.noCssTransExt;
    },

    onProperty: function (/* String */ propName, /* String */ value, /* String|Array */ selectors, /* String */ ss) {
        // if css3 transition property detected
        if (propName.match(/\btransition\b/)) {
            // if browser does not support transitions or there is a non-standard transition prop
            if (!useNative || this.hasCujoExt(propName, value)) {
                this.addTransProp(propName, value, selectors);
                useCssx = true;
                if (!initialized) {
                    initialize();
                }
            }
            // if browser uses a vendor prefix
            else if (prefix != '') {
                this.appendRule(selectors, cssProp + ':' + value);
            }
        }
    },

    hasCujoExt: function (propName, value) {
        // check if it has 'cujo' in it
        return value.match(/cujo/);
    },

    addTransProp: function (propName, value, selectors) {
        // TODO: handle case in which properties are listed independently (e.g. transition-property or transition-duration)
        // add cujo cssx property
        var selText = d.isArray(selectors) ? selectors.join(',') : selectors;
        this.createCssxProp(selText, 'transition', value);
        if (useNative && prefix == '') {
            // remove existing css3 prop
            this.appendRule(selectors, propName + ': none;');
        }
    },

    _init: function () {
        if (prefix === undefined) {
            setVendorVariants();
        }
    }

});
cssx.register(new cujo.cssx.transition.Check());

var
    // the vendor-specific prefix (if any)
    prefix,

    //  transProp: String
    //      summary: The name of the css transition property. There is no need to modify this
    //      for different browsers. This library will figure out which proprietary variant
    //      works.  i.e. WebkitTransition for Webkit-based browsers.
    transProp = 'transition',

    //  transCssProp: String
    //      the css version using dashes instead of camel-case
    cssProp = 'transition',

    //  eventName: String
    //      summary: The name of the javascript event that fires at the document level after
    //      a transition ends.  This library will figure out which proprietary variant
    //      works.  i.e. WebkitTransitionEnd for Webkit-based browsers.
    eventName = 'transitionEnd',

    useNative = false,

    useCssx = false,

    initialized = false,

    defaultParams = {property: '', duration: 0, timing: 'ease', delay: 0},

    inheritDetector,

    origMethods,

    timings; // extension of dojo.fx.easing


function setVendorVariants () {

    prefix = cujo.sniff.getVendorPrefix('transition');

    if (prefix) {
        transProp = prefix + 'Transition';
        eventName = prefix + 'TransitionEnd';
        useNative = true;
        cssProp = cujo.lang.uncamelize(transProp);
    }
    else if (prefix !== null) {
        useNative = true;
    }

}

function initialize () {
    //inheritDetector = !!this.inheritedProps && new RegExp(inheritedProps.replace(/\s*,\s*/g, '|'), 'i');
    connectOps();
    fixupEasing();
    initialized = true;
}

function toggleClass (/* DOMNode */ node, /* String */ classes, /* Boolean? */ adding) {
    // TODO: decide whether to cache cross-referenced classes like the pre-cssx cssTrans did

    // turn on cssx style sheet (but just temporarily)
    cujo.cssx.applyCssx(cssxName);

    var defs = [],
        nodes = getAffectedNodes(node, classes);

    // collect node style and transition info
    nodes.forEach(function (node) {
        // parse transition style
        // TODO: do we need to handle unit mismatches (start:em -> end:px) --> dojo.style can handle some of these
        var cs = d.getComputedStyle(node),
            trans = cujo.cssx.getCssxValue(cs, 'transition'),
            tDefs = trans && d.map(trans.split(','), function (item) {
                var
                    // split transition definition
                    values = item.split(' '),
                    // normalize property name
                    prop = cujo.lang.camelize(values[0]),
                    // grab any current animation for this property
                    anim = node._cujo_trans && node._cujo_trans[prop],
                    // create transition definition
                    tDef = {
                        property: prop,
                        duration: values[1],
                        timing: values[2],
                        delay: values[3],
                        // grab property and its start value while we're here
                        start: getProp(node, cs, prop),
                        // if there is a current animation, get the original off that
                        orig: anim ? anim.properties[prop].orig : node.style[prop]
                    };
                // if there's an existing animation
                if (anim) {
                    // TODO: apply runtimeStyle, if available (to prevent flickering in IE)
                    // unapply style (interferes with addClass/removeClass)
                    d.style(node, prop, anim.orig || '');
                    // cancel animation
                    anim._cujo_canceled = true; // was doesnt' dojo support cancelation!?!?!
                    anim.stop();
                    delete node._cujo_trans[prop];
                }
                return tDef;
            });
        if (tDefs) {
            // record this node's info
            defs.push({node: node, tDefs: tDefs});
        }
    });

    // apply the css change (add/remove the class) like normal dojo.addClass/removeClass
    origMethods[adding ? 'addClass' : 'removeClass'](node, classes);

    // remove nodes that won't change
    defs = d.filter(defs, function (def) {
        // get snapshot of final state, removing any props that won't change
        var cs = d.getComputedStyle(def.node);
        def.tDefs = d.filter(def.tDefs, function (tDef) {
            // record end value
            tDef.end = getProp(def.node, cs, tDef.property);
            // TODO: remove runtimeStyle that mayhave been applied above
            // if property changed
            if (tDef.start != tDef.end) {
                // apply the start value asap (minimize flicker)
                d.style(def.node, tDef.property, tDef.start);
                return true;
            }
        });
        return def.tDefs.length > 0;
    });

    // turn off cssx style sheet again
    cujo.cssx.unapplyCssx(cssxName);

    // create animations
    var anims = createAnimations(defs);

    return;

}

function getAffectedNodes (/* DOMNode */ node, /* String */ classes) {
    // get the list of nodes that may have been affected
    // returns a nodelist
    // Note: it's unclear that fitering by cross-indexed classes helps, so we're just using '*' for now.

    // grab all descendants (there doesn't seem to be any benefit from using recursion to walk the DOM)
    // include the current node, too
    return d.query('*', node).concat([node]);

}

function createAnimations (nodeDefs) {

    var animations = [];

    d.forEach(nodeDefs, function (nodeDef) {

        // get or create node animations
        var anims = nodeDef.node._cujo_trans;
        if (!anims) {
            // track animations per node
            anims = nodeDef.node._cujo_trans = {};
        }

        // loop through properties (tDefs) and create animations
        var anim;
        d.forEach(nodeDef.tDefs, function (tDef) {

            var p = tDef.property,
                animProps = {};

            animProps[p] = tDef;

            if (!p.match(/color/i)) {
                tDef.units = tDef.end.replace(/^[^a-z%]*/i, '');
                tDef._start = tDef.start;
                tDef.start = parseFloat(tDef.start);
                tDef._end = tDef.end;
                tDef.end = parseFloat(tDef.end);
            }

            var anim = d.animateProperty({
                    node: nodeDef.node,
                    // TODO: is this needed any more?
                    nodeDef: nodeDef,
                    duration: toMsec(tDef.duration),
                    easing: getEasing(tDef.timing),
                    properties: animProps,
                    delay: toMsec(tDef.delay)
                });
            // save animation here and on node
            animations.push(anim);
            anims[p] = anim;

        });

    });

    // Combine animations according to their duration and delay
    // (these will end at the same time and will share the same transitionEnd event).
    // According to some research by J Resig, more than 64 setTimeouts is a performance
    // issue for non-webkit browsers. On the other hand, looping over hundreds of nodes
    // in javascript is also slow. Conclusion: it's not feasible to fix the performance
    // issues when transitioning large numbers of nodes.  Instead, we'll just combine them
    // into groups that make the transitionEnd events happen together.
    function grouper (a, b) { return a.duration - b.duration || a.delay - b.delay; }
    var group = [];
    d.forEach(animations.sort(grouper), function (anim, i, all) {
        group.push(anim);
        var next = all[i + 1];
        if (!next || next.duration != anim.duration || next.delay != anim.delay) {
            d.fx
                .combine(group)
                .play(anim.delay)
                .onEnd = (function (anims) { return function () { onEndAnimation.call(this, anims); }; })(group);
            group = [];
        }
    }, this);

    return animations;
}

function getProp (node, cs, prop) {
    var value = cs[prop] || 0;
    // process special cases
    // TODO: do we need to handle 'thick'/'thin'/'medium', for instance? --> see dojo.style
    if (prop == 'opacity') {
        value = d._getOpacity(node);
    }
    else {
        switch (prop) {
            case 'top': value == 'auto' ? value = node.offsetTop + 'px' : value; break;
            case 'left': value == 'auto' ? value = node.offsetLeft + 'px' : value; break;
            case 'right': value == 'auto' ? value = node.offsetLeft + node.offsetWidth + 'px' : value; break;
            case 'bottom': value == 'auto' ? value = node.offsetTop + node.offsetHeight + 'px' : value; break;
        }
    }
    return value;
}

// at the end of the animation, restore node.style properties to ''
function onEndAnimation (anims) {
// TODO: FIXME: find out why animation is still executing after onEnd fires! and remove setTimeout
setTimeout(function () {
    d.forEach(anims, function (anim) {
        if (!anim._cujo_canceled) {
            var nodeDef = anim.nodeDef,
                node = nodeDef.node,
                stillAnimating = false;
            // restore node's original style
            //node.style.cssText = nodeDef.cssText;
            // for each property
            for (var p in anim.properties) {
                // reset the node's style back to the original value
                dojo.style(node, p, anim.properties[p].orig);
                // call standard transitionEnd event
                // TODO: add preventDefault() and other methods?
                onEndTransition.call(node, {
                    type: eventName,
                    propertyName: p,
                    elapsedTime: anim.duration // TODO: is this really duration or is it elapsed time? apple specs are strangely worded
                });
                // remove reference to anim now that we're done with it
                delete node._cujo_trans[p];
            }
            // check if this node still has animations
            for (var p in node._cujo_trans) {
                stillAnimating = true; break;
            }
            // clean up, if not
            if (!stillAnimating) {
                delete node._cujo_trans;
            }
        }
    });
}, 20);
}

function toMsec (str) {
    // remove units and convert to msec
    var val = parseFloat(str);
    return !isNaN(val) ? val * (str.indexOf('ms') < 0 ? 1000 : 1) : 0;
}

function connectOps () {

    // grab original methods
    origMethods = {
        addClass: d.addClass,
        removeClass: d.removeClass
    };

    var self = this;
    // create new dojo.addClass
    d.addClass = function (node, classStr) {
        toggleClass(node, classStr, true);
    };

    // create new dojo.addClass
    d.removeClass = function (node, classStr) {
        toggleClass(node, classStr, false);
    };

}

function fixupEasing () {
    // css transitions support shorcut notation for -in-out timing functions so let's
    // fix-up the dojo easing functions to match
    timings = d.delegate(d.fx.easing);
    for (var p in timings) {
        if (p.substr(-5) == 'InOut')
            timings[p.substr(0, p.length - 5)] = timings[p];
    }
    // TODO: approximate the standard cubic-bezier equivalents better
    if (!timings.ease) {
        // ease should be equivalent to cubic-bezier(0.25, 0.1, 0.25, 1.0)
        // ease-in-out should be equivalent to cubic-bezier(0.42, 0, 0.58, 1.0)
        timings.ease = timings.easeInOut = timings.sineInOut;
        // ease-in should be equivalent to cubic-bezier(0.42, 0, 1.0, 1.0)
        timings.easeIn = timings.sineIn;
        // ease-out should be equivalent to cubic-bezier(0, 0, 0.58, 1.0
        timings.easeOut = timings.sineOut;
    }
}

function getEasing (timing) {
    // TODO: convert this from cubic-bezier func, if specified.
    // remove cujo- prefix
    timing = cujo.lang.camelize((timing || '').replace(/^-?cujo-/, ''));
    return timings[timing];
}


function onEndTransition (e) {
    // note: e.elapsedTime and e.propertyName; e.type = 'webkitTransitionEnd' (or variant)
}

})();
