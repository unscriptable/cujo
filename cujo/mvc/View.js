/*
    cujo.mvc.View
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
define(['dojo', 'cujo/_Widget', 'cujo/_Templated'], function(dojo, Widget, Templated) {
// local scope

dojo.declare('cujo.mvc.View', [Widget, Templated], {

    //  widgetsInTemplate: Boolean
    //  summary: set this to true if there are widgets in this view's template. Otherwise
    //  it'll skip over these, but load faster, of course.
    widgetsInTemplate: false,

    //  stateChanged: Function
    //      Event hook to catch state changes. Subclasses can override this to take special
    //      actions when state changes.  Controllers can hook into this to listen in on state changes
    //      that are triggered internally (e.g. in reaction to user events or data events).
    stateChanged: function (stateDef) {},

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
            return this._setStateDef(state);
        }
        else if (arguments.length > 1) {
            // set string
            return this._setStateDef({state: state, value: value});
        }
        else {
            // get state
            return this._getState(state);
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
        if (state) state = cujo.uncamelize(state);
        var states = cujo.getDomState(this.domNode, state) || '';
        return state ? !!states : dojo.map(states.split(' '), function (s) { return cujo.camelize(s); });
    },

    _setStateDef: function (/* cujo.__StateDef */ stateDef) {
        stateDef.scope = stateDef.scope || this.domNode;
        var currState = cujo.getDomState(stateDef.scope);
            rawDef = dojo.delegate(stateDef);
        rawDef.state = cujo.uncamelize(stateDef.state);
        var result = cujo.setDomState(rawDef);
        if (currState != cujo.getDomState(stateDef.scope)) {
            this.stateChanged(stateDef);
        }
        return result;
    }

});

return cujo.mvc.View;

}); // end of local scope
