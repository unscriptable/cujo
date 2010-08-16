/*
    cujo.mvc._BindableContainer
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    A mixin for views to add functionality necessary to bind multiple sub-views (or dom fragments)
    to values in a result set.

    Use cujo._BindableContainer as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._BindableContainer, { ... }); // mixin

*/
dojo.provide('cujo.mvc._BindableContainer');

// wondering if we'll need this to auto-construct _Bindable widgets around the cloned dom fragments
//dojo.require('cujo.mvc._Bindable');

(function () {

dojo.declare('cujo.mvc._BindableContainer', null, {

    //  bindableRoot: String
    //      The name of the node that holds the data bound items. This will be the node that has a
    //      data-dojo-attach attribute (dojoAttachPoint) of the same name.  There will be one data bound node
    //      per item in the result set. Typically, you'd leave this at its default value, 'containerNode'.
    bindableRoot: 'containerNode',

    //  bindableItem: String
    //      The name of the node that is cloned and bound to each item in the result set. This will be the node
    //      that has a data-dojo-attach attribute (dojoAttachPoint) of the same name.  If this node also has a
    //      data-dojo-type (dojotype) attribute, it will be instantiated as a widget and assumed to have the
    //      cujo.mvc._Bindable mixin. Typically, you'd leave this at its default value, 'itemNode'.
    bindableItem: 'itemNode',

    //  resultSet: Object
    //      The collection of data items used to create and bind the sub-views. Note: you must use get() and
    //      set() to access this property.
    //      TODO: not sure I like treating this like a property (also see _setResultSetAttr below)
    resultSet: null,

    // hooks to catch item modifications
    onAddItem: function (item) {},
    onUpdateItem: function (item) {},
    onDeleteItem: function (item) {},

    constructor: function () {
        // ensure we unsubscribe when destroyed
        if (this.uninitialize) {
            var handle = dojo.connect(this, 'uninitialize', this, function () {
                this._unsubscribeResultSet();
                dojo.disconnect(handle);
            });
        }
    },

    _setResultSetAttr: function (rs) {
        // unsubscribe from any previous resultSet
        if (this.resultSet) {
            this._unsubscribeResultSet(this.resultSet);
        }
        // save result set and load items
        this.resultSet = rs || null;
        dojo.when(rs, dojo.hitch(this, '_resultsLoaded'), dojo.hitch(this, '_resultsError'), dojo.hitch(this, '_itemAdded'));
        // subscribe to onAdd, onUpdate, and onRemove
        if (rs) {
            this._subscribeResultSet(rs);
        }
        // TODO: initialize anything else?
    },

    _subscribeResultSet: function (rs) {
        if (rs && rs.subscribe) {
            rs.subscribe('onAdd', dojo.hitch(this, '_itemAdded'));
            rs.subscribe('onupdate', dojo.hitch(this, '_itemUpdated'));
            rs.subscribe('onDelete', dojo.hitch(this, '_itemDeleted'));
        }
    },

    _unsubscribeResultSet: function (rs) {
        if (rs && rs.unsubscribe) {
            // TODO: how to unsubscribe? the dojo 1.6 data store proposed api doesn't say how :(
        }
    },

    _resultsLoaded: function (rs) {

    },

    _resultsError: function (err) {

    },

    _itemAdded: function (item) {
        this.onAddItem(item);
    },

    _itemUpdated: function (item) {
        // TODO: find item
        var found;
        if (found) {
            this.onUpdateItem(item);
        }
    },

    _itemDeleted: function (id) {
        // TODO: find item from id
        var item;
        if (item) {
            this.onDeleteItem(item);
        }
    }

});

})();