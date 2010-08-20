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
    // TODO: allow this class to be mixed-in to non-widget classes (culprit: postMixInProperties)

    //  derivedProps: Object
    //      Defines a set of derived properties. These act exactly like normal properties, but are changed
    //      automatically when another property changes (or vice versa).  Each property definition has a
    //      getter and a setter, as well as a possible linked property to watch (rel).
    //      Example:
    //          derivedProps: {
    //              displayStartDate: {
    //                  rel: 'startDate',
    //                  get: '_dateToDisplayDate',
    //                  set: '_displayDateToDate',
    //                  persist: false
    //              }
    //          }
    //      When a linked property (rel) is defined, the getter (get) is called to derive the value.  If a setter
    //      (set) is defined, then the relationship is two-way and the setter will be used to set a value
    //      back onto the linked property.  The signatures of the setter and getter are the same:
    //      _dateToDisplayDate: function (/* Any */ value, /* String */ propName, /* String */ relPropName) {
    //          return dojo.date.locale.format(value, {selector: 'date', formatLength: 'long'});
    //      }
    //      When the optional persist property is not false, the property will be persisted onto the current
    //      object.  In other words, this[<property name>] will be set whenever the property is derived.
    derivedProps: null,

    //  persistDerivedAtCreate: Boolean
    //      Default is true. Set this to false to prevent the object from setting any persistent derived
    //      properties at creation time (postMixInProperties, specifically).
    persistDerivedAtCreate: true,

    constructor: function () {
        this.derivedProps = this.derivedProps || {};
        this._relProps = {};
    },

    postMixInProperties: function () {
        // establish links from derivedProps's rel properties...
        // once watch() is implemented, should we switch over to that?
        cujo.lang.forInAll(this.derivedProps, function (deriver, name) {
            if (deriver.rel) {
                var commands = this._relProps[deriver.rel];
                if (!commands) {
                    commands = this._relProps[deriver.rel] = [];
                }
                commands.push({
                    derived: name,
                    deriver: deriver
                });
            }
            // persist any persistent properties
            if (this.persistDerivedAtCreate && deriver.persist !== false) {
                this[name] = this._getDerivedValue(name, deriver);
            }
        }, this);
        return this.inherited(arguments);
    },

    get: function (/*String*/ attr) {
        // handle derived properties
        var deriver = this.derivedProps[attr];
        if (deriver) {
            // don't sniff for deriver.persist, just grab value if it's defined on this.
            // (set() may not have been called, yet)
            return (attr in this) ? this[attr] : this._getDerivedValue(attr, deriver);
        }
        else {
            return this.inherited(arguments);
        }
    },

    set: function (/* String */ attr, /* Any */ value) {
        // TODO: pull out some of these routines into protected methods
        var deriver = this.derivedProps[attr],
            result;
        // handle derived properties
        if (deriver) {
            if (deriver.persist !== false) {
                this[attr] = value;
            }
            if (deriver.set) {
                // always run deriver.set() even if there's no link since it may do manual linking
                var set = dojo.hitch(this, deriver.set),
                    linked = deriver.rel,
                    links = this._relProps[linked],
                    val = set(value, attr, linked);
                if (linked && !links._skip) {
                    links._skip = true; // prevents infinite cascade
                    result = this.set(linked, val);
                    delete links._skip;
                }
            }
        }
        else {
            result = this.inherited(arguments);
            // handle linked properties
            var links = this._relProps[attr];
            if (links && !links._skip) {
                dojo.forEach(links, function (link) {
                    var get = dojo.hitch(this, link.deriver.get),
                        derived = link.derived,
                        deriver = this.derivedProps[derived],
                        val = get(value, derived, attr);
                    deriver._skip = true; // prevents infinite cascade
                    this.set(derived, val);
                    delete deriver._skip;
                }, this);
            }
        }
        return result || this;
    },

    _getDerivedValue: function (attr, deriver) {
        // always run get even if there's no link since it may do manual linking
        var linkedVal = deriver.rel && this[deriver.rel],
            get = dojo.hitch(this, deriver.get);
        return get(linkedVal, attr, deriver.rel);
    }

});

})();