/*
    cujo.mvc.DojoDataAdapter
    (c) copyright 2010, unscriptable.com
    author: john

    Adapts a dojo 1.5 data.store to dojo 1.6's API.  Can be used as a wrapper or as a mixin!

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.DojoDataAdapter');

dojo.require("dojo.StateFul");

dojo.declare('cujo.mvc.DojoDataAdapter', null, {

	target: "",

    constructor: function(options){
		// summary:
		// 		This is an adapter for using Dojo Data stores with an object store consumer.
		//		You can provide a Dojo data store and use this adapter to interact with it through
		//		the Dojo object store API
		//	options:
		//		This provides any configuration information that will be mixed into the store
		// options.store:
		// 		This is the Dojo data store
		dojo.mixin(this, options);
		this.idProperty = this.store.getIdentityAttributes()[0];
	},

    get: function(id, options){
		//	summary:
		// 		Retrieves an object by it's identity. This will trigger a fetchItemByIdentity
		// id:
		// 		The identity to use to lookup the object
		var returnedObject, returnedError;
		var deferred = new dojo.Deferred();
		var store = this.store, self = this;
		store.fetchItemByIdentity({
			identity: id,
			onItem: function(item){
				deferred.resolve(returnedObject = self._itemToObject(item));
			},
			onError: function(error){
				deferred.reject(returnedError = error);
			}
		});
		if(returnedObject){
			// if it was returned synchronously
			return returnedObject;
		}
		if(returnedError){
			throw returnedError;
		}
		return deferred.promise;
	},

    put: function(object, options){
		//	summary:
		// 		Stores an object by it's identity.
		// object:
		// 		The object to store.
		// options:
		// 		Additional metadata for storing the data
		// options.id:
		// 		The identity to use for storing the data
		var id = options && typeof options.id != "undefined" || object[this.idProperty];
		var store = this.store;
		if(typeof id == "undefined"){
			store.newItem(object);
		}else{
			store.fetchItemByIdentity({
				identity: id,
				onItem: function(item){
					if(item){
						for(var i in object){
							if(store.getValue(item, i) != object[i]){
								store.setValue(item, i, object[i]);
							}
						}
					}else{
						store.newItem(object);
					}
				}
			});
		}
	},

    "delete": function(id){
		//	summary:
		// 		Deletes an object by its identity.
		// id:
		// 		The identity to use to delete the object
		var store = this.store;
		this.store.fetchItemByIdentity({
			identity: id,
			onItem: function(item){
				store.deleteItem(item);
			}
		});

	},

    query: function(query, options){
		//	summary:
		// 		Queries the store for objects.
		// query:
		// 		The query to use for retrieving objects from the store
		var returnedObject, returnedError;
		var deferred = new dojo.Deferred();
		deferred.total = new dojo.Deferred();
		this.store.fetch(dojo.mixin({
			query: query,
			onBegin: function(count){
				deferred.total.resolve(count);
			},
			onComplete: function(results){
                var self = this,
                    statefulResults = dojo.map(results, function (item) { return self._itemToObject(item);} );
				deferred.resolve(statefulResults);
			},
			onError: function(error){
				deferred.reject(error);
			}
		}, options));
		return this._deferredToResultSet(deferred);
	},

    _itemToObject: function (item) {
        var object = dojo.delegate({_item: item});
        var attributes = this.store.getAttributes(item);
        for(var i = 0; i < attributes.length; i++){
            object[attributes[i]] = this.store.getValue(item, attributes[i]);
        }
        return new dojo.Stateful(object);
    },

    _deferredToResultSet: function (dfd) {
        // TODO: how to unsubscribe? dojo 1.6 wiki does not say!
        // add subscribe
        dfd.subscribe = function (event, callback) {
            var handle;
            dojo.when(dfd, function (results) {
                if (event = 'onAdd') {
                    handle = dojo.connect(this.store, 'onNew', this, function (item, parentInfo) {
                        // TODO: how to tell if the item belongs in our query's result set????
                        callback(this._itemToObject(item));
                    });
                }
                else if (event = 'onUpdate') {
                    handle = dojo.connect(this.store, 'onSet', this, function (item, attribute, oldValue, newValue) {
                        // find item and then call callback
                        var found;
                        dojo.some(results, function (obj, i) {
                            return found = (item == obj._item ? obj : void 0);
                        });
                        if (found) {
                            callback(found, attribute, oldValue, newValue);
                        }
                    });
                }
                else if (event = 'onRemove') {
                    handle = dojo.connect(this.store, 'onDelete', this, function (item) {
                        // find item and then call callback
                        var found;
                        dojo.some(results, function (obj, i) {
                            return found = (item == obj._item ? obj : void 0);
                        });
                        if (found) {
                            callback(found);
                        }
                    });
                }
                return {
                    unsubscribe: function () {
                        if (handle) dojo.disconnect(handle);
                    }
                };
            });
        };
        // add other methods
        return cujo.mvc.QueryResults(dfd);
    }

});


cujo.mvc.QueryResults = function(results){
	//	summary:
	//		This wraps a query results with the appropriate methods
	function addIterativeMethod(method){
		if(!results[method]){
			results[method] = function(){
				var args = arguments;
				return dojo.when(results, function(results){
					Array.prototype.unshift.call(args, results);
					return dojo[method].apply(dojo, args);
				});
			}
		}
	}
	addIterativeMethod("forEach");
	addIterativeMethod("filter");
	addIterativeMethod("map");
	if(!results.total){
		results.total = dojo.when(results, function(results){
			return results.length
		});
	}
	return results;
};
