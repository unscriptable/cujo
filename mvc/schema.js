/*
    cujo.mvc.schema
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.mvc.schema');

(function () { // local scope

// based on Kris Zyp's json-schema
// http://json-schema.org/

var BaseProp = cujo.mvc.schema.Property = {

    optional: true,

    readonly: false

};

var ValueProp = dojo.delegate(BaseProp, {

    isIdentity: false,

    'enum': undefined,

    'default': null,

    title: null,

    description: null,

    coerce: function (value) { return this.nativeType(value); },

    requires: undefined,

    // TODO: decide if this level is connectable or not
    onChanged: function (/* String */ name, /* any */ oldVal, /* any */ newVal) {},

    validate: function (value) {
        // TODO: check enum values
        if (this.readonly) {
            throw new Error(this.name + ' is read-only. You cannot set it to: ' + value);
        }
        if (!this.optional && value == null) {
            throw new Error(this.name + ' cannot be null or undefined: ' + value);
        }
        if (cujo.lang.typeOf(value) != this.nativeType) {
            throw new TypeError(this.name + ' must be of type: ' + cujo.lang.typeOf(value) + '. You cannot set it to: ' + value);
        }
    },

    create: function (/* String */ name, /* Object */ data) {

        this.name = name;

        this.value = function () {
            var currVal = data[name],
                newVal = arguments[0];
            if (arguments.length == 0) {
                return currVal;
            }
            else {
                if (this.coerce) {
                    newVal = this.coerce(newVal);
                }
                this.validate(newVal);
                data[name] = newVal;
                this.onChanged(name, oldVal, newVal);
                return this; // for chaining
            }
        };

    }

});

cujo.mvc.schema.String = dojo.delegate(ValueProp, {

    type: 'String',

    nativeType: String,

    minLength: 0,

    maxLength: Infinity,

    pattern: undefined,

    validate: function (value) {
        this.inherited('validate', arguments);
        if (value.length < this.minLength) {
            throw new RangeError(this.name + ' must be at least this many characters: ' + this.minLength);
        }
        if (value.length > this.maxLength) {
            throw new RangeError(this.name + ' must be no more than this many characters: ' + this.maxLength);
        }
        if (this.pattern && !this.pattern.match(value)) {
            throw new Error(this.name + ' does not match validation pattern: ' + this.pattern);
        }
    }

});

cujo.mvc.schema.Number = dojo.delegate(ValueProp, {

    type: 'Number',

    nativeType: Number,

    minimum: -Infinity,

    maximum: Infinity,

    minimumCanEqual: true,

    maximumCanEqual: true,

    validate: function (value) {
        this.inherited('validate', arguments);
        if (this.minimumCanEqual && value < this.minimum) {
            throw new RangeError(this.name + ' must be at least : ' + this.minimum);
        }
        if (!this.minimumCanEqual && value <= this.minimum) {
            throw new RangeError(this.name + ' must be greater than : ' + this.minimum);
        }
        if (this.maximumCanEqual && value > this.maximum) {
            throw new RangeError(this.name + ' must be no more than: ' + this.maximum);
        }
        if (!this.maximumCanEqual && value >= this.maximum) {
            throw new RangeError(this.name + ' must be less than: ' + this.maximum);
        }
    }

});

cujo.mvc.schema.Boolean = dojo.delegate(ValueProp, {

    type: 'Boolean',

    nativeType: Boolean,

    'default': false,

    optional: false

});

cujo.mvc.schema.Date = dojo.delegate(ValueProp, {

    type: 'String',

    nativeType: Date,

    coerce: function (value) { return cujo.lang.typeOf(value) == 'Date' ? value :  new Date(value); }

});

dojo.declare('cujo.mvc.schema.Array', [BaseProp, cujo._Connectable], {

    type: 'Array',

    nativeType: Array,

    readonly: false,

    optional: true,

    minItems: 0,

    maxItems: Infinity,

    items: undefined,

    cascades: null,

    onAdded: function (items) {},

    onRemoved: function (items) {},

    create: function (/* String */ name, /* Object */ data) {

        // this is already executed by dojo.declare
        //BaseProp.create.apply(this, arguments);

        this.cascades = {
            onChanged: {count: 0}
        };

    },

    _cujoConnect: function (me, event, obj, method) {
        var cascade = this.cascades[event];
        if (cascade) {
            // only cascade once!
            if (cascade.count == 0) {
                // TODO: connect to all onChanged of items in array

            }
            cascade.count++;
        }
        return this.inherited('_cujoConnect', arguments);
    },

    _cujoDisconnect: function (handle) {
        var cascade = this.cascades[event];
        if (cascade) {
            cascade.count--;
            if (cascade.count == 0) {
                // TODO: disconnect to all onChanged of items in array
            }
        }
        return this.inherited('_cujoDisconnect', arguments);
    }

});

dojo.declare('cujo.mvc.schema.Object', [BaseProp, cujo._Connectable], {

    type: 'Object',

    nativeType: Object,

    readonly: false,

    optional: true,

    properties: undefined,

    onChanged: function (/* String */ name, /* any */ oldVal, /* any */ newVal) {},

    create: function (/* String */ name, /* Object */ data) {

        this.name = name;

        // fix-up properties
        var identities = [];
        for (var p in this.properties) {
            var prop = this.properties[p];
            // gather identities
            if (prop.isIdentity) {
                identities.push(p);
            }
            // hijack setter
            prop.value = function () {
                if (arguments.length > 0) {

                }
            };
        }

        // create identity getter
        this.identity = function () {
            var id;
            if (identities.length == 1) {
                id = identities[0];
            }
            else {
                var that = this;
                id = dojo.map(identities, function (p, i, all) {
                    return encodeURIComponent(p) + '=' + encodeURIComponent(that.properties[p].value());
                });
                id.valueOf = function () { return this.join('&'); }
            }
            return id;
        };

        // create getter/setter
        this.value = function () {
            // TODO:
            if (arguments.length == 0) {
                return dojo.delegate(this.properties);
            }
        };

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

function begetAll (obj) {

    var result = obj;

    function beget (item) {
        // dates act whack when you beget them, so just create a new one
        if (cujo.typeOf(item) == 'Date') {
            return new Date(item);
        }
        // beget all objects (arrays, etc.)
        else if (typeof item == 'object') {
            return begetAll(item);
        }
        else {
            return item;
        }
    }

    if (dojo.isArray(ob)) {
        result = dojo.map(obj, beget);
    }
    else if (typeof obj == 'object') {
        // TODO
    }

    return result;

}

/****** testing *****/

var mvc = cujo.mvc,
    schema = new mvc.Object({
        properties: {
            id: new mvc.Number('id', {
                isIdentity: true,
                'default': -1,
                minimum: 0
            }),
            name: new mvc.String('name', {
                minLength: 1,
                maxLength: 255
            })
        }
    });



})(); // end of local scope
