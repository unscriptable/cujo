/*
    cujo.Derivable
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

*/
dojo.provide('cujo.Derivable');

dojo.require('cujo._Derivable');


cujo.Derivable = function (/* Object */ object, /* Object */ derivedAttrDefs) {
    //  summary:
    //      This is the Decorator version of the cujo.js's Derivable helper.
    //      Both of these versions allow you to add derived attributes (properties)
    //      to an object declaratively.  The derived properties are initialized
    //      and updated continually by watching one or more source properties.
    //      When a source property is changed, the derived property is, too.
    //  object: Object
    //      the object to receive the derived properties.
    //  derivedAttrDefs: Object
    //      see the attributeMap definition in cujo._Derivable for a complete description.
    //  description:
    //      Use cujo.mvc.Derivable as a decorator:
    //          var derivedDefs = { derivedProp: { source: 'sourceProp', deriver: 'myTransformFunc' } },
    //              myDerivableObj = cujo.Derivable(new Stateful(myPlainObj), derivedDefs);
    //      Note: using the "new" statement is optional. The following two statements work the same:
    //          var d = new cujo.Derivable(obj, defs);
    //          var d = cujo.Derivable(obj, defs);

    var cdp = cujo._Derivable.prototype; // we're gonna borrow some methods from cujo._Derivable!

    var deriverSources = {},
        origSet = object.set;

    object.set = function (/* String */ attr, /* Any */ value) {
        cdp._setAndCheckDerivables(attr, value, origSet, deriverSources, this);
        return this;
    };

    // TODO: document _getDerivedValue
    if (!object._getDerivedValue) {
        object._getDerivedValue = cdp._getDerivedValue;
    }

    cdp._initDerivables(derivedAttrDefs, deriverSources, object);

    return object;

};
