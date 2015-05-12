/**
 * A constraint placed on one or more expressions
 * i.e. a + b results in
 * Constraint([a, b], [["String", null], ["number", "number"]])
 * @constructor
 * @param {Array<Node>} nodes
 * @param {Array<Array<Type>>} typePossibilities
 */
function Constraint(nodes, typePossibilities) {
  this.nodes = nodes;
  this.typePossibilities = typePossibilities;

  this.constrainExpressions();
}

/**
 * Apply constraint to referenced expressions
 */
Constraint.prototype.constrainExpressions = function() {
  this.expressions.forEach(function(expression, expressionIndex) {
    var types = [];
    this.typePossibilities.forEach(function(typePossibility) {
      types.push(typePossibility[expressionIndex]);
    });
    expression.constrainTypes(types);
  }.bind(this));
};

/** Export only class */
module.exports = Constraint;
