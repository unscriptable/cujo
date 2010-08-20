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
    },

    // TODO: apply requireLocalization/getLocalization
    formatters: null,

    formatProperty: function (/* Any */ value, /* String */ propName) {
        //  summary: formats some value based on the named entry in the formatters hash map.
        //      The formatters use the dojo standard string formatting (see dojo.string.substitute).
        //      You'd typically use this to format a read-only derived property, but there are
        //      many other potential uses. Examples of typical formatters:
        //          displayName: '${lastName}, ${firstName}',
        //          salutation: 'Hello ${firstName}!',
        //          startDate: '${$value:_myFormatFunction}'
        //      The special property, $value, exists in cases when the value isn't a property
        //      on the current view (e.g. a derived property). See the documentation for
        //      dojo.string.substitute for a description of how to apply format functions.
        //      Note: if you need more complex formatting (e.g. branching or looping) on a
        //      derived property, write your own custom get() function in the derivedProp
        //      definition.  This method is for the simple cases. :)
        return this.formatString(this.formatters[propName], dojo.delegate(this, {$value: value}));
    },

    formatString: function (/* String */ template, /* Object? */ map) {
        //  summary: formats a string using dojo.string.substitute, but inserts the current
        //      view instance for the hash map (and source of format functions) for convenience.
        // TODO: do something with the transform function parameter? Right now it's null:
        return dojo.string.substitute(template, map || this, null, this);
    },

    postCreate: function () {
        this._refreshDataState();
        return this.inherited(arguments);
    },

    _setDataItem: function (item) {
        //  summary: overrides cujo._Derivable's _setDataItemAttr to toggle state
        this._refreshDataState();
        return this.inherited(arguments);
    },

    _refreshDataState: function () {
        this.state({state: dataStateMapper(this[this.dataItemAttr]), set: dataStates});
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
