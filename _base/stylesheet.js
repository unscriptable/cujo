/*
    cujo._base.stylesheet
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.stylesheet');

(function () { // local scope

var _ss,
    // Firefox 3+ haaaaaaacckkkk!! (see below)
    deferrals = [],
    doingDeferrals = false,
    doDeferrals = cujo.debounce(function () {
        doingDeferrals = true;
        dojo.forEach(deferrals, function (def) {
            cujo.stylesheet.insertRule(def.selectorText, def.cssText, def.pos, def.ss);
        });
        doingDeferrals = false;
    }, 0);

function defer (ruleDef) {
    if (doingDeferrals)
        throw 'Unable to add rule.';
    deferrals.push(ruleDef);
}

// add stylesheet to head tag (may not be first child b/c of comments)
function head (doc) {
    var node = doc.documentElement.firstChild;
    while (node && node.nodeType != 1) {
        node = node.nextSibling;
    }
    return node;
}

cujo.stylesheet = {

	createStylesheet: (function () {
        //  summary: Creates a new stylesheet so rules may be added.
        //  cssText: The initial text content of the stylesheet (i.e. rules in text form)
        //  Note: Do not supply cssText if you plan to add rules via the appendRule method immediately.
        //      Firefox 3+ temporarily removes the cssRules collection when text content is
        //      inserted.  A setTimeout is required before the cssRules are available again.

        return dojo.doc.createStyleSheet ?
            // IE (hack city)
            function (cssText) {
                try {
                    var node = dojo.create('style', {type: 'text/css'}, head(dojo.doc), 'last');
                    var ss = node.styleSheet;
                }
                catch (ex) {
                    // we must have hit 31 stylesheet limit so try the other way:
                    ss = dojo.doc.createStyleSheet();
                }
                // IE6 needs to have cssText or the stylesheet won't get created
                cssText = cssText || '#cujo_ignore_ {}';
                try { ss.cssText = cssText; } catch (ex) { console.debug('Unable to create stylesheet', ex); }
                return ss;
            } :
            // w3c
            function (cssText) {
                var node = dojo.create('style', {type: 'text/css'}, head(dojo.doc), 'last');
                if (cssText)
                    node.appendChild(dojo.doc.createTextNode(cssText));
                return node.sheet;
            }
    })(),

    createLink: function (/* String */ src, /* String? */ media) {
        // summary: creates a link tag to link-in a stylesheet from a url
        var attrs = {rel: 'stylesheet', type: 'text/css', href: src};
        if (media) {
            attrs.media = media;
        }
        return dojo.create('link', attrs, head(dojo.doc), 'last');
    },

    appendRule: function (/* String */ selectorText, /* String */ cssText, /* CSSStylesheet? */ ss) {
        //  summary: appends a new rule to the end of a stylesheet
        //  selectorText: String  the selector of the new rule
        //  cssText: String  the css property declarations of the new rule
        //  ss: StyleSheet?  if omitted, a default stylesheet is used
        return this.insertRule(selectorText, cssText, -1, ss);
    },

    insertRule: function (/* String */ selectorText, /* String */ cssText, /* Number? */ pos, /* CSSStylesheet? */ ss) {
        //  summary: inserts a new rule into a stylesheet
        //  selectorText: String  the selector of the new rule
        //  cssText: String  the css property declarations of the new rule
        //  pos: Number?  the position to insert at (or the end if omitted)
        //  ss: StyleSheet?  if omitted, a default stylesheet is used
        // special thanks to PPK at http://www.quirksmode.org for his work on stylesheets
        ss = ss || _ss;
        if (!ss)
            ss = _ss = this.createStylesheet();
        var rules = ss.cssRules || ss.rules;
        // Firefox 3+ removes the cssRules collection temporarily if cssText has been inserted,
        // so defer the rules until the next possible opportunity.
        if (!rules)
            defer({selectorText: selectorText, cssText: cssText, pos: pos, ss: ss});
        if (ss.insertRule) {// w3c
            if (!(pos >= 0))
                pos = rules.length;
            ss.insertRule(selectorText + '{' + cssText + '}', pos);
        }
        // IE. what a stinkin pile!
        else {
            if (!cssText)
                cssText = 'zoom:1'; /* IE6 throws "Invalid argument." when there's no cssText */
            // addRule fails in IE6 if the selectors are comma-separated 
            // TODO: FIXME? is splitting on comma risky for complex CSS3 attribute selectors?
            dojo.forEach(selectorText.split(','), function (sel) {
                ss.addRule(sel, cssText, pos++ || -1);
            });
            if (!(pos >= 0))
                pos = rules.length - 1;
        }
        return rules[pos];
    },

    appendText: function (/* String */ cssText, /* CSSStylesheet? */ ss) {
        //  summary: appends css rules by appending text onto a stylesheet
        //  cssText: String, the text to append
        //  ss: StyleSheet?  if omitted, a default stylesheet is used
        ss = ss || _ss;
        if (!ss) {
            ss = _ss = this.createStylesheet(cssText);
        }
        // w3c
        else if (ss.ownerNode) {
            ss.ownerNode.appendChild(dojo.doc.createTextNode(cssText));
        }
        // IE (slow)
        else { // if (ss.owningElement) {
            ss.cssText += cssText;
        }
    },

    insertText: function (/* String */ cssText, /* CSSStylesheet? */ ss) {
        //  summary: inserts css rules by prepending text onto a stylesheet
        //  cssText: String, the text to insert
        //  ss: StyleSheet?  if omitted, a default stylesheet is used
        ss = ss || _ss;
        if (!ss) {
            ss = _ss = this.createStylesheet(cssText);
        }
        // w3c
        else if (ss.ownerNode) {
            var node = ss.ownerNode;
            node.insertBefore(dojo.doc.createTextNode(cssText), node.firstChild);
        }
        // IE (slow)
        else { // if (ss.owningElement) {
            ss.cssText = cssText + ss.cssText;
        }
    },

    common: function () {
        //  summary: returns a common stylesheet to be used by global / common routines.
        //  The stylesheet is created if it doesn't already exist.
        if (!_ss) {
            _ss = this.createStylesheet();
        }
        return _ss;
    },

	getScrollbarSize: function () {
        //  summary: figures out the height and width of the scrollbars on this system.
		//  something like this exists in dojox, but we don't want to rely on dojox
        //  Returns an object with w and h properties (width and height, Number) in pixels
		if (!sbSize) {
			sbSize = {w: 15, h: 15}; // default
			var testEl = dojo.create('DIV', {style: 'width:100px;height:100px;overflow:scroll;bottom:100%;right:100%;position:absolute;visibility:hidden;'}, dojo.body(), 'last');
			try {
				sbSize = {
                    w: testEl.offsetWidth - Math.max(testEl.clientWidth, testEl.scrollWidth),
                    h: testEl.offsetHeight - Math.max(testEl.clientHeight, testEl.scrollHeight)
                };
				dojo.destroy(testEl);
			}
			catch (ex) {
				// squelch
			}
		}
		return sbSize;
	}

};

