/*
    cujo.mvc.DataListView
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Introduces some new cujo view states (see cujo.mvc.DataListView.dataStates below):
        cujoListUnbound - the view does not have a result set
        cujoListEmpty - the view received a result set, but it is empty
        cujoListBound - the view is bound to a result set that is not empty

*/
define(
	[
		'dojo',
		'cujo/mvc/View',
		'cujo/mvc/binder',
		'cujo/mvc/DataBoundView',
		'cujo/mvc/_BindableContainer'
	],
	function(dojo, View, binder, DataBoundView, BindableContainer) {

dojo.declare('cujo.mvc.DataListView', [View, BindableContainer], {

			// itemAttributeMap: specifies the data bindings for the bound items
			// if they don't have a dojotype. If they do have a dojotype, they
			// are assumed to be descendants of DataBoundView.
			itemAttributeMap: null,

    postCreate: function () {
        this._refreshDataState();
        return this.inherited(arguments);
    },

    _setResultSetAttr: function (item) {
        //  summary: overrides cujo.mvc._BindableContainer's _setResultSetAttr to toggle state
        var result = this.inherited(arguments);
        this._refreshDataState();
        return result;
    },

    _refreshDataState: function () {
        this.state({state: dataStateMapper(this.resultSet), set: dataStates});
			},

			_createBoundClass: function (templateNode) {
				var ctor = this.inherited(arguments);
				if (!ctor) {
					var html = this._getOuterHTML(templateNode),
						prototype = { templateString: html };
					if (this.itemAttributeMap) {
						prototype.attributeMap = this.itemAttributeMap;
    }
					ctor = dojo.declare(DataBoundView, prototype);
				}
				return ctor;
			},

			_getOuterHTML: function (node) {
				// TODO: put this in a common module
				return node.outerHTML || (function (clone) {
					var parent = clone.ownerDocument.createElement('div');
					parent.appendChild(clone);
					return parent.innerHTML;
				}(node.cloneNode(true)));
			}

});

var dataStates = cujo.mvc.DataListView.dataStates = {
        unknown: 'cujo-list-unbound',
        empty: 'cujo-list-empty',
        bound: 'cujo-list-bound'
        // TODO: add a state to indicate list is only partially loaded?
    },
    dataStateMapper = function (resultSet) {
        return (
            !resultSet ? dataStates.unknown :
            resultSet.length == 0 ? dataStates.empty :
            dataStates.bound
        );
    };


return cujo.mvc.DataListView;

	}

); // end of local scope
