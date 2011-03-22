/*
    cujo._Derivable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
define(['dojo', 'cujo'], function(dojo, cujo) {
// local scope

dojo.declare('cujo._Derivable', null, {
    //  summary:
    //      This is the Mixin version of the cujo.js's Derivable helper.
    //      Both of these versions allow you to add derived attributes (a.k.a.
    //      computed properties) to an object declaratively.  The derived atributes are
    //      initialized and updated continually by watching one or more source attributes.
    //      When a source attribute is changed, the derived attribute is, too.
    //  description:
    //      Use cujo._Derivable as a mixin in a multiple-inheritance pattern:
    //          dojo.declare('myClass', cujo._Derivable, { ... }); // mixin
    //      cujo.js's Derivable helpers must be used on an object that implements the set 
    //      method. Any object that descends from cujo._Widget, dijit._Widget, or dojo.Stateful
    //      (as well as others) implements a set method.
    //      This helper is especially useful for adding computed properties to views and
    //      data models.  (hint, hint)
    //      This helper's attributeMap overloads dijit's attributeMap to define the derived 
    //      attributes.  See the attributeMap documentation below.

    /*=====
    //  attributeMap: Object
    //      Defines a set of derived properties. These act like normal properties, but are changed
    //      automatically when another property changes (or vice versa).  Each property definition 
    //      has a deriver function as well as possible linked attributes to watch (source).
    //      Example:
    //          attributeMap: {
    //              info: {
    //                  derived: 'funFacts',
    //                  deriver: function (def) { return 'Fun Facts: ' + this.get('info'); }
    //              },
    //              startDate: {
    //                  derived: 'displayStartDate',
    //                  deriver: '_toDisplayDate' // calls this._toDisplayDate(attrDef);
    //              },
    //              lastName: {
    //                  derived: 'greeting',
    //                  deriver: 'applyTemplate',
    //                  template: 'strings.greeting' // applyTemplate knows what to do with this
    //              },
    //              firstName: {
    //                  derived: 'greeting', // also updates greeting
    //                  deriver: 'applyTemplate',
    //                  template: 'strings.greeting' // applyTemplate knows what to do with this
    //              }
    //          }
    //      Each derived property must have a deriver function.  This function is passed a single
    //      parameter: the entire derived property definition.  It is the job of the deriver 
    //      function to know how to return the value of the derived property from the deriver 
    //      function. You may add additional properties to the attribute definition to help the 
    //      deriver function do its job.  For instance, the lastName and firstName definitions 
    //      above include a template property that the applyTemplate method knows how to use.
    //      Note: attributeMap allows multiple definitions per property name. See dijit._Widget for
    //      more information about this.
    attributeMap: null,
    =====*/
    
    constructor: function () {
        this._deriverSources = {};
        this._derivablesPending = true;
        this._initDerivables(this.attributeMap, this._deriverSources, this, this);
    },

    postscript: function () {
        this.inherited(arguments);
        // check if we need to initialize
        if (this._derivablesPending) {
            this._checkAllDerivables(this._deriverSources, this, this);
        }
//        if (this._derivablesPending) this._initDerivables(this.attributeMap, this._deriverSources, this, this);
        delete this._derivablesPending;
    },

    postMixInProperties: function () {
        this.inherited(arguments);
        // check if we need to initialize
        if (this._derivablesPending) {
            this._checkAllDerivables(this._deriverSources, this, this);
        }
//        if (this._derivablesPending) this._initDerivables(this.attributeMap, this._deriverSources, this, this);
        delete this._derivablesPending;
    },

    set: function (/* String */ attr, /* Any */ value) {

        var inherited = this.getInherited('set', arguments);

        this._setAndCheckDerivables(attr, value, inherited, this._deriverSources[attr], this, this);

        return this;

    },

    /* the following methods are context-free so they can be reused in the Derivable decorator version */

    _initDerivables: function (map, allSources, stateful, context) {

        function addSource (name, link) {
            allSources[name] = allSources[name] || [];
            allSources[name].push(link);
        }

        // TODO should we do this once on the prototype instead of once per instance?
        cujo.forInAll(map, function (commands, name) {
            dojo.forEach([].concat(commands), function (command) {
                // process forward-defined derived attributes
                if (command.derived) {
                    // establish links from attributeMap's derived property...
                    dojo.forEach([].concat(command.derived), function (derived) {
                        addSource(name, { name: derived, command: command, source: name });
	                    // persist property
	                    //context.set(derived, context._getDerivedValue(derived, command));
                    });
                }
                // process backward-defined derived attributes
                else if (command.source) {
                    // establish links from attributeMap's source property...
                    dojo.forEach([].concat(command.source), function (source) {
                        addSource(source, { name: name, command: command, source: source });
                    });
                    // persist property
                    //context.set(name, context._getDerivedValue(name, command));
                }
                // process attributeMap pass-throughs
                if (!command || command.node && map) {
                    map[name] = command;
                }
            });
        });

    },

    _setAndCheckDerivables: function (attr, value, origSet, sources, stateful, context) {

        var currValue = stateful[attr];

        origSet.call(stateful, attr, value);

        if (currValue !== value) {
            context._checkDerivables(attr, sources, stateful, context);
        }

    },

    _checkAllDerivables: function (allSources, stateful, context) {
        cujo.forIn(allSources, function (sources, source) {
            context._checkDerivables(source, sources, stateful, context);
        });
    },

    _checkDerivables: function (attr, sources, stateful, context) {
        // handle derived properties (if this is a source attr)
        dojo.forEach(sources, function (dep) {
            var val = context._getDerivedValue(dep.name, dep.command, stateful, context);
            //  Note: don't call the inherited set because there may be
            //  a superclass set() that needs to run, too.
            stateful.set(dep.name, val);
        });
    },

    _getDerivedValue: function (attr, command, stateful, context) {
        var deriver = dojo.hitch(stateful, command.deriver);
        if (!dojo.isFunction(deriver)) {
            throw new Error(dojo.string.substitute(errTransformNotFound, {deriver: command.deriver, attr: attr}));
        }
        return deriver(command);
    }

});

var errTransformNotFound = 'Deriver function (${deriver}) not found for ${attr}.';

return cujo._Derivable;

});
