function VariableData(name, initExpr) {
  this.name = name;
  this.initExpr = initExpr;
  this.scope = null;
}

/** Export constructor */
module.exports = VariableData;
