/*
    cujo._Derivable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Use cujo.mvc._Derivable as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._Derivable, { ... }); // mixin

*/
dojo.provide('cujo._Derivable');

(function () {

dojo.declare('cujo._Derivable', null, {

    /*=====
    //  attributeMap: Object
    //      Defines a set of derived properties. These act like normal properties, but are changed
    //      automatically when another property changes (or vice versa).  Each property definition has a
    //      deriver function as well as possible linked attributes to watch (source).
    //      Example:
    //          attributeMap: {
    //              displayStartDate: {
    //                  source: 'startDate',
    //                  deriver: '_toDisplayDate' // required
    //              },
    //              greeting: {
    //                  source: ['lastName', 'firstName'],
    //                  deriver: 'applyTemplate',
    //                  template: 'strings.greeting' // applyTemplate knows what to do with this
    //              }
    //          }
    //      Each derived property must have a deriver function.  This function is passed a single
    //      parameter: the derived property definition.  It is the job of the deriver function to
    //      know how to return the value of the derived property from the deriver function.
    //      When linked attributes (source) are defined, the deriver function is called whenever
    //      those linked attributes change.
    //      Note: attributeMap allows multiple mappings per property name, but this doesn't make
    //      any sense for derived attributes. Therefore, only the first one is used.
    attributeMap: null,
    =====*/
    
    constructor: function () {
        this._deriverSources = {};
//        this._derivedAttrs = {};
    },

    postMixInProperties: function () {

        // make sure all props are done before deriving new ones
        var result = this.inherited(arguments);

        cujo.lang.forInAll(this.attributeMap, function (commands, name) {
            dojo.some([].concat(commands), function (command) {
                if (command.deriver) {
                    // establish links from attributeMap's source property...
                    dojo.forEach([].concat(command.source), function (source) {
                        var link = {
                                name: name,
                                command: command,
                                source: source
                            };
                        this._deriverSources[source] = this._deriverSources[source] || [];
                        this._deriverSources[source].push(link);
                    }, this);
//                    this._derivedAttrs[name] = link;
                    // persist property
                    this.set(name, this._getDerivedValue(name, command));
                    return true;
                }
            }, this);
        }, this);

        return result;

    },

//    get: function (/*String*/ attr) {
//        // handle derived properties
//        var command = this._derivedAttrs[attr] && this._derivedAttrs[attr].command;
//        if (command && command.deriver) {
//            // just grab value if it's defined on this.
//            // Note: this.set() may not have been called on any sources, yet
//            return (attr in this) ? this[attr] : this._getDerivedValue(attr, command);
//        }
//        else {
//            return this.inherited(arguments);
//        }
//    },

    set: function (/* String */ attr, /* Any */ value) {

        var currValue = this[attr];

        this.inherited(arguments);

        if (currValue !== value) {
            // handle derived properties (if this is a source attr)
            dojo.forEach(this._deriverSources[attr], function (dep) {
                var val = this._getDerivedValue(dep.name, dep.command);
                //  Note: don't call the inherited set because there may be
                //  a superclass set() that needs to run, too.
                this.set(dep.name, val);
            }, this);
        }

        return this;

    },

    _getDerivedValue: function (attr, command) {
        var deriver = dojo.hitch(this, command.deriver);
        if (!dojo.isFunction(deriver)) {
            throw new Error(dojo.string.substitute(errTransformNotFound, {deriver: deriver, attr: attr}));
        }
        return deriver(command);
    }

});

var errTransformNotFound = 'Deriver function (${deriver}) not found for ${attr}.';

})();
