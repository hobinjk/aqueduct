var Type = require('./type.js');
var VariableData = require('./VariableData.js');
var FunctionData = require('./FunctionData.js');
var ConstraintVariants = require('./constraint-variants.js');

var FunctionReturnsConstraint = ConstraintVariants.FunctionReturnsConstraint;
var TypeEqualityConstraint = ConstraintVariants.TypeEqualityConstraint;
var TypeConstraint = ConstraintVariants.TypeConstraint;
var UnionConstraint = ConstraintVariants.UnionConstraint;
var IntersectionConstraint = ConstraintVariants.IntersectionConstraint;

var BooleanType = Type.BooleanType;
var LabelType = Type.LabelType;
var NumberType = Type.NumberType;
var StringType = Type.StringType;
var ObjectType = Type.ObjectType;

function Scope(parentScope, node) {
  if (parentScope) {
    this.parentScope = parentScope;
    this.parentScope.addChildScope(this);
  }
  this.node = node;
  this.variables = {};
  this.functions = {};
  this.childScopes = [];
  this.constraints = [];
}

/**
 * Register a scope that is a child (inside of) this scope.
 * @param {Scope} childScope
 */
Scope.prototype.addChildScope = function(childScope) {
  this.childScopes.push(childScope);
};

/**
 * Register a variable in this scope
 * @param {string} variableName
 * @param {Expression?} initExpr
 * @return {VariableData}
 */
Scope.prototype.addVariable = function(variableName, initExpr) {
  if (this.variables[variableName]) {
    console.error('Duplicate variable declaration: ' + variableName);
    return;
  }
  var parentScope = this.parentScope;
  while (parentScope) {
    if (parentScope.variables[variableName]) {
      console.warn('Shadowed variable declaration: ' + variableName);
      break;
    }
    parentScope = parentScope.parentScope;
  }
  var varData = new VariableData(variableName, initExpr);
  this.variables[variableName] = varData;
  return varData;
};

/**
 * Register a function in this scope
 * @param {string} functionName
 * @return {VariableData}
 */
Scope.prototype.addFunction = function(functionName) {
  if (this.functions[functionName]) {
    console.error('Duplicate function declaration: ' + functionName);
    return;
  }
  var parentScope = this.parentScope;
  while (parentScope) {
    if (parentScope.functions[functionName]) {
      console.warn('Shadowed function declaration: ' + functionName);
      break;
    }
    parentScope = parentScope.parentScope;
  }
  var funData = new FunctionData(functionName);
  this.functions[functionName] = funData;
  return funData;
};

/**
 * Add a constraint
 * @param {Constraint} constraint
 */
Scope.prototype.addConstraint = function(constraint) {
  this.constraints.push(constraint);
};

/**
 * Process any node into the current scope
 * @param {Node} node
 */
Scope.prototype.processNode = function(node) {
  var processor = this['process' + node.type];
  if (processor) {
    processor.call(this, node);
  } else {
    console.error('Unable to process ' + node.type);
  }
};

/**
 * Process a program node into the scope
 * @param {Program} node
 */
Scope.prototype.processProgram = function(node) {
  var programScope = new Scope(this, node);
  node.body.forEach(function(b) {
    programScope.processNode(b);
  });
};

/**
 * Process a function node into the scope
 * TODO: Does not handle destructuring patterns as params
 * TODO: Does not handle defaults or rest
 * @param {Function} node
 */
Scope.prototype.processFunction = function(node) {
  // Add the function to this scope
  var fun = this.addFunction(node.id.name);
  // Create a dependent scope
  var functionScope = new Scope(this, node);
  fun.scope = functionScope;

  for (var i = 0; i < node.params.length; i++) {
    var param = node.params[i];
    fun.addParam(i, param.name);
    functionScope.addVariable(param.name);
  }

  if (node.rest) {
    this.warn('Rest parameter not implemented');
  }

  functionScope.processNode(node.body);
};

/**
 * Do nothing to an empty statement
 * @param {EmptyStatement} node
 */
Scope.prototype.processEmptyStatement = function(node) {
};

/**
 * Do nothing to an Identifier
 * @param {Identifier} node
 */
Scope.prototype.processIdentifier = function(node) {
};

/**
 * Process a block statement.
 * @param {BlockStatement} node
 */
Scope.prototype.processBlockStatement = function(node) {
  // Possibly want a special processStatement here because we know that the
  // body's elements implement Statement
  var newScope = new Scope(this, node);
  node.body.forEach(newScope.processNode.bind(newScope));
};

