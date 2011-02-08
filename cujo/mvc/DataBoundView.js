/*
    cujo.mvc.DataBoundView
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Introduces some new cujo view states (see cujo.mvc.DataBoundView.dataStates below):
        cujoDataUnknown - the view does not yet know if there is data or not
        cujoDataEmpty - the view received a data item, but it is null
        cujoDataBound - the view is bound to a data item

*/
define(['dojo', 'cujo/mvc/View', 'cujo/mvc/_Bindable', 'cujo/_Derivable'], function(dojo, View, Bindable, Derivable) {
// local scope

dojo.declare('cujo.mvc.DataBoundView', [View, Bindable, Derivable], {

    //  attributeMap: Object
    //      Since virtually all data items have an 'id' property, we need to map it from a
    //      different widget property.  The convention is to use 'dataId' as the widget property.
    attributeMap: {
        dataId: { data: 'id', type: 'cujoBind' }
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

    postCreate: function () {
        this._refreshDataState();
        return this.inherited(arguments);
    },

    _setDataItemAttr: function (item) {
        //  summary: overrides cujo.mvc._Bindable's _setDataItem to toggle state
        this._refreshDataState();
        return this.inherited(arguments);
    },

    _refreshDataState: function () {
        this.state({state: dataStateMapper(this.dataItem), set: dataStates});
    }

});

var dataStates = cujo.mvc.DataBoundView.dataStates = {
        unknown: 'cujo-data-unknown',
        empty: 'cujo-data-empty',
        bound: 'cujo-data-bound'
    },
    dataStateMapper = function (dataItem) {
        return (
            dataItem === undefined ? dataStates.unknown :
            dataItem == null ? dataStates.empty :
            dataStates.bound
        );
    };


return cujo.mvc.DataBoundView;

}); // end of local scope
