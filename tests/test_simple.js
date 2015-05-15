function simple(a, b) {
  var x = a;
  var y = b;
  return x + y;
}

var f = simple('a', 'b');
var g = simple('b', 'a');
if (f === g) {
}
