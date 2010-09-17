/*
    cujo.Derivable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Use cujo.mvc._Derivable as a mixin in a multiple-inheritance pattern:
        dojo.declare('myClass', cujo._Derivable, { ... }); // mixin

*/
dojo.provide('cujo.Derivable');

dojo.require('dojo.string');

(function (d, c) {

cujo.Derivable = function (object) {

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

    var deriverSources = {};

    function init () {

        c.lang.forInAll(object.attributeMap, function (commands, name) {
            d.some([].concat(commands), function (command) {
                if (command.deriver) {
                    // establish links from attributeMap's source property...
                    d.forEach(command.source && [].concat(command.source), function (source) {
                        var link = {
                                name: name,
                                command: command,
                                source: source
                            };
                        deriverSources[source] = deriverSources[source] || [];
                        deriverSources[source].push(link);
                    });
                    // persist property
                    object.set(name, object._getDerivedValue(name, command));
                    return true;
                }
            });
        });

    }
    
    var origSet = object.set;

    object.set = function (/* String */ attr, /* Any */ value) {

        var currValue = this[attr];

        origSet.apply(this, arguments);

        if (currValue !== value) {
            // handle derived properties (if this is a source attr)
            d.forEach(deriverSources[attr], function (dep) {
                var val = this._getDerivedValue(dep.name, dep.command);
                this.set(dep.name, val);
            }, this);
        }

        return this;

    };

    // TODO: document _getDerivedValue
    if (!object._getDerivedValue) {
        object._getDerivedValue = function (attr, command) {
            var deriver = d.hitch(this, command.deriver);
            if (!d.isFunction(deriver)) {
                throw new Error(d.string.substitute(errTransformNotFound, {deriver: deriver, attr: attr}));
            }
            return deriver(command);
        }
    }

    init();

    return object;

};

var errTransformNotFound = 'Deriver function (${deriver}) not found for ${attr}.';

})(dojo, cujo);
