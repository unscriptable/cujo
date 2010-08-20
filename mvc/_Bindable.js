/*
    cujo.mvc._Bindable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    A mixin for views and widgets to add functionality necessary to bind to a single item in a result set.

    Use cujo.mvc._Bindable as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._Bindable, { ... }); // mixin

*/
dojo.provide('cujo.mvc._Bindable');

(function () {

dojo.declare('cujo.mvc._Bindable', null, {
    // assumes we're mixing into a widget or view with uninitialize(), postMixInProperties(), set(), and connect()

    //  dataItemAttr: String
    //      The name of the property that holds the item from the dojo data store
    //      that will be bound to the nodes in this widget/view.
    //      Use set() and get() to set or get this property.
    dataItemAttr: 'dataItem',

    //  unboundAttrs: Object
    //      These are the definitions in attributeMap that should not be auto-bound to the item from the
    //      dojo data store.  For instance, if the data item has an id property, it will conflict with
    //      the id assigned and maintained by dijit.
    unboundAttrs: {id: ''},

 /*=====
    //  attributeMap: Object
    //      attributeMap is the same as dijit._Widget's attributeMap, but has an additional attribute
    //      type added: 'widget'. This allows embedded widgets to be included in the bindings.
    //      attributeMap: {
    //          startDate: {
    //              node: 'startDateBox',
    //              type: 'widget',
    //              attribute: 'value'
    //          },
    //          displayDate: [
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'attribute',
    //                  attribute: 'title'
    //              },
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'innerHTML'
    //              }
    //          ]
    //      }
    //      In this example, startDateBox is the name of the attach point for some widget. There is also
    //      a node (attach point == 'startDateTitle') that is bound twice to displayDate (title attribute
    //      and innerHTML).
    //      Bi-directional binding:
    //      When a data-binding is bi-directional, the developer must also designate the event to be
    //      hooked in order to receive update notifications.  Example:
    //      attributeMap: {
    //          startDate: {
    //              node: 'startDateBox',
    //              type: 'widget',
    //              attribute: 'value',
    //              event: 'onChange',
    //              watch: true
    //          }
    //      }
    //      When dijit's widgets support the watch method, the watch property (if truthy) will preclude
    //      the event property.  The watch property may have a string value that indicates the name of
    //      the property to watch on the widget. If not a string, the attribute property is the default.
    attributeMap: null,
=====*/

    set: function (attr, value) {
        // override _Widget's set() to bind data item when set.
        var result = this.inherited(arguments);
        if (attr == this.dataItemAttr) {
            this._setDataItem(value);
        }
        return result;
    },

    postMixInProperties: function () {
        this._bindDataItem();
        return this.inherited(arguments);
    },
    
    uninitialize: function () {
        // ensure we unbind when destroyed
        this._unbindDataItem();
        return this.inherited(arguments);
    },

    _attrToDom: function (/*String*/ attr, /*String*/ value) {
        // handles child widgets and data transformations that dijit._Widget does not
        var commands = [].concat(this.attributeMap[attr]),
            self = this;
        dojo.forEach(commands, function (command) {
            if (command.type == 'widget') {
                var attribute = command.attribute || attr;
                this[command.node].set(attribute, value);
            }
        });
        // call inherited
        this.inherited(arguments);
    },

    _getDataItem: function () {
        return this[this.dataItemAttr];
        //return this.get(this.dataItemAttr);
    },

    _setDataItem: function (item) {
        this._unbindDataItem();
        this[this.dataItemAttr] = item || null;
        this._bindDataItem();
    },

    _bindDataItem: function () {
        // update dom
        var dataItem = this._getDataItem();
        if (dataItem) {
            cujo.lang.forIn(dataItem, this._bindDataProp, this);
            // watch for all property changes
            this._dataItemWatchHandle = dataItem.watch('*', dojo.hitch(this, '_dataPropUpdated')) || dataItem;
        }
    },

    _unbindDataItem: function () {
        var dataItem = this._getDataItem();
        // unwatch
        if (this._dataItemWatchHandle && this._dataItemWatchHandle.unwatch) {
            this._dataItemWatchHandle.unwatch();
        }
        if (dataItem) {
            cujo.lang.forIn(dataItem, this._unbindDataProp, this);
        }
    },

    _bindDataProp: function (propValue, propName, dataItem) {
        // set initial value
        if (!(propName in this.unboundAttrs)) {
            this.set(propName, dataItem[propName]);
        }
        // hook into nodes/widgets to receive changes
        var commands = [].concat(this.attributeMap[propName]);
        dojo.forEach(commands, function (command) {
            if (command && (command.event || command.watch)) {
                var node = this[command.node],
                    attr = command.attribute || propName;
                if (!command._connects) {
                    command._connects = [];
                }
                function callback () {
                    var val = command.type == 'widget' ? node.get(attr) : dojo.attr(node, attr);
                    this.set(propName, val);
                }
                if (command.watch && node.watch) {
                    var watchee = dojo.isString(command.watch) ? command.watch : attr;
                    command._connects.push(node.watch(watchee, callback));
                }
                else {
                    command._connects.push(this.connect(node, command.event, callback));
                }
            }
        }, this);
    },

    _unbindDataProp: function (propValue, propName, dataItem) {
        // unhook node/widget event callbacks
        var commands = [].concat(this.attributeMap[propName]);
        dojo.forEach(commands, function (command) {
            dojo.forEach(command._connects, function (handle) {
                if (handle.unwatch) {
                    handle.unwatch();
                }
                else {
                    this.disconnect(handle);
                }
            }, this);
        }, this);
    },

    _dataPropUpdated: function (propName, oldValue, newValue) {
        this.set(propName, this._getDataItem()[propName]);
    }

});

})();