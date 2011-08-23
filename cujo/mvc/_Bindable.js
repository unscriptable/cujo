/*
    cujo.mvc._Bindable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO: create a decorator version of this mixin?

*/
define(['dojo', 'cujo/_base/lang'], function(dojo, langExt) {
// local scope

dojo.declare('cujo.mvc._Bindable', null, {
    //A mixin for views and widgets to add functionality necessary to bind to a single item in a result set.
    //Use cujo.mvc._Bindable as a mixin in a multiple-inheritance pattern:
    //    dojo.declare('myClass', cujo._Bindable, { ... }); // mixin
    // assumes we're mixing into a widget (or view) with uninitialize(),
    // postMixInProperties(), set(), and connect().

    dataItem: null,

    /*=====
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
    //          // bind multiple dom nodes (no need to specify data binding twice)
    //          title: [
    //              {
    //                  type: 'attribute',
    //                  node: 'linkNode',
    //                  attribute: 'title',
    //                  data: 'title'
    //              },
    //              {
    //                  type: 'innerText',
    //                  node: 'labelNode'
    //              }
    //          ]
    //      }
    attributeMap: null,
    =====*/

    //  bindAllAttributes: Boolean
    //      Set bindAllAttributes to true to always bind all attributes from the dataItem.
    //      This is good for generic solutions, NOT FOR LAZY PROGRAMMERS. :)
    bindAllAttributes: false,

    constructor: function () {
        // expand shortcut attributeMap definitions

        var reverse = this._reverseBindings = {};
        langExt.forInAll(this.attributeMap, function (defs, propName, map) {
            if (dojo.isString(defs)) {
                // fill-in shortcut attributeMap definitions
                // Note: we have to auto-populate node since once we've constructed a
                // command object, dijit._Widget assumes that it defines a node.
                // default node is this.domNode
                map[propName] = defs = { 
                    data: defs || propName,
                    node: 'domNode'
                };
            }
            // grab reverse-lookups
            dojo.forEach([].concat(defs), function (def) {
                if ('data' in def) {
                    reverse[def.data || propName] = propName;
                }
            });
        });

    },

    set: function (attr, value) {
        //  summary: override _Widget's set() to check for custom bindings
        if (this[attr] !== value) {
            this._localAttrToDataAttr(value, attr);
        }
        return this.inherited(arguments);
    },

	syncDomAttrs: function () {
		//  summary:
		//      Browsers are screwy. Case in point: onChange events happen
		//      after button clicks, which could be submit buttons, which
		//      means that the submit could happen before a view is notified
		//      that an input's value has changed.  This method may be used to
		//      force the values from the dom back to the dataItem
		//      and local attributes.
		var self = this;

		for (var p in this.attributeMap) (function (defs, propName) {
			dojo.forEach([].concat(defs), function (def) {
				var attr, node, value;
				attr = def.attribute || propName;
				node = def.node && self[def.node]; // node is the name of an attach point
				if (node) {
					// `node` could actually be a widget, which will have a get() method
					value = dojo.isFunction(node.get) ? node.get(attr) : dojo.attr(node, attr);
					self.set(propName, value);
				}
			});
		}(this.attributeMap[p], p));

	},

    postCreate: function () {
        if (this.dataItem) {
            this._bindDataItem(this.dataItem);
        }
        return this.inherited(arguments);
    },
    
    uninitialize: function () {
        //  summary: ensure we unbind when destroyed
        this._unbindDataItem();
        return this.inherited(arguments);
    },

    _getDataItemAttr: function () {
        return this.dataItem;
    },

    _setDataItemAttr: function (item) {
        if (item !== this.dataItem) {
            // unbind
            if (this.dataItem) {
                // disconnect dataItem before we start setting all bound properties to undefined
                // (or we'll set the dataItem properties to undefined, too)
                var currDataItem = this.dataItem;
                this.dataItem = void 0;
                this._unbindDataItem(currDataItem);
            }
            // bind
			this._bindDataItem(item);
			this.dataItem = item;
        }
    },

    _bindDataItem: function (dataItem) {
        // update dom
        langExt.forIn(dataItem, this._bindDataProp, this);
        // watch for all property changes
        if (dataItem && dataItem.watch) {
            this._dataItemWatchHandle = dataItem.watch('*', dojo.hitch(this, '_dataPropUpdated')) || dataItem;
        }
    },

    _unbindDataItem: function (dataItem) {
        // unwatch
        if (this._dataItemWatchHandle && this._dataItemWatchHandle.unwatch) {
            this._dataItemWatchHandle.unwatch();
        }
        langExt.forIn(dataItem, this._unbindDataProp, this);
    },

    _bindDataProp: function (value, dataAttr, dataItem) {
        // create reverse binding if it hasn't been already and we're binding all
        if (this.bindAllAttributes && !this._reverseBindings[dataAttr]) {
            this._reverseBindings[dataAttr] = { data: dataAttr };
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
        var localAttr = this._reverseBindings[dataAttr],
            binding = this.attributeMap[localAttr];
        // only call set if the attribute has changed
        // Note: we're using this[propName] instead of this.get(propName). This should be safe
        // because we're always keeping this[propName] current. 
        if (localAttr && value !== this[localAttr] && binding._origin != 'local') {
            binding._origin = 'data';
            this.set(localAttr, value);
            delete binding._origin;
        }
    },

    _localAttrToDataAttr: function (value, localAttr) {
        var dataItem = this.dataItem,
            binding = this.attributeMap[localAttr],
            dataAttr = binding && binding.data;
        if (dataAttr && dataItem && binding._origin != 'data') {
            binding._origin = 'local';
            dojo.isFunction(dataItem.set) ? dataItem.set(dataAttr, value) : dataItem[dataAttr] = value;
            delete binding._origin;
        }
    },

    _dataPropUpdated: function (propName, oldValue, newValue) {
        this._dataAttrToLocalAttr(newValue, propName);
    }

});


return cujo.mvc._Bindable;

});