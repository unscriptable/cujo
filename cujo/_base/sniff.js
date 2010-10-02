/*
    cujo._base.sniff
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.sniff');

(function () { // local scope

var _vendor,
    _testRule;

function _supported (propName, node) {
    return typeof (node || dojo.doc.documentElement).style[propName] == 'string';
}

cujo.sniff = {

    cssProp: function (/* String */ propName, /* Boolean? */ checkVendorPrefixes, /* DOMNode? */ node) {
        //  summary: Checks if a css property is supported by the current browser
        //  propName: String - the camelCased property name to check
        //  checkVendorPrefixes: Boolean? - if true, checks for vendor-specific variations
        //  node: DOMNode? - a dom node to test (checks the body if omitted)
        //  returns: String - If checkVendorPrefixes is true, returns the actual property
        //      name, if any. Otherwise, returns true if the property is supported.
        //
        //  example: hasRadius = cujo.sniff.cssProp('borderRadius', true);
        //  inspired by kangax: http://thinkweb2.com/projects/prototype/feature-testing-css-properties/
        //  Also see: http://yura.thinkweb2.com/cft/ (common feature tests)
        var supported = _supported(propName, node) && propName;
        if (!supported && checkVendorPrefixes) {
            var pre = cujo.sniff.getVendorPrefix(propName, node),
                prop = pre && (pre + cujo.capitalize(propName));
            return (pre && _supported(prop)) ? prop : void 0;
        }
        else
            return supported;

    },

    cssValue: function (/* String */ propName, /* String */ testValue, /* Boolean? */ checkVendorPrefixes, /* DOMNode? */ node) {
        //  summary: Checks if a css value is supported by the current browser.
        //  propName: String - the camelCased property name to check
        //  testValue: String - the property value to test
        //  checkVendorPrefixes: Boolean? - if true, checks for vendor-specific variations
        //  node: DOMNode? - a dom node to test (checks the body if omitted)
        //  returns: String - If checkVendorPrefixes is true, returns the actual property
        //      name, if any. Otherwise, returns true if the property is supported.
        //  Also see: http://ryanmorr.com/archives/detecting-browser-css-style-support
        // TODO: check vendor prefixes!
        var success = false;
        if (!_testRule)
            _testRule = cujo.stylesheet.appendRule('#cujo_test_rule', '');
        try {
            _testRule.style[propName] = testValue;
            success = _testRule.style[propName] !== '';
            _testRule.style[propName] = ''; // clean up
        }
        catch (ex) { /* squelch IE */ }
        return success;
    },

    gcsValue: function (/* String */ propName, /* String */ testValue, /* Boolean? */ checkVendorPrefixes, /* DOMNode? */ node) {
        //  summary: returns true if the browser supports the css property in the getComputedStyle /
        //  currentStyle collections. be sure to supply a testValue that is not falsy already! (TODO: fix this?)
        // TODO: check vendor prefixes
        if (!node) {
            node = document.body;
        }
        var result = false,
            oldVal = node.style[propName];
        node.style[propName] = testValue;
        try {
            result = !!(window.getComputedStyle ? window.getComputedStyle(node, null)[propName] : node.currentStyle[propName]);
        }
        finally {
            node.style[propName] = oldVal;
        }
        return result;
    },

    getVendorPrefix: function (/* String */ propName, /* DOMNode? */ node) {
        //  summary: obtains and returns the vendor prefix used in css extensions / futures.
        //  This routine requires that the dev pass a css property that requires a
        //  vendor prefix in order to extract it.  Once the vendor prefix is obtained once,
        //  it is cached locally.
        if (_vendor != void 0)
            return _vendor;
        else if (_supported(propName)) {
            return '';
        }
        else {
            var prefixes = cujo.sniff.prefixes;
            for (var pre in prefixes) {
                if (_supported(pre + cujo.capitalize(propName), node)) {
                    _vendor = pre;
                    return _vendor;
                }
            }
            _vendor = null;
            return _vendor;
        }
    }

};

cujo.sniff.prefixes = {
    'Moz': '-moz-', // mozilla
    'Webkit': '-webkit-', // webkit
    'O': '-o-', // opera
    'Khtml': '-khtml-', // konqueror
    'Ms': '' // IE is so b0rked (even IE 8)
};

})(); // end of local scope
