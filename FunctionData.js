function FunctionData(name) {
  this.type = 'FunctionData';
  this.name = name;
  this.params = [];
  this.scope = null;
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
    return;
  }

  for (var i = 0; i < this.params.length; i++) {
    var paramVar = this.scope.getVariable(this.params[i]);
    this.scope.addConstraint(
        new TypeEqualityConstraint(this.scope, [args[i], paramVar]));
  }
};

/** Export constructor */
module.exports = FunctionData;
