define(
	[
		'dojo', // for language and array functions
		'cujo' // for hashMap functions
	],
	function (dojo, hashMap) {

		var lang = dojo,
			array = dojo;

		return function () {

			/*

				TODO: allow dojo-default attrs (i.e. attrName: "")
				TODO: documentation!!!!!!

				Valid combos:
				objAttr -> dom -> data -> source
				objAttr -> data -> dom -> source
				objAttr -> derived -> dom
				objAttr -> dom -> derived

				Invalid combos:
				objAttr -> derived !-> data
				objAttr -> data !-> derived
				objAttr -> derived !-> source
				objAttr -> source !-> derived
				dom is cool :)

				Example usage:
				cujo.mvc.binder().inherit(myBaseClass)
					.bind('role')
						.node('roleSelect', 'value', 'change')
						.data()
						.derives('displayRole', function () { return 'role: ' + this.role; })
					.derive('toolTipText', ['role', 'username'], '_createToolTipText')
						.widget('toolTip', 'text')
					.bind('username')
						.data('user')
						.node('userNode', 'innerHTML')
					.map()

				// Equivalent attributeMap:
				dojo.delegate(myBaseClass.prototype.attributeMap, {
					role: {
						node: 'roleSelect', attribute: 'value', event: 'change',
						data: '',
						derives 'displayRole', deriver: function () { return 'role: ' + this.role; }
					},
					toolTipText: {
						source: ['role', 'username'], deriver: '_createToolTipText',
						widget: 'toolTip', attribute: 'text'
					},
					username: {
						data: 'user',
						node: 'userNode', type: 'innerHTML'
					}
				})


			*/


			/* internal defs collection looks like this:
				defs = {
					firstName: {
						node: [
							{ ... definition ... },
							{ ... definition ... }
						]
						data: [
							{ ... definition ... }
						]
					}
					lastName: {
						node: [
							{ ... definition ... }
						]
					}
				}
			 */
			var chain = {},
				defs = {},
				currAttr,
				inherits = [],
				chainWithSubMethods = lang.delegate(chain, {
					node: node,
					widget: widget,
					data: data,
					derives: derives
				});

			function addToDefs (op, def) {
				// grab the corresponding attribute
				var attrDef = defs[currAttr];
				// create it if it doesn't exist
				if (!attrDef) attrDef = defs[currAttr] = {node: [], widget: [], data: [], derived: [], source: []};
				// add the new definition, organized by operation
				attrDef[op][attrDef[op].length] = def;
				return attrDef;
			}

			/* public interface */

			chain.inherit = function (base) {
				//  summary: specifies the attributeMap of the super class that this
				//      attributeMap will extend.  For best performance, do this first.
				var baseMap = base && base.prototype && base.prototype.attributeMap;
				if (baseMap) {
					inherits[inherits.length] = baseMap;
				}
				else {
					logError('inherited base not found');
				}
				return this;
			};

			chain.bind = function (attr, /* the remaining params are optional */ nodeName, nodeAttr, event) {
				// record new attribute name
				currAttr = attr;
				// add optional node definition (common case)
				if (arguments.length > 1) node(nodeName, nodeAttr, event);
				// return fully-decorated chain
				return chainWithSubMethods;
			};

			chain.derive = function (attr, source, deriver, params) {
				// record new attribute name
				currAttr = attr;
				// create and add command out of optional params
				var cmd = params || {};
				addToDefs('source', cmd);
				// set fixed params
				cmd.source = source;
				cmd.deriver = deriver;
				cmd.type = 'cujoBind';
				// return fully-decorated chain
				return chainWithSubMethods;
			};

			/* these methods aren't available until bind() or derive() are called */

			function node (name, attr, event) {
				// create and add command
				var cmd = {node: name},
					attrDef = addToDefs('node', cmd);
				// set defaults and optional params
				if (/innerHTML|innerText|class/.test(attr)) {
					cmd.type = attr;
				}
				else {
					cmd.type = 'attribute';
					cmd.attribute = attr || currAttr;
				}
				if (event) {
					cmd.event = event;
					// record if this command is bidirectional
					attrDef.bidi = [].concat(attrDef.bidi, cmd);
				}
				// return fully-decorated chain
				return chainWithSubMethods;
			}

			function widget (name, attr, bWatch) {
				// create and add command
				var cmd = {node: name, attribute: attr || currAttr, type: 'widget'},
					attrDef = addToDefs('widget', cmd);
				// set optional watch param
				if (bWatch) {
					cmd.watch = bWatch === true ? attr : bWatch;
					// record if this command is bidirectional
					attrDef.bidi = [].concat(attrDef.bidi, cmd);
				}
				// return fully-decorated chain
				return chainWithSubMethods;
			}

			function data (attr) {
				addToDefs('data', {data: attr || currAttr, type: 'cujoBind'});
				// return fully-decorated chain
				return chainWithSubMethods;
			}

			function derives (derived, deriver, params) {
				// create and add command out of optional params
				var cmd = params || {};
				addToDefs('derived', cmd);
				// set fixed params
				cmd.derived = derived;
				cmd.deriver = deriver;
				cmd.type = 'cujoBind';
				// return fully-decorated chain
				return chainWithSubMethods;
			}

			/* the final output is created in this method */

			chain.map = function () {
				//  rules:
				//      TODO: 1. a derived attribute that defines a data binding should actually create a second
				//      derived attribute that sets dataItem.dataAttr instead of defining a data binding
				//      2. only one data binding allowed per object attribute (first one takes precedence
				//      3. only one source binding allowed per object attribute (first one takes precedence
				//      4. derived and bidirectional don't work (node event or widget watch)

				var map = {};

				// apply all inherits
				array.forEach(inherits, function (inherit) {
					map = lang.delegate(inherit);
				});

				function addToMap (attr, cmd) {
					if (map[attr]) {
						map[attr] = [].concat(map[attr], cmd);
					}
					else {
						map[attr] = cmd;
					}
				}

				// apply all attributes
				hashMap.forIn(defs, function (attrDef, attr) {

					// only allow one data-binding definition
					if (attrDef.data.length > 1) {
						attrDef.data = [attrDef.data[0]];
						logError('extra data definitions removed.', attr);
					}

					// only allow one derived (source) definition
					if (attrDef.source.length > 1) {
						attrDef.source = [attrDef.source[0]];
						logError('extra source definitions removed.', attr);
					}

					// derived attrs can't derive other attrs
					if (attrDef.source.length > 0 && attrDef.derived.length > 0) {
						attrDef.derived = [];
						logError('derived definition can\'t derive others.', attr);
					}

					// derived attributes cannot have bidirectional behavior
					if (attrDef.source.length > 0) {

						// data-binding is bidirectional
						if (attrDef.data.length > 0) {
							attrDef.data = [];
							logError('source and data conflict. data removed.', attr);
						}

						// node event or widget watch are bidirectional
						if (attrDef.bidi) {
							array.forEach(attrDef.bidi, function (bidi) {
								delete bidi.watch;
								delete bidi.event;
							});
							delete attrDef.node.event;
							logError('source and node-event or widget-watch conflict. event/watch removed.', attr);
						}

					}

					// merge any definitions that are left
					var max = 0;
					hashMap.forIn(attrDef, function (def, op) {
						if (op != 'bidi') max = Math.max(max, def.length);
					});
					for (var i = 0; i < max; i++) {
						// TODO: this does not look cpu-friendly. investigate other options
						var def = lang.mixin({},
								attrDef.data[i],
								attrDef.source[i],
								attrDef.derived[i],
								// node and widget must override type property so they're last
								attrDef.node[i],
								attrDef.widget[i]
							);
						addToMap(attr, def);
					}

				});

				return map;
			};

			return chain;

		};

		function logError (message, attr) {
			if (console) {
				var msg = 'cujo.mvc.binder: ',
					func = console.error || console.log;
				logError = function (message, attr) {
					func.apply(console, msg + attr + '. ' + message);
				};
				logError(message, attr);
			}
		}

});

