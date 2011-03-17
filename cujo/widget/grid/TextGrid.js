/*
 * Copyright (c) 2010, unscriptable.com.
 *
 * TextGrid widget.  The simplest of grids.
 *
 * TODO: this shares a lot of code with cujo.mvc._BindableContainer
 *
 */

define(
	[
		'text!./TextGrid.html', // template
		'cssx/css!./TextGrid.css', // styles
		'dijit/_Widget',
		'dijit/_Templated',
		'dojo/string',
		'dojo'
	],

	function (template, styleSheet, Widget, Templated, strings, dojo) {

		var lang = dojo, dom = dojo, array = dojo;

		var undef;

		return lang.declare('cujo.widget.grid.TextGrid', [Widget, Templated], {

			/**
			 * colDefs is an array of objects whose properties have the following:
			 * name - the column name/id
			 * title - the display name
			 * colClass - a custom class name for the cells, 'gridrow' and 'gridrow-even' (or odd) are also added
			 * bodyCellTemplate - optional template of the entire body cell
			 * headerCellTemplate - optional template of the entire header cell
			 * footerCellTemplate - optional template of the entire footer cell
			 * transform - a function to transform the value before inserting into the bodyCellTemplate. e.g. function (val) { return val; }
			 */
			colDefs: null,

			/**
			 * An array of objects or the resultSet returned from a dojo.store query.
			 */
			resultSet: null,

			headerCellTemplate: '<th${colClassAttr}>${_value}</th>',

			bodyCellTemplate: '<td${colClassAttr}>${_value}</td>',

			footerCellTemplate: '<td${colClassAttr}>${_value}</td>',

			gridClass: 'cujo-textgrid',

			rowClass: 'cujo-gridrow',

			oddRowClass: 'cujo-gridrow-odd',

			evenRowClass: 'cujo-gridrow-even',

			firstColClass: 'cujo-gridcol-first',

			lastColClass: 'cujo-gridcol-last',

			headerRowTemplate: null,

			bodyRowTemplate: null,

			footerRowTemplate: null,

			hasFooter: false,

			// onRowClick: function (tr, dataItem, e)
			//      onRowClick is called whenever a user clicks within a row.
			//      tr: the DOMNode of the row clicked within
			//      dataItem: if this grid is data-bound, the object this row
			//          is bound to.
			//      e: the original event, which has the element actually
			//          clicked in e.target
			onRowClick: function (row, dataItem, e) {},

			templateString: template,

			_isReady: false,

			_rowTemplate: '<tr class="${rowClass}">${cells}</tr>',

			_setResultSetAttr: function (data) {
				// unsubscribe from any previous resultSet
				if (this.resultSet) {
				    this._unwatchResultSet();
					this._removeAllRows();
				}
				// save result set and initialize
				this.resultSet = data || null;
				this._initResultSet();
			},

			_getResultSetAttr: function () {
				return this.resultSet;
			},

			_initResultSet: function () {
				// subscribe to onAdd, onUpdate, and onRemove
				if (this.resultSet) {
					// TODO: cujo.Promise.when as a common.Promise.when
				    lang.when(this.resultSet, lang.hitch(this, '_resultsLoaded'), lang.hitch(this, '_resultsError'), lang.hitch(this, '_itemAdded'));
				    this._watchResultSet();
				}
			},

			_watchResultSet: function () {
				var data = this.resultSet;
				if (data && data.observe) {
				    var dismiss = data.observe(lang.hitch(this, '_handleResultSetEvent')).dismiss,
				        handle = this.connect(this, '_unwatchResultSet', function () {
				            if (dismiss) dismiss();
				            this.disconnect(handle);
				        });
				}
			},

			_unwatchResultSet: function () {
				//  summary: this gets called when the result set is unwatched but unwatching
				//      happens in a callback within _watchResultSet
			},

			_handleResultSetEvent: function (item, oldIndex, newIndex) {
				// summary: fires when an item in result set changes
				// TODO: debounce these to catch moves instead of deleting/recreating
				//      - create a new debounced method to do the adds/deletes/moves and make
				//        this method accrue add/del operations.
				//      - or will transaction() handle this better than debounce?
				if (oldIndex == -1 || newIndex == -1) {
				    // TODO: ok, what to do if the dev hasn't defined a queryExecutor?
				}
				else if (oldIndex == newIndex) {
				    // item didn't move. don't do anything
				}
				else if (newIndex >= 0) {
				    this._itemAdded(item, newIndex);
				}
				else {
				    this._itemDeleted(item, oldIndex);
				}
			},

			_resultsLoaded: function (data) {
				if (this._isReady) {
					array.forEach(data, function (dataItem) {
						this._itemAdded(dataItem);
					}, this);
				}
			},

			_resultsError: function (err) {
				// TODO
			},

			_itemAdded: function (item, index) {
				if (this._isReady) {
					this._makeBodyRow(item, index);
				}
			},

			_itemDeleted: function (item, index) {
				if (this._isReady) {
					this._destroyBodyRow(index);
				}
			},

			_removeAllRows: function () {
				if (this._isReady) {
					dom.empty(this.bodyRowsContainer);
				}
			},

			_setColDefsAttr: function (defs) {
				// store definitions
				this.colDefs = defs;
				// create new templates
				this._makeTemplates();
				this._makeHeader();
				if (this.hasFooter) {
					this._makeFooter();
				}
				if (this._isReady && this.resultSet) {
					this._removeAllRows();
					this._resultsLoaded(this.resultSet);
				}
			},

			_getColDefsAttr: function () {
				return this.colDefs;
			},

			_makeTemplates: function () {
				if (!this._hasCustomHeader) {
					this.headerRowTemplate = this._makeTemplate('header');
				}
				if (!this._hasCustomBody) {
					this.bodyRowTemplate = this._makeTemplate('body');
				}
				if (this.hasFooter && !this._hasCustomFooter) {
					this.footerRowTemplate = this._makeTemplate('footer');
				}
			},

			_makeHeader: function () {
				var html = this._makeRow(this.headerRowTemplate, this._makeHeaderTitles());
				dom.attr(this.headerRowsContainer, 'innerHTML', html);
				dom.addClass(this.headerScrollspace, this.lastColClass);
			},

			_makeFooter: function () {
				var html = this._makeRow(this.footerRowTemplate, this._makeFooterTitles());
				dom.attr(this.footerRowsContainer, 'innerHTML', html);
				dom.addClass(this.footerScrollspace, this.lastColClass);
			},

			_makeBodyRow: function (dataItem, index) {
				var pos = index === undef ? this.bodyRowsContainer.rows.length : index,
					html = this._makeRow(this.bodyRowTemplate, dataItem, pos),
					node = dom.place(html, this.bodyRowsContainer, index == undef ? 'last' : index),
					dataIndex = this._dataIndex = (this._dataIndex || -1) + 1;
				node.setAttribute('data-cujo-dataindex', dataIndex);
				this._dataIndexes[dataIndex] = dataItem;
				return node;
			},

			_destroyBodyRow: function (index) {
				var row = this.bodyRowsContainer.rows[index];
				if (row) {
					var dataIndex = row.getAttribute('data-cujo-dataindex');
					delete this._dataIndexes[dataIndex];
					dom.destroy(row);
				}
			},

			postMixInProperties: function () {
				this._dataIndexes = {};
				this.inherited('postMixInProperties', arguments);
				this._hasCustomHeader = !!this.headerRowTemplate;
				this._hasCustomFooter = !!this.footerRowTemplate;
				this._hasCustomBody = !!this.bodyRowTemplate;
				if (this.colDefs) {
					this._makeTemplates();
				}
			},

			postCreate: function () {
				this.inherited('postCreate', arguments);
				dom.addClass(this.domNode, this.gridClass);
				if (!this.hasFooter) {
					dom.addClass(this.domNode, 'cujo-grid-nofooter');
				}
				this._isReady = true;
				if (this.resultSet) {
					this._resultsLoaded(this.resultSet);
				}
				this._setScrollbarWidth();
				this.connect(this.bodyRowsContainer, 'click', '_handleRowClick')
			},

			_makeRow: function (template, rowData, rowNum) {
				if (rowData) {
					var rowClasses = [ this.evenRowClass, this.oddRowClass ],
						map = {
							rowAuxClasses: rowNum  == undef ? '' : ' ' + rowClasses[rowNum % 2],
							rowNum: rowNum
						};
					rowData = lang.delegate(rowData, map);
					template = strings.substitute(template, rowData, this._squelchTransform, this);
				}
				return template;
			},

			_makeTemplate: function (rowType) {
				var colTmpl = this[rowType + 'CellTemplate'] || '',
					rowTmpl = '';
				if (this.colDefs) {
					for (var i = 0, len = this.colDefs.length; i < len; i++) {
						var def = this.colDefs[i],
							cellTmpl = def[rowType + 'CellTemplate'] || colTmpl,
							info = lang.delegate(def, {
								colClassAttr: this._makeColClassAttr(def, i, rowType),
								_value: '${' + def.name + (def.transform && 'body' === rowType ? ':' + def.transform : '') + '}'
							});
						rowTmpl += strings.substitute(cellTmpl, info, this._passthruTransform, this);
					}
				}
				var map = {
						rowClass: this.rowClass + '${rowAuxClasses}',
						cells: rowTmpl
					};
				return strings.substitute(this._rowTemplate, map);
			},

			_makeColClassAttr: function (colDef, colNum, rowType) {
				var colClass = colDef.colClass;
				if (colNum === 0) {
					colClass = (colClass || '') + ' ' + this.firstColClass;
				}
				if ('body' === rowType && colNum === this.colDefs.length - 1) {
					colClass = (colClass || '') + ' ' + this.lastColClass;
				}
				return colClass == undef ? '' : ' class="' + colClass + '"';
			},

			// strings.substitute transforms
			_squelchTransform: function (val) { return val == undef ? '' : val; },
			_passthruTransform: function (val, name) { return val == undef ? '${' + name + '}' : val; },

			_makeHeaderTitles: function () {
				// returns an object that looks like a data object, but has column titles
				var titles = {};
				for (var p in this.colDefs) (function (def, p){
					titles[def.name] = def.title;
				}(this.colDefs[p], p));
				return titles;
			},

			_makeFooterTitles: function () {
				return this._makeHeaderTitles();
			},

			_handleRowClick: function (e) {
				var node = e.target, row;
				// find row node
				do {
					if (node.tagName == 'TR') {
						row = node;
					}
					node = node == this.domNode ? null : node.parentNode;
				}
				while (node && !row);
				// if this really was a click within a row, continue
				if (row) {
					// find the data associated with this row (if any, could be undefined)
					var dataIndex = row.getAttribute('data-cujo-dataindex');
					this.onRowClick(row, this._dataIndexes[dataIndex], e);
				}
			},

			// TODO: remove this TEMP code when cssx/cssx is working
			_setScrollbarWidth: (function () {
				function getSbSize () {
					var sbSize = {w: 15, h: 15}; // default
					var testEl = dom.create('DIV', {style: 'width:100px;height:100px;overflow:scroll;bottom:100%;right:100%;position:absolute;visibility:hidden;'}, dojo.body(), 'last');
					try {
						sbSize = {
							w: testEl.offsetWidth - Math.max(testEl.clientWidth, testEl.scrollWidth),
							h: testEl.offsetHeight - Math.max(testEl.clientHeight, testEl.scrollHeight)
						};
						getSbSize = function () { return sbSize; };
						dom.destroy(testEl);
					}
					catch (ex) {
						// squelch
					}
					return sbSize;
				}
				return function () {
					dom.query('.cujo-grid-scrollspace', this.domNode)
						.style('width', getSbSize().w + 'px');
					dom.query('.cujo-header > .cujo-grid-table, .cujo-footer > .cujo-grid-table', this.domNode)
						.style('paddingRight', getSbSize().w + 'px');
				};
			}())

		});

	}
);
