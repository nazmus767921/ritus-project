import { useState, useEffect, useMemo } from 'react';
import { initDb } from './db/client';
import { 
  RefreshCw, CheckCircle2, AlertCircle, Plus, DollarSign, Package, 
  LayoutDashboard, BarChart3, Settings, Download, Upload, RotateCcw, Edit2, Trash2, Undo2, Database, Search
} from 'lucide-react';

import { getTransactions, deleteTransaction, refundTransaction } from './db/queries/transactions';
import { getInventoryItems } from './db/queries/inventory';
import { getShipments, deleteShipment } from './db/queries/shipments';
import { fetchAggregatedMetrics } from './db/queries/dashboard';
import { getSetting, setSetting } from './db/queries/settings';

import TransactionForm from './components/TransactionForm';
import ShipmentForm from './components/ShipmentForm';
import DashboardView from './components/DashboardView';
import SellSheet from './components/SellSheet';
import ReportsView from './components/ReportsView';
import StockView from './components/StockView';

import { formatCurrency } from './lib/math/rounding';
import PinScreen, { hasPinEnabled, setStoredPin } from './components/PinScreen';
import { 
  exportDbToJson, importDbFromJson, triggerManualDownload, 
  autoBackupLocal, restoreFromAutoBackup, hasAutoBackup 
} from './lib/backup/backup';

import type { TransactionRecord, InventoryItemRecord, ShipmentWithItems, DashboardMetrics } from './db/types';

