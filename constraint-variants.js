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
  return Utils.intersect(allTyes);
};

/** Export all constraint variants */
module.exports = {
  TypeConstraint: TypeConstraint,
  TypeEqualityConstraint: TypeEqualityConstraint
};
