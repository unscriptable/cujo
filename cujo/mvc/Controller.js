/*
    cujo.mvc.Controller
    (c) copyright 2010, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
define(['dojo', 'cujo/_Connectable'], function(dojo, Connectable) {
// local scope

dojo.declare('cujo.mvc.Controller', Connectable, {

    // TODO: subclass for root/dispatch controllers and generic controllers

    init: function () {},

    ready: function () {}

});

return cujo.mvc.Controller;

});
