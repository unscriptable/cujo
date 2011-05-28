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
		'cujo/mvc/_BindableContainer',
		'dojo/string',
		'dojo'
	],

	function (template, styleSheet, Widget, Templated, BindableContainer, strings, dojo) {

		var lang = dojo, dom = dojo, array = dojo;

		var undef;

		return lang.declare('cujo.widget.grid.TextGrid', [Widget, Templated, BindableContainer], {

			/**
			 * colDefs is an array of objects whose properties have the following:
			 * name - the column name/id
			 * title - the display name
			 * classes - a custom class name for the cells, 'gridrow' and 'gridrow-even' (or odd) are also added
			 * bodyCellTemplate - optional template of the entire body cell
			 * headerCellTemplate - optional template of the entire header cell
			 * footerCellTemplate - optional template of the entire footer cell
			 * transform - a function to transform the value before inserting into the bodyCellTemplate. e.g. function (val) { return val; }
			 */
			colDefs: null,

			headerCellTemplate: '<th class="${col.classes}">${value}</th>',

			bodyCellTemplate: '<td class="${col.classes}">${value}</td>',

			footerCellTemplate: '<td class="${col.classes}">${value}</td>',

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
			//      row: the DOMNode of the row clicked within
			//      dataItem: if this grid is data-bound, the object this row
			//          is bound to.
			//      e: the original event, which has the element actually
			//          clicked in e.target
			onRowClick: function (row, dataItem, e) {},

			// hooks to catch item modifications
			itemAdded: function (item, index, row) {},
			itemUpdated: function (item, index, row) {},
			itemDeleted: function (item, index, row) {},

			templateString: template,

			_rowTemplate: '<tr class="${rowClass}">${cells}</tr>',

			_createBoundView: function (item, index) {
				return this._makeBodyRow(item, index);
			},

			_destroyBoundView: function (view) {
				this.inherited(arguments);
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
				if (/*this._isReady && */this.resultSet) {
					this._removeAllItems();
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
				var pos, html, node, dataIndex;

				pos = index === undef ? this.bodyRowsContainer.rows.length : index;
				html = this._makeRow(this.bodyRowTemplate, dataItem, pos);
				node = dom.place(html, this.bodyRowsContainer, index == undef ? 'last' : index);
				dataIndex = this._dataIndex = (this._dataIndex >= 0 ? this._dataIndex + 1 : 0);

				node.setAttribute('data-cujo-dataindex', dataIndex);
				this._dataIndexes[dataIndex] = dataItem;

				return node;
			},

			postMixInProperties: function () {
				this.inherited('postMixInProperties', arguments);
				this._hasCustomHeader = !!this.headerRowTemplate;
				this._hasCustomFooter = !!this.footerRowTemplate;
				this._hasCustomBody = !!this.bodyRowTemplate;
				if (this.colDefs) {
					this._makeTemplates();
				}
			},

			buildRendering: function () {
				this.inherited(arguments);
				// IE7 devs, you should be ashamed of yourselves. What a P O S.
				// For some strange reason, IE7 inserts another TBODY into the
				// existing TBODY, which causes the table not to render at all.
				// Note: setting innerHTML on a table element crashes IE.
				var brc = this.bodyRowsContainer, bogus;
				while ((bogus = this.bodyRowsContainer.firstChild)) {
					this.bodyRowsContainer.removeChild(bogus);
				}

			},

			postCreate: function () {
				this.inherited('postCreate', arguments);
				dom.addClass(this.domNode, this.gridClass);
				if (!this.hasFooter) {
					dom.addClass(this.domNode, 'cujo-grid-nofooter');
				}
				this._setScrollbarWidth();
				this.connect(this.bodyRowsContainer, 'click', '_handleRowClick')
			},

			_makeRow: function (template, rowData, rowNum) {
				if (rowData) {
					var rowClasses = [ this.evenRowClass, this.oddRowClass ],
						classMap = {
							rowAuxClasses: rowNum  == undef ? '' : ' ' + rowClasses[rowNum % 2],
							rowNum: rowNum
						};
					rowData = lang.delegate(rowData, classMap);
					template = strings.substitute(template, rowData, this._squelchTransform, this);
				}
				return template;
			},

			_findColDef: function (colName) {
				var i, len;
				for (i = 0, len = this.colDefs.length; i < len; i++) {
					if (this.colDefs[i].name == colName) {
						return this.colDefs[i];
					}
				}
				return;
			},

			_transformValue: function (value, colName) {
				var colDef = this._findColDef(colName);
				if (!colDef || !colDef.transform) {
					throw new Error('Could not find transform function for column ' + colName);
				}
				return lang.hitch(this, colDef.transform)(value, colName);
			},

			_makeTemplate: function (rowType) {
				var colTmpl, cells;
				
				colTmpl = this[rowType + 'CellTemplate'] || '';
				cells = '';

				if (this.colDefs) {

					for (var i = 0, len = this.colDefs.length; i < len; i++) {
						var def, cellTmpl, info, classes;

						def = this.colDefs[i];
						classes = this._makeColClassAttr(def, i, rowType);

						// Info is the template map, passed to strings.substitute below
						info = {
							grid: this,
							col: lang.delegate(def, { classes: classes }),
							value: '${' + def.name + (def.transform && 'body' === rowType ? ':_transformValue' : '') + '}'
						};

						cellTmpl = def[rowType + 'CellTemplate'] || colTmpl;
						cells += strings.substitute(cellTmpl, info, this._passthruTransform, this);
					}
				}

				var map = {
						rowClass: this.rowClass + '${rowAuxClasses}',
						cells: cells
					};
				return strings.substitute(this._rowTemplate, map);
			},

			_makeColClassAttr: function (colDef, colNum, rowType) {
				// Concatenate the colDef classes with generated aux classes.

				var auxClasses = this._makeColAuxClasses(colDef, colNum, rowType);
				return colDef.classes
					? (colDef.classes + ' ' + auxClasses)
					: auxClasses;
			},

			_makeColAuxClasses: function (colDef, colNum, rowType) {
				// Generate aux classes for first and last columns

				var colClass;
				
				if (colNum === 0) {
					colClass = this.firstColClass;
				}

				if ('body' === rowType && colNum === this.colDefs.length - 1) {
					colClass = colClass ? (colClass + ' ' + this.lastColClass) : this.lastColClass;
				}

				return colClass || '';
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
