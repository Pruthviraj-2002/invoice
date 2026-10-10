import { useState } from 'react';

export const DEFAULT_COMPANY_SETTINGS = {
  logo: '',
  stamp: '',
  name: 'SK TECHNOLOGIES',
  gstin: '36GOVPK7075A1ZH',
  address: '11-146/1/A, Patwari Enclave,\nOpp IDPL Colony,\nBalanagar,\nHyderabad, Telangana - 500037',
  mobile: '+91 7032948938, +91 7032948939',
  bankName: 'State Bank of India',
  accountName: 'SK TECHNOLOGIES',
  accountNumber: '41936366955',
  ifsc: 'SBIN0015853',
  branch: 'CHINTAL',
  upiId: 'sktechnologies@sbi',
  terms: '1. Goods once sold cannot be taken back or exchanged.\n2. We are not the manufacturers, company will stand for warranty as per their terms and conditions.\n3. Interest @24% p.a. will be charged for uncleared bills beyond 15 days.\n4. Subject to local jurisdiction.',
  state: 'Telangana',
  stateCode: '36'
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
};

export const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let nArray = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArray) return '';
    let str = '';
    str += (nArray[1] != 0) ? (a[Number(nArray[1])] || b[nArray[1][0]] + ' ' + a[nArray[1][1]]) + 'Crore ' : '';
    str += (nArray[2] != 0) ? (a[Number(nArray[2])] || b[nArray[2][0]] + ' ' + a[nArray[2][1]]) + 'Lakh ' : '';
    str += (nArray[3] != 0) ? (a[Number(nArray[3])] || b[nArray[3][0]] + ' ' + a[nArray[3][1]]) + 'Thousand ' : '';
    str += (nArray[4] != 0) ? (a[Number(nArray[4])] || b[nArray[4][0]] + ' ' + a[nArray[4][1]]) + 'Hundred ' : '';
    str += (nArray[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(nArray[5])] || b[nArray[5][0]] + ' ' + a[nArray[5][1]]) : '';
    return str;
  };

  const parts = Number(num || 0).toFixed(2).split('.');
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);
  
  let result = 'INR ' + inWords(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + inWords(paise).trim() + ' Paisa';
  return result + ' Only';
};

export const getNextInvoiceNumber = (dateStr, allInvoices, docType = 'INV') => {
  const date = new Date(dateStr || Date.now());
  const yy = String(date.getFullYear()).slice(-2);
  const monthLetter = String.fromCharCode(65 + date.getMonth());
  const prefix = `SKT${docType}${yy}${monthLetter}`;
  
  const monthInvoices = allInvoices.filter(i => i.invoiceNumber?.startsWith(prefix));
  const maxSeq = monthInvoices.reduce((max, inv) => {
    const seqStr = inv.invoiceNumber.replace(prefix, '');
    const seq = parseInt(seqStr, 10);
    return !isNaN(seq) && seq > max ? seq : max;
  }, 0); 

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
};

const roundMoney = (value) => {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Number(Math.round((safeValue + Number.EPSILON) * 100) / 100);
};

export const calculateTaxes = (items, isInterstate) => {
  let subtotal = 0, totalDiscount = 0, taxableAmount = 0;
  let cgst = 0, sgst = 0, igst = 0;
  const taxSummary = {};

  items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const disc = parseFloat(item.discount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    
    const baseAmount = roundMoney(qty * rate);
    const itemTaxable = roundMoney(Math.max(0, baseAmount - disc));
    const taxAmt = roundMoney(itemTaxable * (taxRate / 100));
    
    subtotal = roundMoney(subtotal + baseAmount);
    totalDiscount = roundMoney(totalDiscount + disc);
    taxableAmount = roundMoney(taxableAmount + itemTaxable);

    const key = item.hsnSac?.trim() || 'GENERAL';
    if (!taxSummary[key]) {
      taxSummary[key] = { taxable: 0, taxRate: taxRate, cgst: 0, sgst: 0, igst: 0 };
    }
    taxSummary[key].taxable = roundMoney(taxSummary[key].taxable + itemTaxable);

    if (isInterstate) {
      igst = roundMoney(igst + taxAmt);
      taxSummary[key].igst = roundMoney(taxSummary[key].igst + taxAmt);
    } else {
      const itemCgst = roundMoney(taxAmt / 2);
      const itemSgst = roundMoney(taxAmt / 2);
      cgst = roundMoney(cgst + itemCgst);
      sgst = roundMoney(sgst + itemSgst);
      taxSummary[key].cgst = roundMoney(taxSummary[key].cgst + itemCgst);
      taxSummary[key].sgst = roundMoney(taxSummary[key].sgst + itemSgst);
    }
  });

  const unroundedGrandTotal = roundMoney(taxableAmount + cgst + sgst + igst);
  const grandTotal = Math.round(unroundedGrandTotal);
  const roundOff = roundMoney(grandTotal - unroundedGrandTotal);

  return { 
    subtotal, totalDiscount, taxableAmount, 
    cgst, sgst, igst, 
    grandTotal,
    roundOff,
    taxSummary 
  };
};

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};