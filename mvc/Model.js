/*
    cujo.mvc.Model
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.Model');

(function () { // local scope

var mvc = cujo.mvc,
    undefined;

dojo.declare('cujo.mvc.Model', cujo._Connectable, {

    properties: undefined,

    onChanged: function (/* String */ name, /* any */ oldVal, /* any */ newVal) {},

    create: function (/* cujo.mvc.schema */ schema, /* object */ json) {
        return this[dojo.isArray(schema) ? '_createMany' : '_create'](schema, json);
    },

    _create: function (/* cujo.mvc.schema */ schema, /* object */ json) {

        // fix-up properties
        var identProps = [];
        for (var p in this.properties) {
            var prop = this.properties[p];
            // gather identities
            if (prop.isIdentity) {
                identProps.push(p);
            }
            this[p] = this._createProp(p, json, schema);
        }

        // create curried identity getter
        this.identity = dojo.partial(this.identity, identProps);

        // create getter/setter
        this.value = function () {
            // TODO:
            if (arguments.length == 0) {
                return dojo.delegate(this.properties);
            }
        };

    },

    _createMany: function (/* cujo.mvc.schema */ schema, /* object */ json) {

    },

    identity: function (identProps) {
        var id;
        if (identProps.length == 1) {
            id = identProps[0];
        }
        else {
            id = dojo.map(identProps, function (p, i, all) {
                return encodeURIComponent(p) + '=' + encodeURIComponent(all[i].value());
            }, this);
            id.valueOf = function () { return this.join('&'); }
        }
        return id;
    },

    _createProp: function (/* String */ name, /* Object */ data, /* cujo.mvc.schema */ schema) {

        var propDef = schema[p];

        if (data[name] === undefined) {
            data[name] = propDef['default'];
        }

        

    },

    _cujoConnect: function (me, event, obj, method) {
        if (event == 'onChanged') {
            // TODO: connect to all onChanged of array or object properties
        }
        return this.inherited('_cujoConnect', arguments);
    },

    _cujoDisconnect: function (handle) {
        if (event == 'onChanged') {
            // TODO: disconnect from all onChanged of array or object properties
        }
        return this.inherited('_cujoDisconnect', arguments);
    }

});

})(); // end of local scope
