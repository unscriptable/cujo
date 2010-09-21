/*
    language extensions / conveniences
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo._base.lang');

// cujo language extensions
// the following object's members are mixed-in to the cujo.lang object

dojo.mixin(cujo, (function () {

    var
        c = cujo,
        $ = dojo,
        join = Array.prototype.join,
        slice = Array.prototype.slice,
        ts = Object.prototype.toString,
        undefined;

    function forIn (obj, lambda, context, ancestors) {
        for (var p in obj) {
            if (ancestors || obj.hasOwnProperty(p)) {
                if (lambda.call(context, obj[p], p, obj) === false) {
                    return false;
                }
            }
        }
        return true;
    }

    return {

        forIn: function (/* Object */ obj, /* Function */ lambda, /* Object? */ context) {
            //  summary: Iterates over object properties, but only those on the immediate object rather than
            //      inherited properties (via chained prototypes).
            //      The iteration may be stopped by returning false (not just falsy) from the lambda function.
            //  returns true if no lambda functions returned false.
            return forIn(obj || {}, lambda, context || $.global, false);
        },

        forInAll: function (/* Object */ obj, /* Function */ lambda, /* Object? */ context) {
            //  summary: Iterates over object properties, including inherited properties (via chained prototypes).
            //      The iteration may be stopped by returning false (not just falsy) from the lambda function.
            //  returns true if no lambda functions returned false.
            return forIn(obj || {}, lambda, context || $.global, true);
        },

        pre: $.partial,

        post: function (/* Function */ func /*, ... */) {
            var args = slice.call(arguments, 1);
            return function () {
                if (typeof func == 'string') {
                    func = this[func];
                }
                return func.apply(null, slice.call(arguments, 0).concat(args));
            };
        },

        // TODO: return dojo.Deferred?
        soon: function (/* Function */ func, /* Object? */ context) {
            // TODO: use window.postMessage if avaiable for better performance
            setTimeout(function () { func.call(context || $.global); });
        },

        debounce: function (func, threshold, execAsap) {
            var timeout; // handle to setTimeout async task (detection period)
            // add a method to the original function (func) to cancel any future executions
            func.stop = function () { clearTimeout(timeout); };
            // return the new debounced function which executes the original function only once
            // until the detection period expires
            return function debounced () {
                var obj = this, // reference to original context object
                    args = arguments; // arguments at execution time
                // this is the detection function. it will be executed if/when the threshold expires
                function delayed () {
                    // if we're executing at the end of the detection period
                    if (!execAsap)
                        func.apply(obj, args); // execute now
                    // clear timeout handle
                    timeout = null;
                };
                // stop any current detection period
                if (timeout)
                    clearTimeout(timeout);
                // otherwise, if we're not already waiting and we're executing at the beginning of the detection period
                else if (execAsap)
                    func.apply(obj, args); // execute now
                // reset the detection period
                timeout = setTimeout(delayed, threshold || 100);
            };
        },

        capitalize: function (/* String */ s) {
            // summary: returns the given string, s, with the first char capitalized.
            return (s || '').replace(/./, function (c) { return c.toUpperCase(); })
        },

        camelize: function (/* String, String, ... */) {
            //  summary: camel-cases the string arguments into one long word (e.g. thisIsCamelCase)
            //      If multiple arguments are passed, it is assumed that they will be concatenated
            //      together: camelize('love', 'this', 'func') --> 'loveThisFunc'
            //      If one argument is passed, it is assumed to be dash-delimited as in css properties
            //      and is converted to camelCase like their Javascript-bound equivalents:
            //      camelize('border-width') --> 'borderWidth'
            //      camelize('-moz-inline-box') --> 'MozInlineBox'
            var dashed = (arguments.length == 1 ? arguments[0] : join.call(arguments, '-'));
            return dashed.replace(/-([^-])/g, function (m,c) { return c.toUpperCase(); });
        },

        uncamelize: function (/* String */ s) {
            return (s || '').replace(/([A-Z])/g, function (m,c) { return '-' + c.toLowerCase(); });
        },

        typeOf: function (/* Anything */ o) {
            //  summary:
            //      returns a string representation of the object regardless of whether it is a
            //      primitive or an object.  For instance, typeOf(new String('foo')) and typeOf('foo')
            //      both return 'String'.  This code is inspired by kangax (http://perfectionkills.com)
            //      and WebReflection (http://webreflection.blogspot.com/).
            //  o: Object - any object or literal
            // returns a capitalized string: Boolean, Number, Null, Object, RegExp, String,
            //      Undefined, Window, etc...
            return o == null /* null or undefined */ ? cujo.capitalize('' + o) : ts.call(o).slice(8, -1);
        },

        first: function (/* Array */ array, /* Function */ finderFunc, /* Object? */ context) {
            //  summary: finds and returns the first instance of an item in an array that passes the
            //      criteria defined in finderFunc.  finderFunc is executed for each of the items in array
            //      under the context given by the optional context parameter. finderFunc should return
            //      truthy value when it encounters the correct item. The parameter signature of
            //      finderfunc is the same as other dojo array methods which mirror the Javascript 1.6
            //      array iterators: function (/* Any */ item, /* Number */ position, /* Array */ array)
            if (!context) context = $.global;
            var finder = $.isString(finderFunc) ? context[finderFunc] : finderFunc,
                found;
            $.some(array, function (item) {
                // intentional assignment for brevity
                return found = finder.apply(context, arguments) ? item : undefined;
            });
            return found;
        },

        keyMap: function (/* Array */ array, /* Function|String */ mapperFunc, /* Object? */ context) {
            //  summary:
            //      converts an array to a hashMap / keyMap using the lambda function, mapperFunc, to
            //      generate a key for each item in the array.  The result is an object with properties
            //      for each generated key and an array of items that match each key as the values of those
            //      properties.
            //  array: Array = the array that supplies the items
            //  mapperFunc: Function - see above
            //      mapperFunc is the same as other dojo array methods which mirror the Javascript 1.6
            //      array iterators: function (/* Any */ item, /* Number */ position, /* Array */ array)
            //  context: Object? - context on which to run compareFunc (i.e. the "this" reference from
            //      within compareFunc). defaults to null/window
            //  returns an object
            if (!context) context = $.global;
            var mapper = $.isString(mapperFunc) ? context[mapperFunc] : mapperFunc,
                map = {};
            $.forEach(array, function (item) {
                var key = mapper.apply(context, arguments);
                if (key != null) { // Note: this also is true if key != undefined
                    key = key.toString(); // perf. boost so next 3 refs don't have to convert to string?
                    if (!(key in map)) {
                        map[key] = [item];
                    }
                    else {
                        map[key].push(item);
                    }
                }
            });
            return map;
        },

        dedup: function (/* Array */ array, /* Function|String */ compareFunc, /* Object? */ context, /* Boolean? */ preempt) {
            //  summary: removes duplicate items from an array. compareFunc should behave
            //      exactly like the lambda function used in array.sort(), returning:
            //       0 - if the two items to compare are equivalent
            //      -1 - if the first item should be sorted to an earlier position than the second
            //       1 - if the first item should be sorted to a later position than the second
            //      Returns an array with no duplicates.
            //      Note: items found later in the array are favored over earlier items. This means
            //      that if am earlier item is found to be a duplicate of an later item, it is not
            //      included in the returned array.  You might ask, "Who cares which one is favored?"
            //      Glad you asked! It depends upon how you define "duplicate". If you wanted to
            //      remove all nodes with duplicate ids, you could supply a compareFunc that inspected
            //      node ids.  The nodes are not identical in this case, just the ids.
            //      If you wish to favor the earlier items, set preempt = true;
            //      Note: undefined values are omitted from the output array.
            //  array: Array - the array to be deduped. Undefined values are skipped.
            //  compareFunc: Function - see above
            //  context: Object? - context on which to run compareFunc (i.e. the "this" reference from
            //      within compareFunc). defaults to null/window
            //  preempt: Boolean? - set to true to favor earlier occuring items (see above)
            var comparator = $.isString(compareFunc) || context ? $.hitch(context || $.global, compareFunc) : compareFunc,
                prev,
                keepers = [],
                kp = 0; // next position in the keepers list
            // by first sorting the array, we know that dups will be adjacent to each other
            $.forEach(array.sort(comparator), function (item, pos) {
                if (item !== undefined) {
                    if (prev == undefined || comparator(prev, item) != 0)
                        keepers[++kp] = pos;
                    else if (!preempt)
                        keepers[kp] = pos;
                    prev = item;
                }
            });
            return $.map(keepers, function (pos) { return array[pos]; });
        }

    }
})());
