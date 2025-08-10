// Input validation utilities
const validator = require('validator');

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  // At least 8 characters, contains letters and numbers
  const minLength = password.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  
  return minLength && hasLetters && hasNumbers;
};

const validateRequired = (value) => {
  return value !== undefined && value !== null && value.toString().trim() !== '';
};

const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0;
};

const validateQuantity = (quantity) => {
  const numQuantity = parseInt(quantity);
  return !isNaN(numQuantity) && numQuantity >= 0;
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return validator.escape(str.trim());
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRequired,
  validatePrice,
  validateQuantity,
  sanitizeString
};