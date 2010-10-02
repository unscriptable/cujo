/*
    cujo.cssx.ielayout
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO: box-flex
    TODO: support padding for box offsets in units other than px?
    TODO: position:fixed in IE6?
    TODO: display:table and display:inline-table for IE6&7
        - inline-table --> inline-block and children are also inline-block with no margin
        - table --> block and children are inline-block with no margin
        - do we need to implement border-box?
        - do we need to implement a table border spacing algorithm???? (if so, which browsers?)
    TODO: display:table-cell???

*/
dojo.provide('cujo._base.cssx.ieLayout');

(function () {

var
    // shorthand
    d = dojo,
    cssx = cujo.cssx;

// IE6 chokes on complementary pairs of box offsets (top/bottom, left/right)
// Note: this same proc must also run for all ie versions in quirks mode, if cujo ever supports quirks mode.
// TODO: somehow track if selectors have been split s owe don't have to execute this as a _DomProc
d.declare('cujo.cssx.ieLayout.BoxOffsets', cssx._TextProc, {

    activate: d.isIE < 7, // || (d.isIE && document.compatMode == "BackCompat"),

    onProperty: function (/* String */ prop, /* String */ value, /* String */ selectors, /* CSSStyleSheet */ ss) {
        /* temp */
        // TODO: remove after re-designing cssx
        var splits = this.getSplitSelectors(selectors);
        if (!splits) splits = [selectors];
        dojo.forEach(splits, function (sel) {
            this._addProp(prop, value, sel, ss);
        }, this);
    },

    _addProp: function (/* String */ prop, /* String */ value, /* String */ selector, /* CSSStyleSheet */ ss) {
        // create a css expression rule to fix it
        if (prop == 'bottom' && value != 'auto') {
            // optimize common case in which bottom is in pixels already (IE always uses '0px' for '0')
            var decl = value.match(/px$/)
                    ? 'height:expression(cujo.cssx_ieLayout_checkBoxHeight(this, ' + parseInt(value) + '));'
                    : 'height:expression(cujo.cssx_ieLayout_checkBoxHeight(this));bottom:expression("' + value + '");';
            // append it to the stylesheet
            this.appendRule(selector, decl);
//alert('rule appended: ' + selector + ' { ' + decl + ' } ');
        }
        else if (prop == 'right' && value != 'auto') {
            // optimize common case in which right is in pixels already (IE always uses '0px' for '0')
            var decl = value.match(/px$/)
                    ? 'width:expression(cujo.cssx_ieLayout_checkBoxWidth(this, ' + parseInt(value) + '));'
                    : 'width:expression(cujo.cssx_ieLayout_checkBoxWidth(this));right:expression("' + value + '");';
            // append it to the stylesheet
            this.appendRule(selector, decl);
        }
    }

});
cssx.register(new cujo.cssx.ieLayout.BoxOffsets());

cujo.cssx_ieLayout_checkBoxHeight = function (node, bVal) {
    var style = node.currentStyle,
        parent = node.offsetParent;
    // are we using box offset positioning? (Note: assumes position:fixed is fixed for IE6)
    if (parent && style.top != 'auto' && style.position == 'absolute' || style.position == 'fixed') {
        var height = parent == document.body ? document.body.clientHeight : parent.offsetHeight
                - (node.offsetHeight - node.clientHeight) /* border height */
                - parseInt(style.paddingTop)- parseInt(style.paddingBottom) /* padding height if px */;
        return height - node.offsetTop - (bVal != null ? bVal : node.style.pixelBottom) + 'px';
    }
    else
        return '';
};

cujo.cssx_ieLayout_checkBoxWidth = function (node, rVal) {
    var style = node.currentStyle,
        parent = node.offsetParent;
    // are we using box offset positioning? (Note: assumes position:fixed is fixed for IE6)
    if (parent && style.left != 'auto' && style.position == 'absolute' || style.position == 'fixed') {
        var width = (parent == document.body ? document.body.clientWidth : parent.offsetWidth)
                - (node.offsetWidth - node.clientWidth) /* border width */
                - parseInt(style.paddingLeft)- parseInt(style.paddingRight) /* padding width if px */;
        return width - node.offsetLeft - (rVal != null ? rVal : node.style.pixelRight) + 'px';
    }
    else
        return '';
};

d.declare('cujo.cssx.ieLayout.InlineBlock', cssx._TextProc, {

    // why do an expensive sniff for display:inline-block when we know which dead browsers are affected.
    activate: d.isIE < 8,

    onProperty: function (/* String */ prop, /* String */ value, /* String|Array */ selectors, /* String */ ss) {
        if (value.match(/inline-block/) && prop.match(/display/)) {
            this.appendRule(selectors, 'display:inline;zoom:1');
        }
    }

});
cssx.register(new cujo.cssx.ieLayout.InlineBlock());

})();
