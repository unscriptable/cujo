/*
(c) copyright 2010, Brian Cavalier

This version of the digital clock as been donated for use in the cujojs project, and
is dual-licensed under the MIT and AFL 3.0 licenses.

LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the MIT
License at: http://www.opensource.org/licenses/mit-license.php. or AFL License at:
http://www.opensource.org/licenses/afl-3.0.php
*/
// TODO: Should use css plugin instead

define(
[
	'dojo',
	'dojo/Stateful',
	'cujo/mvc/binder',
	'cujo/mvc/DataBoundView',
	'clock/PrefsView',
	'text!clock/ClockView.html',
	'css!clock/ClockView.css'
],
function(dojo, Stateful, binder, DataBoundView, PrefsView, template) {
// local scope

dojo.declare('clock.ClockModel', Stateful,
{
	constructor: function() {
		this._scheduleTick(new Date());
	},
	
	_scheduleTick: function(now) {
		setTimeout(dojo.hitch(this, "_tick"), 1000 - now.getMilliseconds());
	},

	_tick: function() {
		this.set(this._getTime());
	},

	_getTime: function() {
        var now = new Date();
		this._scheduleTick(now);
		return { hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds(), timezone: (now.toString().match(/\b([A-Z]{1,4}).$/) || [""]).pop() };
	}
});

dojo.declare('clock.ClockView', DataBoundView,
{
    templateString: template,

    widgetsInTemplate: true,

    dimTime: 10 * 1000,

	dimTimeout: null,
	
	h10: null, h1: null,
	m10: null, m1: null,
	s10: null, s1: null,

	separator: null,

	ampm: null,
	
	_digits: ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9"],

	attributeMap: binder().inherit(cujo.mvc.DataBoundView)
		.bind('hours').data().derives('displayHours', '_updateTime')
		.bind('minutes').data().derives('displayMinutes', '_updateTime')
		.bind('seconds').data().derives('displaySeconds', '_updateTime')
		.map(),
	
	postMixInProperties: function() {
		var self = this;
		this.subscribe("clock/prefs/theme", function(value, all) {
			var switchTheme = function() { self._setTheme(value, all); };
			cujo.requireCss("clock.themes."+value, {cssx: false}).then(switchTheme, switchTheme);
		});
		this.subscribe("clock/prefs/hours", function(value, all) {
			self.state({ state: value, value: true, set: all });
			this._updateTime();
		});
		this.subscribe("clock/prefs/hide-seconds", function(value) {
			self.state("hide-seconds", value);
		});
		var c = new clock.ClockModel();
		this.set("dataItem", c);
		this.inherited(arguments);
	},

    postCreate: function() {
		this._setupDim();
		dojo.query(dojo.body()).onclick(this, "brighten").onmousemove(this, "brighten");
    },

	_setTheme: function(theme, all) {
		// FIXME: Should not have to set state of body, but currently need to to ensure
		// footer changes color with theme.  Need to restructure HTML/CSS to fix.
		this.state({ state: theme, value: true, set: all, scope: dojo.body() });
	},

	_updateTime: function() {
		var h = this.get("hours")
			,s = this.get("seconds");
		if (this.state("hr12")) {
			this.state({ state: (h >= 12) ? "pm" : "am", value: true, set: ["am", "pm"], scope: this.ampm});
            h = (h == 0) ? 12 : (h > 12) ? h % 12 : h;
        }

		this._updateDigits("h", h);
		this._updateDigits("m", this.get("minutes"));
		this._updateDigits("s", s);
		this.state({ state: "on", value: (s % 2 == 0), scope: this.separator});
	},

	_updateDigits: function(scope, value) {
		if(value) {
			this.state({ state: this._digits[Math.floor(value / 10)], value: true, set: this._digits, scope: this[scope + "10"] });
			this.state({ state: this._digits[value % 10], value: true, set: this._digits, scope: this[scope + "1"] });
		}
		return value;
	},

    brighten: function() {
        this.state({ state: "dim", value: false, scope: dojo.body() });
        this._setupDim();
    },

    dim: function() {
        this.state({ state: "dim", value: true, scope: dojo.body() });
    },

    _setupDim: function() {
        clearTimeout(this.dimTimeout);
        this.dimTimeout = setTimeout(dojo.hitch(this, "dim"), this.dimTime);
    }

});


return clock.ClockView;

});
