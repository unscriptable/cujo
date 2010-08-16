/*
    cujo.mvc._Bindable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    A mixin for views to add functionality necessary to bind to a single item in a result set.

    Use cujo.mvc._Bindable as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._Bindable, { ... }); // mixin

*/
dojo.provide('cujo.mvc._Bindable');

(function () {

dojo.declare('cujo.mvc._Bindable', null, {

    //  dataItem: Object
    //  summary: the item from the dojo data store that will be bound to the nodes in this widget/view
    //  Use set() and get() to set or get this property.
    dataItem: null,

    beforeBindNode: function (node, name, attr) {},
    afterBindNode: function (node, name, attr) {},
    beforeUnbindNode: function (node, name, attr) {},
    afterUnbindNode: function (node, name, attr) {},

    constructor: function () {
        // ensure we unbind when destroyed
        if (this.uninitialize) {
            var handle = dojo.connect(this, 'destroy', this, function () {
                this._unbindDataItem();
                dojo.disconnect (handle);
            });
        }
    },

    _setDataItemAttr: function (item) {
        if (this.dataItem) {
            this._unbindDataItem(this.dataItem);
        }
        this.dataItem = item || null;
        if (item) {
            this._bindDataItem(this.dataItem);
        }
        // TODO: subscribe to anything here?
    },

    _bindDataItem: function (item) {
        cujo.lang.forIn(item || this.dataItem, this._bindNode);
    },


    _unbindDataItem: function (item) {
        cujo.lang.forIn(item, this._unbindNode);
    },

    _bindNode: function (node, attr) {
        if (dojo.isString(node)) {
            node = this[node];
        }
        // TODO: determine if read-only or read-write (how?)
        // TODO: watch for attr changes on dataItem
        // TODO: set initial value on node
    },

    _unbindNode: function (node, attr) {
        if (dojo.isString(node)) {
            node = this[node];
        }
        // TODO:
    }

});

})();