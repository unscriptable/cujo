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

dojo.require('cujo.mvc.BaseView');
dojo.require('cujo.mvc._Bindable');
dojo.require('cujo._Derivable');

(function () { // local scope

dojo.declare('cujo.mvc.DataBoundView', [cujo.mvc.BaseView, cujo.mvc._Bindable, cujo._Derivable], {

    // TODO: apply requireLocalization/getLocalization
    strings: {
        // this is a catchall place to store strings that will be translated / customized
        // before placing in the dom
    },

    //  propertyMap: Object
    //      Since virtually all data items have an 'id' property, we need to map it from a
    //      different widget property.  The convention is to use 'dataId' as the widget property.
    propertyMap: dojo.delegate(cujo.mvc.BaseView.prototype.propertyMap, {
        dataId: {
            bind: 'id'
        }
    }),

    applyTemplate: function (/* Any */ template) {
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
        //      derived property, write your own custom transform() function in the propertyMap
        //      definition.  This method is for the simple cases. :)
        return this.formatString(template, this);
    },

    formatString: function (/* String */ template, /* Object? */ map) {
        //  summary: formats a string using dojo.string.substitute, but inserts the current
        //      view instance for the hash map (and source of format functions) for convenience.
        // TODO: do something useful with the transform function parameter?
        try {
            return dojo.string.substitute(template, map || this, null, this);
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
