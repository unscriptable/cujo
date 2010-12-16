/*
 * Copyright (c) 2010, Life Image, Inc. All rights reserved.
 *
 * TextGrid widget.  The simplest of grids.
 *
 * TODO: this shares a lot of code with cujo.mvc._BindableContainer
 *
 */

define(
	[
		'text!./TextGrid.html', // template
		'css!./TextGrid.css', // styles
		'dijit/_Widget',
		'dijit/_Templated',
		'dojo/string',
		'dojo', // for dojo's language functions
		'dojo', // for dojo's dom functions
		'dojo' // for dojo's array functions
	],

	function (template, styleSheet, Widget, Templated, strings, lang, dom, array) {

		var undef;

		return dojo.declare('li.widget.grid.TextGrid', [Widget, Templated], {

			/**
			 * colDefs properties:
			 * name - the column name/id
			 * title - the display name
			 * colClass - a custom class name for the cells, 'gridrow' and 'gridrow-even' (or odd) are also added
			 * bodyCellTemplate - optional template of the entire body cell
			 * headerCellTemplate - optional template of the entire header cell
			 * footerCellTemplate - optional template of the entire footer cell
			 */
			colDefs: null,

			/**
			 * An array of objects or the resultSet returned from a dojo.store query.
			 */
			dataSet: null,

			headerCellTemplate: '<th${colClassAttr}>${_value}</th>',

			bodyCellTemplate: '<td${colClassAttr}>${_value}</td>',

			footerCellTemplate: '<td${colClassAttr}>${_value}</td>',

			rowClass: 'cujo-gridrow',

			oddRowClass: 'cujo-gridrow-odd',

			evenRowClass: 'cujo-gridrow-even',

			headerRowTemplate: null,

			bodyRowTemplate: null,

			footerRowTemplate: null,

			hasFooter: false,

			templateString: template,

			_isReady: false,

			_rowTemplate: '<tr class="${rowClass}">${cells}</tr>',

			_setDataSetAttr: function (data) {
				// unsubscribe from any previous resultSet
				if (this.dataSet) {
				    this._unwatchDataSet();
					this._removeAllRows();
				}
				// save result set and initialize
				this.dataSet = data || null;
				this._initDataSet();
			},

			_getDataSetAttr: function () {
				return this.dataSet;
			},

			_initDataSet: function () {
				// subscribe to onAdd, onUpdate, and onRemove
				if (this.dataSet) {
					// TODO: cujo.Promise.when as a common.Promise.when
				    lang.when(this.dataSet, lang.hitch(this, '_resultsLoaded'), lang.hitch(this, '_resultsError'), lang.hitch(this, '_itemAdded'));
				    this._watchDataSet();
				}
			},

			_watchDataSet: function () {
				var data = this.dataSet;
				if (data && data.observe) {
				    var dismiss = data.observe(lang.hitch(this, '_handleDataSetEvent')).dismiss,
				        handle = this.connect(this, '_unwatchDataSet', function () {
				            if (dismiss) dismiss();
				            this.disconnect(handle);
				        });
				}
			},

			_unwatchDataSet: function () {
				//  summary: this gets called when the result set is unwatched but unwatching
				//      happens in a callback within _watchDataSet
			},

			_handleDataSetEvent: function (item, oldIndex, newIndex) {
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
					var row = this.bodyRowsContainer.rows[index];
					if (row) {
						dom.destroy(row);
					}
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
				if (this._isReady && this.dataSet) {
					this._removeAllRows();
					this._resultsLoaded(this.dataSet);
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
			},

			_makeFooter: function () {
				var html = this._makeRow(this.footerRowTemplate, this._makeFooterTitles());
				dom.attr(this.footerRowsContainer, 'innerHTML', html);
			},

			_makeBodyRow: function (dataItem, index) {
				var pos = index === undef ? this.bodyRowsContainer.rows.length : index,
					html = this._makeRow(this.bodyRowTemplate, dataItem, pos);
				dom.place(html, this.bodyRowsContainer, index == undef ? 'last' : index);
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

			postCreate: function () {
				this.inherited('postCreate', arguments);
				if (!this.hasFooter) {
					dom.addClass(this.domNode, 'cujo-grid-nofooter');
				}
				this._isReady = true;
				if (this.dataSet) {
					this._resultsLoaded(this.dataSet);
				}
			},

			_makeRow: function (template, rowData, rowNum) {
				if (rowData) {
					var rowClasses = [ this.evenRowClass, this.oddRowClass ],
						map = {

							rowAuxClasses: rowNum  == undef ? '' : ' ' + rowClasses[rowNum % 2],
							rowNum: rowNum
						};
					rowData = lang.delegate(rowData, map);
					template = strings.substitute(template, rowData, this._squelchTransform);
				}
				return template;
			},

			_makeTemplate: function (rowType) {
				var colTmpl = this[rowType + 'CellTemplate'] || '',
					rowTmpl = '';
				if (this.colDefs) {
					for (var p in this.colDefs) {
						var def = this.colDefs[p],
							cellTmpl = def[rowType + 'CellTemplate'] || colTmpl,
							info = lang.delegate(def, {
								colClassAttr: def.colClass == undef ? '' : ' class="' + def.colClass + '"',
								_value: '${' + def.name + '}'
							});
						rowTmpl += strings.substitute(cellTmpl, info, this._passthruTransform);
					}
				}
				var map = {
						rowClass: this.rowClass + '${rowAuxClasses}',
						cells: rowTmpl
					};
				return strings.substitute(this._rowTemplate, map);
			},

			// strings.substitute transforms
			_squelchTransform: function (val) { return val == undef ? '' : val; },
			_passthruTransform: function (val, name) { return val == undef ? '${' + name + '}' : val; },

			_makeHeaderTitles: function () {
				// returns an object that looks like a data object, but has column titles
				var titles = {};
				for (var p in this.colDefs) {
					titles[p] = this.colDefs[p].title;
				}
				return titles;
			},

			_makeFooterTitles: function () {
				return this._makeHeaderTitles();
			}

		});

	}
);
