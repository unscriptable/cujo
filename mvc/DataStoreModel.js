/*
    cujo.mvc.DataStoreModel
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO: delete this file!
*/
dojo.provide('cujo.mvc.DataStoreModel');

(function () { // local scope

dojo.declare('cujo.mvc.DataStoreModel', cujo._Connectable, {

    constructor: function (store) {
        this._store = store;
        this._initStore(store);
    },

    onItem: function (item, request) {},

    onBegin: function (count, request) {},

    onComplete: function (subset, request) {},

    // TODO: convert to dojo 1.5 dojo.Stateful's get()
    getStore: function () {
        return this._store;
    },

    _initStore: function (store) {
        var self = this,
            origFetch = store.fetch;
        store.fetch = function (request) {
            self.connect(request, 'onBegin', 'onBegin');
            self.connect(request, 'onItem', 'onItem');
            self.connect(request, 'onComplete', 'onComplete');
            return origFetch.apply(store, arguments);
        }
    }

});

})(); // end of local scope
