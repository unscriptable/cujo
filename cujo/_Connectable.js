/*
    cujo._Connectable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

*/
define(['dojo'], function(dojo) {
// local scope

dojo.declare('cujo._Connectable', null, {

    _cujoConnects: null,

    // anything that doesn't start with an underscore is connectable by default
    // override this to allow or disallow other combos
    connectables: cujo._Connectable.any,

    _hasListener: function (/* String */ event) {
        return this._cujoConnects[event] > 0;
    },

    _cujoConnect: function (me, event, obj, method) {
        if (!this.connectables(event)) {
            throw 'Attempted to connect to an unallowed event/method: ' + event;
        }
        me._cujoConnects[event] = (me._cujoConnects[event] || 0) + 1;
    },

    _cujoDisconnect: function (handle) {
        var event = handle[1];
        me._cujoConnects[event] = (me._cujoConnects[event] || 1) - 1;
    },

    constructor: function () {
        this._connects = [];
        this._cujoConnects = {};
    },

    destroy: function () {
        dojo.forEach(this._connects, dojo.disconnect);
        this.inherited(arguments);
    },

    connect: function (source, event, func) {
        var handle = dojo.connect(source, event, this, func);
        this._connects.push(handle);
        return handle;
    },

    disconnect: function (handle) {
        dojo.disconnect(handle);
        var pos = dojo.indexOf(this._connects, handle);
        if (pos) {
            this._connects.splice(pos, 1);
        }
    }

});

// some common use cases
cujo._Connectable.any = function () { return true };
cujo._Connectable.publicOnly = function (name) { return name.match(/^[^_]/); };
cujo._Connectable.eventsOnly = function (name) { return name.match(/^on/); };

// Connect cujo event processors by hijacking dojo.connect.
// I learned this trick from browsing the dijit._Widget source.
// Connecting to the "private" versions allows us to ignore optional arguments
dojo.connect(dojo, '_connect', function (o) {
    if (o && dojo.isFunction(o._cujoConnect)) {
        o._cujoConnect.apply(o, arguments);
    }
});
dojo.connect(dojo, '_disconnect', function (h) {
    var o = h[0];
    if (o && dojo.isFunction(o._cujoDisconnect)) {
        o._cujoDisconnect.apply(o, arguments);
    }
});

return cujo._Connectable;

}); // end of local scope