/**
 * Process an expression statement
 * @param {ExpressionStatement} node
 */
Scope.prototype.processExpressionStatement = function(node) {
  this.processNode(node.expression);
};

/**
 * Process an if statement
 * @param {IfStatement} node
 */
Scope.prototype.processIfStatement = function(node) {
  this.addConstraint(new TypeConstraint(this, [node.test], BooleanType));

  this.processNode(node.test); // test <: Expression

  var consScope = new Scope(this, node);
  consScope.processNode(node.consequent); // consequent <: Statement

  if (node.alternate) {
    var altScope = new Scope(this, node);
    altScope.processNode(node.alternate); // alternate <: Statement
  }
};

/**
 * Process a labeled statement
 * @param {LabeledStatement} node
 */
Scope.prototype.processLabeledStatement = function(node) {
  this.processNode(node.body);
};

/**
 * Process a break statement
 * @param {BreakStatement} node
 */
Scope.prototype.processBreakStatement = function(node) {
  if (node.label) {
    this.setType(node.label.name, LabelType);
  }
};

/**
 * Process a continue statement
 * @param {ContinueStatement} node
 */
Scope.prototype.processContinueStatement = function(node) {
  if (node.label) {
    this.setType(node.label.name, LabelType);
  }
};

/**
 * Process a with statement
 * @param {WithStatement} node
 */
Scope.prototype.processWithStatement = function(node) {
  throw new Error('AHG NO WITH STATEMENTS');
};

/**
 * Process a switch statement
 * @param {SwitchStatement} node
 */
Scope.prototype.processSwitchStatement = function(node) {
  var switchScope = new Scope(this, node);
  this.addConstraint(
      new TypeEqualityConstraint(this, [node.discriminant].concat(node.cases)));
  this.processNode(node.discriminant);
  node.cases.forEach(switchScope.processNode.bind(switchScope));
};

/**
 * Process a return statement
 * @param {ReturnStatement} node
 */
Scope.prototype.processReturnStatement = function(node) {
  var returnedScope = this;
  // Traverse upwards in scopes until a Function statement is found
  while (returnedScope) {
    if (returnedScope.node.type === 'FunctionDeclaration') {
      returnedScope.parentScope.addConstraint(
          new FunctionReturnsConstraint(
            this, [returnedScope.node], node.argument));
      break;
    }
    returnedScope = returnedScope.parentScope;
  }

  this.processNode(node.argument);
};

/**
 * Process a throw statement
 * @param {ThrowStatement} node
 */
Scope.prototype.processThrowStatement = function(node) {
  this.addConstraint(new UnionConstraint([
        new TypeConstraint(this, [node.argument], StringType),
        new TypeConstraint(this, [node.argument], new Type('Error'))]));
  this.processNode(node.argument);
};

/**
 * Process a try statement
 * @param {TryStatement} node
 */
Scope.prototype.processTryStatement = function(node) {
  var blockScope = new Scope(this, node);
  blockScope.processNode(node.block);

  if (node.handler) {
    var handlerScope = new Scope(this, node);
    handlerScope.processNode(node.handler);
  }
  node.guardedHandlers.forEach(function(handler) {
    var handlerScope = new Scope(this, node);
    handlerScope.processNode(handler);
  });
  if (node.finalizer) {
    var finalizerScope = new Scope(this, node);
    finalizerScope.processNode(node.finalizer);
  }
};

/**
 * Process a while statement
 * @param {WhileStatement} node
 */
Scope.prototype.processWhileStatement = function(node) {
  this.addConstraint(new TypeConstraint(this, [node.test], BooleanType));
  this.processNode(node.test);
  var whileScope = new Scope(this, node);
  whileScope.processNode(node.body);
};

/**
 * Process a do...while statement
 * @param {DoWhileStatement} node
 */
Scope.prototype.processDoWhileStatement = function(node) {
  var doWhileScope = new Scope(this, node);

  doWhileScope.processNode(node.body);

  this.addConstraint(new TypeConstraint(this, [node.test], BooleanType));
  this.processNode(node.test);
};

/**
 * Process a for statement
 * @param {ForStatement} node
 */
Scope.prototype.processForStatement = function(node) {
  var forScope = new Scope(this, node);

  if (node.init) {
    forScope.processNode(node.init);
  }
  if (node.test) {
    forScope.addConstraint(new TypeConstraint(this, [node.test], BooleanType));
    forScope.processNode(test);
  }
  if (node.update) {
    forScope.processNode(node.update);
  }
  forScope.processNode(node.body);
};

