export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return '₹' + parseFloat(amount).toFixed(2);
};

export const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) return '0.00';
  return parseFloat(number).toFixed(2);
};