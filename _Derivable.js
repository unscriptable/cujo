/*
    cujo.mvc._Derivable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    A mixin for views to add functionality necessary to bind to a single item in a result set.

    Use cujo.mvc._Derivable as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._Derivable, { ... }); // mixin

*/
dojo.provide('cujo._Derivable');

(function () {

dojo.declare('cujo._Derivable', null, {
    //  Note: derived properties can't rely on other derived properties (yet?). This is only a
    //      problem concerning persistDerivedAtCreate, afaik.
    // TODO: allow this class to be mixed-in to non-widget classes? (culprit: postMixInProperties)

    //  propertyMap: Object
    //      Defines a set of derived properties. These act like normal properties, but are changed
    //      automatically when another property changes (or vice versa).  Each property definition has a
    //      transform and a reverse transform, as well as a possible linked property to watch (source).
    //      Example:
    //          propertyMap: {
    //              displayStartDate: {
    //                  source: 'startDate', // required
    //                  transform: '_dateToDisplayDate', // required
    //                  reverse: '_displayDateToDate'
    //              }
    //          }
    //      When a linked property (source) is defined, the transform is called to derive the value.  If a
    //      reverse transform (reverse) is defined, then the relationship is two-way and the setter will be used  
    //      to set a value back onto the linked property.  The signatures of the setter and getter are the same:
    //      _dateToDisplayDate: function (/* Any */ value, /* String */ propName, /* String */ relPropName) {
    //          return dojo.date.locale.format(value, {selector: 'date', formatLength: 'long'});
    //      }
    propertyMap: null,

    constructor: function () {
        this.propertyMap = this.propertyMap || {};
        this._dependentProps = {};
    },

    postMixInProperties: function () {
        // TODO: once watch() is implemented, should we switch over to that?

        // make sure all props are done before deriving new ones
        var result = this.inherited(arguments);

        cujo.lang.forInAll(this.propertyMap, function (deriver, name) {
            // establish link from propertyMap's source property...
            if (deriver.source) {
                var link = {
                        name: name,
                        deriver: deriver
                    };
                var links = this._dependentProps[deriver.source];
                if (!links) {
                    this._dependentProps[deriver.source] = [link];
                }
                else {
                    links.push(link);
                }
            }
            // ensure we've got a getter and a transform
            deriver.get = deriver.get || noop;
            // persist property
            if (deriver.source && deriver.transform) {
                dojo.setObject(name, this._getDerivedValue(name, deriver), this);
            }
        }, this);

        return result;

    },

    get: function (/*String*/ attr) {
        // handle derived properties
        var deriver = this.propertyMap[attr];
        if (deriver && deriver.source && deriver.transform) {
            // just grab value if it's defined on this. Note: this.set() may not have been called, yet
            return (attr in this) ? this[attr] : this._getDerivedValue(attr, deriver);
        }
        else {
            return this.inherited(arguments);
        }
    },

    set: function (/* String */ attr, /* Any */ value) {

        var deriver = this.propertyMap[attr],
            result = this.inherited(arguments);

        // handle source properties (if a bi-directional link has been set. i.e. deriver.reverse is specified)
        if (deriver && deriver.source && deriver.reverse && !deriver._skip) {
            var val = deriver.reverse.call(this, value, attr, deriver.source);
            deriver._skip = true;
            try {
                //  Note: we can't call the inherited set (and avoid the infinite loops) because there may be
                //  a superclass set that needs to run, too.
                this.set(deriver.source, val);
            }
            finally {
                delete deriver._skip;
            }
        }

        // handle derived properties (if this is a source attr)
        var deps = this._dependentProps[attr];
        if (deps && !sources._skip) {
            deps._skip = true;
            try {
                dojo.forEach(deps, function (dep) {
                    var val = this._getDerivedValue(dep.name, dep.deriver);
                    //  Note: we can't call the inherited set because there may be
                    //  a superclass set() that needs to run, too.
                    this.set(dep.name, val);
                }, this);
            }
            finally {
                delete sources._skip;
            }
        }

        return result;

    },

    _getDerivedValue: function (attr, deriver) {
        // always run transform() even if there's no link since it may do manual linking
        var linkedVal = deriver.source && dojo.getObject(deriver.source, false, this),
            transform = dojo.isFunction(deriver.transform) ?
                deriver.transform :
                dojo.getObject(deriver.transform, false, this);
        if (!dojo.isFunction(transform)) {
            throw new Error(dojo.string.substitute(errTransformNotFound, {transform: transform, attr: attr}));
        }
        return transform.call(this, linkedVal, attr, deriver.source);
    }

});

var
    noop = function (val) { return val; },
    errTransformNotFound = 'Transform (${transform}) not found for ${attr}.';

})();