/* create scrollbar-sized styles */

var sbSize;

dojo.ready(function () {

    sbSize = cujo.stylesheet.getScrollbarSize();

    var
        sbw = sbSize.w + 'px',
        sbh = sbSize.h + 'px',
        scrollStyles = {
            '.cujo-scroll-mgn': 'margin-right: ' + sbw + '; margin-bottom: ' + sbh,
            '.cujo-scroll-mgn-v, .cujo-scroll-mgn-r': 'margin-right: ' + sbw,
            '.dijitRtl .cujo-scroll-mgn-v, .cujo-scroll-mgn-l': 'margin-left: ' + sbw,
            '.cujo-scroll-mgn-h, .cujo-scroll-mgn-b': 'margin-bottom: ' + sbh,
            '.cujo-scroll-mgn-t': 'margin-top: ' + sbh,
            '.cujo-scroll-pad': 'padding-right: ' + sbw + '; padding-bottom: ' + sbh,
            '.cujo-scroll-pad-v, .cujo-scroll-pad-r': 'padding-right: ' + sbw,
            '.dijitRtl .cujo-scroll-pad-v, .cujo-scroll-pad-l': 'padding-left: ' + sbw,
            '.cujo-scroll-pad-b': 'padding-bottom: ' + sbh,
            '.cujo-scroll-pad-t': 'padding-top: ' + sbh
        };

    cujo.forIn(scrollStyles, function (cssText, selector) {
        cujo.stylesheet.appendRule(selector, cssText);
    });

});

})(); // end of local scope
