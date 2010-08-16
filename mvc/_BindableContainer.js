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
dojo.provide('cujo.mvc._BindableContainer');

// wondering if we'll need this to auto-construct _Bindable widgets around the cloned dom fragments
//dojo.require('cujo.mvc._Bindable');

(function () {

dojo.declare('cujo.mvc._BindableContainer', null, {

    //  bindableContainer: String
    //      The name of the node that node that holds the data bound items. This will be the node that
    //      has a data-dojo-attach attribute of the same name.  There will be one data bound node per item
    //      in the result set. Typically, you'd leave this at its default value, 'containerNode'.
    bindableContainer: 'containerNode',

    //  bindableItem: String
    //      The name of the node that is cloned and bound to each item in the result set. This will be the node
    //      that has a data-dojo-attach attribute of the same name.  If this node also has a data-dojo-type
    //      (or dojotype) attribute, it will be instantiated as a widget and assumed to have the
    //      cujo.mvc._Bindable mixin. Typically, you'd leave this at its default value, 'itemNode'.
    bindableItem: 'itemNode',

    //  resultSet: Object
    //      The collection of data items used to create and bind the sub-views. Note: you must use get() and
    //      set() to access this property.
    //      TODO: not sure I like treating this like a property (also see _setResultSetAttr below)
    resultSet: null,

    // hooks to catch item modifications
    // should these be marked private (actually protected?)
    beforeInsertItem: function () {},
    afterInsertItem: function () {},
    beforeUpdateItem: function () {}, // hm. not sure we can catch this b/c of data store api
    afterUpdateItem: function () {},
    beforeRemoveItem: function () {},
    afterRemoveItem: function () {},

    _setResultSetAttr: function (rs) {
        // TODO: unsubscribe from any previous resultSet
        // TODO: subscribe to onAdd, onUpdate, and onRemove
        // TODO: initialize anything?
    }

});

})();