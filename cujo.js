/*
    cujo base
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.
*/
// dojo.provide('cujo');

if (typeof cujo == 'undefined') {
	var cujo = {};
}

//  cujoConfig params
//      noCssTransExt: don't look for extensions to css transitions in css files
//      ieHtml5Tags: the list of html5 tags to pre-define for IE

if (typeof cujoConfig == 'undefined') {
	var cujoConfig = {};
}

// TODO: find out why this fails if dojo is not in teh dependency list
	
define(['dojo'], function(dojo) {

return cujo;

});