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

    // TODO: use dijit._Widget's get/set? and hook-up watch() in cujo._Widget
    // (detect for existence before adding watch since it's in 1.6)

/*====
    //  state: String
    //      Sets the visual state of the View.
    //      Use set('state', 'edit') and get('state') to set or get the state.
    //      States can be selected from a mutually-exclusive group by passing a cujo.__StateDef
    //      object instead of a string.  See cujo.__StateDef in cujo.dom.
    //      set() returns this widget TODO: return a promise if async
    //      get() returns all classes set on the object
    //      Example:
    //          var states = ['ready', 'done', 'pending'];
    //          widget.set('state', {state: 'pending', value: true, set: states});
====*/

    state: function (/* String */ state, /* Boolean|cujo.__StateDef */ value) {

        // disambiguate arguments
        if (dojo.isObject(state)) {
            // set
            return this._setStateDef(state);
        }
        else if (arguments.length > 1) {
            // set
            return this._setStateDef({state: state, value: value});
        }
        else {
            // get
            return this._getState(state);
        }

    },

    block: function () {
        // TODO
    },

    capture: function () {
        // TODO
    },

    query: function (query, /* DOMNode? */ node) {
        return dojo.query(query, node || this.containerNode || this.domNode);
    },

    _getState: function (/* String */ state) {
        return cujo.dom.getState(this.domNode, state);
    },

    _setStateDef: function (/* cujo.__StateDef */ stateDef) {
        stateDef.scope = stateDef.scope || this.domNode;
        return cujo.dom.setState(stateDef);
    }

});

})(); // end of local scope
