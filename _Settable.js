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

    constructor: function () {
        this._settableCache = {};
    },

    // by default, everything is settable (null). to limit which properties are settable, change
    // cujoSettables to a regex that matches the settable properties
    cujoSettables: null,

    //  summary: if true, detects if a property was modified outside of the setter
    //      Detection does not happen immediately after modification. It happens the next
    //      time the get or set method is invoked.
    detectDirectAccess: true,

    get: function (name) {
        var oName = '_' + name,
            value = stfu.get.call(oName);
        if (this.detectDirectAccess && (name in this._settableCache) && value !== this._settableCache[name]) {
            throw new Error('Detected a direct set on a settable property: ' + name);
        }
        return value;
    },

    set: function (name, value) {
        var oName = '_' + name,
            curr = stfu.get.call(oName);
        if (this.detectDirectAccess && (name in this._settableCache) && curr !== this._settableCache[name]) {
            throw new Error('Detected a direct set on a settable property: ' + name);
        }
        if (this.cujoSettables && !name.match(this.cujoSettables)) {
            throw new Error('Attempt to set an unsettable property: ' + name);
        }
        this._settableCache[name] = value;
        return stfu.set.call(this, '_' + name, value);
    }

});

})(); // end of local scope
