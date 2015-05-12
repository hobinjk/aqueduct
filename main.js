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
var d3 = require('d3');

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
  processSource(source);
};

/**
 * Attach a generic error handler
 * @param {Error} e
 */
xhr.onerror = function(e) {
  console.error(xhr.statusText);
};

xhr.send(null);

function processSource(source) {
  var astRoot = esprima.parse(source, {loc: true});
  var globalScope = new Scope(null, astRoot);
  globalScope.processNode(astRoot);

  var allConstraints = getAllConstraints(globalScope);

  window.globalScope = globalScope;
  window.allConstraints = allConstraints;

  visualizeConstraints(allConstraints);
}

function getAllConstraints(scope) {
  var constraints = [].concat(scope.constraints);
  scope.childScopes.forEach(function(child) {
    constraints = constraints.concat(getAllConstraints(child));
  });
  return constraints;
}

function visualizeConstraints(constraints) {
  // Taken from d3 example of force-directed graphs
  var nodes = getNodes(constraints);
  var links = getLinks(constraints);

  var width = window.innerWidth;
  var height = width * 0.75;

  var color = d3.scale.category20();

  var force = d3.layout.force()
    .charge(-120)
    .linkDistance(30)
    .size([width, height]);

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height);

  force.nodes(nodes)
       .links(links)
       .start();

  var link = svg.selectAll('.link')
      .data(links)
    .enter().append('line')
      .attr('class', 'link')
      .style('stroke-width', function(d) { return Math.sqrt(d.value); });

  var node = svg.selectAll('.node')
      .data(nodes)
    .enter().append('circle')
      .attr('class', 'node')
      .attr('r', 5)
      .style('fill', function(d) { return color(d.type); })
      .call(force.drag);

  node.append('title')
    .text(function(d) {
      if (d.type === 'FunctionDeclaration') {
        return 'function ' + d.id.name;
      } else if (d.type === 'Identifier') {
        return 'id ' + d.name;
      } else if (d.type === 'VariableData') {
        return 'var ' + d.name;
      } else if (d.type === 'FunctionData') {
        return d.toString();
      } else if (d.type === 'BinaryExpression' ||
                 d.type === 'UnaryExpression') {
        return d.operator;
      }
      return d.type;
    });

  force.on('tick', function() {
    link.attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

    node.attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
  });
}

function getNodes(constraints) {
  var nodesMap = {};
  constraints.forEach(function(constraint) {
    constraint.getNodes().forEach(function(node) {
      nodesMap[node.toSource()] = node;
    });
  });

  var nodes = [];
  Object.keys(nodesMap).forEach(function(key) {
    nodes.push(nodesMap[key]);
  });
  return nodes;
}

function getLinks(constraints) {
  var links = [];

  constraints.forEach(function(constraint) {
    var nodes = constraint.getNodes();
    var len = nodes.length;
    if (len == 2) {
      // Do not duplicate single links in the 2-node case.
      len = 1;
    }
    for (var i = 0; i < len; i++) {
      var source = nodes[i];
      var target = nodes[(i + 1) % nodes.length];
      links.push({
        source: source,
        target: target
      });
    }
  });

  return links;
}