/**
 * Process a for...in statement
 * @param {ForInStatement} node
 */
Scope.prototype.processForInStatement = function(node) {
  var forInScope = new Scope(this, node);
  var accessor = keysOf;
  if (node.each) {
    accessor = valuesOf;
  }
  forInScope.addConstraint(
      new TypeEqualityConstraint(this, [node.left, accessor(node.right)]));
  forInScope.processNode(node.left);
  forInScope.processNode(node.right);
  forInScope.processNode(node.body);
};

/**
 * Process a for...of statement
 * @param {ForOfStatement} node
 */
Scope.prototype.processForOfStatement = function(node) {
  var forOfScope = new Scope(this, node);

  forOfScope.addConstraint(
      new TypeEqualityConstraint(this, [node.left, valuesOf(node.right)]));
  forOfScope.processNode(node.left);
  forOfScope.processNode(node.right);
  forOfScope.processNode(node.body);
};

/**
 * Process a let statement
 * @param {LetStatement} node
 */
Scope.prototype.processLetStatement = function(node) {
  node.head.forEach(this.processNode.bind(this));
  this.processNode(node.body);
};

/**
 * Process a function declaration, handled by processFunction
 * @param {FunctionDeclaration} node
 */
Scope.prototype.processFunctionDeclaration = function(node) {
  this.processFunction(node);
};

/**
 * Process a variable declaration, handled by processVariable
 * @param {VariableDeclaration} node
 */
Scope.prototype.processVariableDeclaration = function(node) {
  node.declarations.forEach(this.processVariableDeclarator.bind(this));
  if (node.kind !== 'var') {
    this.warn('Non-var declarations are not handled properly');
  }
};

/**
 * Process a single variable declarator
 * @param {VariableDeclarator} node
 */
Scope.prototype.processVariableDeclarator = function(node) {
  if (node.id.type === 'Identifier') {
    this.addVariable(node.id.name, node.it); // questionable
    this.addConstraint(new TypeEqualityConstraint(this, [node.id, node.init]));
  } else {
    this.error('Destructuring not handled');
  }
};

/**
 * Process a function expression
 * @param {FunctionExpression} node
 */
Scope.prototype.processFunctionExpression = function(node) {
  // FunctionExpression <: Function, Expression
  this.processFunction(node);
};

/**
 * Process a unary expression
 * @param {UnaryExpression} node
 */
Scope.prototype.processUnaryExpression = function(node) {
  switch (node.operator) {
    case '+':
    case '-':
    case '~':
      this.addConstraint(
          new TypeConstraint(this, [node, node.argument], NumberType));
      break;
    case '!':
      // Argument can actually be any type because JavaScript is strange
      this.addConstraint(new TypeConstraint(this, [node], BooleanType));
      break;
    case 'typeof':
      this.addConstraint(new TypeConstraint(this, [node], StringType));
      break;
    case 'void':
    case 'delete':
      console.warn('Scope does not handle ' + node.operator + ' operators');
      break;
  }
};

/**
 * Process a binary expression
 * @param {BinaryExpression} node
 */
Scope.prototype.processBinaryExpression = function(node) {
  switch (node.operator) {
  case '==':
  case '!=':
  case '===':
  case '!==':
    this.addConstraint(new TypeConstraint(this, [node], BooleanType));
    this.addConstraint(
        new TypeEqualityConstraint(this, [node.left, node.right]));
    break;
  case '<':
  case '<=':
  case '>':
  case '>=':
    this.addConstraint(new TypeConstraint(this, [node], BooleanType));
    this.addConstraint(
        new TypeConstraint(this, [node.left, node.right], NumberType));
    break;
  case '+':
    this.addConstraint(new IntersectionConstraint([
          new TypeEqualityConstraint(this, [node, node.left, node.right]),
          new UnionConstraint([
            new TypeConstraint(
              this, [node, node.left, node.right], StringType),
            new TypeConstraint(
              this, [node, node.left, node.right], NumberType)
          ])
    ]));
    break;
  case '<<':
  case '>>':
  case '>>>':
  case '-':
  case '*':
  case '/':
  case '%':
  case '|':
  case '^':
  case '&':
    this.addConstraint(
        new TypeConstraint(this, [node, node.left, node.right], NumberType));
    break;
  case 'in':
  case 'instanceof':
  case '..':
    console.warn('Binary operator ' + node.operator + ' not supported');
    break;
  }
  this.processNode(node.left);
  this.processNode(node.right);
};

