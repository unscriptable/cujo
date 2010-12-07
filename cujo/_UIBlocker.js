/*
    cujo._UIBlocker
    (c) copyright 2009 unscriptable.com

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Developers should not need to use this class directly.  Use cujo.dom.setState() instead.

    TODO: disable keyboard navigation / events
    TODO: keep track of status messages and zIndexes

*/
define(['dojo', 'cujo/_Widget', 'cujo/_Templated'], function(dojo) {
	
// cujo.registerPublisher('cujo.dom.block.visualization.start', 'all');

dojo.declare('cujo._UIBlocker', [cujo._Widget, cujo._Templated], {
    //  summary:
    //      cujo._UIBlocker is meant for internal use by cujo's dom library. If you are trying to
    //      use it directly, *you are likely doing something wrong*. There are some overrideable
    //      properties in _UIBlocker that you can set via cujo.customize topic (see cujo._Widget).

    //  statusMessage: String
    //      Provides a status message. Can be localized via cujo.customize topic (see cujo._Widget).
    statusMessage: '',

    // zIndex: Number
    //      Determines the z-index at which to put the blocker. This should be higher than any nodes
    //      that need to be blocked! Can be customized via cujo.customize topic (see cujo._Widget).
    zIndex: 100000,

    //  diversionDelay: Number
    //      The delay in milliseconds to wait before showing the user a visualization that the UI
    //      is being blocked. Can be customized via cujo.customize topic (see cujo._Widget).
    diversionDelay: 500, //msec

    // TODO: replace this with a topic, 'cujo.dom.block.visualization.start'
    //onUIDiversion: function () {},

    //  templateString: String
    //      The HTML markup needed to construct this widget. Can be localized via cujo.customize
    //      topic (see cujo._Widget).
    templateString: '\
        <div class="uiBlockerContainer" style="display: none;">\
            <div class="uiBlockerBg"></div>\
            <div class="uiBlockerStatusVPos">\
                <div class="uiBlockerDiversionContainer">\
                    <img class="uiBlockerDiversion" src="${imagesPath}/uiBlockerAnim.gif"/>\
                    <h3 dojoAttachPoint="textNode" class="uiBlockerDiversionText"></h3>\
                </div>\
            </div>\
        </div>',

    attributeMap: { zIndex: '' },

    block: function () {
        if (this._blockCount == 0)
            this._show();
        return ++this._blockCount;
    },

    unblock: function () {
        this._blockCount = Math.max(0, --this._blockCount);
        if (this._blockCount == 0)
            this._hide();
        return this._blockCount;
    },

    isBlocking: function () { return _blockCount > 0; },

    postCreate: function () {
        this.inherited(arguments);
        this._createBgIframe();
        var divertFunc = dojo.hitch(this, '_onUIDiversion');
        this._delayedDiversion = cujo.debounce(divertFunc, this.diversionDelay, false);
        this._preventDiversion = divertFunc.stop;
    },

    _blockCount: 0,

    _show: function () {
        // start blocking mouse events
        cujo.setDomState({scope: this.domNode, state: 'hide', value: false});
        //dojo.style(this.domNode, 'display', '');
        // TODO: block keyboard events
        // show diversion later
        this._delayedDiversion();
    },

    _hide: function () {
        // unblock mouse events
        cujo.setDomState({scope: this.domNode, state: 'hide', value: true});
        //dojo.style(this.domNode, 'display', 'none');
        // TODO: unblock keyboard events
        // prevent diversion from popping up
        this._preventDiversion();
        // remove disabled styling
        cujo.setDomState({scope: this.domNode, state: 'active', value: false});
        //dojo.removeClass(this.domNode, 'uiBlockerDivert');
    },

    _onUIDiversion: function () {
        // if the diversion is not handled in the handler
        if (this.onUIDiversion && this.onUIDiversion() !== false)
            // style this as disabled
            cujo.setDomState({scope: this.domNode, state: 'active', value: true});
            //dojo.addClass(this.domNode, 'uiBlockerDivert');
    },

    _createBgIframe: function () {
        // adapted from dojo's dijit.BackgroundIframe
        if (dojo.isIE < 7) {
            var html = '<iframe src="'
                    + dojo.moduleUrl('dojo', 'resources/blank.html')
                    + '" class="uiBlockerIframe" tabIndex="-1">',
                iframe = dojo.doc.createElement(html);
        }
        else if (dojo.isFF < 3 && dojo.hasClass(dojo.body(), 'dijit_a11y')) {
            iframe = dojo.create('iframe', {
                src: 'javascript:""',
                'class': 'uiBlockerIframe',
                tabIndex: -1
            });
        }
        return iframe;
    },

    _getStatusMessageAttr: function () {
        return this.textNode.innerHTML;
    },

    _setStatusMessageAttr: function (value) {
        this.textNode.innerHTML = value;
    },

    _setZIndexAttr: function (value) {
        dojo.style(this.domNode, 'zIndex', value);
    },

    _getZIndexAttr: function () {
        return dojo.style(this.domNode, 'zIndex');
    }

});

return cujo._UIBlocker;

});

