export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return '₹' + parseFloat(amount).toFixed(2);
};

export const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) return '0.00';
  return parseFloat(number).toFixed(2);
};

export const formatCompactCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  
  const num = parseFloat(amount);
  
  if (num >= 10000000) {
    return '₹' + (num / 10000000).toFixed(1) + 'Cr';
  }
  if (num >= 100000) {
    return '₹' + (num / 100000).toFixed(1) + 'L';
  }
  if (num >= 1000) {
    return '₹' + (num / 1000).toFixed(1) + 'K';
  }
  
  return '₹' + num.toFixed(0);
};