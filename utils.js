function intersect(arrays) {
  if (arrays.length === 0) {
    return [];
  }

  var intersection = set(arrays[0]);
  for (var i = 1; i < arrays.length; i++) {
    intersection = and(intersection, set(arrays[1]));
  }
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
  var arrSet = [];
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
  and: and,
  intersect: intersect,
  set: set
};
