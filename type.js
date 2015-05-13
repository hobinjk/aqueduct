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

/** Built-in boolean type */
Type.BooleanType = new Type('boolean',
                            Object.getOwnPropertyNames(Boolean.prototype));

/** Built-in label type which really should never exist */
Type.LabelType = new Type('label', []);

/** Built-in number type */
Type.NumberType = new Type('number',
                           Object.getOwnPropertyNames(Number.prototype));

/** Built-in String type */
Type.StringType = new Type('String',
    Object.getOwnPropertyNames(String.prototype)
          .concat(Object.getOwnPropertyNames('')));

/** Built-in Array type */
Type.ArrayType = new Type('Array', Object.getOwnPropertyNames(Array.prototype)
    .concat(Object.getOwnPropertyNames([])));

/** Built-in Object type */
Type.ObjectType = new Type('Object',
    Object.getOwnPropertyNames(Object.prototype));

/** Additionally export type hole */
Type.AnyType = new AnyType();

/** Export Type */
module.exports = Type;
