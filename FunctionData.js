function FunctionData(name) {
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

/** Export constructor */
module.exports = FunctionData;
