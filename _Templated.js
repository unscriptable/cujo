/*
    cujo._Templated
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO:
    - cache dom-ified templates for a perf boost (current and ancestor)
    - test mixin with children and at top node
    - add ability to use nodes already in DOM UL/LI hierarchies, etc. ???
    - remove data-cujoattrs or detect if they're different in the ancestors!!!

*/
dojo.provide('cujo._Templated');
dojo.require('dijit._Templated');

cujoConfig = cujoConfig || {};

// default to html5-compatible custom attributes
cujoConfig.attrAttach = cujoConfig.attrAttach || 'data-attach';
cujoConfig.attrEvent = cujoConfig.attrEvent || 'data-event';
cujoConfig.attrCujo = cujoConfig.attrCujo || 'data-cujo';
cujoConfig.attrOverride = cujoConfig.attrOverride || 'data-override';

dojo.declare('cujo._Templated', dijit._Templated, {
    //  summary:
    //      Adds inheritance and configurable attribute names to templates.
    //      Notes:
    //          entirely driven by template!
    //          ${} tokens still work, but are slower when used with inheritance
    //          give examples of valid token usage
    //          custom attrs
    //          data-override (mixin, replace. with optional css3 query)
    //          data-cujo
    //          data-attach
    //          data-event

    buildRendering: function () {
        // inheritance!
        // TODO: cache dom-ified templates for a perf boost
        // Note: this will break if the dom-ified template is not valid HTML. e.g: <div ${attrPairs}></div>

        // grab template
        var tmpl = dijit._Templated.getCachedTemplate(this.templatePath, this.templateString, this._skipNodeCache),
            tmplIsString = dojo.isString(tmpl);

        // convert to dom, if necessary
        // (the cached version will be a string if it contained an ${} tokens)
        if (tmplIsString) {
            tmpl = dojo._toDom(tmpl);
        }

        // get config and check for attribute overrides
        var cujoParams = dojo.fromJson(dojo.attr(tmpl, cujoConfig.attrCujo)) || {};
        this._setAttrNames(cujoParams);

        // get ancestor template, perform inheritance, insert new template into cache
        if (this._usesInheritance) {
            var ancestor = this.constructor.superclass,
                baseTmpl = dijit._Templated.getCachedTemplate(ancestor.templatePath, ancestor.templateString, ancestor._skipNodeCache),
                baseIsString = dojo.isString(baseTmpl);
            baseTmpl = baseIsString ? dojo._toDom(baseTmpl): baseTmpl.cloneNode(true);
            // TODO: allow data-attach to be optional on the root node
            if (dojo.attr(tmpl, this._attrOverride)) {
                this._overrideNodes([tmpl], baseTmpl);
            }
            var overrides = dojo.query('[' + this._attrOverride + ']', tmpl);
            if (overrides.length > 0) {
                this._overrideNodes(overrides, baseTmpl);
                if (tmplIsString || baseIsString) {
                    // TODO: cache dom-ified version, too!
                    // convert back to string before caching
                    var cont = dojo.create('div');
                    cont.appendChild(baseTmpl);
                    baseTmpl = cont.innerHTML;
                    cont.removeChild(cont.lastChild);
                }
                // replace cached template (there is no dojo API to do this, unfortunately)
                dijit._Templated._templateCache[this.templateString || this.templatePath] = baseTmpl;
            }
        }
        // continue as normal. inherited method will grab template already in the cache
        return this.inherited('buildRendering', arguments);
    },

    // summary: cujo attribute names. These may have been overridden in the template's root node
    _attrAttach: null,
    _attrEvent: null,
    _attrInherit: null,
    _attrOverride: null,

    _attachTemplateNodes: function (/* DOMNode */ rootNode, /* Function? */ getAttrFunc) {
        //  summary:
        //      overrides the dijit._Templated method to recognize cujo's alternatives to
        //      dojo attributes such as dojoAttachEvent and dojoAttachPoint

        if (!getAttrFunc) getAttrFunc = function (n, p) { return n.getAttribute(p); };

        var map = {
                dojoAttachPoint: this._attrAttach,
                dojoAttachEvent: this._attrEvent
            };

        function getDataAttr (node, name) {
            // translate property from html5 data-* or custom name
            return getAttrFunc(node, map[name] || name);
        }
        
        return this.inherited('_attachTemplateNodes', arguments, [rootNode, getDataAttr]);
    },

    _overrideNodes: function (overrides, source) {

        // get ancestor nodes and organize by attachpoint name
        // the root node is also added in as attachpoint, 'rootNode'
        var ancDefs = [],
            ancNodes = dojo.query('[' + this._attrAttach + ']', source).concat([source]);
        ancNodes.forEach(function (node) {
            var attach = dojo.attr(node, this._attrAttach) || '',
                names = node == source ? attach.split(/\s*,\s*/).concat(['rootNode']) : attach.split(/\s*,\s*/),
                defs = dojo.map(names, function (name) { return {node: node, name: name}; });
            ancDefs = ancDefs.concat(defs);
        }, this);
        var ancNodeMap = cujo.lang.keyMap(ancDefs, function (def) { return def.name; });

        // iterate over overrides and replace or mixin, as specified
        dojo.forEach(overrides, function (node) {

            var aParts = dojo.attr(node, this._attrOverride).split(':'),
                oper = aParts[0],
                query = aParts[1],
                attach = dojo.attr(node, this._attrAttach),
                ancNodeDefs;

            if (query) {
                if (!ancNodeMap[query]) {
                    ancNodeMap[query] = dojo.query(query, source).map(function (node) { return {node: node, query: query}; });
                }
                ancNodeDefs = ancNodeMap[query];
            }
            else {
                ancNodeDefs = ancNodeMap[attach];
            }

            dojo.forEach(ancNodeDefs, function (def) {

                if (!def) {
                    throw new Error('Ancestor not found in inherited template: ' + attach);
                }
                if (oper.match(/^replace$/i)) {
                    this._replaceNode(def.node, node);
                }
                else if (oper.match(/^mixin$/i)) {
                    this._mixinNode(def.node, node);
                }

            }, this);

        }, this);

    },

    _replaceNode: function (oldNode, newNode) {
        return oldNode.parentNode.replaceChild(newNode, oldNode);
    },

    _mixinNode: function (currNode, mixinNode) {
        // mixin attrs
        dojo.forEach(mixinNode.attributes, function (attr) {
            // css class attrs get handled specially (the way most devs would expect them to work)
            if (attr.name.match(/^class$/i)) {
                dojo.addClass(currNode, attr.value);
            }
            else {
                currNode.setAttribute(attr.name, attr.value);
            }
        });
        // mixin children
        if (mixinNode.childNodes.length > 0) {
            return this._overrideNodes(dojo.query('[' + this._attrAttach + ']', mixinNode), currNode);
        }
    },

    _setAttrNames: function (config) {

        dojo.mixin(this, {
            _attrAttach: config.attach || cujoConfig.attrAttach,
            _attrEvent: config.event || cujoConfig.attrEvent,
            _attrInherit: config.inherit || cujoConfig.attrInherit,
            _attrOverride: config.override || cujoConfig.attrOverride
        });

        this._usesInheritance = 'inherit' in config;

        // duck-punch dijit._Widget if _attrAttach isn't already defined (or else it won't be mapped into the widget)
        if (!(this._attrAttach in dijit._Widget.prototype)) {
            dijit._Widget.prototype[this._attrAttach] = '';
        }
        if (!(this._attrEvent in dijit._Widget.prototype)) {
            dijit._Widget.prototype[this._attrEvent] = '';
        }

    }

});
