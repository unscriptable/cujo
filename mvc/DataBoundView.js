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
dojo.provide('cujo.mvc.DataBoundView');

dojo.require('cujo.mvc.View');
dojo.require('cujo.mvc._Bindable');
dojo.require('cujo._Derivable');

(function () { // local scope

dojo.declare('cujo.mvc.DataBoundView', [cujo.mvc.View, cujo.mvc._Bindable, cujo._Derivable], {

    //  attributeMap: Object
    //      Since virtually all data items have an 'id' property, we need to map it from a
    //      different widget property.  The convention is to use 'dataId' as the widget property.
    attributeMap: {
        dataId: {
            data: 'id',
            type: 'no-dom'
        }
    },

    applyTemplate: function (/* Object */ args) {
        //  summary: applies a template defined by propName to the current widget (this).
        //      The template uses dojo standard string formatting (see dojo.string.substitute).
        //      You'd typically use this to format a read-only derived property, but there are
        //      many other potential uses. Examples of typical templates:
        //          displayName: '${lastName}, ${firstName}',
        //          salutation: 'Hello ${firstName}!',
        //          startDate: '${$value:_myFormatFunction}'
        //      See the documentation for dojo.string.substitute for
        //      a description of how to apply format functions in templates.
        //      Note: if you need more complex formatting (e.g. branching or looping) on a
        //      derived property, write your own custom transform() function in the attributeMap
        //      definition.  This method is for the simple cases. :)
        var template = args.template || args.templateName && dojo.getObject(args.templateName, false, this),
            transform = args.transform && dojo.hitch(this, args.transform);
        return this.formatString(template, this, transform);
    },

    formatString: function (/* String */ template, /* Object? */ map, /* Function? */ transform) {
        //  summary: formats a string using dojo.string.substitute, but inserts the current
        //      view instance for the hash map (and source of format functions) for convenience.
        try {
            return dojo.string.substitute(template, map || this, transform, this);
        }
        catch (ex) {
            // TODO: figure out how to intelligently handle when a property isn't yet available
            return '';
        }
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
        unknown: 'cujoDataUnknown',
        empty: 'cujoDataEmpty',
        bound: 'cujoDataBound'
    },
    dataStateMapper = function (dataItem) {
        return (
            dataItem === undefined ? dataStates.unknown :
            dataItem == null ? dataStates.empty :
            dataStates.bound
        );
    };

})(); // end of local scope
