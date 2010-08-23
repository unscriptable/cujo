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
    // assumes we're mixing into a widget (or view) with uninitialize(),
    // postMixInProperties(), set(), and connect().

    dataItem: null,

    //  propertyMap: Object
    //      propertyMap maps widget properties to data item properties.
    //      propertyMap: {
    //          eventName: '',
    //          eventType: 'eventTypeStr',
    //          startDate: {
    //              bind: 'beginDate'
    //          },
    //          aWidgetProp: 'aDataProp'
    //      }
    propertyMap: null,

    constructor: function () {
        // expand shortcut propertyMap definitions
        this.propertyMap = this.propertyMap || {};
        var reverse = this._reverseBindings = {};
        cujo.lang.forInAll(this.propertyMap, function (def, propName, map) {
            if (dojo.isString(def)) {
                map[propName] = def = { bind: def || propName };
            }
            if (def.bind) {
                reverse[def.bind] = propName;
            }
        });
    },

    set: function (attr, value) {
        // override _Widget's set() to check for custom bindings
        var def = this.propertyMap[attr],
            dataItem = this.dataItem;
        if (def && def.bind && dataItem) {
            dojo.isFunction(dataItem.set) ? dataItem.set(def.bind, value) : dataItem[def.bind] = value;
        }
        return this.inherited(arguments);
    },

    get: function (attr) {
        // override _Widget's get() to check for custom bindings
        var def = this.propertyMap[attr],
            dataItem = this.dataItem;
        if (def && def.bind && dataItem) {
            return dojo.isFunction(dataItem.get) ? dataItem.get(def.bind) : dataItem[def.bind];
        }
        else {
            return this.inherited(arguments);
        }
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
            cujo.lang.forIn(this.dataItem, this._bindDataProp, this);
            // watch for all property changes
            this._dataItemWatchHandle = this.dataItem.watch('*', dojo.hitch(this, '_dataPropUpdated')) || this.dataItem;
        }
    },

    _unbindDataItem: function () {
        // unwatch
        if (this._dataItemWatchHandle && this._dataItemWatchHandle.unwatch) {
            this._dataItemWatchHandle.unwatch();
        }
        if (this.dataItem) {
            cujo.lang.forIn(this.dataItem, this._unbindDataProp, this);
        }
    },

    _bindDataProp: function (propValue, propName, dataItem) {
        // set initial value
        propName = this._reverseBindings[propName] || propName;
        this.set(propName, dataItem[propName]);
    },

    _unbindDataProp: function (propValue, propName, dataItem) {
        // wondering if there's ever going to be something to do here?
    },

    _dataPropUpdated: function (propName, oldValue, newValue) {
        var dataItem = this.dataItem;
        this.set(propName, dojo.isFunction(dataItem.get) ? dataItem.get(propName) : dataItem[propName]);
    }

});

})();