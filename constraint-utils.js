function isEither(constraintA, constraintB) {
  return new Constraint(
      constraintA.typePossibilities
                 .concat(constraintB.typePossibilities)
  );
}
