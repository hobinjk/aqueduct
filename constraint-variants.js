var Utils = require('./utils.js');

function TypeConstraint(scope, nodes, type) {
  this.nodes = scope.constraintReduceAll(nodes);
  this.type = type;
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
TypeConstraint.prototype.getSatisfiableTypes = function(assignments) {
  return [this.type];
};

/**
 * @return {Array<Node>}
 */
TypeConstraint.prototype.getNodes = function() {
  return this.nodes;
};

function TypeEqualityConstraint(scope, nodes) {
  this.nodes = scope.constraintReduceAll(nodes);
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
TypeEqualityConstraint.prototype.getSatisfiableTypes = function(assignments) {
  var allTypes = this.nodes.map(function(node) {
    return assignments.getTypes(node);
  });
  return Utils.intersectionByType(allTypes);
};

/**
 * @return {Array<Node>}
 */
TypeEqualityConstraint.prototype.getNodes = function() {
  return this.nodes;
};

function FunctionReturnsConstraint(scope, functionNodes, returnNode) {
  this.functionNodes = scope.constraintReduceAll(functionNodes);
  this.returnNode = scope.constraintReduce(returnNode);
}

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
FunctionReturnsConstraint.prototype.getSatisfiableTypes =
      function(assignments) {
  return assignments.getTypes(this.returnNode);
};

/**
 * @return {Array<Node>}
 */
FunctionReturnsConstraint.prototype.getNodes = function() {
  return this.functionNodes.concat([this.returnNode]);
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

/**
 * @return {Array<Node>}
 */
UnionConstraint.prototype.getNodes = function() {
  // All constraint members are applied to the same set of nodes
  // TODO: not actually enforced
  return this.constraints[0].getNodes();
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
  return Utils.intersectionByType(allSatisfiableTypes);
};

/**
 * @return {Array<Node>}
 */
IntersectionConstraint.prototype.getNodes = function() {
  // All constraint members are applied to the same set of nodes
  // TODO: not actually enforced
  return this.constraints[0].getNodes();
};

function HasPropertyConstraint(scope, nodes, propertyName) {
  this.nodes = scope.constraintReduceAll(nodes);
  this.nodes.forEach(function(node) {
    if (node.type) {
      console.warn('YOU WERE WRONG: ' + node.type);
    }
  });
  this.propertyName = propertyName;
}

/**
 * @return {Array<Node>}
 */
HasPropertyConstraint.prototype.getNodes = function() {
  return this.nodes;
};

/**
 * @param {AssignmentFinder} assignments
 * @return {Array<Type>}
 */
HasPropertyConstraint.prototype.getSatisfiableTypes = function(assignments) {
  var sharedTypes = Utils.intersectionByType(this.nodes.map(function(node) {
    return assignments.getTypes(node);
  }));
  return sharedTypes.filter(function(sharedType) {
    return sharedType.hasMember(this.propertyName);
  });
};

/** Export all constraint variants */
module.exports = {
  TypeConstraint: TypeConstraint,
  TypeEqualityConstraint: TypeEqualityConstraint,
  FunctionReturnsConstraint: FunctionReturnsConstraint,
  UnionConstraint: UnionConstraint,
  IntersectionConstraint: IntersectionConstraint
};
