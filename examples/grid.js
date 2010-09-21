/*
    cujo.examples.grid
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/

dojo.require('cujo._Widget');
dojo.require('cujo._Templated');
dojo.require('dojo.date.locale');

dojo.provide('cujo.examples.grid');

(function () { // local scope

// quick, poor-man's grid implementation
dojo.declare('cujo.examples.grid', [cujo._Widget, cujo._Templated], {

    // the data to display in the grid
    data: null,

    // the schema / meta-data
    schema: {
        id: {name: 'ID', key: 'listing_id'},
        state: {name: 'Status', key: 'state'},
        title: {name: 'Title', key: 'title'},
        url: {name: 'URL', key: 'url'},
        thumb: {name: 'Pic', key: 'image_url_25x25'},
        image: {name: 'Image', key: 'image_url_430xN'},
        created: {name: 'Created', key: 'creation_epoch', format: cujo.post('_formatCreated', {selector: 'date'})},
        user: {name: 'Seller', key: 'user_name'}
    },

    // translatable / customizable text strings
    strings: {
        linkText: 'view listing',
        linkTitle: 'link to original listing',
        thumbTitle: 'click to see larger image',
        thumbAlt: 'thumbnail image of listing item'
    },

    // the core template
    templateString: '\
        <div class="grid-listings">\
            <div class="cujo-scroll-pad-v grid-header-cont">\
                <table class="grid-header">\
                    <colgroup>\
                        <col class="col-thumb"/>\
                        <col class="col-title"/>\
                        <col class="col-id"/>\
                        <col class="col-state"/>\
                        <col class="col-created"/>\
                        <!--<col class="col-user"/>-->\
                        <col class="col-delete"/>\
                    </colgroup>\
                    <thead>\
                        <tr>\
                            <th class="cell-thumb"></th>\
                            <th class="cell-title">${schema.title.name}</th>\
                            <th class="cell-id">${schema.id.name}</th>\
                            <th class="cell-state">${schema.state.name}</th>\
                            <th class="cell-created">${schema.created.name}</th>\
                            <!--<th class="cell-user">${schema.user.name}</th>-->\
                            <th class="cell-delete"><input type="checkbox" name="all_delete" dojoAttachEvent="click:_onSelectAllClick"/></th>\
                        </tr>\
                    </thead>\
                </table>\
            </div>\
            <div class="grid-body-cont">\
                <table class="grid-body">\
                    <colgroup>\
                        <col class="col-thumb"/>\
                        <col class="col-title"/>\
                        <col class="col-id"/>\
                        <col class="col-state"/>\
                        <col class="col-created"/>\
                        <!--<col class="col-user"/>-->\
                        <col class="col-delete"/>\
                    </colgroup>\
                    <tbody dojoAttachPoint="gridBody">\
                        ${rows}\
                    </tbody>\
                </table>\
            </div>\
            <div class="cujo-scroll-pad-v grid-footer-cont">\
                <table class="grid-footer">\
                    <colgroup>\
                        <col class="col-span"/>\
                        <col class="col-delete"/>\
                    </colgroup>\
                    <tfoot>\
                        <tr>\
                            <th class="cell-span"></th>\
                            <th class="cell-delete"><input type="checkbox" name="all_delete" dojoAttachEvent="click:_onSelectAllClick"/></th>\
                        </tr>\
                    </tfoot>\
                </table>\
            </div>\
        </div>\
    ',

    // the template for each row
    rowTemplate: '\
                        <tr class="${record.class}">\
                            <td class="cell-thumb"><a href="${record.image}" target="_blank" title="${strings.thumbTitle}"><img src="${record.thumb}" alt="${strings.thumbAlt}"/></a></td>\
                            <td class="cell-title"><a href="${record.url}" target="_blank" title="${strings.linkTitle}:\n${record.url}">${record.title}</a></td>\
                            <td class="cell-id">${record.id}</td>\
                            <td class="cell-state">${record.state}</td>\
                            <td class="cell-created">${record.created}</td>\
                            <!--<td class="cell-user">${record.user}</td>-->\
                            <td class="cell-delete"><input type="checkbox" name="row-delete"/></td>\
                        </tr>\
    ',

    addRows: function (data) {
        var html = this._generateRows(data);
        dojo.place(dojo.trim(html.join('\n')), this.gridBody, 'last');
    },

    _generateRows: function (data) {
        var html = [];
        dojo.forEach(data, function (item, i) {
            var record = this._dataToRecord(item),
                templateData = dojo.delegate(this, {record: record});
            record['class'] = ['gridrow-odd', 'gridrow-even'][i % 2];
            html[html.length] = dojo.string.substitute(this.rowTemplate, templateData);
        }, this);
        return html;
    },

    _dataToRecord: function (data) {
        var record = {};
        for (var id in this.schema) {
            var def = this.schema[id],
                key = def.key;
            record[id] = data[key];
            if (def.format) {
                record[id] = def.format.call(this, record[id], def, data);
            }
        }
        return record;
    },

    _formatCreated: function (/* Number */ created, /* Object */ def, /* Object */ data, /* Object? */ options) {
        return dojo.date.locale.format(new Date(created * 1000), options);
    },

    _onSelectAllClick: function (e) {
        dojo.query('input[type="checkbox"]').attr('checked', e.target.checked);
    },

    postMixInProperties: function () {
        // if we have data at parse time, insert the rows now
        var rows = this.data ? this._generateRows(this.data) : '';
        this.templateString = this.templateString.replace(/\$\{rows\}/, rows);
        return this.inherited('postMixInProperties', arguments);
    }

});

})(); // end of local scope
