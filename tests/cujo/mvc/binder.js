dojo.provide('tests.cujo.mvc.binder');

dojo.require('cujo.cujo', true);
dojo.require('cujo.mvc.binder');
dojo.require('doh.runner');

function basicDeriver(binding) {
	return true;
}

tests.cujo.mvc.testWidget = function() {};
tests.cujo.mvc.testWidget.prototype.attributeMap = {
	prop: {
        data: 'id',
        type: 'cujoBind'
	}
};

doh.register('cujo.mvc.binder-basic',
[
	function test_empty() {
		var map = cujo.mvc.binder().map();
		doh.assertEqual({}, map);
	},
	function test_data() {
		var map = cujo.mvc.binder().bind("prop").data().map();
		doh.assertEqual({ prop: { data: "", type: "cujoBind" } }, map);
	},
	function test_derivesWithName() {
		var map = cujo.mvc.binder().bind("prop").derives("derived", "deriver").map();
		doh.assertEqual({ prop: { derived: "derived", deriver: "deriver", type: "cujoBind"  } }, map);
	},
	function test_derivesWithFunction() {
		var map = cujo.mvc.binder().bind("prop").derives("derived", basicDeriver).map();
		doh.assertEqual({ prop: { derived: "derived", deriver: basicDeriver, type: "cujoBind"  } }, map);
	},
	function test_inherit() {
		var map = cujo.mvc.binder().inherit(tests.cujo.mvc.testWidget).map();
		doh.assertEqual({ prop: { data: "id", type: "cujoBind" } }, map);
	},
	function test_node() {
		var map = cujo.mvc.binder().bind("prop").node("node", "attr").map();
		doh.assertEqual({ prop: { node: "node", type: "attribute", attribute: "attr" } }, map);
	},
	function test_nodeInnerHTML() {
		var map = cujo.mvc.binder().bind("prop").node("node", "innerHTML").map();
		doh.assertEqual({ prop: { node: "node", type: "innerHTML" } }, map);
	},
	function test_nodeInnerText() {
		var map = cujo.mvc.binder().bind("prop").node("node", "innerText").map();
		doh.assertEqual({ prop: { node: "node", type: "innerText" } }, map);
	},
	function test_nodeClass() {
		var map = cujo.mvc.binder().bind("prop").node("node", "class").map();
		doh.assertEqual({ prop: { node: "node", type: "class" } }, map);
	},
	function test_widget() {
		var map = cujo.mvc.binder().bind("prop").widget("widgetNode", "property").map();
		doh.assertEqual({ prop: { node: "widgetNode", type: "widget", attribute: "property" } }, map);
	}
]);