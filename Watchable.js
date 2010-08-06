/*
    cujo.Watchable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Works just like dojo.Stateful (get, set, and watch) but translates names to "private" names

    Use cujo._Watchable as a mixin in a multiple-inheritance pattern.  Use cujo.Watchable as a stand-alone. Example:
        dojo.declare('myClass', cujo._Watchable, { ... }); // mixin
        var myObj = new cujo.Watchable(props); // stand-alone


*/
dojo.provide('cujo.Watchable');

dojo.require('cujo.Settable');

(function () { // local scope

var stfu = dojo.Stateful.prototype;

// Note: use _Watchable as a mixin, but use Watchable standalone

dojo.declare('cujo._Watchable', cujo._Settable, {

    watch: function (name, callback) {
        return stfu.watch.call(this, '_' + name, callback);
    }

});

dojo.declare('cujo.Watchable', cujo._Watchable, {

    constructor: function (mixin) {
        dojo.mixin(this, mixin);
    }

});

})(); // end of local scope
