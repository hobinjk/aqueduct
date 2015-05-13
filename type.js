function Type(name, members) {
  this.name = name;
  this.members = members || [];
}

/**
 * @param {String} memberName
 * @return {boolean}
 */
Type.prototype.hasMember = function(memberName) {
  return this.members.findIndex(function(name) {
    return name === memberName;
  }) >= 0;
};

/**
 * @param {Type} otherType - Potential subtype
 * @return {boolean}
 */
Type.prototype.satisfies = function(otherType) {
  return this === otherType;
};

function AnyType() {
  Type.call(this, '__Any', []);
}

AnyType.prototype = Object.create(Type.prototype);

/**
 * Any member is possible
 * @return {boolean}
 */
AnyType.prototype.hasMember = function() {
  return true;
};

/**
 * All types are subtypes of Any
 * @param {Type} otherType
 * @return {boolean}
 */
AnyType.prototype.satisfies = function(otherType) {
  return true;
};

/** Built-in types */
Type.BooleanType = new Type('boolean',
                            Object.getOwnPropertyNames(Boolean.prototype));
Type.LabelType = new Type('label', []);
Type.NumberType = new Type('number',
                           Object.getOwnPropertyNames(Number.prototype));
Type.StringType = new Type('String', Object.getOwnPropertyNames(String.prototype));
Type.ObjectType = new Type('Object', Object.getOwnPropertyNames(Object.prototype));
Type.AnyType = new AnyType();

module.exports = Type;
