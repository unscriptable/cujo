/*
    cujo.mvc.BaseView
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.BaseView');

dojo.require('cujo._Widget');
dojo.require('cujo._Templated');
dojo.require('cujo._Connectable');

(function () { // local scope

dojo.declare('cujo.mvc.BaseView', [cujo._Widget, cujo._Templated, cujo._Connectable], {

    widgetsInTemplate: false,

    //  onStateChange: Function
    //      Event hook to catch state changes. Subclasses can override this to take special
    //      actions when state changes.  Controllers can hook into this to listen in on state changes
    //      that are triggered internally (e.g. in reaction to user events or data events).
    onStateChange: function (stateDef) {},

    state: function (/* String|cujo.__StateDef */ state, /* Boolean? */ value) {
        //  summary:
        //      Sets the visual state of the View.
        //      States can be selected from a mutually-exclusive group by passing a cujo.__StateDef
        //      object instead of a string.  See cujo.__StateDef in cujo.dom.
        //      There are three function signatures. See the examples for details.
        //  description:
        //      States are converted from camelCase strings to valid HTML-strict class names, e.g.:
        //      myView.state('bulkDelete') returns true if myView's domNode has the class 'bulk-delete'. 
        //      TODO: finish documenting all of the possible parameter combos and returns
        //      Example 1 -- Simple setter:
        //          myView.state('bulkDelete', false); // turn off 'bulkDelete' mode
        //      Example 2 -- Sniff for a specific state (getter):
        //          myView.state('bulkDelete'); // boolean
        //      Example 3 -- Return all states (getter):
        //          var array = myView.state();
        //      Example 4 -- Complex setter:
        //          var states = ['ready', 'done', 'pending'];
        //          myView.state({state: 'pending', value: true, set: states});

        // disambiguate arguments
        if (!dojo.isString(state)) {
            // set object
            state.state = cujo.lang.uncamelize(state.state);
            return this._setStateDef(state);
        }
        else if (arguments.length > 1) {
            // set string
            return this._setStateDef({state: cujo.lang.uncamelize(state), value: value});
        }
        else if (!!state) {
            // get array of current states
            return dojo.map(this._getState().split(' '), function (cn) { return cujo.lang.camelize(cn); });
        }
        else {
            // get status of single state (boolean)
            return this._getState(cujo.lang.uncamelize(state));
        }

    },

    states: function () {
        //  summary: alias for state() method with no params (getter).
        //      Returns an array of state strings.
        return this.state();
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
        return cujo.dom.getState(this.domNode, state) || '';
    },

    _setStateDef: function (/* cujo.__StateDef */ stateDef) {
        stateDef.scope = stateDef.scope || this.domNode;
        var result = cujo.dom.setState(stateDef);
        this.onStateChange(stateDef);
        return result;
    }

});

})(); // end of local scope
