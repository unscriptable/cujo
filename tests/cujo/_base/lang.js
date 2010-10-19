dojo.provide('tests.cujo._base.lang');

dojo.require('cujo.cujo', true);
dojo.require('doh.runner');

function test_forIn(src, expect) {
	var results = {},
		expected = expect || src;
	cujo.forIn(src, function(val, key, srcObj) {
		results[key] = val;
	});
	doh.assertEqual(expected, results);
}

function test_forInCount(src, expectCount) {
	var count = 0,
		expectedCount = expectCount || 0;
	cujo.forIn(src, function(val, key, srcObj) {
		count++;
	});
	doh.assertEqual(expectedCount, count);
}

doh.register("cujo._base.lang.forIn",
[
	function test_empty() {
		test_forIn({});
	},
	function test_noProperties() {
		test_forInCount(null);
		test_forInCount(undefined);
		test_forInCount(0);
		test_forInCount(1.5);
		test_forInCount("");
	},
	function test_simple() {
		test_forIn({ foo: "bar", baz: 123 });
	},
	function test_onlyOwnProperties() {
		var T = function() {};
		T.prototype.foo = "bar";
		var src = new T();
		src.baz = 123;		
		test_forIn(src, { baz: 123 });
	}
]);