/*
    cujo.mvc.DojoDataAdapter
    (c) copyright 2010, unscriptable.com
    author: john

    Adapts a dojo 1.5 data.store to dojo 1.6's API.  Can be used as a wrapper or as a mixin!

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.DojoDataAdapter');

dojo.require("cujo._Watchable");
dojo.require("cujo._Connectable");
dojo.require("dojo.StateFul");

(function () { // local scope

dojo.declare('cujo.mvc.DojoDataAdapter', [cujo._Watchable, cujo._Connectable], {
    //  summary:
    //      Uses Adapter Pattern to allow older (1.5) data stores to work like dojo 1.6 stores.
    //      This is important since the old stores won't do data binding easily.  The new
    //      stores use native javascript object properties to represent data attributes, rather
    //      than getter / setter methods on the store.

    constructor: function (store) {
        // wrapper or mixin
        this.store = store || this;
        this._initStore(store);
    },

    // use get('store') to get a handle to the store
    _store: null,

    _initStore: function (store) {
        // sniff for old (1.5) data store methods to adapt to 1.6-compat methods
        // only mixin methods that are needed and aren't already implemented!
        var features = store.getFeatures();
                adapted = false;
        if (features['dojo.data.api.Read']) {
            if (!store.get) {
                store.get = readMixin._get;
            }
            if (!store.query) {
                store.query = readMixin._query;
            }
            store._itemToObj = readMixin._itemToObj;
            store._itemsToPromise = readMixin._itemsToPromise;
        }
        if (features['dojo.data.api.Write']) {
            if (!store.add) {
                store.add = writeMixin._add;
            }
            if (!store.put) {
                store.put = writeMixin._put;
            }
            if (!store['delete']) {
                store['delete'] = writeMixin._delete;
            }
        }
// TODO: hook up result sets to object-wide events?        
//        var self = this,
//            origFetch = store.fetch;
//        store.fetch = function (request) {
//            self.connect(request, 'onBegin', 'onBegin');
//            self.connect(request, 'onItem', 'onItem');
//            self.connect(request, 'onComplete', 'onComplete');
//            return origFetch.apply(store, arguments);
//        }
    }

});

// map dojo 1.5 events from 1.6 events
var eventsMap = {
        onAdd: 'onItem',
        onRemove: 'onDelete',
        onUpdate: 'onSet'
    };

/*
 * The following functions are mixed-into the DojoDataAdapter objects so this = adapter
 */

var readMixin = {

        _requestToResultSet: function (request) {

            var self = this,
                store = this.store,
                canceler = function () { request.abort(); return 'Fetch aborted.'; },
                promise = new dojo.Deferred(canceler),
                totalCount = new dojo.Deferred(),
                objects = []; // dojo.map(items, this._itemToObj, this);

            // hook promise methods from store callbacks

            function complete (items) {
                // grab the rest of the items
                objects.concat(dojo.map(items, self._itemToObj, self));
                // resolve the promise
                promise.resolve(promise);
                // resolve the totalCount promise
                var count = objects.length;
                totalCount.resolve(count);
                totalCount = count;
            }

            this.connect(request, 'onComplete', complete);
            this.connect(request, 'onItem', function (item) { var obj = self._itemToObj(item); objects.push(obj); promise.progress(obj); });
            this.connect(request, 'onError', function (error) { promise.reject(error); });

            // totalCount, forEach, map, filter, reduce, subscribe, and close

            promise.totalCount = totalCount;

            promise.forEach = function (lambda, context) {
                return dojo.forEach(objects, lambda, context);
            };

            promise.map = function (lambda, context) {
                return dojo.map(objects, lambda, context);
            };

            promise.filter = function (lambda, context) {
                return dojo.filter(objects, lambda, context);
            };

            //objects.reduce = function () {
                // TODO: reduce. what does this do exactly?
            //};

            promise.subscribe = function (event, callback) {
                this.connect(store, eventsMap[event], callback);
                // TODO: how to unsubscribe????
            };

            promise.close = function () {
                return request.close();
            };

            return promise;

        },

        _itemToObj: function (item) {
            // TODO: hook more stuff here (like callbacks)
            var store = this.store,
                obj = dojo.delegate(this._newObjSuper(item)); // ref back to item
            dojo.forEach(store.getAttributes(item), function (attr) {
                obj[attr] = store.getValue(item, attr);
            });
            return obj;
        },

        _newObjSuper: function (item) {
            // TODO: add exceptions if a property was modified outside of the set (by caching values in set and detecting in get/set)
            return {
                _storeItem: item,
                get: function () { return  },
                set: function () {},
                load: function () {},
                save: function () {},
                watch: function () {},
                getId: function () {},
                getMetaData: function () {}
            };
        },

        _objToItem: function (obj) {
            return obj._storeItem;
        },

        // API adapter methods for dojo 1.5 (or earlier) data.stores
        // They're here, rather than in the prototype, so they don't pollute any 1.6+ data stores
        _get: function (id) {
            // AFAIK, there is no way to cancel a fetchItemByIdentity, amIRight?
            var promise = new dojo.Deferred(),
                kwArgs = {
                    identity: id,
                    onItem: function (item) { promise.resolve(this._itemToObj(item)); },
                    onError: function (error) { promise.reject(error); }
                };
            this.store.fetchItemByIdentity(kwArgs);
            return promise;
        },

        _query: function (query, options) {
            // use fetch
            // TODO: what to do with 1.5's kwArgs.abort? or any other custom kwArgs?
            var onComplete = function () {  },
                onError = function () {  },
                kwArgs = dojo.mixin(options, {
                    query: query,
                    onComplete: onComplete,
                    onError: onError
                }),
                request = this.store.fetch(kwArgs);
            return this._requestToResultSet(request);
        }

    },

    writeMixin = {

        _add: function  (item) {
            // use newItem
            // detect if the item is hierarchical. if so, navigate and add each item hierarchically using newItem(item, parent)
        },

        _put: function (obj, options) {

            // Note: put saves ALL items, but since our 1.6 API specifies that we save one item at a time, this should be ok?
            // TODO: verify with Kris Zyp
            var store = this.store,
                item = this._objToItem(obj),
                identity = store.getIdentity(item);

            if (options.id) {
                obj[identity] = options.id;
            }

            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    store.setValue(item, p, obj[p]);
                }
            }

            var promise = new dojo.Deferred(),
                kwArgs = {
                    onComplete: function () { promise.resolve(); },
                    onError: function (error) { promise.reject(error); }
                };

            store.save(kwArgs);

            return promise;

        },

        _delete: function () {
            // TODO
        }

    };

})(); // end of local scope