function App() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Data States
  const [testRecords, setTestRecords] = useState<TransactionRecord[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<InventoryItemRecord[]>([]);
  const [shipmentRecords, setShipmentRecords] = useState<ShipmentWithItems[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    tailoringNet: 0,
    clothingNet: 0,
    totalBusinessProfit: 0,
    safetyPocket: 0,
    totalAvailableStock: 0,
    totalSoldQuantity: 0,
    totalRemainingStock: 0
  });

  // Settings States
  const [safetyPocketTarget, setSafetyPocketTarget] = useState<number>(0); // Poisha
  const [safetyPocketTargetStr, setSafetyPocketTargetStr] = useState('0.00');
  const [targetMarkup, setTargetMarkup] = useState<number>(0.20); // fraction
  const [targetMarkupStr, setTargetMarkupStr] = useState('20');

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finances' | 'inventory' | 'reports' | 'stock'>('dashboard');

  // Modal / Sheet States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [editingShipment, setEditingShipment] = useState<ShipmentWithItems | null>(null);
  const [selectedSellItem, setSelectedSellItem] = useState<InventoryItemRecord | null>(null);

  // Collapsible Settings & Backup sections in Finances Tab
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackupsOpen, setIsBackupsOpen] = useState(false);

  // PIN Lock State
  const [isLocked, setIsLocked] = useState(hasPinEnabled);
  const [pinSetupValue, setPinSetupValue] = useState('');

  // Search/Filter & Pagination States
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState(0);
  const TX_PAGE_SIZE = 10;

  const filteredTransactions = useMemo(() => {
    let filtered = testRecords;
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase();
      filtered = filtered.filter(t => t.description.toLowerCase().includes(q));
    }
    if (txCategoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === txCategoryFilter);
    }
    return filtered;
  }, [testRecords, txSearchQuery, txCategoryFilter]);

  const paginatedTransactions = useMemo(() => {
    const start = txPage * TX_PAGE_SIZE;
    return filteredTransactions.slice(start, start + TX_PAGE_SIZE);
  }, [filteredTransactions, txPage]);

  const totalTxPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_PAGE_SIZE));
  
  // Initialize DB on component mount
  useEffect(() => {
    async function startDatabase() {
      try {
        setDbStatus('loading');
        await initDb();
        setDbStatus('ready');
        await loadSettings();
        await refreshAll();
      } catch (err: unknown) {
        console.error('Failed to initialize local sqlite db:', err);
        setDbStatus('error');
        setDbError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
    startDatabase();
  }, []);

  const loadSettings = async () => {
    try {
      const pocketStr = await getSetting('safety_pocket_target', '0');
      const markupStr = await getSetting('target_profit_margin', '20');
      
      const pocketVal = parseFloat(pocketStr) || 0;
      const markupVal = (parseFloat(markupStr) || 20) / 100;

      setSafetyPocketTarget(pocketVal * 100); // Poisha
      setSafetyPocketTargetStr(pocketStr);
      
      setTargetMarkup(markupVal);
      setTargetMarkupStr(markupStr);
    } catch (err: unknown) {
      console.error("Failed to load settings:", err);
    }
  };

  const handleSaveSafetyPocketTarget = async (valStr: string) => {
    setSafetyPocketTargetStr(valStr);
    const parsed = parseFloat(valStr) || 0;
    setSafetyPocketTarget(parsed * 100);
    await setSetting('safety_pocket_target', valStr);
    autoBackupLocal();
  };

  const handleSaveTargetMarkup = async (valStr: string) => {
    setTargetMarkupStr(valStr);
    const parsed = parseFloat(valStr) || 20;
    setTargetMarkup(parsed / 100);
    await setSetting('target_profit_margin', valStr);
    autoBackupLocal();
  };

  const refreshTestRecords = async () => {
    try {
      const allTx = await getTransactions();
      setTestRecords(allTx);
    } catch (err: unknown) {
      console.error('Error listing transactions:', err);
    }
  };

  const refreshInventoryRecords = async () => {
    try {
      const allItems = await getInventoryItems();
      setInventoryRecords(allItems);
    } catch (err: unknown) {
      console.error('Error listing inventory items:', err);
    }
  };

  const refreshShipmentRecords = async () => {
    try {
      const shps = await getShipments();
      const allItems = await getInventoryItems();
      const shpsWithItems: ShipmentWithItems[] = shps.map((s) => ({
        ...s,
        items: allItems.filter((item) => item.shipmentId === s.id)
      }));
      setShipmentRecords(shpsWithItems);
    } catch (err: unknown) {
      console.error("Failed to list shipments:", err);
    }
  };

  const refreshMetrics = async () => {
    try {
      const data = await fetchAggregatedMetrics();
      setMetrics(data);
    } catch (err: unknown) {
      console.error('Error listing aggregated metrics:', err);
    }
  };

  const refreshAll = async () => {
    // Run sequentially to avoid race conditions on the shared WASM tmpPtr buffer
    // used by sqlite3.prepare_v2 internally.
    await refreshTestRecords();
    await refreshInventoryRecords();
    await refreshShipmentRecords();
    await refreshMetrics();
    autoBackupLocal();
  };

  // Edit / Delete / Refund handlers
  const handleEditTransaction = (tx: TransactionRecord) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    if (confirm("Are you sure you want to delete this transaction? This will reverse any stock changes.")) {
      try {
        await deleteTransaction(id);
        await refreshAll();
      } catch (err: unknown) {
        alert("Failed to delete transaction: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleRefundTransaction = async (id: number) => {
    if (confirm("Mark this transaction as refunded? This will restore stock for clothing retail sales.")) {
      try {
        await refundTransaction(id);
        await refreshAll();
      } catch (err: unknown) {
        alert("Failed to refund transaction: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleEditShipment = (shp: ShipmentWithItems) => {
    setEditingShipment(shp);
    setIsShipmentFormOpen(true);
  };

  const handleDeleteShipment = async (id: number) => {
    if (confirm("Delete this shipment? This will cascade delete its inventory items and remove its courier fee overhead transaction.")) {
      try {
        await deleteShipment(id);
        await refreshAll();
      } catch (err: unknown) {
        alert("Failed to delete shipment: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const jsonStr = await exportDbToJson();
      triggerManualDownload(jsonStr);
    } catch (err: unknown) {
      alert("Failed to export backup: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        await importDbFromJson(text);
        await loadSettings();
        await refreshAll();
        alert("Backup restored successfully!");
      } catch (err: unknown) {
        alert("Restore failed: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreAutoBackup = async () => {
    if (confirm("Restore the database to the last automated local backup snapshot?")) {
      const ok = await restoreFromAutoBackup();
      if (ok) {
        await loadSettings();
        await refreshAll();
        alert("Automated local backup restored successfully!");
      } else {
        alert("Failed to restore. No valid auto-backup found.");
      }
    }
  };

  const expenseCategories = new Set(['personal_expense', 'tailoring_expense', 'clothing_overhead']);

  return (
    <>
      {isLocked && <PinScreen onUnlock={() => setIsLocked(false)} />}
      <div className={`min-h-screen bg-yellow-100 text-black font-sans p-4 md:p-8 flex flex-col items-center pb-28 ${isLocked ? 'hidden' : ''}`}>
      {/* Retro Game Window Wrapper */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border-[3px] border-black shadow-neobrutal overflow-hidden">
        {/* Retro Title Bar Header */}
        <div className="bg-black text-white px-4 py-3 flex items-center justify-between border-b-[3px] border-black select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Window control dots */}
            <span className="w-3 h-3 rounded-full bg-red-500 border border-black inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500 border border-black inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500 border border-black inline-block"></span>
          </div>
          <h1 className="text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider text-center flex-1 mx-2 truncate">
            {activeTab === 'dashboard' ? 'ClothEx_Dashboard.exe' : activeTab === 'finances' ? 'ClothEx_Finances.exe' : activeTab === 'inventory' ? 'ClothEx_Shipments.exe' : activeTab === 'stock' ? 'ClothEx_Stock.exe' : 'ClothEx_Reports.exe'}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {dbStatus === 'loading' && (
              <span className="flex items-center gap-1 text-black text-[10px] font-bold bg-yellow-300 px-2 py-0.5 rounded border border-black">
                <RefreshCw className="w-3 h-3 animate-spin" /> SQLite Init
              </span>
            )}
            {dbStatus === 'ready' && (
              <span className="flex items-center gap-1 text-black text-[10px] font-bold bg-green-400 px-2 py-0.5 rounded border border-black">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
            {dbStatus === 'error' && (
              <span className="flex items-center gap-1 text-white text-[10px] font-bold bg-red-500 px-2 py-0.5 rounded border border-black">
                <AlertCircle className="w-3 h-3" /> Fault
              </span>
            )}
          </div>
        </div>

        {/* Database Status Alert Banner */}
        {dbStatus === 'error' && (
          <div className="bg-red-400 border-b-[3px] border-black p-4 flex gap-3 text-black text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-black stroke-[2.5px]" />
            <div>
              <p className="font-bold uppercase tracking-wide">Database Connection Failed</p>
              <p className="mt-1.5 font-mono text-xs bg-white p-2 border-2 border-black rounded-lg">{dbError}</p>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {activeTab === 'dashboard' ? (
            <DashboardView
              metrics={metrics}
              inventoryItems={inventoryRecords}
              safetyPocketTarget={safetyPocketTarget}
              targetMarkup={targetMarkup}
              onSellClick={(item) => {
                setSelectedSellItem(item);
                setIsSellOpen(true);
              }}
            />
          ) : activeTab === 'finances' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Settings Accordion Control Panel */}
              <section className="bg-yellow-200 border-2 border-black rounded-xl overflow-hidden shadow-neobrutal-sm">
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="w-full p-3 flex justify-between items-center text-xs font-sans font-bold uppercase tracking-wider text-black select-none border-b-2 border-transparent hover:bg-yellow-300/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Business Target Settings
                  </span>
                  <span>{isSettingsOpen ? '[ - ]' : '[ + ]'}</span>
                </button>
                
                {isSettingsOpen && (
                  <div className="p-4 border-t-2 border-black bg-white space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Budget goal */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-sans font-extrabold text-slate-700 uppercase">Target Safety Pocket (৳)</label>
                        <input
                          type="number"
                          value={safetyPocketTargetStr}
                          onChange={(e) => handleSaveSafetyPocketTarget(e.target.value)}
                          placeholder="e.g. 5000.00"
                          className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[38px]"
                        />
                      </div>
                      
                      {/* Target markup */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-sans font-extrabold text-slate-700 uppercase">Expected Markup (%)</label>
                        <input
                          type="number"
                          value={targetMarkupStr}
                          onChange={(e) => handleSaveTargetMarkup(e.target.value)}
                          placeholder="e.g. 20"
                          className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[38px]"
                        />
                      </div>
                    </div>

                    {/* PIN Lock Section */}
                    <div className="border-t-2 border-slate-200 pt-4 space-y-3">
                      <label className="text-[10px] font-sans font-extrabold text-slate-700 uppercase">App PIN Lock</label>
                      {hasPinEnabled() ? (
                        <div className="space-y-2">
                          <input
                            type="password"
                            maxLength={6}
                            placeholder="Enter new PIN to change"
                            value={pinSetupValue}
                            onChange={(e) => setPinSetupValue(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[38px]"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (pinSetupValue.length === 6) {
                                  setStoredPin(pinSetupValue);
                                  setPinSetupValue('');
                                  alert('PIN updated successfully.');
                                }
                              }}
                              disabled={pinSetupValue.length !== 6}
                              className="flex-1 bg-green-300 border-2 border-black rounded-xl py-2 px-3 text-xs font-sans font-bold uppercase disabled:opacity-40 cursor-pointer hover:bg-green-400 transition-colors"
                            >
                              Set
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Remove PIN lock?')) {
                                  setStoredPin('');
                                  alert('PIN lock removed.');
                                }
                              }}
                              className="flex-1 bg-red-300 border-2 border-black rounded-xl py-2 px-3 text-xs font-sans font-bold uppercase cursor-pointer hover:bg-red-400 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="password"
                            maxLength={6}
                            placeholder="Set a 6-digit PIN"
                            value={pinSetupValue}
                            onChange={(e) => setPinSetupValue(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 px-3 font-mono text-xs text-black focus:outline-none min-h-[38px]"
                          />
                          <button
                            onClick={() => {
                              if (pinSetupValue.length === 6) {
                                setStoredPin(pinSetupValue);
                                setPinSetupValue('');
                                setIsLocked(true);
                                alert('PIN set. The app will lock on next action.');
                              }
                            }}
                            disabled={pinSetupValue.length !== 6}
                            className="w-full bg-purple-600 text-white border-2 border-black rounded-xl py-2 px-3 text-xs font-sans font-bold uppercase disabled:opacity-40 cursor-pointer hover:bg-purple-700 transition-colors"
                          >
                            Enable
                          </button>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-500 font-sans font-medium">Set a 6-digit PIN to lock the app on startup.</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Backups Accordion Control Panel */}
              <section className="bg-cyan-200 border-2 border-black rounded-xl overflow-hidden shadow-neobrutal-sm">
                <button 
                  onClick={() => setIsBackupsOpen(!isBackupsOpen)}
                  className="w-full p-3 flex justify-between items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-black select-none border-b-2 border-transparent hover:bg-cyan-300/50 transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0 truncate">
                    <Database className="w-4 h-4 text-black shrink-0" /> <span className="truncate">Local Backup & Restore Utilities</span>
                  </span>
                  <span className="shrink-0">{isBackupsOpen ? '[ - ]' : '[ + ]'}</span>
                </button>
                
                {isBackupsOpen && (
                  <div className="p-4 border-t-2 border-black bg-white space-y-4 animate-fade-in">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleDownloadBackup}
                        className="flex-1 min-w-[150px] bg-green-300 hover:bg-green-400 active:translate-x-[1px] active:translate-y-[1px] text-xs font-sans font-bold uppercase py-2 px-4 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all flex items-center justify-start gap-1.5 min-h-[40px] cursor-pointer text-left"
                      >
                        <Download className="w-4 h-4 shrink-0" /> <span>Download JSON Backup</span>
                      </button>

                      <label className="flex-1 min-w-[150px] bg-purple-300 hover:bg-purple-400 active:translate-x-[1px] active:translate-y-[1px] text-xs font-sans font-bold uppercase py-2 px-4 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all flex items-center justify-start gap-1.5 min-h-[40px] cursor-pointer text-left">
                        <Upload className="w-4 h-4 shrink-0" /> <span>Import Backup File</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportBackup}
                          className="hidden"
                        />
                      </label>

                      {hasAutoBackup() && (
                        <button
                          onClick={handleRestoreAutoBackup}
                          className="flex-1 min-w-[150px] bg-yellow-300 hover:bg-yellow-400 active:translate-x-[1px] active:translate-y-[1px] text-xs font-sans font-bold uppercase py-2 px-4 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all flex items-center justify-start gap-1.5 min-h-[40px] cursor-pointer text-left"
                        >
                          <RotateCcw className="w-4 h-4 shrink-0" /> <span>Restore Last Auto-Backup</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Transactions Log Section */}
              <section className="space-y-3">
                <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4.5 h-4.5 text-black" /> Financial Transactions Log
                </h2>

                {/* Search & Filter Controls */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={txSearchQuery}
                      onChange={(e) => { setTxSearchQuery(e.target.value); setTxPage(0); }}
                      className="w-full bg-white border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                    />
                  </div>
                  <select
                    value={txCategoryFilter}
                    onChange={(e) => { setTxCategoryFilter(e.target.value); setTxPage(0); }}
                    className="bg-white border-2 border-black rounded-xl py-2 px-2 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                  >
                    <option value="all">All</option>
                    <option value="clothing_income">Clothing Income</option>
                    <option value="clothing_overhead">Clothing Overhead</option>
                    <option value="tailoring_income">Tailoring Income</option>
                    <option value="tailoring_expense">Tailoring Expense</option>
                    <option value="personal_expense">Personal Expense</option>
                  </select>
                </div>

                <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden shadow-neobrutal-sm">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      {testRecords.length === 0
                        ? 'No records logged yet. Tap the "+" button to record your first transaction.'
                        : 'No transactions match your search criteria.'}
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-black">
                      {paginatedTransactions.map((record) => {
                        const isRefunded = record.status === 'refunded';
                        return (
                          <div 
                            key={record.id} 
                            className={`p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-yellow-50/10 transition-colors ${
                              isRefunded ? 'bg-slate-50 opacity-70' : ''
                            }`}
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-sans font-bold text-black truncate ${isRefunded ? 'line-through text-slate-500' : ''}`}>
                                  {record.description}
                                </p>
                                {record.customerName && (
                                  <span className="bg-blue-100 text-black text-[8px] font-sans font-extrabold px-1.5 py-0.5 rounded border border-black uppercase tracking-wide shrink-0">
                                    {record.customerName}
                                  </span>
                                )}
                                {isRefunded && (
                                  <span className="bg-red-400 text-black text-[8px] font-sans font-extrabold px-1.5 py-0.5 rounded border border-black uppercase tracking-wide shrink-0">
                                    Refunded
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 font-mono text-[10px]">
                                {new Date(record.createdAt).toLocaleString()}
                                {record.category === 'clothing_income' && <span className="ml-2 font-bold">Qty: {record.quantity ?? 1}</span>}
                                {record.notes && <span className="text-slate-400 ml-2">— {record.notes}</span>}
                              </p>
                            </div>
                            
                            <div className="text-right space-y-1.5 shrink-0 flex flex-col items-end">
                              <p className={`font-display font-bold ${expenseCategories.has(record.category) ? 'text-red-600' : 'text-black'} ${isRefunded ? 'line-through text-slate-400' : ''}`}>
                                {formatCurrency(record.amount)}
                              </p>
                              
                              <div className="flex gap-1.5 items-center">
                                <span className="inline-block bg-slate-100 text-slate-700 font-sans font-bold text-[9px] px-1.5 py-0.5 rounded border border-black uppercase tracking-wider">
                                  {record.category.replace('_', ' ')}
                                </span>
                                
                                <button
                                  onClick={() => handleEditTransaction(record)}
                                  className="p-1 bg-white hover:bg-slate-100 border border-black rounded active:bg-slate-200"
                                  title="Edit Transaction"
                                >
                                  <Edit2 className="w-3 h-3 text-black" />
                                </button>

                                {!isRefunded && (record.category === 'clothing_income' || record.category === 'tailoring_income') && (
                                  <button
                                    onClick={() => handleRefundTransaction(record.id)}
                                    className="p-1 bg-yellow-200 hover:bg-yellow-300 border border-black rounded active:bg-yellow-400"
                                    title="Refund/Return"
                                  >
                                    <Undo2 className="w-3 h-3 text-black" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteTransaction(record.id)}
                                  className="p-1 bg-red-300 hover:bg-red-400 border border-black rounded active:bg-red-500"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-3 h-3 text-red-700" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {filteredTransactions.length > TX_PAGE_SIZE && (
                    <div className="flex items-center justify-between p-3 border-t-2 border-black bg-slate-50">
                      <button
                        onClick={() => setTxPage(p => Math.max(0, p - 1))}
                        disabled={txPage === 0}
                        className="text-xs font-sans font-bold uppercase px-3 py-1.5 rounded-lg border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        Prev
                      </button>
                      <span className="text-xs font-sans font-bold text-slate-600">
                        Page {txPage + 1} of {totalTxPages}
                      </span>
                      <button
                        onClick={() => setTxPage(p => Math.min(totalTxPages - 1, p + 1))}
                        disabled={txPage >= totalTxPages - 1}
                        className="text-xs font-sans font-bold uppercase px-3 py-1.5 rounded-lg border-2 border-black bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'inventory' ? (
            <div className="space-y-6 animate-fade-in">
              {/* Shipments Log Section */}
              <section className="space-y-3 pt-4 border-t-2 border-slate-300">
                <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-black" /> Shipments Intake Log
                </h2>

                <div className="bg-white rounded-xl border-[3px] border-black overflow-hidden shadow-neobrutal-sm">
                  {shipmentRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No shipments imported yet. Tap the "+" button to import a shipment.
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-black max-h-[300px] overflow-y-auto">
                      {shipmentRecords.map((shp) => (
                        <div key={shp.id} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-yellow-50/10 transition-colors">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-sans font-bold text-black">
                              Shipment #{shp.id} (Courier Fee: {formatCurrency(shp.courierFee)})
                            </h3>
                            <p className="text-slate-600 font-mono text-[10px]">
                              Date: {new Date(shp.deliveryDate).toLocaleDateString()} | Batches: {shp.items?.length || 0}
                            </p>
                          </div>
                          <div className="flex gap-1.5 items-center shrink-0">
                            <button
                              onClick={() => handleEditShipment(shp)}
                              className="p-1.5 bg-white hover:bg-slate-100 border border-black rounded active:bg-slate-200 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                              title="Edit Shipment"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-black" />
                            </button>
                            <button
                              onClick={() => handleDeleteShipment(shp.id)}
                              className="p-1.5 bg-red-300 hover:bg-red-400 border border-black rounded active:bg-red-500 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                              title="Delete Shipment"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-700" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'stock' ? (
            <StockView
              inventoryItems={inventoryRecords}
              onSellClick={(item) => {
                setSelectedSellItem(item);
                setIsSellOpen(true);
              }}
            />
          ) : (
            <ReportsView
              transactions={testRecords}
              inventoryItems={inventoryRecords}
              targetMarkup={targetMarkup}
            />
          )}
        </div>
      </div>

      {/* Floating Action Button (fixed position above tab bar) */}
      {activeTab !== 'reports' && activeTab !== 'dashboard' && (
        <button
          onClick={() => {
            if (activeTab === 'inventory' || activeTab === 'stock') {
              setEditingShipment(null);
              setIsShipmentFormOpen(true);
            } else {
              setEditingTransaction(null);
              setIsFormOpen(true);
            }
          }}
          disabled={dbStatus !== 'ready'}
          className="fixed bottom-24 right-6 w-14 h-14 bg-purple-600 text-white rounded-full border-[3px] border-black shadow-neobrutal-sm hover:shadow-neobrutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-all z-40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          aria-label={activeTab === 'inventory' ? 'Import Shipment' : 'Add Transaction'}
        >
          <Plus className="w-7 h-7 stroke-[3px]" />
        </button>
      )}

      {/* Neobrutalist Bottom Tab Bar */}
      <div className="fixed bottom-4 left-4 right-4 bg-white border-[3px] border-black rounded-2xl py-2.5 px-4 flex justify-around items-center z-40 shadow-neobrutal min-h-[68px] max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'dashboard'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span>Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'finances'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <DollarSign className="w-5 h-5 shrink-0" />
          <span>Finances</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'inventory'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <Database className="w-5 h-5 shrink-0" />
          <span>Shipments</span>
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'stock'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <Package className="w-5 h-5 shrink-0" />
          <span>Stock</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider min-h-[44px] min-w-[64px] justify-center transition-all rounded-xl border-2 ${
            activeTab === 'reports'
              ? 'bg-purple-600 text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              : 'text-slate-700 border-transparent hover:bg-slate-100 active:translate-y-[1px]'
          }`}
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          <span>Reports</span>
        </button>
      </div>

      {/* Financial Logger Sheet */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        onSave={refreshAll}
        transaction={editingTransaction}
        inventoryItems={inventoryRecords}
        targetMarkup={targetMarkup}
      />

      {/* Shipment Intake Sheet */}
      <ShipmentForm
        isOpen={isShipmentFormOpen}
        onClose={() => {
          setIsShipmentFormOpen(false);
          setEditingShipment(null);
        }}
        onSave={refreshAll}
        shipment={editingShipment}
      />

      {/* Product Sale execution sheet */}
      <SellSheet
        isOpen={isSellOpen}
        onClose={() => {
          setIsSellOpen(false);
          setSelectedSellItem(null);
        }}
        onSave={refreshAll}
        item={selectedSellItem}
        targetMarkup={targetMarkup}
      />
      </div>
    </>
  );
}

export default App;
