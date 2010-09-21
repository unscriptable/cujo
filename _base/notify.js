/*
    cujo._base.notify
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO: deprecate this


*/
dojo.provide('cujo._base.notify');

(function () {

// cujo notification extensions
// the following object's members are mixed-in to the cujo object

dojo.mixin(cujo, {

    post: function (/* String */ topic, /* Object|Array? */ args, /* Function? */ callback, /* Object? */ context) {
        //  summary:
        //    Posts a message to all listeners of the specified topic and returns true if at least
        //    one listener has been registered.  (The calling code may want to take different actions
        //    if no listeners are registered.)  The args parameter is sent on to the listeners'
        //    handler functions. If the args parameter can be any object or an array.  If an array is
        //    passed, it is assumed that each item in the array will become a parameter to the
        //    listeners' handler functions.  (To pass a single array as a parameter to the handler
        //    functions, you must wrap the arry in an array: e.g. [myArray] or [[1,2,3]].)
        //    If the callback parameter is present, it will be called back with a summary of the
        //    results of the listeners' handler functions.
        //
        //    If the callback parameter is supplied, it receives a 'survey' object as the first param.
        //    The survey object has five properties:
        //      error: Error? - the exception thrown, if any
        //      all: Boolean - true if all listeners returned a truthy value
        //      none: Boolean - true if each of the listeners returned an explicit false
        //      any: Boolean - true is at least one listener returned true
        //      indeterminate: Boolean - at least one listener did not return a result
        //
        //    If the callback parameter is omitted, the survey is done synchronously and returned
        //    immediately.

        // handle optional arguments
        if (arguments.length == 2 && cujo.typeOf(args) != 'Function') {
            callback = args;
            args = undefined;
        }

        // fix args if not already an array
        if (args !== undefined && cujo.typeOf(args) != 'Array')
            args = [args];

        var result = {yays: 0, nays: 0, total: 0},
            listeners = this._listeners[topic];

        // execute async if we've got a callback
        if (callback) {
            setTimeout(function () { callback.call(context, survey()); }, 0);
            return listeners.length > 0;
        }
        // execute sync otherwise
        else
            return survey();

        function survey () {
            try {
                if (listeners)
                    _surveyExec(listeners, args, result);
            }
            catch (ex) {
                result.error = ex;
            }
            return new _surveyResult(result);
        }
    },

    listen: function (/* String */ topic, /* Function|String */ handler, /* Object? */ context) {
        var listeners = this._listeners[topic];
        if (!listeners)
            listeners = this._listeners[topic] = [];
        if (!context)
            context = dojo.global;
        listeners.push({handler: handler, context: context});
        // return a token / handle
        return [topic, handler, context];
    },

    unlisten: function (/* Object */ token) {
        var listeners = this._listeners[topic],
            pos = dojo.indexOf(listeners, token);
        if (listeners && pos) {
            listeners.splice(pos, 1);
        }
    },

    _listeners: {}

});

function _surveyExec (listeners, args, result) {
    // TODO: raise an exception if handler is not found in the specified context
    dojo.forEach(listeners, function (l) {
        var func = cujo.typeOf(l.handler) == 'Function' ? l.handler : l.context[l.handler],
            r = func.apply(l.context, args);
        if (r) result.yays++;
        if (r === false) result.nays++;
        result.total++;
    });
}

function _surveyResult (/* Object */ seed) {
    var yays = seed.yays || 0,
        nays = seed.nays || 0,
        total = seed.total || 0;
    this.error = seed.error;
    this.all = yays == total;
    this.none = nays == total;
    this.any = yays > 0;
    this.indeterminate = nays + yays != total;
}

})();
