/*
(c) copyright 2010, Brian Cavalier

This version of the digital clock as been donated for use in the cujojs project, and
is dual-licensed under the MIT and AFL 3.0 licenses.

LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the MIT
License at: http://www.opensource.org/licenses/mit-license.php. or AFL License at:
http://www.opensource.org/licenses/afl-3.0.php
*/
define(
[
	'dojo',
	'cujo',
	'dojo/Stateful',
	'cujo/mvc/View',
	'text!clock/PrefsView.html'
],
function(dojo, cujo, Stateful, View, template) {
// local scope

dojo.declare('clock.StorageModel', Stateful,
{
	store: null,
	
	constructor: function() {
		this.store = ('localStorage' in window) && window['localStorage'] !== null ? window.localStorage : this;
	},
	
	set: function(name, value) {
		this.store.setItem(name, value);
		this.inherited(arguments);
	},
	
	get: function(name) {
		return this.store.getItem(name);
	},
	
	setItem: function(key, value) {
		this[key] = value;
	},
	
	getItem: function(key) {
		return this[key];
	},
	
	removeItem: function(key) {
		delete this[key];
	}
});

dojo.declare('clock.PrefsView', View,
{
	templateString: template,
	
	themes: null,
	
	hours: null,
	
	seconds: null,

	prefsModel: null,
	
	constructor: function() {
		this.prefsModel = dojo.delegate(new clock.StorageModel, {theme: "green", hours: "hr12", "hide-seconds": false});
	},
	
	postCreate: function() {
		this._updateTheme(this.prefsModel.get("theme"));
		this._updateHours(this.prefsModel.get("hours"));
		this._updateHideSeconds(this.prefsModel.get("hide-seconds") == "true");
		dojo.query(".theme", this.themes).onclick(this, function(e) { this._updateTheme(e.target.name); return false; });
		dojo.query(".hour", this.hours).onclick(this, function(e) { this._updateHours(e.target.name); return false; });
		dojo.query(".seconds", this.hours).onclick(this, function(e) { this._updateHideSeconds(this.prefsModel.get("hide-seconds") == "false"); return false; });
	},
	
	_updatePref: function(prefKey, value, all) {
		this.prefsModel.set(prefKey, value);
		dojo.publish("clock/prefs/" + prefKey, [value, all]);
	},
	
	_updateTheme: function(theme) {
		this._updatePref("theme", theme, dojo.query(".theme", this.themes).attr("name"));
	},

	_updateHours: function(hours) {
		this._updatePref("hours", hours, dojo.query(".hour", this.hours).attr("name"));
	},
	
	_updateHideSeconds: function(hide) {
		this._updatePref("hide-seconds", hide);
	}

});

return clock.PrefsView;

});	


