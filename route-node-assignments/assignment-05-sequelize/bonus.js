// LeetCode 27. Prepared solution; not submitted.
function removeElement(nums, val) {
  let k = 0;
  for (const number of nums) if (number !== val) nums[k++] = number;
  return k;
}
module.exports = removeElement;
