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
define([
	'dojo',
	'dijit',
	'cujo/Stateful',
	'cujo/Derivable',
	'cujo/_base/dom'
],
function(dojo, dijit, Stateful, Derivable, dom2) {

	var dom = dojo,
		lang = dojo,
		undef;

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
    resultSet: null,

    //  boundViews: Array
    //      The collection of sub-views created and bound to data items in resultSet.  These get generated
    //      automatically.
    boundViews: null,

    //	_observeObjectUpdates: Boolean
    //		If true, _BindableContainer will handle in-place updates to existing items
    //		in the resultSet it is observing.  If false, it will ignore updates, and only
    //		handle new items and removed items.
    _observeObjectUpdates: true,

	// removeItemsEagerly: Boolean
	//      If true, all bound views will be removed immediately when set('resultSet',...) is
	//      called with a new result set, even if that result set is a promise.  If false,
	//      bound views will only be removed when the result set is resolved.
	removeAllItemsEagerly: true,

    // hooks to catch item modifications
    itemAdded: function (item, index, view) {},
    itemUpdated: function (item, index, view) {},
    itemDeleted: function (item, index, view) {},

	findDataItem: function (nodeOrWidget) {
		var view;
		// if it's not a node, it's a widget.
		// if it's a widget, it's assumed to be the view.
		// is this a safe assumption?
		if (nodeOrWidget.nodeType) {
			view = this._findViewNode(nodeOrWidget);
		}
		else {
			view = nodeOrWidget;
		}
		return view && this._getDataItemForView(view);
	},

	findView: function (dataItemOrNode) {
		// find by node or data item?
		if (dataItemOrNode.nodeType) {
			// check if this a widget view or a simple node view
			var node, widget;
			node = this._findViewNode(dataItemOrNode);
			widget = dijit.byNode(node); // TODO: is this a perf bottleneck?
			return widget || node;
		}
		else {
			return this._getViewForDataItem(dataItemOrNode);
		}
	},

    constructor: function () {
        // create list of items
        this.boundViews = [];
	    this._dataIndexes = {};
    },

    postCreate: function () {
        var result = this.inherited(arguments);
        return result;
    },

    uninitialize: function () {
        this._unwatchResultSet();
        this.inherited(arguments);
    },

    _getResultSetAttr: function () {
        return this.resultSet;
    },

    _setResultSetAttr: function (rs) {
	    var eager = this.removeAllItemsEagerly;

        // unsubscribe from any previous resultSet
        if (this.resultSet) {
            this._unwatchResultSet();
	        if(eager) this._removeAllItems();
        }

	    if(eager) this._refreshState();
        // save result set and initialize
        this.resultSet = rs || null;
        this._initResultSet();
        
    },

    _initResultSet: function () {
        // subscribe to onAdd, onUpdate, and onRemove
        //
        if (this.resultSet) {
            // TODO: will the progress handler ever fire?
            dojo.when(this.resultSet, dojo.hitch(this, '_resultsLoaded'), dojo.hitch(this, '_resultsError'), dojo.hitch(this, '_itemAdded'));
            this._watchResultSet();
        }
    },

    _watchResultSet: function () {
        var rs = this.resultSet;
        if (rs && rs.observe) {
            var cancel = rs.observe(dojo.hitch(this, '_handleResultSetEvent'), this._observeObjectUpdates).cancel,
                handle = this.connect(this, '_unwatchResultSet', function () {
                    if (cancel) cancel();
                    this.disconnect(handle);
                });
        }
    },

    _unwatchResultSet: function () {
        //  summary: this gets called when the result set is unwatched but unwatching
        //      happens in a callback within _watchResultSet
    },

    _handleResultSetEvent: function (item, oldIndex, newIndex) {
        // summary: fires when an item in result set changes
        // TODO: debounce these to catch moves instead of deleting/recreating
        //      - create a new debounced method to do the adds/deletes/moves and make 
        //        this method accrue add/del operations.
        //      - or will transaction() handle this better than debounce?
        
        // When oldIndex and newIndex both == -1, means that item is
        // a new item (not already in the resultSet), but *does not*
        // match the resultSet's query.
        // In that case, we don't need to do anything with the item,
        // so we can short-circuit.
        if (oldIndex == -1 && newIndex == -1) return;

        if (oldIndex == newIndex) {
        	// Item remained in the same position, but its data was updated
            this._itemUpdated(item, oldIndex);
        }
        else {
        	// This branch handles oldIndex and newIndex separately
        	// to cover 4 cases:
        	//
        	// 1. oldIndex >= 0, newIndex == -1. The item was removed from the
        	//    resultSet either forcibly, or was changed in a way that it no
        	//    longer matches the query.  In that case, remove it.
        	// 2. oldIndex == -1, newIndex >= 0. The item is new to this
        	//    resultSet.  Add it.
        	// 3. oldIndex >= 0 and newIndex >= 0.
        	//    a. The item was present, but was changed in such a way that it's
        	//       position (due to sorting) is now different.  So, we remove it,
        	//       then add it again in the new position.
	        //    b. An item was added, and it caused the result set to be larger
	        //       than the original query options (e.g. options.start & options.count)
	        //       allowed, so another item must be removed to maintain the
	        //       correct result set size.
	        if (newIndex >= 0) {
            	this._itemAdded(item, newIndex);
       		}
    	    if (oldIndex >= 0) {
    	        this._itemDeleted(item, oldIndex);
        	}
       	}
    },

    _resultsLoaded: function (rs) {
	    if(!this.removeAllItemsEagerly) this._removeAllItems();

        dojo.forEach(rs, function (dataItem) {
            this._itemAdded(dataItem);
        }, this);
    },

    _resultsError: function (err) {
        // TODO
    },

	_findViewNode: function (node) {
		// finds the root node of the view that contains the given node
		// we know we've got it when our parentNode is the containerNode
		var view;
		while (node && node != this.containerNode) {
			if (node.parentNode == this.containerNode) {
				view = node;
			}
			node = node.parentNode;
		}
		return view;
	},

	_associateViewAndDataItem: function (view, dataItem) {
		// associates a view with a data item

		// first disassociate any existing data item
		this._disassociateViewAndDataItem(view);

		// get a possibly new pointer
		var dataIndex = this._getDataPointerForView(view);

		this._dataIndexes[dataIndex] = dataItem;
		
		// set it
		if (view.set) {
			// widget
			view.set('_cujo_data_index', dataIndex);
		}
		else if (view.setAttribute) {
			// node
			view.setAttribute('data-cujo-dataindex', dataIndex);
		}
		else {
			// something else
			view._cujo_data_index = dataIndex;
		}
	},

	_getDataPointerForView: function (view) {
		// finds the pointer to the dataItem for a view
		// if no data pointer exists, it creates one
		var dataIndex;
		if (view.get) {
			// widget
			dataIndex = view.get('_cujo_data_index');
		}
		else if (view.getAttribute) {
			// node
			dataIndex = view.getAttribute('data-cujo-dataindex');
		}
		else {
			// something else
			dataIndex = view._cujo_data_index;
		}
		if (dataIndex == undef) {
			dataIndex = this._dataIndex = (this._dataIndex >= 0 ? this._dataIndex + 1 : 0);
		}
		return dataIndex;
	},

	_getDataItemForView: function (view) {
		return this._dataIndexes[this._getDataPointerForView(view)];
	},

	_getViewForDataItem: function (dataItem) {
		var found;
		for (var i = 0, view; !found && (view = this.boundViews[i]); i++) {
			if (this._getDataItemForView(view) == dataItem) {
				found = view;
			}
		}
		return found;
	},

	_disassociateViewAndDataItem: function (view) {
		var pointer = this._getDataPointerForView(view);
		if (pointer != undef) delete this._dataIndex[pointer];
	},

    _itemAdded: function (item, index) {
        var views = this.boundViews,
            pos = index >= 0 ? index : views.length,
            view = this._createBoundView(item, index);
	    this._associateViewAndDataItem(view, item);
        views.splice(pos, 0, view);
	    this._refreshState();
	    this.itemAdded(item, pos, view);
        return view;
    },

    _itemDeleted: function (item, index) {
        var removed = this.boundViews.splice(index, 1)[0];
        if (removed) {
	        this._disassociateViewAndDataItem(removed);
	        this.itemDeleted(item, index, removed);
	        this._destroyBoundView(removed);
        }
	    this._refreshState();
    },

	_itemUpdated: function (item, index) {
		var view = this.boundViews[index];
		this.itemUpdated(item, index, view);
	},

	_removeAllItems: function () {
	    var removed, dataItem, childNode;
		for (var i = this.boundViews.length - 1; i >= 0; i--) {
			removed = this.boundViews[i];
			dataItem = this._getDataItemForView(removed);
			this._itemDeleted(dataItem, i);
		}
		// dojo.destroy() fails if the dom node wasn't yet added to the document
	    while(this.containerNode 
	        && this.containerNode.firstChild 
	        &&(childNode = this.containerNode.firstChild)){
	            this.containerNode.removeChild(childNode);
	    }
		this.boundViews = [];
		
	},

    _attachTemplateNodes: function (rootNode, getAttrFunc) {
        // snatch template out of html before it's constructed as a widget

        var result = this.inherited('_attachTemplateNodes', arguments);

        // remove data item template from DOM (it's still a node at this point)
        var tmplNode = this.itemTemplate;
        if (!tmplNode) {
            // oops! dijit doesn't hook up anything with a data-dojo-type attr, yet
            var query = '[' + this._attrAttach + '=' + this.resultSetItem + ']';
            this.itemTemplate = tmplNode = dojo.query(query, this.domNode)[0];
        }
        if (tmplNode && tmplNode.parentNode) {
            tmplNode.parentNode.removeChild(tmplNode);
        }

        return result;

    },

	_createBoundClass: function (templateNode) {
		// override this method to create a bound class that doesn't use dojotype
		var dojoType = dojo.attr(templateNode, 'dojotype');
		return dojoType && dojo.getObject(dojoType);
	},

    _createBoundView: function (dataItem, index) {
	    // Returns a node or a widget (if the node has a dojotype attr)
	    // Note: for the auto-creation of a View from a node, you MUST have widgetsInTemplate:false
	    // in the list view! Otherwise, this next line will fail because this.itemTemplate will
	    // be a widget instead of a node.
        var node = this.itemTemplate.cloneNode(true),
            ctor = this._createBoundClass(node);
        dojo.place(node, this.containerNode, index >= 0 ? index : 'last');
        return ctor ?
	        new ctor({dataItem: dataItem}, node) :
	        this._bindDomFragment(dataItem, node);
    },

	_refreshState: function () {
		if (this.domNode) {
			dom2.setDomState({scope: this.domNode, state: dataStateMapper(this), set: dataStates});
		}
	},

	_bindDomFragment: function (dataItem, node) {
		var model, attachpoints;

		// create a model from the dataItem
		model = new Derivable(new Stateful(dataItem), this.itemAttributeMap);

		// mixin all dojoattachpoints
		model.set('domNode', node);
		// dojo's NodeList.concat seems to choke in IE6 so we're converting to an array :(
		attachpoints = lang._toArray(dom.query('[dojoattachpoint]', node).slice(0));
		lang.forEach(attachpoints.concat(node), function (node) {
			// there could be more than one attachpoint in 
			lang.forEach(node.getAttribute('dojoattachpoint').split(','), function (name) {
				model.set(name.replace(/^\s|\s$/, ''), node);
			});
		});

		// this logic translated from dijit._Widget
		for (var attr in this.itemAttributeMap) {
			// convert this.itemAttributeMap[attr] if it isn't already and
			// iterate over each command
			lang.forEach([].concat(this.itemAttributeMap[attr]), function (command) {
				var mapNode, type, value;
				// find the node
				mapNode = model[command.node || 'domNode'];
				// get the model attribute
				value = model.get(attr);
				// set the appropriate attribute of the node
				type = command.type || 'attribute';
				if (!mapNode) {
					throw new Error(['Can not find node for binding:', command.node, type].join(' '));
				}
				else if (type == 'innerText') {
					mapNode.innerHTML = '';
					mapNode.appendChild(dom.doc.createTextNode(value));
				}
				else if (type == 'innerHTML') {
					mapNode.innerHTML = value;
				}
				else if (type == 'class') {
					mapNode.className = value;
				}
				else if (value != undef) {
					dom.attr(mapNode, command.attribute || attr, value);
				}
				else {
					dom.removeAttr(mapNode, command.attribute || attr);
				}
			});
		}

		return node;
	},

	_destroyBoundView: function (view) {
		if (view.destroyRecursive) {
			// compound widget
			view.destroyRecursive();
		}
		else if (view.destroy) {
			// simple widget
			view.destroy();
		}
		else if (view.nodeType) {
			// node
			dojo.destroy(view);
		}
	}

});

	var dataStates = cujo.mvc._BindableContainer.dataStates = {
			unknown: 'cujo-list-unbound',
			empty: 'cujo-list-empty',
			bound: 'cujo-list-bound'
			// TODO: add a state to indicate list is only partially loaded?
		},
		dataStateMapper = function (list) {
			return (
				// we have no list
				!list.resultSet ? dataStates.unknown :
				// empty list or promise
				!list.boundViews.length ? dataStates.empty :
				// we have model items
				dataStates.bound
			);
		};


return cujo.mvc._BindableContainer;

});
