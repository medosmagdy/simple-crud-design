"use strict";
// Part 1: numbered answers match the assignment PDF.
const convertAndAdd = (value) => Number(value) + 7; // 1
const validateTruthy = (value) => (value ? value : "Invalid"); // 2
function printOddNumbers() {
  // 3
  for (let i = 1; i <= 10; i++) {
    if (i % 2 === 0) continue;
    console.log(i);
  }
}
const evenNumbers = (numbers) => numbers.filter((n) => n % 2 === 0); // 4
const mergeArrays = (first, second) => [...first, ...second]; // 5
function dayOfWeek(number) {
  // 6
  switch (number) {
    case 1:
      return "Sunday";
    case 2:
      return "Monday";
    case 3:
      return "Tuesday";
    case 4:
      return "Wednesday";
    case 5:
      return "Thursday";
    case 6:
      return "Friday";
    case 7:
      return "Saturday";
    default:
      return "Invalid day";
  }
}
const stringLengths = (strings) => strings.map((s) => s.length); // 7
const divisibleBy3And5 = (n) =>
  n % 3 === 0 && n % 5 === 0 ? "Divisible by both" : "Not divisible by both"; // 8
const square = (n) => n * n; // 9
function describePerson({ name, age }) {
  return `${name} is ${age} years old`;
} // 10
const sum = (...numbers) => numbers.reduce((total, n) => total + n, 0); // 11
const delayedSuccess = () =>
  new Promise((resolve) => setTimeout(() => resolve("Success"), 3000)); // 12
function largestNumber(numbers) {
  // 13
  if (!numbers.length) throw new RangeError("Array must not be empty");
  return numbers.reduce((max, n) => (n > max ? n : max));
}
const objectKeys = (object) => Object.keys(object); // 14
const splitWords = (text) => text.split(" "); // 15
module.exports = {
  convertAndAdd,
  validateTruthy,
  printOddNumbers,
  evenNumbers,
  mergeArrays,
  dayOfWeek,
  stringLengths,
  divisibleBy3And5,
  square,
  describePerson,
  sum,
  delayedSuccess,
  largestNumber,
  objectKeys,
  splitWords,
};
if (require.main === module) {
  console.log(convertAndAdd("123"), validateTruthy(0));
  printOddNumbers();
  console.log(evenNumbers([1, 2, 3, 4, 5]), mergeArrays([1, 2, 3], [4, 5, 6]));
  console.log(
    dayOfWeek(2),
    stringLengths(["a", "ab", "abc"]),
    divisibleBy3And5(15),
  );
  console.log(
    square(5),
    describePerson({ name: "John", age: 25 }),
    sum(1, 2, 3, 4, 5),
  );
  console.log(
    largestNumber([1, 3, 7, 2, 4]),
    objectKeys({ name: "John", age: 30 }),
    splitWords("The quick brown fox"),
  );
  delayedSuccess().then(console.log);
}
