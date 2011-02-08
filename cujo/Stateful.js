/*
    cujo.Stateful
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Adds dojo.Stateful behavior to objects without the dojo.declare turds and overhead

*/
define(/* cujo/Stateful, */ ['cujo'], function(cujo) {

var op = Object.prototype,
	wildcard = "*";

function set (obj, cb, name, value) {

	var old;

	function _set (prop, val) {
		var old = obj[prop];
		obj[prop] = val;
		for (var i = 0, len = cb && cb.length; i < len; i++) {
			try {
				cb[i](prop, old, val);
			}
			catch (ex) {
				console && console.log && console.log(ex);
			}
		}
	}

	if (typeof name === 'object') {
		for (var p in name) {
			if (!(p in op)) {
				_set(p, name[p]);
			}
		}
	}
	else {
		_set(name, value);
	}

	return obj;

}

function P () {}

cujo.Stateful = function (obj, options) {

	var callbacks = {},
		proto = {

			get: function (name) {
				return this[name];
			},

			set: function (name, value) {
				var cbs = (callbacks[name] || []).concat(callbacks[wildcard] || []);
				return set(this, cbs, name, value);
			},

			watch: function (name, callback) {
				if(!callback) {
					callback = name;
					name = wildcard;
				}
				var cb = callbacks[name];
				if (!cb) {
					cb = callbacks[name] = [];
				}
				// for dojo.Stateful compatibility, we need to set the context to "this"
				var self = this;
				cb.push(function () { callback.apply(self, arguments); });
				return {
					unwatch: function () {
						var pos = cb.length;
						while (--pos >= 0) {
							if (cb[pos] == callback) {
								cb.splice(pos, 1);
								break;
							}
						}

					}
				};
			}

		};

	P.prototype = proto;
	var stfuObj = new P();
	for (var p in obj) {
		if (!(p in op)) {
			stfuObj[p] = obj[p];
		}
	}

	return stfuObj;

};

return cujo.Stateful;

});