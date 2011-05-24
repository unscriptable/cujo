/*
    cujo.mvc.View
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
define(['dojo', 'cujo/_base/dom', 'cujo/_Widget', 'cujo/_Templated'], function(dojo, domExt, Widget, Templated) {
// local scope

dojo.declare('cujo.mvc.View', [Widget, Templated], {

    //  widgetsInTemplate: Boolean
    //  summary: set this to true if there are widgets in this view's template. Otherwise
    //  it'll skip over these, but load faster, of course.
    widgetsInTemplate: true,

    //  stateChanged: Function
    //      Event hook to catch state changes. Subclasses can override this to take special
    //      actions when state changes.  Controllers can hook into this to listen in on state changes
    //      that are triggered internally (e.g. in reaction to user events or data events).
    stateChanged: function (stateDef) {},

    state: function (/* String|cujo.__StateDef */ state, /* Boolean? */ value) {
        //  summary:
        //      Sets the visual state of the View.
        //      States can be selected from a mutually-exclusive group by passing a cujo.__StateDef
        //      object instead of a string.  See cujo.__StateDef in cujo/_base/dom.
        //      There are three function signatures. See the examples for details.
        //  description:
        //      States are converted from camelCase strings to valid HTML-strict class names, e.g.:
        //      myView.state('bulk-delete') returns true if myView's domNode has the class 'bulk-delete'.
        //      TODO: finish documenting all of the possible parameter combos and returns
        //      Example 1 -- Simple setter:
        //          myView.state('bulk-delete', false); // turn off 'bulkDelete' mode
        //      Example 2 -- Sniff for a specific state (getter):
        //          myView.state('bulk-delete'); // boolean
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

	applyTemplate: function (args) {
		// TODO: move this to _Widget or View
	    //  summary: applies a template defined by propName to the current
		//      widget (this). The template uses dojo standard string formatting
		//      (see dojo.string.substitute). You'd typically use this to format
		//      a read-only derived property, but there are many other potential
		//      uses. Examples of typical templates:
	    //          displayName: '${lastName}, ${firstName}',
	    //          salutation: 'Hello ${firstName}!',
	    //          startDate: '${$value:_myFormatFunction}'
	    //      See the documentation for dojo.string.substitute for
	    //      a description of how to apply format functions in templates.
	    //      Note: if you need more complex formatting (e.g. branching or
		//      looping) on a derived property, write your own custom transform()
		//      function in the attributeMap definition.  This method is for the
		//      simple cases. :)
		//      If the args.transform function is missing, a "safe"
		//      function is used: a blank is inserted if the token
		//      is not found as a property in the current view.
	    var template = args.template || args.templateName &&
		        dojo.getObject(args.templateName, false, this),
	        transform = args.transform && dojo.hitch(this, args.transform) ||
		        function (v, p) { return v == null ? '' : v; };
	    return this.formatString(template, this, transform);
	},

	formatString: function (/* String */ template, /* Object? */ map, /* Function? */ transform) {
	    //  summary: formats a string using dojo.string.substitute, but inserts the current
	    //      view instance for the hash map (and source of format functions) for convenience.
		return dojo.string.substitute(template, map || this, transform, this);
	},

    _getState: function (/* String */ state) {
        var states = domExt.getDomState(this.domNode, state) || '';
        return state ? !!states : states.split(' ');
    },

    _setStateDef: function (/* cujo.__StateDef */ stateDef) {
        stateDef.scope = stateDef.scope || this.domNode;
        var currState = domExt.getDomState(stateDef.scope);
        var result = domExt.setDomState(stateDef);
        if (currState != domExt.getDomState(stateDef.scope)) {
            this.stateChanged(stateDef);
        }
        return result;
    }

});

return cujo.mvc.View;

}); // end of local scope
