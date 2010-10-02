dojo.provide('cujo.tests.mvc.binder');

dojo.require('cujo.cujo', true);
dojo.require('cujo.mvc.binder');
dojo.require('doh.runner');

function basicDeriver(binding) {
	return true;
}

cujo.tests.mvc.testWidget = function() {};
cujo.tests.mvc.testWidget.prototype.attributeMap = {
	prop: {
        data: 'id',
        type: 'cujoBind'
	}
};

doh.register('cujo.mvc.tests.binder-basic',
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
		var map = cujo.mvc.binder().inherit(cujo.tests.mvc.testWidget).map();
		doh.assertEqual({ prop: { data: "id", type: "cujoBind" } }, map);
	}
]);