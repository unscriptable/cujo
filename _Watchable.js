/*
    cujo._Watchable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Works just like dojo.Stateful (get, set, and watch) but translates names to "private" names

*/
dojo.provide('cujo._Watchable');

dojo.require('cujo._Settable');

(function () { // local scope

var stfu = dojo.Stateful.prototype;

dojo.declare('cujo._Watchable', cujo._Settable, {

    watch: function (name, callback) {
        return stfu.watch.call(this, '_' + name, callback);
    }

});

})(); // end of local scope
