/* jshint browser: true */
/* global esprima, d3, console */

/**
 * Aqueduct
 *
 * From parsed js, yields scopes and variables in the scope.
 * scopes and variables -> variable type constraints -> annotations
 * i.e.
 * function add2(a) {
 *  return a + 2;
 * }
 *
 * constraints: add2.a :: number
 * constraints: add2 :: number -> number
 *
 * k = 12
 * k(expr)
 * expr = function(x) { expr }
 *
 * Okay, v0: get list of names and their apparent type
 */
var Scope = require('./scope.js');
var esprima = require('esprima');

var xhr = new XMLHttpRequest();
xhr.open('GET', 'test.js', true);
xhr.overrideMimeType('text/plain');
/**
 * Attach a load listener that parses the text
 */
xhr.onload = function() {
  if (xhr.readyState !== 4) {
    return;
  }

  if (xhr.status !== 200) {
    console.error(xhr.statusText);
    return;
  }
  var source = xhr.responseText;
  var astRoot = esprima.parse(source);
  var globalScope = new Scope(null, astRoot);
  globalScope.processNode(astRoot);
  window.globalScope = globalScope;
};

/**
 * Attach a generic error handler
 * @param {Error} e
 */
xhr.onerror = function(e) {
  console.error(xhr.statusText);
};

xhr.send(null);
