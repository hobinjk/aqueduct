var Utils = require('./utils.js');

function TypeConstraint(nodes, type) {
  this.nodes = nodes;
  this.type = type;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
TypeConstraint.prototype.getSatisfiableTypes = function(assignments) {
  return [this.type];
};

function TypeEqualityConstraint(nodes) {
  this.nodes = nodes;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
TypeEqualityConstraint.prototype.getSatisfiableTypes = function(assignments) {
  var allTypes = this.nodes.map(function(node) {
    return assignments.getTypes(node);
  });
  return Utils.intersection(allTyes);
};

function FunctionReturnsConstraint(functionNodes, returnNode) {
  this.functionNodes = functionNodes;
  this.returnNode = returnNode;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
FunctionReturnsConstraint
    .prototype.getSatisfiableTypes = function(assignments) {
  return assignments.getTypes(returnNode);
};

function UnionConstraint(constraints) {
  this.constraints = constraints;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
UnionConstraint.prototype.getSatisfiableTypes = function(assignments) {
  var allSatisfiableTypes = this.constraints.map(function(constraint) {
    return constraint.getSatisfiableTypes(assignments);
  });
  return Utils.union(allSatisfiableTypes);
};

function IntersectionConstraint(constraints) {
  this.constraints = constraints;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
IntersectionConstraint.prototype.getSatisfiableTypes = function(assignments) {
  var allSatisfiableTypes = this.constraints.map(function(constraint) {
    return constraint.getSatisfiableTypes(assignments);
  });
  return Utils.intersection(allSatisfiableTypes);
};

/** Export all constraint variants */
module.exports = {
  TypeConstraint: TypeConstraint,
  TypeEqualityConstraint: TypeEqualityConstraint,
  FunctionReturnsConstraint: FunctionReturnsConstraint,
  UnionConstraint: UnionConstraint,
  IntersectionConstraint: IntersectionConstraint
};
