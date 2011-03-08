/*
 * Copyright (c) 2011, unscriptable.com.
 *
 * Navihint widget
 */

define(
[
	'dojo',
	'text!./Navihint.html',
	'i18n!./nls/Navihint',
	'cujo/mvc/View',
	'cssx/css!./Navihint.css'
],
function(dojo, template, strings, View) {

	// package emulation
	var lang = dojo,
		dom = dojo;
	
	return lang.declare('cujo.widget.Navihint', View, {

		anchorQuery: 'a[name]',

		templateString: template,
		
		strings: strings,

		// nodes in template:
		bottomNode: null,
		topNode: null,
		proxyTemplate: null,

		postCreate: function () {

			this.inherited(arguments);

			this.titleNodes = dom.query(this.anchorQuery, this.containerNode);
			this.proxies = [];
			var count = this.titleNodes.length;

			for (var i = 0; i < count; i++) (function (proxy, target, widget) {
				proxy._origClassName = proxy.className;
				widget.proxies.push(proxy);
				widget.connect(proxy, 'click', function () { widget._scrollIntoView(target); } );
			}(this._createProxy(this.titleNodes[i].innerHTML), this.titleNodes[i], this));

			this._checkProxies();

			this.connect(this.containerNode.parentNode, 'scroll', '_onScroll');

		},

		buildRendering: function () {
			this.inherited(arguments);
			this.proxyTemplate.parentNode.removeChild(this.proxyTemplate);
		},

		_createProxy: function (title, abbr) {
			var proxy = this.proxyTemplate.cloneNode(true),
				titleNode = dom.query('.navihint-proxy-title', proxy)[0],
				abbrNode = dom.query('.navihint-proxy-abbr', proxy)[0];
			titleNode.innerHTML = title || '';
			abbrNode.innerHTML = abbr || titleNode.innerHTML;
			return proxy;
		},

		_onScroll: function (e) {
			// TODO: debounce
			this._checkProxies();
		},

		_scrollIntoView: function (target) {
			if (target.offsetParent) {
				var viewport = this.containerNode.parentNode,
					targetBox = { t: target.offsetTop, h: target.offsetHeight },
					viewportBox = { t: viewport.scrollTop, h: viewport.offsetHeight };
				if (targetBox.t < viewportBox.t || targetBox.t + targetBox.h > viewportBox.t + viewportBox.h) {
					target.scrollIntoView();
				}
			}
		},

		_checkProxies: function () {
			// loop through all the titles and figure out which are above, below, or within the viewport
			var viewport = this.containerNode.parentNode;
			for (var i = 0; i < this.titleNodes.length; i++) {
				var titleNode = this.titleNodes[i];
				if (titleNode.offsetTop < viewport.scrollTop) {
					// move to the top
					this.proxies[i]._pos = 'top';
				}
				else if (titleNode.offsetTop + titleNode.offsetHeight > viewport.scrollTop + viewport.offsetHeight) {
					// move to the bottom
					this.proxies[i]._pos = 'bottom';
				}
				else {
					// remove from both
					this.proxies[i]._pos = 'viewport';
				}
			}
			for (var i = 0; i < this.proxies.length; i++) {
				if (this.proxies[i]._pos == 'top') {
					this.topNode.appendChild(this.proxies[i]);
				}
				else if (this.proxies[i]._pos == 'bottom') {
					this.bottomNode.appendChild(this.proxies[i]);
				}
				else {
					if (this.proxies[i].parentNode) this.proxies[i].parentNode.removeChild(this.proxies[i]);
				}
			}
		}
		
	});

});
