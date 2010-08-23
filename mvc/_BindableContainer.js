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

    //  resultSetRoot: String
    //      The name of the node that holds the data bound items. This will be the node that has a
    //      data-dojo-attach attribute (dojoAttachPoint) of the same name.  There will be one data bound node
    //      per item in the result set. Typically, you'd leave this at its default value, 'containerNode'.
    resultSetRoot: 'containerNode',

    //  resultSetItem: String
    //      The name of the node that is cloned and bound to each item in the result set. This will be the node
    //      that has a data-dojo-attach attribute (dojoAttachPoint) of the same name.  If this node also has a
    //      data-dojo-type (dojotype) attribute, it will be instantiated as a widget and assumed to have the
    //      cujo.mvc._Bindable mixin. Typically, you'd leave this at its default value, 'itemNode'.
    resultSetItem: 'itemNode',

    //  resultSet: Object
    //      The collection of data items used to create and bind the sub-views. Note: you must use get() and
    //      set() to access this property.
    //      TODO: not sure I like treating this like a property (also see _setResultSetAttr below)
    resultSet: null,

    // hooks to catch item modifications
    onAddItem: function (item) {},
    onUpdateItem: function (item) {},
    onDeleteItem: function (item) {},

    buildRendering: function () {
        var result = this.inherited(arguments);
        if (this.resultSet) {
            this._initResultSet();
        }
        return result;
    },

    uninitialize: function () {
        this._unsubscribeResultSet();
        this.inherited(arguments);
    },

    _getResultSetAttr: function () {
        return this.resultSet;
    },

    _setResultSetAttr: function (rs) {
        // unsubscribe from any previous resultSet
        if (this.resultSet) {
            this._unsubscribeResultSet(this.resultSet);
        }
        // save result set and initialize
        this.resultSet = rs || null;
        this._initResultSet();
    },

    _initResultSet: function () {
        // subscribe to onAdd, onUpdate, and onRemove
        if (this.resultSet) {
            dojo.when(this.resultSet, dojo.hitch(this, '_resultsLoaded'), dojo.hitch(this, '_resultsError'), dojo.hitch(this, '_itemAdded'));
            this._subscribeResultSet(this.resultSet);
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
        dojo.forEach(rs, function (dataItem) {
            this._itemAdded(dataItem);
        }, this);
    },

    _resultsError: function (err) {

    },

    _itemAdded: function (item) {
        var widget = this._createBoundItem(item);
        this.onAddItem(widget);
    },

    _itemUpdated: function (item) {
        // TODO: find item
        var found;
        if (found) {
            var widget;
            this.onUpdateItem(widget);
        }
    },

    _itemDeleted: function (id) {
        // TODO: find item from id
        var item;
        if (item) {
            var widget;
            this.onDeleteItem(widget);
        }
    },

    _attachTemplateNodes: function (rootNode, getAttrFunc) {
        // snatch template out of html before it's constructed as a widget

        var result = this.inherited('_attachTemplateNodes', arguments);

        // remove data item template from DOM (it's still a node at this point)
        var tmplNode = this.itemTemplate;
        if (!tmplNode) {
            // oops! dijit doesn't hook up anything with a dojotype attr, yet
            var query = '[' + this._attrAttach + '=' + this.resultSetItem + ']';
            this.itemTemplate = tmplNode = dojo.query(query, this.domNode)[0];
        }
        if (tmplNode && tmplNode.parentNode) {
            tmplNode.parentNode.removeChild(tmplNode);
        }

        return result;

    },

    _createBoundItem: function (dataItem) {
        // TODO: is there any way we can create a DataBoundView automagically if the node is not a widget?
        var node = this.itemTemplate.cloneNode(true),
            dojoType = dojo.attr(this.itemTemplate, 'dojotype');
        dojo.place(node, this.containerNode, 'last');
        var ctor = dojo.getObject(dojoType),
            widget = new ctor({dataItem: dataItem}, node);
        return widget;
    }

});

})();