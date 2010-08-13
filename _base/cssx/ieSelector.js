/*
    cujo._base.cssx.ieSelector
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.cssx.ieSelector');

// TODO: create a recursive onSelector procedure that re-parses the on > + and []
// TODO: fix IE6's inability to handle multiple classnames, e.g. DIV.one.two {}
// TODO: remove the old, invalid rules since they get processed, causing slowdowns at parse time and run time

(function () { // local scope

var d = dojo,
    cssProc = cujo.cssProc,
    id = 0;

d.declare('cujo.cssx.ieSelector.Child', cssProc._TextProc, {

    activate: d.isIE < 7, // || (d.isIE && document.compatMode == "BackCompat"),

    onSelector: function (/* String */ selector, /* String */ ss) {
        // optimization: the vast majority of selectors will NOT have > so we're using indexOf (faster than split or match)
        if (selector.indexOf('>') >= 0) {
            var ancestry = selector.split(/\s*>\s*/g),
                rules = [];
            // bail if any blanks were found
            if (d.some(ancestry, function (a) { return !a }))
                return false;
            this._init();
            this._selSplits.push(ancestry);
            if (!this._props)
                this._props = [];
            /* temp */
            // TODO: remove after re-designing cssProc
            this.saveSplitSelectors(selector, ancestry);
        }
    },

    onProperty: function (/* String */ propName, /* String */ value, /* String|Array */ selectors, /* String */ ss) {
        if (this._props) {
            this._props.push(propName, ':', value, ';');
        }
    },

    onEndRule: function (/* String */ selector, /* String */ ss) {

        if (this._selSplits && this._selSplits.length > 0) {

            for (var a = 0, len1 = this._selSplits.length; a < len1; a++) {

                var parts = this._selSplits[a],
                    // create unique key for this ancestry
                    key = this._createKey(),
                    // original rule's props
                    props = this._props.join(''),
                    // original rule's independent selectors (not in ancestral hierarchy)
                    selectors = parts.join(',');

                // for the child selector, create a rule that contains all of the properties from the original rule
                this.appendRule('.' + key, props);

                // add a rule to test for a match in each ancestor
                var i = parts.length;
                while (--i >= 0)
                    this.appendRule(parts[i], key + '-' + i + ':1;');

                //this.appendRule(selectors, key + ':1;');

                // add a rule to child to test if all ancestors match, and if so, apply first rule
                this.appendRule(parts[parts.length - 1], key + '-exec:expression(cujo.cssx_ieSelector_checkMatch(this,"' + key + '",' + parts.length + '))');

            }

            this._reset();

        }

    },

    _createKey: function () {
        return 'cujo-selector-' + id++;
    },

    _reset: function () {
        this._selSplits = [];
        delete this._props;
    },

    _init: function () {
        this._reset();
    }

});
cssProc.register(new cujo.cssx.ieSelector.Child());

cujo.cssx_ieSelector_checkMatch = function (child, key, levels) {

    // walk up the DOM to see if all of our ancestors match the original selector
    var
        // assume success
        ok = true,
        // is the key class already added? (this is faster than dojo.hasClass)
        has = child.className.indexOf(key) >= 0,
        // node is the node at the current level
        node = child,
        i = levels;

    // walk up the DOM to see if all nodes match
    while (ok && --i >= 0 && node && node.nodeType == 1) {
        ok = ok && !!node.currentStyle[key + '-' + i];
        node = node.parentNode;
    }

    // IE is full of dumb so dojo's toggleClass is inefficient on IE6
    if (ok && !has)
        dojo.addClass(child, key)
    else if (!ok && has)
        dojo.removeClass(child, key);

//if (ok ^ has) console.log('end', ok, has);
};

})(); // end of local scope
