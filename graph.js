/* jshint browser: true */
/* global esprima, d3, console */

/**
 * Fluffy
 * A constraint-solving type checker for Javascript, hopefully with eventual
 * completion api support.
 *
 * From parsed js, yields scopes and variables in the scope.
 * scopes and variables -> variable type constraints -> validity
 * i.e in strict mode:
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

/**
 * @param {Object} elt
 * @return {boolean} truthiness of elt
 */
function truthy(elt) {
  return !!elt;
}

function children(node) {
  console.log(node.type);
  switch (node.type) {
  case 'Program':
  case 'BlockStatement':
    return node.body;
  case 'Function':
  case 'LabeledStatement':
  case 'WithStatement':
    return [node.body];
  case 'IfStatement':
    if (node.alternate) {
      return [node.test, node.consequent, node.alternate];
    }
    return [node.test, node.consequent];
  case 'SwitchStatement':
    return node.cases;
  case 'ReturnStatement':
    return [node.argument];
  case 'ThrowStatement':
    return [node.argument];
  case 'TryStatement':
    var tryChildren = [node.block, node.handler].concat(node.guardedHandlers);
    if (node.finalizer) {
      tryChildren = tryChildren.concat(node.finalizer);
    }
    return tryChildren;
  case 'WhileStatement':
    return [node.test, node.body];
  case 'DoWhileStatement':
    return [node.body, node.test];
  case 'ForStatement':
    return [node.init, node.test, node.update, node.body].filter(truthy);
  case 'ForInStatement':
    return [node.left, node.right, node.body];
  case 'ForOfStatement':
    return [node.left, node.right, node.body];
  case 'LetStatement':
    return [node.head.id, node.head.init, node.body].filter(truthy);
  case 'FunctionDeclaration':
    return [node.id, node.rest, node.body]
              .concat(node.params, node.defaults)
              .filter(truthy);
  case 'VariableDeclaration':
    return node.declarations;
  case 'VariableDeclarator':
    return [node.id, node.init].filter(truthy);
  case 'ArrayExpression':
    return node.elements.filter(truthy);
  case 'ObjectExpression':
    var props = [];
    node.properties.forEach(function(prop) {
      props.push(prop.key);
      props.push(prop.value);
    });
    return node;
  case 'FunctionExpression':
    return node.params.concat(node.defaults, node.rest, node.body)
                      .filter(truthy);
  case 'ArrowExpression':
    return node.params.concat(node.default, node.rest, node.body)
                      .filter(truthy);
  case 'SequenceExpression':
    return node.expressions;
  case 'UnaryExpression':
    return [node.operator, node.argument];
  case 'BinaryExpression':
  case 'AssignmentExpression':
  case 'LogicalExpression':
    return [node.operator, node.left, node.right];
  case 'UpdateExpression':
    return [node.operator, node.argument];
  case 'ConditionalExpression':
    return [node.test, node.alternate, node.consequent];
  case 'NewExpression':
  case 'CallExpresion':
    return [node.callee].concat(node.arguments);
  case 'MemberExpression':
    return [node.object, node.property];
  case 'YieldExpression':
    return [node.argument].filter(truthy);
  case 'ComprehensionExpression':
  case 'GeneratorExpression':
    return [node.body].concat(node.blocks, node.filter).filter(truthy);
  case 'LetExpression':
    var letParts = [];
    node.head.forEach(function(h) {
      letParts.push(h.id);
      letParts.push(h.init);
    });
    letParts.push(node.body);
    return letParts.filter(truthy);
  case 'ObjectPattern':
    var objectParts = [];
    node.properties.forEach(function(p) {
      objectParts.push(p.key);
      objectParts.push(p.value);
    });
    return objectParts;
  case 'ArrayPattern':
    return node.elements.filter(truthy);
  case 'SwitchCase':
    return [node.test].concat(node.consequent).filter(truthy);
  case 'CatchClause':
    return [node.param, node.guard, node.body];
  case 'ComprehensionBlock':
    return [node.left, node.right];
  default:
    return [];
  }
}

var width = 8000;
var height = 2000;

var tree = d3.layout.tree()
  .size([width, height]);

tree.children(children);

var diagonal = d3.svg.diagonal();

var svg = d3.select('body').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
      .attr('transform',
            'translate(20, 20)');

d3.text('fluffy.js', 'text/plain', function(source) {
  var results = esprima.parse(source);
  window.results = results;

  var nodes = tree.nodes(results);
  var links = tree.links(nodes);

  svg.selectAll('.link')
     .data(links)
     .enter().append('path')
       .attr('class', 'link')
       .attr('d', diagonal);

  var node = svg.selectAll('.node')
                .data(nodes)
                .enter().append('g')
                  .attr('class', 'node')
                  .attr('transform', function(d) {
                    return 'translate(' + d.x + ', ' + d.y + ')';
                  });
  node.append('circle')
      .attr('r', 4.5);

  node.append('text')
      .attr('dy', '.31em')
      .attr('text-anchor', function() {
        return 'start';
      })
      .attr('transform', function() {
        return 'translate(8)';
      })
      .text(function(d) {
        return d.name || d.type;
      });
});

