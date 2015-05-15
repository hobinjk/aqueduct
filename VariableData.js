function VariableData(name, initExpr) {
  this.type = 'VariableData';
  this.name = name;
  this.initExpr = initExpr;
}

/** Export constructor */
module.exports = VariableData;
