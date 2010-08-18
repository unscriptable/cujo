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
    // assumes we're mixing into a widget or view with uninitialize() and buildRendering()

    //  dataItem: Object
    //  summary: the item from the dojo data store that will be bound to the nodes in this widget/view
    //      Use set() and get() to set or get this property.
    dataItem: null,

 /*=====
    //  attributeMap: Object
    //      attributeMap is the same as dijit._Widget's attributeMap, but has an additional property:
    //      set transform function. In dijit._Widget, the developer
    //      must create a custom setter if the data needs to be transformed in any way
    //      (e.g. a date object needs to be converted to a string).  Also: a new attribute type
    //      was added: 'widget'. This allows embedded widgets to be included in the bindings.
    //      The following example shows both get and set transforms and an embedded widget:
    //      attributeMap: {
    //          startDate: [
    //              {
    //                  node: 'startDateBox',
    //                  type: 'widget',
    //                  set: '_dateToString'
    //              },
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'attribute',
    //                  attribute: 'title',
    //                  set: '_dateToString'
    //              },
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'innerHTML',
    //                  set: '_dateToString'
    //              }
    //          ]
    //      }
    //      In this example, startDateBox is the name of the attach point for some widget and
    //      _dateToString and _stringToDate are methods on the current object (this). There is also
    //      a node (attach point == 'startDateTitle') that is bound twice to startDate (title attribute
    //      and innerHTML) and uses the same transform functions.
    //      Bi-directional binding:
    //      When a data-binding is bi-directional, the developer must also designate the event to be
    //      hooked in order to receive update notifications.  She/he may also specify a get transform
    //      function.  Example:
    //      attributeMap: {
    //          startDate: {
    //              node: 'startDateBox',
    //              type: 'widget',
    //              event: 'onchange',
    //              set: '_dateToString',
    //              get: '_stringToDate'
    //          }
    //      }
    attributeMap: null,
=====*/

    uninitialize: function () {
        // ensure we unbind when destroyed
        this._unbindDataItem();
        return this.inherited(arguments);
    },

    get: function (/*String*/ attr) {
        // TODO: handle reverse data transformation
        return this.inherited(arguments);
    },

    _attrToDom: function (/*String*/ attr, /*String*/ value) {
        // handles child widgets and data transformations that dijit._Widget does not
        // TODO: data transformation
        var commands = this.attributeMap[attr];
        dojo.forEach([].concat(commands), function (command) {
            if (command.type == 'widget') {
                dijit.byNode(command.node).set(attr, value);
            }
        });
        this.inherited(arguments);
    },

    _domToAttr: function (/*String*/ attr) {
        // TODO: reverse data transform
    },

    _getDataItemAttr: function () {
        return this.dataItem;
    },

    _setDataItemAttr: function (item) {
        this._unbindDataItem();
        this.dataItem = item || null;
        this._bindDataItem();
    },

    _bindDataItem: function () {
        // update dom
        if (this.dataItem) {
            cujo.lang.forIn(this.dataItem, this._bindDataProp);
        }
        // watch for all property changes
        this._dataItemWatch = this.dataItem.watch(dojo.hitch(this, '_dataPropUpdated'));
    },


    _unbindDataItem: function () {
        // unwatch
        if (this._dataItemWatch && this._dataItemWatch.unwatch) {
            this._dataItemWatch.unwatch();
        }
        if (this.dataItem) {
            cujo.lang.forIn(this.dataItem, this._unbindDataProp);
        }
    },

    _bindDataProp: function (propName, propValue, dataItem) {
        // set initial values on nodes
        this._updateBoundNodes(propName);
    },

    _unbindDataProp: function (propName, propValue, dataItem) {
        // anything to do here?
    },

    _dataPropUpdated: function (propName, oldValue, newValue) {
        this._updateBoundNodes(propName);
    },

    _updateBoundNodes: function (propName) {
        this.set(propName, this.dataItem[propName]);
    }

});

})();