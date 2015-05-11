var Globals = require('./globals.js');

var BooleanType = Globals.BooleanType;
var LabelType = Globals.LabelType;
var NumberType = Globals.NumberType;
var ObjectType = Globals.ObjectType;

function Scope(parentScope) {
  if (parentScope) {
    this.parentScope = parentScope;
    this.parentScope.addChildScope(this);
  }
  this.variables = {};
  this.functions = {};
  this.childScopes = [];
}

/**
 * Register a scope that is a child (inside of) this scope.
 * @param {Scope} childScope
 */
Scope.prototype.addChildScope = function(childScope) {
  this.childScopes.push(childScope);
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
  this.addFunction(node.id.name);
  // Create a dependent scope
  var functionScope = new Scope(this, node);

  for (var i = 0; i < node.params.length; i++) {
    var param = node.params[i];
    this.addFunctionParam(node.id.name, i, param.name);
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
  this.addConstraint([node.test], isBooleanType);

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
  this.addConstraint([node.discriminant].concat(node.cases), typeEquality);
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
    if (returnedScope.node.type === 'Function') {
      returnedScope.parentScope.addConstraint(
          [returnedScope.node],
          functionReturns(node.argument));
      break;
    }
    returnedScope = returnedScope.parentScope;
  }
};

/**
 * Process a throw statement
 * @param {ThrowStatement} node
 */
Scope.prototype.processThrowStatement = function(node) {
  this.addConstraint([node.argument], isEither(isStringType, isType('Error')));
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
  this.addConstraint([node.test], isBooleanType);
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

  this.addConstraint([node.test], isBooleanType);
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
    forScope.addConstraint([node.test], isBooleanType);
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
  forInScope.addConstraint([node.left, accessor(node.right)], typeEquality);
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

  forOfScope.addConstraint([node.left, valuesOf(node.right)], typeEquality);
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
    this.addVariable(node.id.name, node.init);
  } else {
    this.error('Destructuring not handled');
  }
};

/** Export constructor */
module.exports = Scope;
