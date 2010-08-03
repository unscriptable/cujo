/*
    cujo.CssTextParser
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.CssTextParser');
dojo.provide('cujo.CssTextParser');

(function () { // local scope

cujo._base.CssTextParser = cujo.CssTextParser = function (/* Object */ cb) {
    //  summary: A fast, flexible CSS streaming TEXT parser in 1kB! (minified)
    //      See also the cujo.cssDomParser!
    //  cb: Object
    //      The cb parameter is a configuration object supplying callbacks that are called whenever
    //      a new object is encountered in the CSS object hierarchy. Return an explicit false (not
    //      a falsy value) from the callback to terminate processing that branch in the hierarchy.
    //      For instance, to abort the parsing of the current rule, return false from the onRule
    //      callback. To abort parsing of the current sheet, return false from the onSheet callback.
    //      Call the stop() method to stop parsing altogether. The signatures of the callbacks
    //      are as follows:
    //          onSheet: function (/* String */ ss) {}
    //          onRule: function (/* String */ rule, /* String */ ss) {}
    //          onImport: function (/* String */ url, /* String */ rule, /* String */ ss) {}
    //          onSelector: function (/* String */ selectorText, /* String */ rule, /* String */ ss) {}
    //          onProperty: function (/* String */ propName, /* String */ value, /* String */ rule, /* String */ ss) {}
    //      This css parser will only dig into the stylesheet as deeply as you require. If
    //      you don't supply an onSelector or onProperty callback, it will not process that
    //      deeply.
    //      Other properties of cb:
    //          hasComments: Boolean. Default == true. Comments must be stripped before parsing
    //              the css. If they've already been stripped, set hasComments to true to
    //              improve performance.
    //          dontSplit: Boolean. Prevents the parser from spliting compound selectors into
    //              multiple single selectors in all browsers except IE.  See Notes below.
    //          skipImports: Boolean.  This flag has no meaning when processing text since the
    //              imported stylesheet is not automatically fetched.  See the cujo.cssDomParser.
    //          context: Object. If supplied, runs the callbacks in the context of this object.
    //              If missing, runs the callbacks in the context of the CssParser instance.
    //  Notes:
    //      1.  The selectors are split at the comma in compound selectors, e.g. the selector,
    //          ".dijitFoo, .dijitBar", results in two onSelector callbacks: one for ".dijitFoo"
    //          and one for ".dijitBar". If you don't want the selectorText split, supply a truthy
    //          dontSplit property on the cb parameter.
    //  Example 1:
    //        var myCallbacks = {
    //                dontSplit: true,
    //                onSelector: function (st, r, ss) { console.log(st, r, ss); }
    //            };
    //        (new CssParser(myCallbacks)).parse();
    //  Example 2:
    //        function checkRuleForOpacity (rule, style, sheet) {
    //            /* stop all processing if we hit a style property for opacity */
    //            if (style.match(/opacity|rgba/))
    //                this.stop();
    //        }
    //        var canceled = !(new CssParser({onRule: checkRuleForOpacity})).parse();
    //
    //  TODO: detect quoted strings in selectors, e.g. a[href="{this fails}"], and fix!

    var
        // for brevity
        d = dojo,
        // context in which to execute callbacks
        ctx = cb.context || this,
        // flag to detect if user has stopped (c is short for "continue")
        c = true,
        // regular expression to parse css {}-rules and @-rules
        rxRules = /\s*(?:(@[^{';"]*)\s*([{';"]))|(?:([^{]*)\s*{([^}]*)})/g,
        // regular expression to split properties (with quote detection)
        rxProps = /\s*([^:]+)\s*:\s*([^';"}]+)\s*([';"}])/g,
        // regular expressions to scan to matching delimiter
        rxDels = {
            '"': '[^\\]"',  // double-quote
            "'": "[^\\]'",  // single-quote
            '{': '[\'"{}]', // brace
            ';': '[\'"{;]'  // semicolon
        },
        // preventative measure
        undefined;

    this.parse = function (/* String|Array */ w) {
        //  summary: Call parse to start parsing the css.
        //  cssText: String - The raw text of the sheet to parse.
        //  returns Boolean. true == parse was not stopped; false == it was stopped.
        // TODO: parse several sheets as an array
        c = true;
        if (!d.isArray(w))
            w = [w];
        d.every(w, function (s) {
            if (cb.onSheet && cb.onSheet(s) !== false && c) {
                if (cb.hasComments !== false)
                    s = s.replace(/\/\*(.|\n)*?\*\//g, '');
                sheet(s);
            }
            return c;
        });
        return c;
    };

    this.stop = function () {
        //  summary: Call stop() from within a callback to stop parsing.
        c = false;
    };

    function sheet (/* String */ s) {
        var m;
        rxRules.lastIndex = 0; // reset!
        while (c && (m = rxRules.exec(s))) { // intentional assignment
            var r = m[0];
            // TODO: detect and process @import rules separately
            if (m[1] != undefined && m[1].charAt(0) == '@') {
                var del = m[2];
                if (del == '"' || del == "'") {
                    // scan to end of quote
                    scanToDel(rxRules, s, del);
                    // scan for semicolon (or open brace: brace shouldn't happen, but just in case)
                    scanToDel(rxRules, s, ';');
                    // set new delimiter found
                    del = s.charAt(rxRules.lastIndex - 1);
                }
                if (del == "{") {
                    // block @-rules are not supported, skip to end
                    scanToDel(rxRules, s, '{');
                }
                else {
                    console.dir(m[1] + m[2])
                }
                console.log('@-rule found:', r);
            }
            else {
                // Note: once {}-rules are found, @-rules are no longer valid (and should be skipped)
                // parse if there are callbacks AND the current callback (if any) didn't cancel and
                // caller didn't cancel (c == false). Note: c should be checked AFTER the callback.
                if ((cb.onSelector || cb.onProperty || cb.onRule) && (!cb.onRule || cb.onRule.call(ctx, r, s) !== false) && c) {
                    rule(r, m[3], m[4], s);
                }
            }
        }
    }

    function rule (/* String */ r, /* String */ sel, /* String */ p, /* String */ s) {
        // if there is an onSelector callback
        if (cb.onSelector && sel) {
            d.every(cb.dontSplit ? [sel] : sel.split(/\s*,\s*/g), function (t) {
                return cb.onSelector.call(ctx, t, r, s) !== false && c;
            });
        }
        // if there is an onProperty callback
        if (cb.onProperty) {
            rxProps.lastIndex = 0; // reset!
            // parse properties
            var
                // regex matches
                m,
                // keep going?
                g = true;
            while (c && g && (m = rxProps.exec(p))) { // intentional assignment
                var del = m[3];
                // did we hit a quote?
                if (del == '"' || del == "'") {
                    // scan to end of quoted section, skipping over css-specific delimiters
                    var start = rxProps.lastIndex;
                    scanToDel(rxProps, p, del);
                    val = m[1] + p.substring(start, rxProps.lastIndex);
                    //var start = rxProps.lastIndex,
                    //    end = p.indexOf(del, start),
                    //    val = m[1] + str.substring(start - 1,  end);
                    //rx.lastIndex = end + 1;
                }
                else
                    val = m[2];
                g = cb.onProperty.call(ctx, m[1], val, r, s);
            }
        }
    }

    function scanToDel (rx, str, ch) {
        // create another regex to scan for matching delimiter
        // since this is a recursive function, create a new regex every time
        var rxDel = new RegExp(rxDels[ch]);
        rxDel.lastIndex = rx.lastIndex + 1;
        var m = rxDel.exec(str);
        // check if we encountered quotes while scanning for a closing brace
        if (ch == '{' && m[0] != '}') {
            // rescan for matching quote/brace
            scanToDel(rxDel, str, m[0]);
            // resume scan for closing brace
            scanToDel(rxDel, str, ch);
        }
        rx.lastIndex = rxDel.lastIndex;
    }

}


})(); // end of local scope
