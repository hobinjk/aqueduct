var AnyType = require('./type.js').AnyType;

function union(arrays) {
  var allValues = [];
  for (var i = 0; i < arrays.length; i++) {
    allValues = allValues.concat(arrays[i]);
  }
  return set(allValues);
}

function intersection(arrays) {
  if (arrays.length === 0) {
    return [];
  }

  var intersectionSet = set(arrays[0]);
  for (var i = 1; i < arrays.length; i++) {
    intersectionSet = and(intersectionSet, set(arrays[1]));
  }

  return intersectionSet;
}

function intersectionByType(typeArrays) {
  // Intersection of all arrays that do not include the Any type
  typeArrays = typeArrays.map(set);
  var constrainedTypeArrays = [];
  typeArrays.forEach(function(typeArray) {
    var containsAny = typeArray.findIndex(function(type) {
      // type instanceof AnyType
      return type.name === AnyType.name;
    }) >= 0;
    if (containsAny) {
      return;
    }
    constrainedTypeArrays.push(typeArray);
  });
  if (constrainedTypeArrays.length === 0) {
    return union(typeArrays);
  }
  return intersection(constrainedTypeArrays);
}

function set(array) {
  var present = {};
  var arrSet = [];
  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    if (present[value]) {
      continue;
    }
    present[value] = true;
    arrSet.push(value);
  }
  return arrSet;
}

function and(setA, setB) {
  var present = {};
  var andSet = [];
  for (var i = 0; i < setA.length; i++) {
    present[setA[i]] = true;
  }
  for (var i = 0; i < setB.length; i++) {
    if (!present[setB[i]]) {
      continue;
    }
    andSet.push(setB[i]);
  }
  return andSet;
}

/** Export all utility functions */
module.exports = {
  union: union,
  intersection: intersection,
  intersectionByType: intersectionByType,
  set: set
};
