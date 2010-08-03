/*
    cujo.mvc.View
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.View');

dojo.require('cujo._Widget');
dojo.require('cujo._Templated');

(function () { // local scope

dojo.declare('cujo.mvc.View', [cujo._Widget, cujo._Templated, cujo._Connectable], {

    widgetsInTemplate: false,

    setState: function (/* cujo.__StateDef */ stateDef) {
        stateDef.scope = stateDef.scope || this.domNode;
        return cujo.dom.setState(stateDef);
    },

    getState: function (/* String */ state) {
        return cujo.dom.getState(this.domNode, state);
    },

    // TODO: this is just a stub. write for realz!
    state: function (value) {
        if (arguments.length == 0) {
            return this._state;
        }
        else {
            dojo.toggleClass(this.domNode, value)
            this._state = dojo.attr(this.domNode, 'class');
            return this;
        }
    }

});

})(); // end of local scope