/**
 * Process an assignment expression
 * @param {AssignmentExpression} node
 */
Scope.prototype.processAssignmentExpression = function(node) {
  switch (node.operator) {
    case '=':
      this.addConstraint(
          new TypeEqualityConstraint(this, [node.left, node.right]));
      break;
    case '+=':
    case '-=':
    case '*=':
    case '/=':
    case '%=':
    case '<<=':
    case '>>=':
    case '>>>=':
    case '|=':
    case '^=':
    case '&=':
      this.addConstraint(
          new TypeConstraint(this, [node.left, node.right], NumberType));
      break;
  }
  this.processNode(node.left);
  this.processNode(node.right);
};

/**
 * Lookup a variable in this and all parent scopes. Might not obey JavaScript's
 * var scoping
 * @param {String} name
 * @return {VariableData?}
 */
Scope.prototype.getVariable = function(name) {
  var scope = this;
  while (scope) {
    var variable = scope.variables[name];
    if (variable) {
      return variable;
    }
    scope = scope.parentScope;
  }
  return null;
};

/**
 * Lookup a function in this and all parent scopes. Might not obey JavaScript's
 * scoping
 * @param {Node} node
 * @return {FunctionData?}
 */
Scope.prototype.getFunction = function(node) {
  var name = node.name;

  if (node.type !== 'Identifier') {
    console.warn('IFE is strange, horrible, and probably unsupported');
    name = '__anonfunc_' + node.loc.start.line + '_' + node.loc.start.column;
  }

  var fun = this.functions[name];
  if (fun) {
    return fun;
  }
  if (this.parentScope) {
    return this.parentScope.getFunction(node);
  }
  return null;
};

/**
 * Reduce a series of nodes according to the current entries of the scope
 * @param {Array<Node>} nodes
 * @return {Array<Node or VariableData or FunctionData>}
 */
Scope.prototype.constraintReduceAll = function(nodes) {
  return nodes.map(this.constraintReduce.bind(this));
};

/**
 * Reduce a node according to the current entries of the scope
 * @param {Node} node
 * @return {Node or VariableData or FunctionData}
 */
Scope.prototype.constraintReduce = function(node) {
  if (node.type === 'Identifier') {
    return this.getVariable(node.name);
  } else if (node.type === 'CallExpression') {
    return this.getFunction(node.callee);
  } else if (node.type === 'FunctionDeclaration') {
    return this.getFunction(node.id);
  }
  return node;
};

/**
 * Process an update expression
 * @param {UpdateExpression} node
 */
Scope.prototype.processUpdateExpression = function(node) {
  this.addConstraint(new TypeConstraint(this, [node], NumberType));
  this.addConstraint(new TypeConstraint(this, [node.argument], NumberType));
};

/**
 * Process a logical expression
 * @param {LogicalExpression} node
 */
Scope.prototype.processLogicalExpression = function(node) {
  this.addConstraint(new TypeConstraint(this, [node], BooleanType));
  this.addConstraint(
      new TypeConstraint(this, [node.left, node.right], BooleanType));

  this.processNode(node.left);
  this.processNode(node.right);
};

/**
 * Process a conditional expression
 * @param {ConditionalExpression} node
 */
Scope.prototype.processConditionalExpression = function(node) {
  this.addConstraint(new TypeConstraint(this, [node.test], BooleanType));
  this.processNode(node.test);
  this.addConstraint(
      new TypeEqualityConstraint(
        this, [node, node.alternate, node.consequent]));
  this.processNode(node.alternate);
  this.processNode(node.consequent);
};

/**
 * Process a new expression
 * @param {NewExpression} node
 */
Scope.prototype.processNewExpression = function(node) {
  console.warn('Objects are weird and scary');
};

/**
 * Process a call expression
 * @param {CallExpression} node
 */
Scope.prototype.processCallExpression = function(node) {
  var functionData = node.callee;
  functionData.addCall(node.arguments);
  node.arguments.forEach(function() {
    this.processNode(node);
  });
};

/**
 * Process a call expression
 * @param {MemberExpression} node
 */
Scope.prototype.processMemberExpression = function(node) {
  if (node.property.type !== 'Identifier') {
    // TODO handle special cases for array access
    console.error('Expressions in member expressions unsupported');
    return;
  }
  this.addConstraint(
      new HasPropertyConstraint(this, [node.object], node.property.name));
};

/** Export constructor */
module.exports = Scope;
