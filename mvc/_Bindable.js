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

    // TODO: this should be a class member, not a prototype member. how to fix this?
    //  attributeMap: Object
    //      attributeMap maps widget/view properties to data item properties.
    //      attributeMap: {
    //          // 3-way binding on this.userName/domNode.userName/dataItem.userName
    //          userName: '',
    //          // 3-way binding on this.userId/domNode.displayId/dataItem.displayId
    //          userId: 'displayId',
    //          // 3-way binding on this.endDate/endDateNode.value/dataItem.finalDate
    //          endDate: {
    //              type: 'attribute',
    //              node: 'endDateNode',
    //              attribute: 'value',
    //              data: 'finalDate'
    //          },
    //          // 2-way binding on this.startDate/dataItem.beginDate
    //          startDate: {
    //              data: 'beginDate',
    //              type: 'no-dom'
    //          },
    //          aWidgetProp: 'aDataProp'
    //      }
    attributeMap: null,

    //  bindAllAttributes: Boolean
    //      Set bindAllAttributes to true to always bind all attributes from the dataItem.
    //      This is good for generic solutions, NOT FOR LAZY PROGRAMMERS. :)
    bindAllAttributes: false,

    constructor: function () {
        // expand shortcut attributeMap definitions
        this.attributeMap = this.attributeMap || {};
        var reverse = this._reverseBindings = {};
        // fill-in shortcut attributeMap definitions
        cujo.lang.forInAll(this.attributeMap, function (def, propName, map) {
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
        this._localAttrToDataAttr(value, attr);
        return this.inherited(arguments);
    },

    get: function (attr) {
        // override _Widget's get() to check for custom bindings?
        // the values should be synchronized at all times, so just return the inherited value
        return this.inherited(arguments);
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
            if (this.dataItem.watch) {
                this._dataItemWatchHandle = this.dataItem.watch('*', dojo.hitch(this, '_dataPropUpdated')) || this.dataItem;
            }
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

    _bindDataProp: function (value, dataAttr, dataItem) {
        // create reverse binding if it hasn't been already and we're binding all
        if (this.bindAllAttributes && !this._reverseBindings[dataAttr]) {
            this._reverseBindings[dataAttr] = { bind: dataAttr };
        }
        // set initial value
        this._dataAttrToLocalAttr(value, dataAttr);
    },

    _unbindDataProp: function (value, dataAttr, dataItem) {
        // remove reverse binding if it was created automatically
        if (this.bindAllAttributes && !this.attributeMap[dataAttr]) {
            delete this._reverseBindings[dataAttr];
        }
        // remove value
        this._dataAttrToLocalAttr(void 0, dataAttr);
    },

    _dataAttrToLocalAttr: function (value, dataAttr) {
        var dataItem = this.dataItem,
            viewName = this._reverseBindings[dataAttr];
        if (viewName) {
            this.set(viewName, value);
        }
    },

    _localAttrToDataAttr: function (value, viewAttr) {
        var dataItem = this.dataItem,
            binding = this.attributeMap[viewAttr],
            boundName = binding && binding.bind;
        if (boundName) {
            dojo.isFunction(dataItem.set) ? dataItem.set(boundName, value) : dataItem[boundName] = value;
        }
    },

    _dataPropUpdated: function (propName, oldValue, newValue) {
        this._dataAttrToLocalAttr(newValue, propName);
    }

});

})();