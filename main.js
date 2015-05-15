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
var TypeSolver = require('./TypeSolver.js');
var Utils = require('./utils.js');
var IntersectionConstraint =
      require('./constraint-variants.js').IntersectionConstraint;
var esprima = require('esprima');
var d3 = require('d3');
var ace = require('brace');
require('brace/mode/javascript');
require('brace/theme/monokai');

var editor = ace.edit('javascript-editor');
editor.getSession().setMode('ace/mode/javascript');
editor.setTheme('ace/theme/monokai');

document.getElementById('assign-button')
        .addEventListener('click', function() {
  annotateSource();
});

function annotateSource() {
  var newSource = processSource(editor.getValue());
  // editor.setValue(newSource);
}

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
  editor.setValue(source);
  editor.clearSelection();

  annotateSource();
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

  var typeSolver = new TypeSolver(globalScope);
  window.types = typeSolver.assignTypes();

  window.globalScope = globalScope;
  window.typeSolver = typeSolver;

  visualizeTypeSolver(typeSolver, types);
}

function visualizeTypeSolver(typeSolver, types) {
  // Taken from d3 example of force-directed graphs
  var nodes = getNodes(typeSolver.constraints);
  var links = getLinks(typeSolver.constraints);

  var width = window.innerWidth - 400;
  var height = window.innerHeight;

  var color = d3.scale.category20();

  var colorTypes = [];
  for (var i = 0; i < nodes.length; i++) {
    colorTypes.push(nodes[i].type);
  }
  for (var i = 0; i < links.length; i++) {
    colorTypes.push(links[i].type);
  }
  colorTypes = Utils.set(colorTypes);

  function color(type) {
    colorTypes.push(type);
    return actualColor(type);
  }

  var force = d3.layout.force()
    .charge(-300)
    .linkDistance(100)
    .size([width / 2, height / 2]);

  var prevSvg = document.getElementById('d3-container');
  if (prevSvg) {
    prevSvg.parentNode.removeChild(prevSvg);
  }

  var svg = d3.select('body').append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('id', 'd3-container');

  force.nodes(nodes)
       .links(links)
       .start();

  var link = svg.selectAll('.link')
      .data(links)
    .enter().append('line')
      .attr('class', 'link')
      .style('stroke-width', '5px')
      .style('stroke', function(d) {
        return color(d.type);
      });

  var node = svg.selectAll('.node')
      .data(nodes)
    .enter().append('g')
      .attr('class', 'node');

  node.append('circle')
      .attr('r', function(d) {
        return 10 + (getNodeText(d) + ': ' + getNodeTypeText(d)).length * 3.5;
      })
      .style('fill', function(d) { return color(d.type); })
      .call(force.drag);

  function getNodeTypeText(node) {
    var finalTypes = types.find(function(candidateType) {
      return node === candidateType.node;
    });
    if (!finalTypes) {
      return '??';
    }
    return getTypesText(finalTypes.types);
  }

  function getTypesText(types) {
    if (types.length === 0) {
      return 'UNSAT';
    }
    var text = '';
    for (var i = 0; i < types.length; i++) {
      text += types[i].name;
      if (i < types.length - 1) {
        text += '|';
      }
    }
    return text;
  }

  node.append('text')
    .attr('dy', '.31em')
    .attr('text-anchor', 'middle')
    .text(function(d) {
      return getNodeText(d) + ': ' + getNodeTypeText(d);
    });

  node.append('title')
    .text(function(d) {
      return getNodeText(d) + ': ' + getNodeTypeText(d);
    });

  force.on('tick', function() {
    link.attr('x1', function(d) { return d.source.x * 2; })
        .attr('y1', function(d) { return d.source.y * 2; })
        .attr('x2', function(d) { return d.target.x * 2; })
        .attr('y2', function(d) { return d.target.y * 2; });

    node.attr('transform', function(d) {
      return 'translate(' + (d.x * 2) + ',' + (d.y * 2) + ')';
    });
  });

  makeLegend(colorTypes, color);
}

function getNodeText(d) {
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
}

function makeLegend(types, color) {
  var prevLegend = document.querySelector('.legend');
  if (prevLegend) {
    prevLegend.parentNode.removeChild(prevLegend);
  }
  var legend = d3.select('body')
      .append('div')
      .attr('class', 'legend');

  var legendEntry = legend.selectAll('.legend-entry')
    .data(types)
    .enter().append('div')
      .attr('class', 'legend-entry')
      .style('color', function(d) { return color(d); });

  legendEntry.append('span')
    .attr('class', 'legend-entry-box')
    .style('background-color', function(d) { return color(d); });

  legendEntry.append('p')
    .text(function(d) {
      return d;
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
        target: target,
        type: constraint.name
      });
    }
  });

  return links;
}
