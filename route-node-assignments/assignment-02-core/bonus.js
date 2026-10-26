// LeetCode 1539. Prepared solution; not submitted to LeetCode.
function findKthPositive(arr, k) {
  let left = 0,
    right = arr.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] - mid - 1 < k) left = mid + 1;
    else right = mid;
  }
  return left + k;
}
module.exports = findKthPositive;
