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

    dataItem: null,

    _setDataItemAttr: function (item) {
        // TODO: subscribe to anything here?
    },

    _bindNode: function (node, attr) {
        // TODO: determine if read-only or read-write (how?)
        // TODO: watch for attr changes on dataItem
        // TODO: set initial value on node
    }

});

})();