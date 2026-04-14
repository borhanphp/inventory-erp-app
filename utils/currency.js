import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_CURRENCY = 'USD';

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  PKR: '₨',
  NPR: '₨',
  LKR: 'Rs',
  AED: 'AED ',
  SAR: 'SAR ',
  QAR: 'QAR ',
  KWD: 'KWD ',
  OMR: 'OMR ',
  BHD: 'BHD ',
  JPY: '¥',
  CNY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  MYR: 'RM ',
  THB: '฿',
};

export const getCurrencySymbol = (currencyCode = DEFAULT_CURRENCY) => {
  const code = String(currencyCode || DEFAULT_CURRENCY).toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
};

export const formatCurrency = (amount, currencyCode = DEFAULT_CURRENCY, options = {}) => {
  const value = Number(amount) || 0;
  const {
    decimals = 2,
    absolute = false,
    showPlus = false,
  } = options;

  const prefix = value < 0 && !absolute ? '-' : showPlus && value > 0 ? '+' : '';
  return `${prefix}${getCurrencySymbol(currencyCode)}${Math.abs(value).toFixed(decimals)}`;
};

export const useCurrency = (fallbackCurrencyCode) => {
  const { companyCurrency, refreshCompanyCurrency } = useAuth();
  const currencyCode = (fallbackCurrencyCode || companyCurrency || DEFAULT_CURRENCY).toUpperCase();

  useEffect(() => {
    if (!fallbackCurrencyCode && !companyCurrency && refreshCompanyCurrency) {
      refreshCompanyCurrency();
    }
  }, [companyCurrency, fallbackCurrencyCode, refreshCompanyCurrency]);

  return {
    currencyCode,
    currencySymbol: getCurrencySymbol(currencyCode),
    formatAmount: (amount, options) => formatCurrency(amount, currencyCode, options),
  };
};
