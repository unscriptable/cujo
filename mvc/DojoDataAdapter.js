/*
    cujo.mvc.DojoDataAdapter
    (c) copyright 2010, unscriptable.com
    author: john

    Adapts a dojo 1.5 data.store to dojo 1.6's API.  Can be used as a wrapper or as a mixin!

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.DojoDataAdapter');

dojo.require("dojo.Stateful");

/*
    The following dojo.* classes are copied from pre- dojo 1.6 trunk.
    Scroll down to find the actual cujo.mvc.DojoDataAdapter class.
*/

dojo.provide("dojo.store.DataStore");
dojo.provide("dojo.store.util.QueryResults");
dojo.provide("dojo.store.util.SimpleQueryEngine");
dojo.provide("dojo.store.Observable");

dojo.declare("dojo.store.DataStore", null, {
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
	},
	_objectConverter: function(callback){
		var store = this.store;
		return function(item){
			var object = {};
			var attributes = store.getAttributes(item);
			for(var i = 0; i < attributes.length; i++){
				object[attributes[i]] = store.getValue(item, attributes[i]);
			}
			return callback(object);
		}
	},
	get: function(id, options){
		//	summary:
		// 		Retrieves an object by it's identity. This will trigger a fetchItemByIdentity
		// id:
		// 		The identity to use to lookup the object
		var returnedObject, returnedError;
		var deferred = new dojo.Deferred();
		this.store.fetchItemByIdentity({
			identity: id,
			onItem: this._objectConverter(function(object){
				deferred.resolve(returnedObject = object)
			}),
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
		var id = options && typeof options.id != "undefined" || this.getIdentity(object);
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
	remove: function(id){
		//	summary:
		// 		Deletes an object by it's identity.
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
		var converter = this._objectConverter(function(object){return object});
		this.store.fetch(dojo.mixin({
			query: query,
			onBegin: function(count){
				deferred.total.resolve(count);
			},
			onComplete: function(results){
				deferred.resolve(dojo.map(results, converter));
			},
			onError: function(error){
				deferred.reject(error);
			}
		}, options));
		return dojo.store.util.QueryResults(deferred);
	},
	getIdentity: function(object){
		return object[this.idProperty || this.store.getIdentityAttributes()[0]];
	}
});

dojo.declare('cujo.mvc.DojoDataAdapter', dojo.store.DataStore, {

    queryEngine: null,

    constructor: function (options) {

        dojo.store.Observable(this);

    },

    _objectConverter: function(callback){
        //  summary:
        //      ensures that the returned object has a watch method
        //      (e.g. dojo.Stateful) but not the mozilla native watch method
        //      since the mozilla watch method doesn't support the same method
        //      signatures for watching all properties as dojo.Stateful:
        //      o.watch(callback) // throws TypeError
        //      o.watch('*', callback); // adds a '*' property to the object
        function makeStatefulAndCallback (object) {
            var stfuObj = object.watch != Object.prototype.watch ? object : new dojo.Stateful(object);
            return callback(stfuObj);
        }
        return this.inherited(arguments, [makeStatefulAndCallback]);
    }

});


dojo.store.util.QueryResults = function(results){
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

dojo.store.util.SimpleQueryEngine = function(query, options){
	// summary:
	//		Simple query engine that matches using filter functions, named filter
	// 		functions or objects by name-value on a query object hash

	// create our matching query function
	if(typeof query == "string"){
		// named query
		query = this[query];
	}else if(typeof query == "object"){
		var queryObject = query;
		query = function(object){
			for(var key in queryObject){
				if(queryObject[key] != object[key]){
					return false;
				}
			}
			return true;
		};
	}
	function execute(array){
		// execute the whole query, first we filter
		var results = dojo.filter(array, query);
		// next we sort
		if(options && options.sort){
			results.sort(function(a, b){
				for(var sort, i=0; sort = options.sort[i]; i++){
					var aValue = a[sort.attribute];
					var bValue = b[sort.attribute];
					if (aValue != bValue) {
						return sort.descending == aValue > bValue ? -1 : 1;
					}
				}
				return 0;
			});
		}
		// now we paginate
		if(options && (options.start || options.count)){
			results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
		}
		return results;
	}
	execute.matches = query;
	return execute;
};

dojo.store.Observable = function(store){
	//	summary:
	//		The Observable store wrapper takes a store and sets an observe method on query()
	// 		results that can be used to monitor results for changes
	var queryUpdaters = [], revision = 0;
	// a Comet driven store could directly call notify to notify watchers when data has
	// changed on the backend
	var notifyAll = store.notify = function(object, existingId){
		revision++;
		for(var i = 0, l = queryUpdaters.length; i < l; i++){
			queryUpdaters[i](object, existingId);
		}
	}
	var originalQuery = store.query;
	store.query = function(query, options){
		var results = originalQuery.apply(this, arguments);
		if(results && results.forEach){
			var queryExecutor = store.queryEngine && store.queryEngine(query, options);
			var queryRevision = revision;
			var listeners = [], queryUpdater;
			results.observe = function(listener, includeObjectUpdates){
				if(listeners.push(listener) == 1){
					// first listener was added, create the query checker and updater
					queryUpdaters.push(queryUpdater = function(changed, existingId){
						dojo.when(results, function(resultsArray){
							var i;
							if(++queryRevision != revision){
								throw new Error("Query is out of date, you must watch() the query prior to any data modifications");
							}
							var removedObject, removedFrom, insertedInto;
							if(existingId){
								// remove the old one
								for(i = 0, l = resultsArray.length; i < l; i++){
									var object = resultsArray[i];
									if(store.getIdentity(object) == existingId){
										removedObject = object;
										removedFrom = i;
										resultsArray.splice(i, 1);
									}
								}
							}
							if(queryExecutor){
								// add the new one
								if(changed &&
										// if a matches function exists, use that (probably more efficient)
										(queryExecutor.matches ? queryExecutor.matches(changed) : queryExecutor([changed]).length)){
									// TODO: handle paging correctly
									resultsArray.push(changed);
									insertedInto = queryExecutor(resultsArray).indexOf(changed);
								}
							}else if(changed){
								// we don't have a queryEngine, so we can't provide any information
								// about where it was inserted, but we can at least indicate a new object
								insertedInto = removedFrom || -1;
							}
							if((removedFrom > -1 || insertedInto > -2) &&
									(includeObjectUpdates || (removedFrom != insertedInto))){
								for(i = 0;listener = listeners[i]; i++){
									listener(changed || removedObject, removedFrom, insertedInto);
								}
							}
						});
					});
				}
				return {
					dismiss: function(){
						// remove this listener
						listeners.splice(dojo.indexOf(listeners, listener), 1);
						if(!listeners.length){
							// no more listeners, remove the query updater too
							queryUpdaters.splice(dojo.indexOf(queryUpdaters, queryUpdater), 1);
						}
					}
				}
			};
		}
		return results;
	};
	var inMethod;
	function whenFinished(method, action){
		var original = store[method];
		if(original){
			store[method] = function(value){
				if(inMethod){
					// if one method calls another (like add() calling put()) we don't want two events
					return original.apply(this, arguments);
				}
				inMethod = true;
				try{
					return dojo.when(original.apply(this, arguments), function(results){
						action(value);
						return results;
					});
				}finally{
					inMethod = false;
				}
			};
		}
	}
	// monitor for updates by listening to these methods
	whenFinished("put", function(object){
		notifyAll(object, store.getIdentity(object));
	});
	whenFinished("add", notifyAll);
	whenFinished("remove", function(id){
		notifyAll(undefined, id);
	});

	return store;
};
