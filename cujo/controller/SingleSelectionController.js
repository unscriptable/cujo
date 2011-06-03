/*
    cujo.controller.
    (c) copyright 2011, unscriptable.com
    author: briancavalier

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

*/

define(
[
	'dojo'
],
function(dojo) {

	var events = dojo;

	function SingleSelectionController() {
		this._selectables = [];
	}

	SingleSelectionController.prototype = {
		onChange: function(e, viewOrWidget) {},

		addSelectable: function(selectable) {
			var selectables, connection, remove;
			
			selectables = this._selectables;

			if(this._selectables.length === 0) {
				this._currentSelectable = selectable;
			} else {
				var val = this._currentSelectable.get('value');
				if(val !== null) {
					selectable.set('value', null);				
				}
			}

			connection = this._connectSelectable(selectable);
			remove = (function(index) {
				return function() {				
					selectables.splice(index, 1);
					events.disconnect(connection);
				};
			})(selectables.length);

			// Hold onto the remove function so we can use it in destroy(),
			// and hold onto the selectable itself, so we can use it below
			// in _setCurrent() to "deselect" items from all the non current
			// views.
			selectables.push({
				remove: remove,
				view: selectable
			});

			return remove;
		},

		addSelectables: function(array) {
			for (var i = 0; i < array.length; i++) {
				this.addSelectable(array[i]);
			}
		},

		_connectSelectable: function(selectable) {
			return events.connect(selectable, 'onChange', this, '_handleSelectableEvent');
		},

		_handleSelectableEvent: function(e, viewOrWidget) {
			if(this._setCurrent(viewOrWidget)) {
				// If the current view did change, fire onChange.
				this.onChange(e, viewOrWidget);
			}
		},

		_setCurrent: function(view) {
			// Only need to do this if view is actually different.
			if(view === this._currentSelectable) return false;

			var prev, selectables, i, s;
						
			selectables = this._selectables;

			for (i = selectables.length - 1; i >= 0; i--) {
				s = selectables[i].view;
				if(s !== view) {
					s.set('value', null);
				}
			}

			prev = this._currentSelectable;
			this._currentSelectable = view;

			return prev;	
		},

		getCurrentSelectable: function() {
			return this._currentSelectable;
		},

		destroy: function() {
			if(!this._selectables) return;

			for (var i = this._selectables.length - 1; i >= 0; i--) {
				console.log('removing', this._selectables[i]);
				this._selectables[i].remove();
			}

			delete this._selectables;
		}

	};

	return SingleSelectionController;
});
