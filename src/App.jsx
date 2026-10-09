import React, { useState, useEffect, useRef, useMemo } from 'react';
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { 
  Plus, Download, Printer, Settings, FileText, CheckCircle, Save, Trash2, 
  Building2, Users, Eye, FileBox, Search, ArrowLeft, Edit3, Paperclip, 
  Database, UploadCloud, FileSpreadsheet, Package, AlertTriangle, Share2
} from 'lucide-react';
import InvoicePreview from './InvoicePreview';
import { supabase } from './supabase';
import { 
  DEFAULT_COMPANY_SETTINGS, calculateTaxes, getNextInvoiceNumber, 
  useLocalStorage, formatCurrency 
} from './utils';

export default function App() {
  const [view, setView] = useState('DASHBOARD'); 
  const [companySettings, setCompanySettings] = useLocalStorage('skt_company_v3', DEFAULT_COMPANY_SETTINGS);
  const [invoices, setInvoices] = useLocalStorage('skt_invoices_v3', []);
  const [clientCatalog, setClientCatalog] = useLocalStorage('skt_clients_v3', []);
  const [itemCatalog, setItemCatalog] = useLocalStorage('skt_catalog_v3', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null); 

  const defaultInvoiceState = useMemo(() => ({
    id: null,
    supabaseId: null,
    shareableLink: null,
    docType: 'INV', 
    invoiceNumber: '', 
    attachment: null,
    date: new Date().toISOString().split('T')[0],
    status: 'Unpaid', 
    customer: { 
      name: '', 
      email: '', 
      gstin: '', 
      phone: '', 
      billingStreet: '', 
      billingCity: '', 
      billingState: 'Telangana', 
      billingPin: '',
      shippingStreet: '', 
      shippingCity: '', 
      shippingState: 'Telangana', 
      shippingPin: '',
      state: 'Telangana', 
      stateCode: '36' 
    },
    shippingSameAsBilling: true,
    items: [{ description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discount: 0, taxRate: 18 }],
    amountPaid: 0,
    notes: 'Thank you for your business.',
    terms: companySettings.terms,
    totals: { subtotal: 0, totalDiscount: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0, taxSummary: {} }
  }), [companySettings.terms]);

  const [currentInvoice, setCurrentInvoice] = useState(defaultInvoiceState);
  const invoiceRef = useRef();

  const triggerToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- NEW: FETCH CLOUD INVOICES ON APP LOAD ---
  useEffect(() => {
    const fetchCloudInvoices = async () => {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching cloud documents:", error);
          return;
        }

        if (data && data.length > 0) {
          const cloudInvoices = data.map(item => ({
            ...item.invoice_data,
            supabaseId: item.id,
            shareableLink: `${window.location.origin}/invoice/${item.id}`
          }));
          
          // Merge cloud invoices with local ones, preferring cloud data to avoid duplicates
          setInvoices(prevLocalInvoices => {
            const merged = [...cloudInvoices];
            prevLocalInvoices.forEach(localInv => {
              if (!merged.some(cloudInv => cloudInv.invoiceNumber === localInv.invoiceNumber)) {
                merged.push(localInv);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.error("Cloud fetch failed:", err);
      }
    };

    fetchCloudInvoices();
  }, []);
  // ---------------------------------------------

  useEffect(() => {
    const targetState = currentInvoice.shippingSameAsBilling ? currentInvoice.customer.billingState : currentInvoice.customer.shippingState;
    const isInterstate = (targetState || '').trim().toLowerCase() !== (companySettings.state || '').trim().toLowerCase();
    const totals = calculateTaxes(currentInvoice.items, isInterstate);
    setCurrentInvoice(prev => ({ 
      ...prev, 
      customer: { ...prev.customer, state: targetState },
      totals 
    }));
  }, [
    currentInvoice.items, 
    currentInvoice.customer.billingState, 
    currentInvoice.customer.shippingState, 
    currentInvoice.shippingSameAsBilling, 
    companySettings.state
  ]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...currentInvoice.items];
    newItems[index][field] = value;
    setCurrentInvoice({ ...currentInvoice, items: newItems });
  };

  const addItemRow = () => {
    setCurrentInvoice({ 
      ...currentInvoice, 
      items: [...currentInvoice.items, { description: '', hsnSac: '', quantity: 1, unit: 'NOS', rate: 0, discount: 0, taxRate: 18 }] 
    });
  };

  const removeItemRow = (index) => {
    const newItems = currentInvoice.items.filter((_, i) => i !== index);
    setCurrentInvoice({ ...currentInvoice, items: newItems.length ? newItems : defaultInvoiceState.items });
  };

  const applyClientTemplate = (clientId) => {
    const client = clientCatalog.find(c => c.id === clientId);
    if (!client) return;
    setCurrentInvoice(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        name: client.name,
        email: client.email || '',
        gstin: client.gstin,
        phone: client.phone,
        billingStreet: client.billingStreet,
        billingCity: client.billingCity,
        billingState: client.billingState,
        billingPin: client.billingPin,
        shippingStreet: client.billingStreet,
        shippingCity: client.billingCity,
        shippingState: client.billingState,
        shippingPin: client.billingPin
      }
    }));
    triggerToast(`Applied ${client.name} details`);
  };

  const applyCatalogItem = (index, itemId) => {
    const item = itemCatalog.find(i => i.id === itemId);
    if (!item) return;
    const updated = [...currentInvoice.items];
    updated[index] = {
      ...updated[index],
      description: item.description,
      hsnSac: item.hsnSac,
      unit: item.unit,
      rate: item.rate,
      taxRate: item.taxRate
    };
    setCurrentInvoice({ ...currentInvoice, items: updated });
    triggerToast(`Populated ${item.description}`);
  };

  const handleAttachmentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3.5 * 1024 * 1024) {
      triggerToast("File is too large! Please compress the PDF/Image to under 3.5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentInvoice({ ...currentInvoice, attachment: reader.result });
      triggerToast("File successfully attached to document memory.");
    };
    reader.readAsDataURL(file);
  };

  const saveInvoice = async () => {
    if (!currentInvoice.customer.name.trim()) {
      triggerToast("Client name is required.", "error");
      return;
    }
    
    let invNumber = (currentInvoice.invoiceNumber || '').trim().toUpperCase();
    if (!invNumber) {
      const seqType = currentInvoice.docType === 'UPLOAD' ? 'INV' : currentInvoice.docType;
      invNumber = getNextInvoiceNumber(currentInvoice.date, invoices, seqType);
    }
    
    const finalDocType = currentInvoice.docType === 'UPLOAD' ? 'INV' : currentInvoice.docType;

    const grandTotal = currentInvoice.totals.grandTotal;
    const paid = parseFloat(currentInvoice.amountPaid || 0);
    let resolvedStatus = currentInvoice.status;
    if (paid >= grandTotal && grandTotal > 0) resolvedStatus = 'Paid';
    else if (paid > 0 && paid < grandTotal) resolvedStatus = 'Partially Paid';
    else if (paid === 0 && resolvedStatus === 'Paid') resolvedStatus = 'Unpaid';

    const finalizedDoc = {
      ...currentInvoice,
      docType: finalDocType,
      invoiceNumber: invNumber,
      id: currentInvoice.id || Date.now().toString(),
      balanceDue: Math.max(0, grandTotal - paid),
      status: resolvedStatus
    };

    // --- SUPABASE CLOUD SAVE LOGIC ---
    triggerToast("Saving to cloud...", "info");
    try {
      let supabaseResult;
      if (finalizedDoc.supabaseId) {
        // Update existing cloud document
        supabaseResult = await supabase
          .from('invoices')
          .update({ invoice_data: finalizedDoc })
          .eq('id', finalizedDoc.supabaseId)
          .select()
          .single();
      } else {
        // Insert new cloud document
        supabaseResult = await supabase
          .from('invoices')
          .insert([{ invoice_data: finalizedDoc }])
          .select()
          .single();
      }

      const { data, error } = supabaseResult;
      
      if (!error && data) {
        finalizedDoc.supabaseId = data.id;
        finalizedDoc.shareableLink = `${window.location.origin}/invoice/${data.id}`;
        triggerToast(`Document ${invNumber} saved & synced to cloud!`);
      } else {
        console.error("Supabase Error:", error);
        triggerToast("Saved locally, but cloud sync failed.", "error");
      }
    } catch (err) {
      console.error("Supabase Exception:", err);
      triggerToast("Saved locally, but cloud sync failed.", "error");
    }
    // --- END SUPABASE LOGIC ---

    if (!clientCatalog.some(c => c.name.toLowerCase() === finalizedDoc.customer.name.toLowerCase())) {
      setClientCatalog(prev => [...prev, {
        id: `client-${Date.now()}`,
        name: finalizedDoc.customer.name,
        email: finalizedDoc.customer.email,
        gstin: finalizedDoc.customer.gstin,
        phone: finalizedDoc.customer.phone,
        billingStreet: finalizedDoc.customer.billingStreet,
        billingCity: finalizedDoc.customer.billingCity,
        billingState: finalizedDoc.customer.billingState,
        billingPin: finalizedDoc.customer.billingPin
      }]);
    }

    if (currentInvoice.id) {
      setInvoices(invoices.map(i => i.id === finalizedDoc.id ? finalizedDoc : i));
    } else {
      setInvoices([finalizedDoc, ...invoices]);
    }
    
    setCurrentInvoice(finalizedDoc);
    setView('INVOICES');
  };

  const confirmDelete = () => {
    if (!activeModal?.data?.id) return;
    setInvoices(invoices.filter(i => i.id !== activeModal.data.id));
    if (currentInvoice?.id === activeModal.data.id) {
      setCurrentInvoice(defaultInvoiceState);
    }
    triggerToast(`Deleted ${activeModal.data.invoiceNumber}`);
    setActiveModal(null);
  };

  const exportSystemBackup = () => {
    const backupData = {
      version: '3.0',
      timestamp: new Date().toISOString(),
      companySettings,
      invoices,
      clientCatalog,
      itemCatalog
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKT_ERP_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("System backup file exported");
  };

  const importSystemBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.invoices && parsed.companySettings) {
          setCompanySettings(parsed.companySettings);
          setInvoices(parsed.invoices);
          if (parsed.clientCatalog) setClientCatalog(parsed.clientCatalog);
          if (parsed.itemCatalog) setItemCatalog(parsed.itemCatalog);
          triggerToast("System records restored successfully");
        } else {
          triggerToast("Invalid backup schema", "error");
        }
      } catch (err) {
        triggerToast("Failed to parse JSON backup file", "error");
      }
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const headers = ["Doc Number", "Type", "Date", "Client", "GSTIN", "Taxable", "Grand Total", "Status"];
    const rows = invoices.map(i => [
      i.invoiceNumber,
      i.docType,
      i.date,
      `"${i.customer.name.replace(/"/g, '""')}"`,
      i.customer.gstin || '',
      i.totals.taxableAmount.toFixed(2),
      i.totals.grandTotal.toFixed(2),
      i.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Documents_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Financial spreadsheet register exported");
  };

  const generatePDF = async () => {
    try {
      if (!invoiceRef.current) return;
      triggerToast("Rendering high-resolution PDF document...", "info");
      
      const imgData = await toPng(invoiceRef.current, { 
        quality: 1, 
        pixelRatio: 2.5, 
        backgroundColor: '#ffffff' 
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (invoiceRef.current.offsetHeight * pdfWidth) / invoiceRef.current.offsetWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentInvoice.invoiceNumber || currentInvoice.docType}.pdf`);
      triggerToast("PDF generated and saved to device");
      
    } catch (error) {
      console.error("PDF Export Error:", error);
      triggerToast("PDF Generation Failed! Press F12 to check the console.", "error");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings({ ...companySettings, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings({ ...companySettings, stamp: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesFilter = filterType === 'ALL' || inv.docType === filterType;
    const matchesSearch = 
      (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getDocTypeName = (code) => {
    const types = { 'INV': 'Invoice', 'EST': 'Quotation', 'PO': 'Purchase Order', 'DC': 'Delivery Challan' };
    return types[code] || code;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0B10] text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border transition-all animate-bounce ${
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-500/50 text-rose-200' :
          toast.type === 'info' ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200' :
          'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {activeModal?.type === 'DELETE_CONFIRM' && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161922] border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle size={28} />
              <h3 className="text-lg font-black text-white">Delete Document</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-mono">{activeModal.data.invoiceNumber}</strong>? This action will permanently remove it from local application storage.
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <button onClick={() => setActiveModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-900/30 transition-all">Delete Record</button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-72 bg-[#12141C] border-r border-slate-800 flex flex-col shadow-2xl print:hidden flex-shrink-0">
        <div className="p-8 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/30">SK</div>
          <div>
            <h1 className="font-black text-base tracking-widest text-white">SK TECH</h1>
            <p className="text-[10px] text-indigo-400 tracking-wider uppercase font-semibold">Enterprise Hub</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'DASHBOARD', icon: FileText, label: 'Dashboard' },
            { id: 'CREATE', icon: Plus, label: 'Document Studio' },
            { id: 'INVOICES', icon: FileBox, label: 'Document Register' },
            { id: 'CLIENTS', icon: Users, label: 'Client Master' },
            { id: 'ITEMS', icon: Package, label: 'Item Catalog' },
            { id: 'SETTINGS', icon: Settings, label: 'Entity Settings' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => {
                if (item.id === 'CREATE') setCurrentInvoice(defaultInvoiceState);
                setView(item.id);
              }} 
              className={`w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm ${
                view === item.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800/80">
          <div className="bg-[#0A0B10] p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
              <span>Local Storage</span>
              <span className="text-emerald-400 flex items-center gap-1">● Active</span>
            </div>
            <div className="flex gap-2">
              <button onClick={exportSystemBackup} title="Export JSON Backup" className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all">
                <Database size={12} /> Backup
              </button>
              <label title="Import JSON Backup" className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                <UploadCloud size={12} /> Restore
                <input type="file" accept=".json" onChange={importSystemBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto print:p-0 print:overflow-visible bg-[#0E1017]">
        
        {view === 'DASHBOARD' && (
          <div className="p-12 space-y-10 max-w-7xl mx-auto print:hidden">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">Operations Center</h1>
                <p className="text-slate-400 text-sm mt-2">Telemetry, financial receivables, and documentation pipeline.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={exportCSV} className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-5 py-3.5 rounded-2xl text-xs flex items-center space-x-2 border border-slate-700 shadow-xl transition-all">
                  <FileSpreadsheet size={16} /><span>Export Register (CSV)</span>
                </button>
                <button onClick={() => { setCurrentInvoice(defaultInvoiceState); setView('CREATE'); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 flex items-center space-x-2.5 transition-all text-xs">
                  <Plus size={18} /><span>Generate Document</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#161922] p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Total Issued</p>
                <p className="text-4xl font-black text-white mt-3">{invoices.length}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">All recorded entities</p>
              </div>
              <div className="bg-[#161922] p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Gross Turnaround</p>
                <p className="text-3xl font-black text-indigo-400 mt-3">{formatCurrency(invoices.reduce((acc, inv) => acc + (inv.totals?.grandTotal || 0), 0))}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Cumulated document volume</p>
              </div>
              <div className="bg-[#161922] p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Pending Receivables</p>
                <p className="text-3xl font-black text-rose-400 mt-3">{formatCurrency(invoices.filter(i => i.docType === 'INV').reduce((acc, inv) => acc + (inv.balanceDue || 0), 0))}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Unpaid balance on invoices</p>
              </div>
              <div className="bg-[#161922] p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Client Directory</p>
                <p className="text-4xl font-black text-emerald-400 mt-3">{clientCatalog.length}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Saved business entities</p>
              </div>
            </div>
          </div>
        )}

        {view === 'CLIENTS' && (
          <div className="p-12 max-w-6xl mx-auto space-y-8 print:hidden">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">Client Master Directory</h1>
                <p className="text-slate-400 text-sm mt-2">Saved corporate accounts, billing addresses, and tax identifiers.</p>
              </div>
              <button 
                onClick={() => {
                  const name = prompt("Enter Client / Corporate Entity Name:");
                  if (!name) return;
                  const email = prompt("Enter Email Address:") || '';
                  const gstin = prompt("Enter GSTIN (optional):") || '';
                  const phone = prompt("Enter Phone Number:") || '';
                  const city = prompt("Enter City:") || 'Hyderabad';
                  const state = prompt("Enter State:") || 'Telangana';
                  setClientCatalog([...clientCatalog, {
                    id: `client-${Date.now()}`,
                    name, email, gstin: gstin.toUpperCase(), phone, billingStreet: '', billingCity: city, billingState: state, billingPin: ''
                  }]);
                  triggerToast(`Client ${name} registered`);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-2xl text-xs flex items-center space-x-2"
              >
                <Plus size={16} /><span>Add Client Account</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientCatalog.map(client => (
                <div key={client.id} className="bg-[#161922] p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold text-white">{client.name}</h3>
                      <p className="text-xs text-indigo-400 font-mono mt-0.5">GSTIN: {client.gstin || 'UNREGISTERED'}</p>
                    </div>
                    <button onClick={() => setClientCatalog(clientCatalog.filter(c => c.id !== client.id))} className="text-slate-500 hover:text-rose-400 transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{client.billingStreet && `${client.billingStreet}, `}{client.billingCity}, {client.billingState} {client.billingPin && `- ${client.billingPin}`}</p>
                  <p className="text-xs text-slate-400 font-mono">Ph: {client.phone || 'N/A'} | Email: {client.email || 'N/A'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'ITEMS' && (
          <div className="p-12 max-w-6xl mx-auto space-y-8 print:hidden">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">Item & Service Catalog</h1>
                <p className="text-slate-400 text-sm mt-2">Standard product SKUs, default rates, and statutory HSN/SAC codes.</p>
              </div>
            </div>
            <div className="bg-[#161922] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#12141C] text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr><th className="p-5">Description</th><th className="p-5">HSN/SAC</th><th className="p-5">Unit</th><th className="p-5">Default Rate</th><th className="p-5">Tax Rate</th><th className="p-5 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {itemCatalog.map(item => (
                    <tr key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                      <td className="p-5 font-bold text-white">{item.description}</td>
                      <td className="p-5 font-mono text-slate-400">{item.hsnSac}</td>
                      <td className="p-5 text-slate-300 uppercase">{item.unit}</td>
                      <td className="p-5 font-bold">{formatCurrency(item.rate)}</td>
                      <td className="p-5 text-slate-300">{item.taxRate}% GST</td>
                      <td className="p-5 text-right"><button onClick={() => setItemCatalog(itemCatalog.filter(i => i.id !== item.id))} className="text-rose-400 hover:text-rose-300 font-bold">Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'VIEW' && (
          <div className="p-12 max-w-5xl mx-auto space-y-8 print:p-0 print:max-w-none">
            <div className="flex justify-between items-center bg-[#161922]/90 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl sticky top-6 z-30 print:hidden">
              <div className="flex items-center space-x-4">
                <button onClick={() => setView('INVOICES')} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all flex items-center space-x-2 text-xs font-bold">
                  <ArrowLeft size={16} /><span>Back to Register</span>
                </button>
                <div>
                  <h2 className="text-lg font-black text-white">{currentInvoice.invoiceNumber}</h2>
                  <p className="text-xs text-slate-400">{getDocTypeName(currentInvoice.docType)} • Read-Only View</p>
                </div>
              </div>
              <div className="flex space-x-3">
                
                {/* NEW SHARE LINK BUTTON */}
                {currentInvoice.shareableLink && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentInvoice.shareableLink);
                      triggerToast("Public link copied to clipboard!");
                    }} 
                    className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all"
                  >
                    <Share2 size={16} /><span>Copy Link</span>
                  </button>
                )}

                <button onClick={() => { setCurrentInvoice(currentInvoice); setView('CREATE'); }} className="bg-slate-800 hover:bg-slate-700 text-indigo-400 px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all">
                  <Edit3 size={16} /><span>Edit Document</span>
                </button>
                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all">
                  <Printer size={16} /><span>Print</span>
                </button>
                <button onClick={generatePDF} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/30 transition-all">
                  <Download size={16} /><span>Export PDF</span>
                </button>
              </div>
            </div>

            {currentInvoice.attachment && (
              <div className="flex justify-center print:hidden">
                <a href={currentInvoice.attachment} download={`Attachment-${currentInvoice.invoiceNumber}`} className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 transition-all px-8 py-3.5 rounded-2xl font-bold flex items-center space-x-3 text-xs">
                  <Paperclip size={18} /> <span>Download Attached Historical Document</span>
                </a>
              </div>
            )}

            <div className="bg-white p-12 rounded-3xl shadow-2xl flex justify-center border border-slate-800 overflow-x-auto">
              <InvoicePreview ref={invoiceRef} data={currentInvoice} company={companySettings} />
            </div>
          </div>
        )}

        {view === 'CREATE' && (
          <div className="p-12 max-w-5xl mx-auto space-y-10 print:p-0 print:max-w-none">
            
            <div className="flex justify-between items-center bg-[#161922]/90 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl sticky top-6 z-30 print:hidden">
              <div>
                <h2 className="text-xl font-black text-white">{currentInvoice.id ? 'Edit Record' : 'Document Studio'}</h2>
                <p className="text-xs text-slate-400">Interactive form engine; live preview updates dynamically.</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={saveInvoice} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-900/30 transition-all"><Save size={16}/><span>Save & Generate Link</span></button>
                <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 transition-all"><Printer size={16}/><span>Print</span></button>
                <button onClick={generatePDF} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/30 transition-all"><Download size={16}/><span>Download PDF</span></button>
              </div>
            </div>

            <div className="bg-[#161922] p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 print:hidden">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 border-b border-slate-800 pb-4">
                0. Sequence & Document Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Type</label>
                  <select 
                    className="bg-[#0A0B10] border border-indigo-500/40 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none font-bold" 
                    value={currentInvoice.docType} 
                    onChange={e => {
                      const newType = e.target.value;
                      let newTerms = companySettings.terms;
                      if (newType === 'EST') {
                        newTerms = "Validity: This quotation is valid for 30 days from the date of issue.\nPayment Terms: A 50% advance payment is required upon order confirmation. The remaining 50% balance is due at the time of delivery.\nDelivery Timeline: The estimated delivery period is 10 to 12 weeks from the receipt of the advance payment.\nExclusions: Shipping, handling, and installation charges are not included in this quotation and will be billed separately.";
                      }
                      setCurrentInvoice({...currentInvoice, docType: newType, terms: newTerms});
                    }}
                  >
                    <option value="INV">Tax Invoice</option>
                    <option value="EST">Quotation / Estimate</option>
                    <option value="PO">Purchase Order</option>
                    <option value="DC">Delivery Challan</option>
                    <option value="UPLOAD" className="bg-emerald-900 text-emerald-300 font-bold">Log Past Manual Invoice</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Document Date</label>
                  <input type="date" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none" value={currentInvoice.date} onChange={e => setCurrentInvoice({...currentInvoice, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
                  <select 
                    className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none font-bold" 
                    value={currentInvoice.status} 
                    onChange={e => setCurrentInvoice({...currentInvoice, status: e.target.value})}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="md:col-span-3 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Document Number Override
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2">Leave blank to auto-generate sequentially. Specify a number (e.g. SKTINV26I015) to record a manual past invoice; future auto-numbers will seamlessly increment from it.</p>
                  <input 
                    type="text" 
                    placeholder="Auto-generated if left blank" 
                    className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs uppercase font-mono tracking-wider focus:border-amber-500 outline-none" 
                    value={currentInvoice.invoiceNumber || ''} 
                    onChange={e => setCurrentInvoice({...currentInvoice, invoiceNumber: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#161922] p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 print:hidden">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">1. Client Master Autofill & Information</h3>
                {clientCatalog.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Quick Fill:</span>
                    <select 
                      onChange={e => applyClientTemplate(e.target.value)} 
                      defaultValue=""
                      className="bg-[#0A0B10] border border-indigo-500/40 text-indigo-300 text-xs px-3 py-1.5 rounded-xl outline-none cursor-pointer"
                    >
                      <option value="" disabled>Select saved client...</option>
                      {clientCatalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client / Vendor Name</label>
                  <input type="text" placeholder="Entity name" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none" value={currentInvoice.customer.name} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, name: e.target.value}})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input type="email" placeholder="client@example.com" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none" value={currentInvoice.customer.email || ''} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, email: e.target.value}})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">GSTIN</label>
                  <input type="text" placeholder="36GOVPK7075A1ZH" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 uppercase focus:border-indigo-500 outline-none font-mono" value={currentInvoice.customer.gstin} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, gstin: e.target.value.toUpperCase()}})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input type="text" placeholder="Contact number" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl text-xs mt-2 focus:border-indigo-500 outline-none" value={currentInvoice.customer.phone} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, phone: e.target.value}})} />
                </div>

                <div className="col-span-2 space-y-4 pt-2 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Billing Address</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-4">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Street Address / Area</label>
                      <input type="text" placeholder="Address street" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3 rounded-xl text-xs mt-1" value={currentInvoice.customer.billingStreet} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, billingStreet: e.target.value}})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">City</label>
                      <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3 rounded-xl text-xs mt-1" value={currentInvoice.customer.billingCity} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, billingCity: e.target.value}})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">State</label>
                      <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3 rounded-xl text-xs mt-1" value={currentInvoice.customer.billingState} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, billingState: e.target.value}})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">PIN Code</label>
                      <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3 rounded-xl text-xs mt-1" value={currentInvoice.customer.billingPin} onChange={e => setCurrentInvoice({...currentInvoice, customer: {...currentInvoice.customer, billingPin: e.target.value}})} />
                    </div>
                  </div>
                </div>

                <div className="col-span-2 flex items-center space-x-3 pt-2 border-t border-slate-800/80">
                  <input 
                    type="checkbox" 
                    id="shippingToggle" 
                    checked={currentInvoice.shippingSameAsBilling} 
                    onChange={e => setCurrentInvoice({...currentInvoice, shippingSameAsBilling: e.target.checked})}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="shippingToggle" className="text-xs font-bold text-slate-300 cursor-pointer">Shipping / Consignee address identical to billing address</label>
                </div>
              </div>
            </div>

            {currentInvoice.docType === 'UPLOAD' ? (
              <div className="bg-[#161922] p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 print:hidden">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 border-b border-slate-800 pb-4">2. Historical Totals & File Attachment</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Invoice Amount (INR)</label>
                    <input type="number" 
                      className="bg-[#0A0B10] border border-slate-800 text-white w-full p-4 rounded-2xl text-sm mt-2 focus:border-emerald-500 outline-none" 
                      value={currentInvoice.items[0]?.rate || ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        setCurrentInvoice({
                          ...currentInvoice,
                          items: [{ description: 'Historical Manual Invoice Record', hsnSac: 'N/A', quantity: 1, unit: 'NOS', rate: val, discount: 0, taxRate: 0 }]
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                      <Paperclip size={16}/> <span>Upload Original Document (PDF/Image)</span>
                    </label>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleAttachmentUpload} className="mt-2 text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer w-full" />
                    {currentInvoice.attachment && <p className="mt-3 text-xs text-emerald-400 font-bold">✔ File securely attached.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#161922] p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 print:hidden">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">2. Products & Work Items</h3>
                  <button onClick={addItemRow} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all">
                    <Plus size={16}/><span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-4">
                  {currentInvoice.items.map((item, idx) => (
                    <div key={idx} className="bg-[#0A0B10] p-5 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Item #{idx + 1}</span>
                        <div className="flex items-center space-x-3">
                          {itemCatalog.length > 0 && (
                            <select 
                              onChange={e => applyCatalogItem(idx, e.target.value)} 
                              defaultValue=""
                              className="bg-[#161922] border border-slate-800 text-indigo-300 text-[10px] px-2.5 py-1 rounded-lg outline-none"
                            >
                              <option value="" disabled>Autofill from Catalog...</option>
                              {itemCatalog.map(cat => <option key={cat.id} value={cat.id}>{cat.description}</option>)}
                            </select>
                          )}
                          <button onClick={() => removeItemRow(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                            <Trash2 size={15}/>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Description</label>
                          <input type="text" className="bg-[#161922] border border-slate-800 text-white w-full p-2.5 rounded-xl text-xs mt-1" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">HSN/SAC</label>
                          <input type="text" className="bg-[#161922] border border-slate-800 text-white w-full p-2.5 rounded-xl text-xs mt-1 font-mono" value={item.hsnSac} onChange={e => handleItemChange(idx, 'hsnSac', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Quantity</label>
                          <input type="number" className="bg-[#161922] border border-slate-800 text-white w-full p-2.5 rounded-xl text-xs mt-1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Rate (INR)</label>
                          <input type="number" className="bg-[#161922] border border-slate-800 text-white w-full p-2.5 rounded-xl text-xs mt-1" value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase">Tax Rate</label>
                          <select className="bg-[#161922] border border-slate-800 text-white w-full p-2.5 rounded-xl text-xs mt-1" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}>
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-6">
              <div className="flex items-center space-x-2 print:hidden">
                <Eye size={18} className="text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Live A4 Paper Preview</h3>
              </div>
              <div className="bg-white p-12 rounded-3xl shadow-2xl flex justify-center border border-slate-800 overflow-x-auto">
                <InvoicePreview ref={invoiceRef} data={currentInvoice} company={companySettings} />
              </div>
            </div>

          </div>
        )}

        {view === 'INVOICES' && (
          <div className="p-12 max-w-7xl mx-auto print:hidden space-y-8">
            <div className="flex justify-between items-center">
               <div>
                 <h1 className="text-4xl font-black tracking-tight text-white">Document Register</h1>
                 <p className="text-slate-400 text-sm mt-2">Filter, search, inspect, and duplicate all ERP records.</p>
               </div>
               <div className="flex space-x-3">
                 <button onClick={() => { setCurrentInvoice(defaultInvoiceState); setView('CREATE'); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl transition-all flex items-center space-x-2 text-xs">
                   <Plus size={16} /><span>Create Document</span>
                 </button>
               </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161922] p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center space-x-2 overflow-x-auto">
                {[{ id: 'ALL', label: 'All Records' }, { id: 'INV', label: 'Invoices' }, { id: 'EST', label: 'Quotations' }, { id: 'PO', label: 'Purchase Orders' }, { id: 'DC', label: 'Delivery Challans' }].map(tab => (
                  <button key={tab.id} onClick={() => setFilterType(tab.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search by doc number or client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#0A0B10] border border-slate-800 text-white w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600" />
              </div>
            </div>

            <div className="bg-[#161922] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#12141C] border-b border-slate-800 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <tr><th className="p-5 pl-6">Doc Number</th><th className="p-5">Type</th><th className="p-5">Date</th><th className="p-5">Client / Vendor</th><th className="p-5">Amount</th><th className="p-5">Status</th><th className="p-5 text-right pr-6">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                      <td className="p-5 pl-6">
                        <button onClick={() => { setCurrentInvoice(inv); setView('VIEW'); }} className="font-black text-indigo-400 hover:underline font-mono flex items-center space-x-2">
                          <span>{inv.invoiceNumber}</span>
                          {inv.attachment && <Paperclip size={12} className="text-emerald-400" />}
                        </button>
                      </td>
                      <td className="p-5 text-slate-300"><span className="bg-[#0A0B10] border border-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-semibold">{getDocTypeName(inv.docType)}</span></td>
                      <td className="p-5 text-slate-400">{inv.date}</td>
                      <td className="p-5 font-bold text-white">{inv.customer.name}</td>
                      <td className="p-5 font-bold">{formatCurrency(inv.totals?.grandTotal || 0)}</td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : inv.status === 'Partially Paid' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-5 text-right pr-6 space-x-3">
                        <button onClick={() => { setCurrentInvoice(inv); setView('VIEW'); }} className="text-slate-400 hover:text-white font-bold">View</button>
                        <button onClick={() => { setCurrentInvoice(inv); setView('CREATE'); }} className="text-indigo-400 hover:underline font-bold">Edit</button>
                        <button onClick={() => { setCurrentInvoice({ ...inv, id: null, invoiceNumber: '' }); setView('CREATE'); }} className="text-slate-400 hover:text-white font-bold">Duplicate</button>
                        <button onClick={() => setActiveModal({ type: 'DELETE_CONFIRM', data: inv })} className="text-rose-400 hover:underline font-bold">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr><td colSpan="7" className="p-16 text-center text-slate-500">No matching document records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="p-12 max-w-4xl mx-auto print:hidden space-y-8">
            <h1 className="text-4xl font-black tracking-tight text-white">Entity Configuration</h1>
            <div className="bg-[#161922] p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-8">
              
              <div>
                <h3 className="font-bold text-xs text-indigo-400 border-b border-slate-800 pb-4 mb-6 uppercase tracking-wider">Business Identity & Branding</h3>
                <div className="grid grid-cols-2 gap-6 text-xs">
                  
                  {/* Logo Upload */}
                  <div className="border border-slate-800 p-5 rounded-2xl bg-[#0A0B10]">
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Company Logo</label>
                    <div className="flex flex-col items-start mt-3 space-y-3">
                      {companySettings.logo && (
                        <div className="bg-white p-2 rounded-xl border border-slate-700">
                          <img src={companySettings.logo} alt="Logo" className="w-12 h-12 object-contain" />
                        </div>
                      )}
                      <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} className="text-[10px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 cursor-pointer w-full" />
                      {companySettings.logo && (
                        <button onClick={() => setCompanySettings({...companySettings, logo: ''})} className="text-rose-400 text-[10px] font-bold hover:underline">Remove Logo</button>
                      )}
                    </div>
                  </div>

                  {/* Stamp Upload */}
                  <div className="border border-slate-800 p-5 rounded-2xl bg-[#0A0B10]">
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Company Stamp / Seal</label>
                    <div className="flex flex-col items-start mt-3 space-y-3">
                      {companySettings.stamp && (
                        <div className="bg-white/10 p-2 rounded-xl border border-slate-700">
                          <img src={companySettings.stamp} alt="Stamp" className="w-12 h-12 object-contain mix-blend-screen opacity-90 bg-white rounded-lg p-1" />
                        </div>
                      )}
                      <input type="file" accept="image/png, image/jpeg" onChange={handleStampUpload} className="text-[10px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer w-full" />
                      {companySettings.stamp && (
                        <button onClick={() => setCompanySettings({...companySettings, stamp: ''})} className="text-rose-400 text-[10px] font-bold hover:underline">Remove Stamp</button>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 border-t border-slate-800 pt-6"></div>

                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Company Name</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5 font-bold" value={companySettings.name} onChange={e => setCompanySettings({...companySettings, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">GSTIN</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5 uppercase font-mono" value={companySettings.gstin} onChange={e => setCompanySettings({...companySettings, gstin: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Registered Address</label>
                    <textarea rows="3" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5" value={companySettings.address} onChange={e => setCompanySettings({...companySettings, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Mobile Contact</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5" value={companySettings.mobile} onChange={e => setCompanySettings({...companySettings, mobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">State Entity</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5" value={companySettings.state} onChange={e => setCompanySettings({...companySettings, state: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-xs text-indigo-400 border-b border-slate-800 pb-4 mb-6 uppercase tracking-wider">Settlement & UPI Credentials</h3>
                <div className="grid grid-cols-2 gap-6 text-xs">
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Bank Name</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5" value={companySettings.bankName} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">Account Number</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5 font-mono" value={companySettings.accountNumber} onChange={e => setCompanySettings({...companySettings, accountNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">IFSC Code</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5 uppercase font-mono" value={companySettings.ifsc} onChange={e => setCompanySettings({...companySettings, ifsc: e.target.value})} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px]">UPI VPA (for QR generation)</label>
                    <input type="text" className="bg-[#0A0B10] border border-slate-800 text-white w-full p-3.5 rounded-2xl mt-1.5 font-mono" value={companySettings.upiId} onChange={e => setCompanySettings({...companySettings, upiId: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => triggerToast("Entity configuration updated")} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold shadow-xl shadow-blue-600/30 text-xs flex items-center space-x-2">
                  <CheckCircle size={16} /><span>Commit Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}