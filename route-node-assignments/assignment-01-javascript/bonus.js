// LeetCode 2665: Counter II. Prepared solution; not submitted to LeetCode.
function createCounter(init) {
  let value = init;
  return {
    increment: () => ++value,
    decrement: () => --value,
    reset: () => (value = init),
  };
}
module.exports = createCounter;
