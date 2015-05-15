var ConstraintVariants = require('./constraint-variants.js');
var TypeEqualityConstraint = ConstraintVariants.TypeEqualityConstraint;

function FunctionData(scope, name) {
  this.type = 'FunctionData';
  this.scope = scope;
  this.name = name;
  this.params = [];
}

/**
 * @param {number} index
 * @param {string} name
 */
FunctionData.prototype.addParam = function(index, name) {
  this.params[index] = name;
};

/**
 * Adds constraints to scope based on results of function call
 * @param {Array<Node>} args - Arguments to function call
 */
FunctionData.prototype.addCall = function(args) {
  if (args.length !== this.params.length) {
    console.error('Incorrect number of parameters to function call');
    if (args.length > this.params.length) {
      for (var i = this.params.length; i < args.length; i++) {
        this.params[i] = '_anon_' + i;
      }
    }
  }

  for (var i = 0; i < this.params.length; i++) {
    var paramVar = this.scope.getVariable(this.params[i]);
    this.scope.addConstraint(
        new TypeEqualityConstraint(this.scope, [args[i], paramVar]));
  }
};

/**
 * Custom toString for more efficiently representing parameters
 * @return {String}
 */
FunctionData.prototype.toString = function() {
  var str = this.name + '(';
  for (var i = 0; i < this.params.length; i++) {
    str += this.params[i];
    if (i < this.params.length - 1) {
      str += ', ';
    }
  }
  str += ')';
  return str;
};

/** Export constructor */
module.exports = FunctionData;
