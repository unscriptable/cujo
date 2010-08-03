/*
    cujo.examples.gridView
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
dojo.provide('cujo.examples.gridView');

dojo.require('cujo.mvc.View');
dojo.require('cujo.examples.grid');

(function () { // local scope

dojo.declare('cujo.examples.gridView', [cujo.mvc.View], {

    strings: {
        deleteLabel: 'delete many',
        cancelLabel: 'cancel',
        deleteManyLabel: 'delete ${count}'
    },

    templatePath: dojo.moduleUrl('cujo.examples', 'gridView.html'),

    _isDeleteMode: false,

    setState: function (/* cujo.__StateDef */ stateDef) {
        if (stateDef.state == 'bulk-delete') {
            this._isDeleteMode = stateDef.value;
            this._setDeleteLabel();
        }
        return this.inherited(arguments);
    },

    postCreate: function () {
        this.inherited(arguments);
        dojo.xhr('GET', {url: 'etsyData.js', handleAs: 'json', load: dojo.hitch(this, '_loadData') })
    },

    _loadData: function (data) {
        this.grid.addRows(data.results);
    },

    _setDeleteLabel: function () {
        var count = dojo.query('input[name="row-delete"]', this.grid.domNode).filter(':checked').length,
            state = this._isDeleteMode ?
                (count > 0 ? dojo.string.substitute(this.strings.deleteManyLabel, {count: count}) : this.strings.cancelLabel) :
                this.strings.deleteLabel;
        dojo.attr(this.deleteLabel, 'innerHTML', state);
    },

    _onDeleteClick: function (e) {
        this.setState({state: 'bulk-delete', value: !this._isDeleteMode});
    },

    _onGridClick: function (e) {
        // manual event delegation --> TODO: use dojo.behavior
        var name = dojo.attr(e.target, 'name');
        if (name == 'row-delete' || name == 'all_delete') {
            this._setDeleteLabel();
        }
    }

});

})(); // end of local scope
