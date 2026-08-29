export function numberToDecimalString(value) {
  if (!value) return "";
  return parseInt(value.replace(/[^\d]/g, "")).toLocaleString();
}
export function numberToSortCodeString(value) {
  if (!value) return "";
  return value
    .replace(/[^\d]/g, "")
    .replace(/(.{2})/g, "$1 ")
    .trim();
}
export function decimalStringToNumber(value) {
  if (!value) return 0;
  return parseInt(value.replace(/[ ,]+/g, ""));
}
export function numberToBankNumberString(value) {
  if (!value) return "";
  return value
    .replace(/[^\d]/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
export const parseNumber = (number) => {
  if (!number) return 0;
  return number && !isNaN(number) ? parseFloat(Math.abs(number)) : 0;
};

export function numberFormatter(value) {
  if (!value) return "";
  return value?.toLocaleString({
    minimumFractionDigits: 2,
  });
}
