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

    postCreate: function () {
        this._refreshState();
        return this.inherited(arguments);
    },

    _setDataItemAttr: function (item) {
        //  summary: overrides cujo.mvc._Bindable's _setDataItem to toggle state
        var result = this.inherited(arguments);
	    this._refreshState();
	    return result;
    },

    _refreshState: function () {
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
