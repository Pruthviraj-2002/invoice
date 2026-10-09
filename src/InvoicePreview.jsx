import React from 'react';
import defaultLogo from './assets/logo.png';
import defaultStamp from './assets/stamp.png';
import { formatCurrency, numberToWords } from './utils';

const InvoicePreview = React.forwardRef(({ data, company }, ref) => {
  const targetState = data.shippingSameAsBilling ? data.customer.billingState : data.customer.shippingState;
  const isInterstate = (targetState || '').trim().toLowerCase() !== (company.state || '').trim().toLowerCase();
  
  const isChallan = data.docType === 'DC';
  const isPO = data.docType === 'PO';
  const isQuote = data.docType === 'EST';
  const isInvoice = data.docType === 'INV' || data.docType === 'UPLOAD' || !data.docType;

  const totalQty = data.items.reduce((acc, i) => acc + (parseFloat(i.quantity) || 0), 0);

  // Dynamically calculate effective tax percentage based on totals
  const getRate = (taxAmt) => data.totals.taxableAmount > 0 
    ? Number(((taxAmt / data.totals.taxableAmount) * 100).toFixed(2)) 
    : 0;
    
  const igstRate = getRate(data.totals.igst);
  const cgstRate = getRate(data.totals.cgst);
  const sgstRate = getRate(data.totals.sgst);

  // ----------------------------------------------------------------------
  // 1. QUOTATION TEMPLATE
  // ----------------------------------------------------------------------
  if (isQuote) {
    return (
      <div ref={ref} id="invoice-preview" className="bg-white text-black p-[10mm] w-[210mm] h-[297mm] text-[10px] relative flex flex-col box-border overflow-hidden print:shadow-none print:m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
        
        <div className="border border-black flex flex-col flex-1 bg-white relative z-10">
          
          <div className="grid grid-cols-2 border-b border-black shrink-0">
            <div className="p-3 border-r border-black flex flex-col justify-between">
              <div className="flex items-start mb-4">
                <img src={company.logo || defaultLogo} alt="Company Logo" className="w-14 h-14 mr-3 shrink-0 object-contain" />
                <div className="flex flex-col">
                  <h2 className="text-[14px] font-bold text-[#1c305c] uppercase tracking-wide">{company.name}</h2>
                  <p className="whitespace-pre-line mt-1 text-[10px] text-gray-800 leading-snug">{company.address}</p>
                  <p className="mt-1 font-bold text-[10px] text-gray-800 uppercase">GSTIN: {company.gstin}</p>
                  <p className="text-[10px] text-gray-800 mt-0.5">
                    <strong>Ph:</strong> {company.mobile} <br/> <strong>Email:</strong> sales@sktechnologies.co.in
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-2">
                <p className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-1">Customer Details:</p>
                <p className="font-bold text-[11px] text-black">{data.customer.name || 'Default Customer'}</p>
                {data.customer.gstin && <p className="mt-0.5 text-[10px] font-bold text-gray-800">GSTIN: {data.customer.gstin}</p>}
                <p className="whitespace-pre-line mt-1 text-[10px] text-gray-800 leading-snug">
                  {data.customer.billingStreet ? `${data.customer.billingStreet}, ` : ''}
                  {data.customer.billingCity ? `${data.customer.billingCity}, ` : ''}
                  {data.customer.billingState} {data.customer.billingPin ? `- ${data.customer.billingPin}` : ''}
                </p>
                <p className="mt-1 text-[10px] text-gray-800">
                  <strong>Ph:</strong> {data.customer.phone || '-'} {data.customer.email ? ` | Email: ${data.customer.email}` : ''}
                </p>
              </div>
            </div>

            <div className="p-0 flex flex-col bg-gray-50/50">
              <div className="p-4 text-center border-b border-black bg-gray-100 flex flex-col justify-center flex-1">
                <h1 className="text-[16px] font-bold tracking-widest text-[#1c305c]">QUOTATION </h1>
              </div>
              
              <div className="grid grid-cols-2 border-b border-black flex-1">
                <div className="p-3 border-r border-black flex flex-col justify-center">
                  <p className="text-gray-500 text-[9px] uppercase font-bold">Quotation #:</p>
                  <p className="font-bold text-[11px] mt-0.5 text-black">{data.invoiceNumber || 'EST-1'}</p>
                </div>
                <div className="p-3 flex flex-col justify-center">
                  <p className="text-gray-500 text-[9px] uppercase font-bold">Date:</p>
                  <p className="font-bold text-[11px] mt-0.5 text-black">{data.date}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 border-b border-black flex-1">
                <div className="p-3 border-r border-black flex flex-col justify-center h-full">
                  <p className="text-gray-500 text-[9px] uppercase font-bold">Place of Supply:</p>
                  <p className="font-bold text-[11px] mt-0.5 text-black">{(targetState || company.state).toUpperCase()}</p>
                </div>
                <div className="p-3 flex flex-col justify-center h-full">
                  <p className="text-gray-500 text-[9px] uppercase font-bold">Valid Until:</p>
                  <p className="font-bold text-[11px] mt-0.5 text-black">{data.dueDate || data.date}</p>
                </div>
              </div>
              
              <div className="p-3 flex-1 flex flex-col justify-center">
                <p className="text-gray-500 text-[9px] uppercase font-bold">Dispatch From:</p>
                <p className="font-bold text-[10px] mt-0.5 leading-snug whitespace-pre-line text-gray-800">{company.address}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col w-full bg-white relative z-10">
            {/* ALIGNMENT FIX: Removed the old div spacer. The table stretches 100% and uses exact colgroups */}
            <div className="flex-1 border-b border-black flex flex-col overflow-hidden">
              <table className="w-full h-full border-collapse text-center" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '51%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-gray-100 text-gray-800 uppercase font-bold text-[9px] shrink-0">
                  <tr className="border-b border-black">
                    <th className="border-r border-black p-2">#</th>
                    <th className="border-r border-black p-2 text-left">Item Description</th>
                    <th className="border-r border-black p-2">HSN/SAC</th>
                    <th className="border-r border-black p-2">Rate / Item</th>
                    <th className="border-r border-black p-2">Qty</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {data.items.map((item, idx) => {
                    const baseAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount) || 0);

                    return (
                      <tr key={idx} className="border-b border-gray-200 h-7">
                        <td className="border-r border-black p-2 overflow-hidden">{idx + 1}</td>
                        <td className="border-r border-black p-2 text-left font-bold text-[10px] wrap-break-words">{item.description}</td>
                        <td className="border-r border-black p-2">{item.hsnSac || '00000000'}</td>
                        <td className="border-r border-black p-2">{parseFloat(item.rate || 0).toFixed(2)}</td>
                        <td className="border-r border-black p-2 font-bold">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-right font-bold pr-2">{baseAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* PERFECT ALIGNMENT: 6-COLUMN SPACER ROW */}
                  <tr className="h-full">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Box With Dynamic GST % Rows */}
            <table className="w-full border-collapse text-center shrink-0 border-t border-black" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '88%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <tbody>
                <tr className="font-bold text-[10px] border-b border-gray-200">
                  <td className="border-r border-black p-2.5 text-right text-gray-700">Sub Total</td>
                  <td className="p-2.5 text-right pr-2">{formatCurrency(data.totals.taxableAmount)}</td>
                </tr>
                
                {!isInterstate ? (
                  <>
                    <tr className="font-bold text-[10px] border-b border-gray-200">
                      <td className="border-r border-black p-2.5 text-right text-gray-700">CGST ({cgstRate}%)</td>
                      <td className="p-2.5 text-right pr-2">{formatCurrency(data.totals.cgst)}</td>
                    </tr>
                    <tr className="font-bold text-[10px] border-b border-black">
                      <td className="border-r border-black p-2.5 text-right text-gray-700">SGST ({sgstRate}%)</td>
                      <td className="p-2.5 text-right pr-2">{formatCurrency(data.totals.sgst)}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="font-bold text-[10px] border-b border-black">
                    <td className="border-r border-black p-2.5 text-right text-gray-700">IGST ({igstRate}%)</td>
                    <td className="p-2.5 text-right pr-2">{formatCurrency(data.totals.igst)}</td>
                  </tr>
                )}

                {Number(data.totals.roundOff || 0) !== 0 && (
                  <tr className="font-bold text-[10px] border-b border-gray-200">
                    <td className="border-r border-black p-2.5 text-right text-gray-700">Round Off</td>
                    <td className="p-2.5 text-right pr-2">{formatCurrency(data.totals.roundOff)}</td>
                  </tr>
                )}

                <tr className="font-bold text-[12px] bg-gray-50">
                  <td className="border-r border-black p-3 text-right">Grand Total</td>
                  <td className="p-3 text-right pr-2">{formatCurrency(data.totals.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-black border-b p-2 px-3 text-[10px] bg-white flex justify-between items-start shrink-0 relative z-10">
            <div className="flex space-x-6 whitespace-nowrap">
               <p className="text-gray-700">
                 <strong>Total Items:</strong> <span className="text-black font-bold ml-1">{data.items.length}</span>
               </p>
               <p className="text-gray-700">
                 <strong>Total Quantity:</strong> <span className="text-black font-bold ml-1">{totalQty}</span>
               </p>
            </div>
            <p className="text-right text-gray-700 max-w-[65%] leading-snug">
               <strong>Amount (in words):</strong> <span className="text-black font-bold ml-1">{numberToWords(data.totals.grandTotal)}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 min-h-[120px] bg-white shrink-0 relative z-10">
            <div className="p-3 border-r border-black">
              <p className="font-bold text-gray-500 uppercase text-[9px] tracking-wider mb-2">Bank Details:</p>
              <table className="w-full text-[10px]">
                <tbody>
                  <tr><td className="w-24 pb-1 text-gray-600">Bank:</td><td className="font-bold pb-1">{company.bankName}</td></tr>
                  <tr><td className="pb-1 text-gray-600">Account Holder:</td><td className="font-bold pb-1">{company.accountName || company.name}</td></tr>
                  <tr><td className="pb-1 text-gray-600">Account #:</td><td className="font-bold pb-1 font-mono">{company.accountNumber}</td></tr>
                  <tr><td className="pb-1 text-gray-600">IFSC Code:</td><td className="font-bold pb-1 font-mono uppercase">{company.ifsc}</td></tr>
                  <tr><td className="text-gray-600">Branch:</td><td className="font-bold uppercase">{company.branch}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 flex flex-col justify-between items-end relative text-right">
              <p className="text-[10px] font-bold text-gray-600 relative z-10">For <span className="text-black">{company.name}</span></p>

              <div className="absolute bottom-6 right-6 flex items-center justify-center pointer-events-none z-50">
                <img src={company.stamp || defaultStamp} alt="Company Stamp" className="w-24 h-24 object-contain opacity-95" />
              </div>

              <div className="mt-auto w-48 border-t border-gray-400 pt-1 text-center relative z-10 bg-transparent">
                <p className="text-[10px] font-bold text-gray-700">Authorized Signatory</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 text-[9px] border-t border-black bg-white shrink-0 relative z-10">
            <div className="p-3 border-r border-black">
              <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Notes / Instructions:</p>
              <p className="mt-0.5 text-gray-800">{data.notes || 'Thank you for the Business'}</p>
            </div>
            <div className="p-3">
              <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions:</p>
              <ul className="list-disc pl-3 mt-0.5 leading-snug text-gray-800 space-y-0.5">
                {data.terms.split('\n').map((term, i) => (
                  term.trim() ? <li key={i}>{term.trim()}</li> : null
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-[8px] font-bold mt-2 px-1 text-gray-500 uppercase tracking-widest shrink-0">
          <span>Page 1 / 1</span>
          <span>This is a digitally generated document.</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 2. STANDARD TEMPLATE (INVOICE / PO / CHALLAN)
  // ----------------------------------------------------------------------
  const docLabels = {
    'INV': { title: 'TAX INVOICE', noLabel: 'Invoice #:', dateLabel: 'Invoice Date:', targetLabel: 'Customer Details:' },
    'PO':  { title: 'PURCHASE ORDER', noLabel: 'PO #:', dateLabel: 'PO Date:', targetLabel: 'Vendor Details:' },
    'DC':  { title: 'DELIVERY CHALLAN', noLabel: 'Challan #:', dateLabel: 'Challan Date:', targetLabel: 'Consignee Details:' },
    'UPLOAD': { title: 'EXTERNAL DOCUMENT', noLabel: 'Doc #:', dateLabel: 'Doc Date:', targetLabel: 'Client Details:' }
  };
  const currentDoc = docLabels[data.docType] || docLabels['INV'];

  return (
    <div ref={ref} id="invoice-preview" className="bg-white text-black p-[10mm] w-[210mm] h-[297mm] text-[10px] relative flex flex-col box-border overflow-hidden print:shadow-none print:m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
      
      <div className="border border-black flex flex-col h-full bg-white flex-1 relative z-10">
        
        <div className="flex justify-between items-center border-b border-black p-1 text-[#1c305c] shrink-0">
          <span className="w-1/3"></span>
          <span className="w-1/3 text-center font-bold text-[14px] tracking-widest uppercase">{currentDoc.title}</span>
          <span className="w-1/3 text-right text-[9px] font-bold uppercase">{isPO ? 'ORIGINAL FOR VENDOR' : 'ORIGINAL FOR RECIPIENT'}</span>
        </div>

        <div className="grid grid-cols-2 border-b border-black shrink-0">
          <div className="p-2 border-r border-black flex items-start">
            <img src={company.logo || defaultLogo} alt="Company Logo" className="w-14 h-14 mr-3 flex-shrink-0 object-contain" />
            <div className="flex flex-col justify-center">
              <h2 className="text-[14px] font-bold text-[#1c305c] uppercase">{company.name}</h2>
              <p className="mt-0.5 font-bold text-[10px]">GSTIN {company.gstin}</p>
              <p className="whitespace-pre-line text-gray-800 leading-snug mt-0.5 text-[10px]">{company.address}</p>
              <p className="mt-0.5 text-[10px]"><strong>Mobile:</strong> {company.mobile}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 grid-rows-2">
            <div className="p-2 border-r border-b border-black flex flex-col justify-center">
              <span className="text-gray-500 text-[9px] uppercase font-bold">{currentDoc.noLabel}</span>
              <span className="font-bold text-[11px] mt-0.5">{data.invoiceNumber || 'DRAFT'}</span>
            </div>
            <div className="p-2 border-b border-black flex flex-col justify-center">
              <span className="text-gray-500 text-[9px] uppercase font-bold">{currentDoc.dateLabel}</span>
              <span className="font-bold text-[11px] mt-0.5">{data.date}</span>
            </div>
            <div className="p-2 border-r border-black flex flex-col justify-center">
              <span className="text-gray-500 text-[9px] uppercase font-bold">Place of Supply:</span>
              <span className="font-bold text-[11px] mt-0.5">{(targetState || company.state).toUpperCase()}</span>
            </div>
            <div className="p-2 border-black flex flex-col justify-center">
              <span className="text-gray-500 text-[9px] uppercase font-bold">{isChallan ? 'Dispatch Date:' : 'Due Date:'}</span>
              <span className="font-bold text-[11px] mt-0.5">{data.dueDate || data.date}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-black shrink-0">
          <div className="p-2 border-r border-black">
            <p className="font-bold mb-1 text-gray-500 text-[9px] uppercase tracking-wider">{currentDoc.targetLabel}</p>
            <p className="font-bold text-[11px]">{data.customer.name || 'Enter Name'}</p>
            {data.customer.gstin && <p className="mt-0.5 font-bold text-gray-800 text-[10px]">GSTIN: {data.customer.gstin}</p>}
            <p className="mt-1 text-[10px] text-gray-800 leading-snug">
              {data.customer.billingStreet ? `${data.customer.billingStreet}, ` : ''}<br/>
              {data.customer.billingCity ? `${data.customer.billingCity}, ` : ''}
              {data.customer.billingState} {data.customer.billingPin ? `- ${data.customer.billingPin}` : ''}
            </p>
            <p className="mt-1 text-[10px] text-gray-800">
               <strong>Ph:</strong> {data.customer.phone || '-'} {data.customer.email ? ` | Email: ${data.customer.email}` : ''}
            </p>
          </div>
          <div className="p-2">
            <p className="font-bold mb-1 text-gray-500 text-[9px] uppercase tracking-wider">Shipping/Delivery address:</p>
            <p className="text-[10px] text-gray-800 leading-snug">
              {data.shippingSameAsBilling ? (
                <>
                  {data.customer.billingStreet ? `${data.customer.billingStreet}, ` : ''}<br/>
                  {data.customer.billingCity ? `${data.customer.billingCity}, ` : ''}
                  {data.customer.billingState} {data.customer.billingPin ? `- ${data.customer.billingPin}` : ''}
                </>
              ) : (
                <>
                  {data.customer.shippingStreet ? `${data.customer.shippingStreet}, ` : ''}<br/>
                  {data.customer.shippingCity ? `${data.customer.shippingCity}, ` : ''}
                  {data.customer.shippingState} {data.customer.shippingPin ? `- ${data.customer.shippingPin}` : ''}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full bg-white relative z-10">
          
          {/* ALIGNMENT FIX: Colgroup controls precise widths, ensuring lines perfectly match all the way down */}
          <div className="flex-1 border-b border-black flex flex-col overflow-hidden">
            <table className="w-full h-full border-collapse text-center" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: isChallan ? '50%' : '35%' }} />
                <col style={{ width: isChallan ? '15%' : '10%' }} />
                {!isChallan && <col style={{ width: '8%' }} />}
                <col style={{ width: isChallan ? '15%' : '8%' }} />
                {!isChallan && <col style={{ width: '12%' }} />}
                <col style={{ width: isChallan ? '15%' : '8%' }} />
                {!isChallan && <col style={{ width: '14%' }} />}
              </colgroup>
              <thead className="bg-gray-100 text-gray-800 uppercase font-bold text-[9px] shrink-0">
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1">#</th>
                  <th className="border-r border-black p-1 text-left">Item Description</th>
                  <th className="border-r border-black p-1">HSN/SAC</th>
                  {!isChallan && <th className="border-r border-black p-1">Tax</th>}
                  <th className="border-r border-black p-1">Qty</th>
                  {!isChallan && <th className="border-r border-black p-1">Rate/Item</th>}
                  <th className={`border-black p-1 ${!isChallan ? 'border-r' : ''}`}>Per</th>
                  {!isChallan && <th className="p-1">Amount</th>}
                </tr>
              </thead>
              <tbody className="align-top">
                {data.items.map((item, idx) => {
                  const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0) - (parseFloat(item.discount) || 0);
                  return (
                    <tr key={idx} className="border-b border-gray-200 h-5">
                      <td className="border-r border-black p-1 overflow-hidden">{idx + 1}</td>
                      <td className="border-r border-black p-1 text-left font-bold text-[10px] break-words">{item.description}</td>
                      <td className="border-r border-black p-1 text-[10px]">{item.hsnSac || '0000'}</td>
                      {!isChallan && <td className="border-r border-black p-1 text-[9px] text-gray-600">{item.taxRate}%</td>}
                      <td className="border-r border-black p-1 font-bold">{item.quantity}</td>
                      {!isChallan && <td className="border-r border-black p-1 text-right">{parseFloat(item.rate || 0).toFixed(2)}</td>}
                      <td className={`border-black p-1 font-bold text-[9px] text-gray-600 ${!isChallan ? 'border-r' : ''}`}>{item.unit || 'NOS'}</td>
                      {!isChallan && <td className="p-1 text-right font-bold pr-2">{amount.toFixed(2)}</td>}
                    </tr>
                  );
                })}

                {/* PERFECT ALIGNMENT SPACER */}
                {isChallan ? (
                  <tr className="h-full">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                ) : (
                  <tr className="h-full">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Explicit Top Border for Totals Box aligned precisely with colgroups */}
          <table className="w-full border-collapse text-center shrink-0 border-t border-black" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: isChallan ? '85%' : '86%' }} />
              <col style={{ width: isChallan ? '15%' : '14%' }} />
            </colgroup>
            <tbody>
              {!isChallan ? (
                <>
                  <tr className="border-b border-gray-200">
                    <td className="border-r border-black p-1 text-right font-bold text-gray-700 text-[10px]">Taxable Amount</td>
                    <td className="p-1 text-right pr-2">{formatCurrency(data.totals.taxableAmount)}</td>
                  </tr>
                  {!isInterstate ? (
                    <>
                      <tr className="border-b border-gray-200">
                        <td className="border-r border-black p-1 text-right font-bold text-gray-700 text-[10px]">CGST 9.0%</td>
                        <td className="p-1 text-right pr-2">{formatCurrency(data.totals.cgst)}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border-r border-black p-1 text-right font-bold text-gray-700 text-[10px]">SGST 9.0%</td>
                        <td className="p-1 text-right pr-2">{formatCurrency(data.totals.sgst)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-black">
                      <td className="border-r border-black p-1 text-right font-bold text-gray-700 text-[10px]">IGST 18.0%</td>
                      <td className="p-1 text-right pr-2">{formatCurrency(data.totals.igst)}</td>
                    </tr>
                  )}
                  {Number(data.totals.roundOff || 0) !== 0 && (
                    <tr className="border-b border-gray-200">
                      <td className="border-r border-black p-1 text-right font-bold text-gray-700 text-[10px]">Round Off</td>
                      <td className="p-1 text-right pr-2">{formatCurrency(data.totals.roundOff)}</td>
                    </tr>
                  )}
                  <tr className="font-bold text-[12px] bg-gray-50 border-b border-black">
                    <td className="border-r border-black p-2 text-right">
                       <span className="float-left ml-2 text-[9px] text-gray-500 font-normal">Total Qty: {totalQty.toFixed(3)}</span>
                       Grand Total
                    </td>
                    <td className="p-2 text-right text-black pr-2">{formatCurrency(data.totals.grandTotal)}</td>
                  </tr>
                </>
              ) : (
                <tr className="font-bold text-[12px] bg-gray-50 border-b border-black">
                  <td className="border-r border-black p-2 text-right text-gray-700">Total Quantity</td>
                  <td className="p-2 text-black">{totalQty.toFixed(3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isChallan && (
          <div className="border-b border-black p-2 px-3 text-[10px] bg-white shrink-0 flex justify-between items-start relative z-10">
            <p className="text-gray-700 max-w-[65%] leading-snug text-left">
              <strong>{isPO ? 'Order Value' : 'Amount Chargeable'} (in words): </strong>
              <span className="text-black font-bold ml-1">{numberToWords(data.totals.grandTotal)}</span>
            </p>
            <span className="font-bold text-gray-500">E & O.E</span>
          </div>
        )}

        

        <div className={`grid ${isInvoice ? 'grid-cols-3' : 'grid-cols-2'} min-h-[100px] bg-white shrink-0 relative z-10`}>
          
          {isInvoice && (
            <div className="p-2 border-r border-black">
              <p className="font-bold text-gray-500 uppercase text-[9px] tracking-wider mb-2">Bank Details:</p>
              <table className="w-full text-[10px]">
                <tbody>
                  <tr><td className="w-16 pb-1 text-gray-600">Bank:</td><td className="font-bold pb-1">{company.bankName}</td></tr>
                  <tr><td className="pb-1 text-gray-600">Account #:</td><td className="font-bold pb-1 font-mono">{company.accountNumber}</td></tr>
                  <tr><td className="pb-1 text-gray-600">IFSC:</td><td className="font-bold pb-1 font-mono uppercase">{company.ifsc}</td></tr>
                  <tr><td className="text-gray-600">Branch:</td><td className="font-bold uppercase">{company.branch}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {isInvoice && (
            <div className="p-2 border-r border-black text-center flex flex-col items-center justify-center">
              <p className="font-bold mb-1 text-[9px] text-gray-500 uppercase tracking-wider">Pay using UPI:</p>
              <div className="w-16 h-16 bg-gray-100 border border-gray-300 flex items-center justify-center text-[7px] text-center text-gray-400">
                [UPI QR]<br/>{company.upiId}
              </div>
            </div>
          )}
          
          {(isPO || isChallan) && (
            <div className="p-2 border-r border-black flex flex-col justify-end text-left">
              <p className="border-t border-gray-400 pt-0.5 text-[9px] font-bold inline-block w-3/4 text-gray-700">Receiver's Signature</p>
            </div>
          )}

          <div className="p-2 flex flex-col justify-between items-end text-right">
            <p className="text-[10px] font-bold text-gray-600 relative z-10">For <span className="text-black">{company.name}</span></p>
            
            <div className="absolute bottom-6 right-6 flex items-center justify-center pointer-events-none z-50">
              <img src={company.stamp || defaultStamp} alt="Company Stamp" className="w-24 h-24 object-contain opacity-95" />
            </div>

            <div className="mt-auto w-32 border-t border-gray-400 pt-1 text-center relative z-10 bg-transparent">
              <p className="text-[10px] font-bold text-gray-700">Authorized Signatory</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 text-[9px] border-t border-black bg-white shrink-0 relative z-10">
          <div className="p-2 border-r border-black">
            <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Notes / Instructions:</p>
            <p className="mt-0.5 text-gray-800">{data.notes || 'Thank you for the Business'}</p>
          </div>
          <div className="p-2">
            <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions:</p>
            <ul className="list-disc pl-3 mt-0.5 leading-snug text-gray-800 space-y-0.5">
              {data.terms.split('\n').map((term, i) => (
                term.trim() ? <li key={i}>{term.trim()}</li> : null
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-between text-[8px] font-bold mt-2 px-1 text-gray-500 uppercase tracking-widest shrink-0">
        <span>Page 1 / 1</span>
        <span>This is a digitally generated document.</span>
      </div>

    </div>
  );
});

export default InvoicePreview;