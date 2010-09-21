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
        this._derivablesPending = true;
    },

    postscript: function () {
        this.inherited(arguments);
        // check if we need to initialize
        if (this._derivablesPending) this._initDerivables(this.attributeMap, this._deriverSources, this);
        delete this._derivablesPending;
    },

    postMixInProperties: function () {
        this.inherited(arguments);
        // check if we need to initialize
        if (this._derivablesPending) this._initDerivables(this.attributeMap, this._deriverSources, this);
        delete this._derivablesPending;
    },

    set: function (/* String */ attr, /* Any */ value) {

        var inherited = this.getInherited('set', arguments);

        this._setAndCheckDerivables(attr, value, inherited, this._deriverSources, this);

        return this;

    },

    /* the following methods are context-free so they can be reused in the Derivable decorator */

    _initDerivables: function (map, sources, context) {

        cujo.lang.forInAll(map, function (commands, name) {
            dojo.some([].concat(commands), function (command) {
                if (command.deriver) {
                    // establish links from attributeMap's source property...
                    dojo.forEach([].concat(command.source), function (source) {
                        var link = {
                                name: name,
                                command: command,
                                source: source
                            };
                        sources[source] = sources[source] || [];
                        sources[source].push(link);
                    });
                    // persist property
                    context.set(name, context._getDerivedValue(name, command));
                    return true;
                }
            });
        });

    },

    _setAndCheckDerivables: function (attr, value, origSet, sources, context) {

        var currValue = context[attr];

        origSet.call(context, attr, value);

        if (currValue !== value) {
            // handle derived properties (if this is a source attr)
            dojo.forEach(sources[attr], function (dep) {
                var val = context._getDerivedValue(dep.name, dep.command);
                //  Note: don't call the inherited set because there may be
                //  a superclass set() that needs to run, too.
                context.set(dep.name, val);
            });
        }

    },

    _getDerivedValue: function (attr, command) {
        var deriver = dojo.hitch(this, command.deriver);
        if (!dojo.isFunction(deriver)) {
            throw new Error(dojo.string.substitute(errTransformNotFound, {deriver: command.deriver, attr: attr}));
        }
        return deriver(command);
    }

});

var errTransformNotFound = 'Deriver function (${deriver}) not found for ${attr}.';

})();
