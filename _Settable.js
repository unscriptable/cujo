/*
    cujo._Settable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Works just like dojo.Stateful's get/set but translates get/set names to "private" names
    For watch functionality, use cujo._Watchable instead.

    Use cujo._Settable as a mixin in a multiple-inheritance pattern. Example:
        dojo.declare('myClass', cujo._Settable, { ... }); // mixin

*/
dojo.provide('cujo._Settable');

dojo.require('dojo.Stateful');
dojo.require('dojo.string');

(function () { // local scope

var stfu = dojo.Stateful.prototype;

// Anything that uses _Settable as a mixin should also ensure that any mixin properties passed to the
// constructor (don't confuse these with mixin classes) are converted to the correct property name using
// settableXform().
    
dojo.declare('cujo._Settable', null, {

    constructor: function () {
        this._settableCache = {};
    },

    //  summary: by default, everything is settable (null). to limit which properties are settable, change
    //      cujoSettables to a function that takes single name argument and returns a truthy/falsy result.
    //      example: the following only allows methods that start with 'on; to be settable.
    //          settableProps: function (name) { return dojo.isFunction(this[name]) && name.substr(0, 2) == 'on'; }
    settableProps: null,

    //  summary: if set to an function, it is used to transform the name passed to get()  or set() to a
    //      local property. set this property to something falsy ('', false, null) to prevent any transform.
    //      By default, settableXform does nothing. However, to transform names to a private-by-convention property
    //      (leading underbar), you could just use this:
    //          function (name) { return '_' + name; }
    settableXform: null,

    //  summary: if true, detects if a property was modified outside of the setter
    //      Detection does not happen immediately after modification. It happens the next
    //      time the get or set method is invoked.
    //      TODO: should we remove this and just detect direct access in the build script?
    detectDirectWrite: true,

    get: function (name) {
        var oName = this.settableXform ? this.settableXform(name) : name,
            value = stfu.get.call(this, oName);
        if (this.detectDirectWrite && (name in this._settableCache) && value !== this._settableCache[name]) {
            throw new Error(dojo.string.substitute(errDirectWrite, {name: name}));
        }
        return value;
    },

    set: function (name, value) {
        var oName = this.settableXform ? this.settableXform(name) : name,
            curr = stfu.get.call(this, oName);
        if (this.detectDirectWrite && (name in this._settableCache) && curr !== this._settableCache[name]) {
            throw new Error(dojo.string.substitute(errDirectWrite, {name: name}));
        }
        if (this.settableProps && !this.settableProps(name)) {
            throw new Error(dojo.string.substitute(errUnsettable, {name: name}));
        }
        this._settableCache[name] = value;
        return stfu.set.call(this, oName, value);
    }

});

var
    errUnsettable = 'Attempt to set an unsettable property: ${name}',
    errDirectWrite = 'Detected a direct write (i.e. not via set()) on a settable property: ${name}.';
})(); // end of local scope
