/*
    cujo._Settable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Works just like dojo.Stateful's get/set but translates get/set names to "private" names
    For watch functionality, use cujo._Watchable instead.

*/
dojo.provide('cujo._Settable');

dojo.require('dojo.Stateful');

(function () { // local scope

var stfu = dojo.Stateful.prototype;

dojo.declare('cujo._Settable', null, {

    // by default, everything is settable (null). to limit which properties are settable, change
    // cujoSettables to a regex that matches the settable properties
    cujoSettables: null,

    get: function (name) {
        return stfu.get.call(this, '_' + name);
    },

    set: function (name, value) {
        if (this.cujoSettables && !name.match(this.cujoSettables)) {
            throw new Error('Attempt to set an unsettable property: ' + name);
        }
        return stfu.set.call(this, '_' + name, value);
    }

});

})(); // end of local scope
