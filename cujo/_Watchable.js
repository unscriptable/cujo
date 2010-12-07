/*
    cujo._Watchable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Adds dojo.Stateful's watch to cujo._Settable

    Use cujo._Watchable as a mixin in a multiple-inheritance pattern. Example:
        dojo.declare('myClass', cujo._Watchable, { ... }); // mixin

*/
define(['dojo', 'dojo/Stateful', 'cujo/_Settable'], function(dojo, Stateful, Settable) {

// local scope

var stfu = Stateful.prototype;

dojo.declare('cujo._Watchable', Settable, {

    watch: function (name, callback) {
        return stfu.watch.call(this, '_' + name, callback);
    }

});

return cujo._Watchable;

}); // end of local scope
