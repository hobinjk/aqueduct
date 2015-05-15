var IntersectionConstraint = require('./constraint-variants.js')
                                .IntersectionConstraint;
var Utils = require('./utils.js');
var Type = require('./type.js');

function TypeSolver(globalScope) {
  this.globalScope = globalScope;
  this.constraints = this.getAllConstraints(globalScope);
  this.nodes = this.getNodes(this.constraints);
  this.typeAssignments = {};
  this.fixedPointReached = false;
}

/**
 * @param {Scope} scope
 * @return {Array<Constraint>}
 */
TypeSolver.prototype.getAllConstraints = function(scope) {
  var constraints = [].concat(scope.constraints);
  var solver = this;
  scope.childScopes.forEach(function(child) {
    constraints = constraints.concat(solver.getAllConstraints(child));
  });
  return constraints;
};

/**
 * @param {Array<Constraint>} constraints
 * @return {Array<Node>}
 */
TypeSolver.prototype.getNodes = function(constraints) {
  var nodesMap = {};
  var solver = this;
  constraints.forEach(function(constraint) {
    constraint.getNodes().forEach(function(node) {
      nodesMap[solver.getKey(node)] = node;
    });
  });

  var nodes = [];
  Object.keys(nodesMap).forEach(function(key) {
    nodes.push(nodesMap[key]);
  });
  return nodes;
};

/**
 * @param {Node} node
 * @return {Array<Type>} Possible types
 */
TypeSolver.prototype.getTypes = function(node) {
  var nodeKey = this.getKey(node);

  var forcedTypes = this.typeAssignments[nodeKey];
  if (forcedTypes && forcedTypes.cached) {
    return forcedTypes.types;
  }

  // TODO verify validity of using stale data
  this.typeAssignments[nodeKey].cached = true;

  var relevantConstraints = this.constraints.filter(function(constraint) {
    return constraint.getNodes().findIndex(function(other) {
      return other === node;
    }) >= 0;
  });
  var pseudoConstraint = new IntersectionConstraint(relevantConstraints);
  var types = pseudoConstraint.getSatisfiableTypes(this);
  if (forcedTypes.length > 0) {
    types = Utils.intersectionByType([types, forcedTypes]);
  }

  var oldTypes = this.typeAssignments[nodeKey].types;
  if (oldTypes.length !== types.length) {
    this.fixedPointReached = false;
  } else {
    for (var i = 0; i < types.length; i++) {
      if (types[i] !== oldTypes[i]) {
        this.fixedPointReached = false;
        break;
      }
    }
  }

  this.typeAssignments[nodeKey] = {
    node: node,
    types: types,
    cached: true
  };
  return types;
};

/**
 * @param {Node} node
 * @return {String}
 */
TypeSolver.prototype.getKey = function(node) {
  var obj = {};
  Object.keys(node).forEach(function(key) {
    if (key == 'loc' || key == 'type' || key === 'value' || key === 'name') {
      obj[key] = node[key];
    }
    // if (key === 'px' || key === 'py' || key === 'x' || key === 'y' ||
    //     key === 'weight' || key === 'initExpr' || key === 'index') {
    //   return;
    // }
    // obj[key] = node[key];
  });
  return obj.toSource();
};

/**
 * Get all types for all nodes
 * @return {Array<Array<Type>>} All type groupings per node
 */
TypeSolver.prototype.getAllTypes = function() {
  var allTypes = [];
  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    var key = this.getKey(node);
    this.typeAssignments[key].cached = false;

    allTypes.push(this.getTypes(node));
  }
  return allTypes;
};

/**
 * Assign types until the types no longer decrease in two iterations (arbitrary
 * brute force)
 * @return {Map<String, Array<Type>>} assigned types
 */
TypeSolver.prototype.assignTypes = function() {
  var typeCount = 1;
  var lastTypeCount = 0;

  for (var i = 0; i < this.nodes.length; i++) {
    var node = this.nodes[i];
    var key = this.getKey(node);
    this.typeAssignments[key] = {
      types: [Type.AnyType],
      node: node,
      cached: true
    };
  }

  var bound = 0;

  while (!this.fixedPointReached && bound < 1000) {
    this.fixedPointReached = true;
    bound++;

    this.getAllTypes();
    this.getAllTypes();
    this.getAllTypes();
  }

  if (bound === 1000) {
    console.warn('Unable to converge on fixed-point solution');
  }

  var finalAssignments = [];
  var typeAssignments = this.typeAssignments;
  Object.keys(this.typeAssignments).forEach(function(key) {
    var finalAssignment = typeAssignments[key];
    var types = finalAssignment.types;
    if (types.length === 0) {
      console.warn('Unsatisfiability detected, check near ' +
          finalAssignment.toSource());
    }
    finalAssignments.push({
      node: finalAssignment.node,
      types: types
    });
  });

  return finalAssignments;
};

/** Export constructor */
module.exports = TypeSolver;
