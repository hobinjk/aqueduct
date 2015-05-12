function Type(name, members) {
  this.name = name;
  this.members = members || [];
}

/** Built-in types */
Type.BooleanType = new Type('boolean',
                            Object.getOwnPropertyNames(Boolean.prototype));
Type.LabelType = new Type('label', []);
Type.NumberType = new Type('number',
                           Object.getOwnPropertyNames(Number.prototype));
Type.StringType = new Type('String', Object.getOwnPropertyNames(String.prototype));
Type.ObjectType = new Type('Object', Object.getOwnPropertyNames(Object.prototype));

module.exports = Type;