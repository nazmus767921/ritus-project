import { useState, useEffect } from 'react';
import { initDb, getDb } from './db/client';
import { transactions } from './db/schema';
import { calculateOptionA } from './lib/math/allocator';
import { Terminal, Database, Calculator, RefreshCw, CheckCircle2, AlertCircle, Plus, DollarSign, Package, LayoutDashboard } from 'lucide-react';
import { getTransactions } from './db/queries/transactions';
import { getInventoryItems } from './db/queries/inventory';
import { fetchAggregatedMetrics } from './db/queries/dashboard';
import TransactionForm from './components/TransactionForm';
import ShipmentForm from './components/ShipmentForm';
import DashboardView from './components/DashboardView';
import SellSheet from './components/SellSheet';

function App() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  const [testRecords, setTestRecords] = useState<any[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'finances' | 'inventory'>('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [selectedSellItem, setSelectedSellItem] = useState<any | null>(null);
  const [metrics, setMetrics] = useState({
    tailoringNet: 0,
    clothingNet: 0,
    totalBusinessProfit: 0,
    safetyPocket: 0
  });
  
  // Math playground state
  const [courierFee, setCourierFee] = useState<string>('150.00');
  const [item1Qty, setItem1Qty] = useState<string>('10');
  const [item1Cost, setItem1Cost] = useState<string>('120.00');
  const [item2Qty, setItem2Qty] = useState<string>('5');
  const [item2Cost, setItem2Cost] = useState<string>('200.00');
  const [mathResult, setMathResult] = useState<number[]>([]);
  const [mathError, setMathError] = useState<string | null>(null);

  // Initialize DB on component mount
  useEffect(() => {
    async function startDatabase() {
      try {
        setDbStatus('loading');
        await initDb();
        setDbStatus('ready');
        await refreshTestRecords();
        await refreshInventoryRecords();
        await refreshMetrics();
      } catch (err: any) {
        console.error('Failed to initialize local sqlite db:', err);
        setDbStatus('error');
        setDbError(err.message || 'Unknown error');
      }
    }
    startDatabase();
  }, []);

  // Recalculate Option A whenever playground inputs change
  useEffect(() => {
    try {
      setMathError(null);
      const feePoisha = Math.round(parseFloat(courierFee) * 100);
      const qty1 = parseInt(item1Qty);
      const cost1Poisha = Math.round(parseFloat(item1Cost) * 100);
      const qty2 = parseInt(item2Qty);
      const cost2Poisha = Math.round(parseFloat(item2Cost) * 100);

      if (isNaN(feePoisha) || isNaN(qty1) || isNaN(cost1Poisha) || isNaN(qty2) || isNaN(cost2Poisha)) {
        setMathResult([]);
        return;
      }

      if (qty1 < 0 || qty2 < 0) {
        throw new Error('Quantities cannot be negative.');
      }

      const items = [
        { quantity: qty1, wholesaleCost: cost1Poisha },
        { quantity: qty2, wholesaleCost: cost2Poisha }
      ];

      const trueCosts = calculateOptionA(feePoisha, items);
      setMathResult(trueCosts);
    } catch (err: any) {
      setMathError(err.message);
      setMathResult([]);
    }
  }, [courierFee, item1Qty, item1Cost, item2Qty, item2Cost]);

  const refreshTestRecords = async () => {
    try {
      const allTx = await getTransactions();
      setTestRecords(allTx);
    } catch (err) {
      console.error('Error listing test transactions:', err);
    }
  };

  const refreshInventoryRecords = async () => {
    try {
      const allItems = await getInventoryItems();
      setInventoryRecords(allItems);
    } catch (err) {
      console.error('Error listing inventory items:', err);
    }
  };

  const refreshMetrics = async () => {
    try {
      const data = await fetchAggregatedMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error listing aggregated metrics:', err);
    }
  };

  const runInsertTest = async () => {
    try {
      const db = getDb();
      const categories: ('personal_expense' | 'tailoring_expense' | 'clothing_overhead' | 'tailoring_income' | 'clothing_income')[] = [
        'clothing_overhead',
        'tailoring_income',
        'personal_expense'
      ];
      
      const category = categories[Math.floor(Math.random() * categories.length)];
      const amount = Math.floor(Math.random() * 10000) + 500; // 5.00 to 105.00 Taka
      const descriptions = {
        clothing_overhead: 'Hanger batches',
        tailoring_income: 'Suit tailoring service',
        personal_expense: 'Lunch snack'
      };
      
      await db.insert(transactions).values({
        amount,
        category,
        description: descriptions[category as keyof typeof descriptions] || 'Diagnostic entry',
        createdAt: new Date()
      });
      
      await refreshTestRecords();
      await refreshMetrics();
    } catch (err: any) {
      alert('Failed to insert record: ' + err.message);
    }
  };

  const clearTestRecords = async () => {
    try {
      const db = getDb();
      await db.delete(transactions);
      await refreshTestRecords();
      await refreshMetrics();
    } catch (err: any) {
      alert('Failed to clear records: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-100 text-black font-sans p-4 md:p-8 flex flex-col items-center pb-28">
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
            {activeTab === 'dashboard' ? 'ClothEx_Dashboard.exe' : activeTab === 'finances' ? 'ClothEx_Finances.exe' : 'ClothEx_Stock_Inventory.exe'}
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
              onSellClick={(item) => {
                setSelectedSellItem(item);
                setIsSellOpen(true);
              }}
            />
          ) : activeTab === 'finances' ? (
            <div className="space-y-8 animate-fade-in">
              {/* Section: SQLite & IndexedDB VFS Info */}
              <section className="space-y-3">
                <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-black" /> Relational Storage Layer
                </h2>
                <div className="bg-white rounded-xl p-4 border-2 border-black shadow-neobrutal-sm text-xs sm:text-sm space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold">SQLite Engine</span>
                    <span className="font-mono text-black font-bold bg-yellow-200 px-2 py-0.5 rounded-lg border-2 border-black">@vlcn.io/wa-sqlite (WASM)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold">Persistence Layer</span>
                    <span className="font-mono text-black font-bold bg-yellow-200 px-2 py-0.5 rounded-lg border-2 border-black">IndexedDB VFS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold">ORM Framework</span>
                    <span className="font-mono text-black font-bold bg-yellow-200 px-2 py-0.5 rounded-lg border-2 border-black">Drizzle sqlite-proxy</span>
                  </div>
                </div>
              </section>

              {/* Section: Option A Math Calculator */}
              <section className="space-y-3">
                <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-black" /> Option A Allocator Playground
                </h2>
                <div className="bg-white rounded-xl p-5 border-2 border-black shadow-neobrutal space-y-4">
                  {/* Courier fee input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-sans font-bold text-slate-700 uppercase">Courier Delivery Fee (Taka)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-black font-bold font-mono">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-slate-50 border-2 border-black rounded-xl py-2 pl-7 pr-3 font-mono text-sm text-black focus:outline-none focus:bg-white focus:ring-0 min-h-[44px]"
                        value={courierFee}
                        onChange={(e) => setCourierFee(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Items configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Item 1 */}
                    <div className="bg-slate-50 p-3 rounded-xl border-2 border-black space-y-2.5">
                      <p className="text-[10px] font-display font-bold text-black border-b-2 border-black pb-1 uppercase tracking-wide">Brand Batch A</p>
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Quantity</label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-black rounded-lg py-1 px-2 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                          value={item1Qty}
                          onChange={(e) => setItem1Qty(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Wholesale (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white border-2 border-black rounded-lg py-1 px-2 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                          value={item1Cost}
                          onChange={(e) => setItem1Cost(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-slate-50 p-3 rounded-xl border-2 border-black space-y-2.5">
                      <p className="text-[10px] font-display font-bold text-black border-b-2 border-black pb-1 uppercase tracking-wide">Brand Batch B</p>
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Quantity</label>
                        <input
                          type="number"
                          className="w-full bg-white border-2 border-black rounded-lg py-1 px-2 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                          value={item2Qty}
                          onChange={(e) => setItem2Qty(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-sans font-bold text-slate-600 uppercase">Wholesale (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-white border-2 border-black rounded-lg py-1 px-2 font-mono text-xs text-black focus:outline-none min-h-[36px]"
                          value={item2Cost}
                          onChange={(e) => setItem2Cost(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-time Math Output Card */}
                  {mathError ? (
                    <div className="bg-red-300 border-2 border-black text-black text-xs font-semibold rounded-xl p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-black" /> {mathError}
                    </div>
                  ) : mathResult.length > 0 ? (
                    <div className="bg-green-300 border-2 border-black rounded-xl p-3.5 space-y-2.5 shadow-neobrutal-sm">
                      <p className="text-xs font-display font-bold text-black uppercase tracking-wide">Option A Proportional Allocation Results</p>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-800 font-bold block">Batch A True Cost:</span>
                          <p className="text-sm font-display font-extrabold text-black mt-0.5">৳{(mathResult[0] / 100).toFixed(2)} <span className="text-[10px] text-slate-700 font-normal">({mathResult[0]} Poisha)</span></p>
                        </div>
                        <div>
                          <span className="text-slate-800 font-bold block">Batch B True Cost:</span>
                          <p className="text-sm font-display font-extrabold text-black mt-0.5">৳{(mathResult[1] / 100).toFixed(2)} <span className="text-[10px] text-slate-700 font-normal">({mathResult[1]} Poisha)</span></p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Section: Relational Drizzle Sandbox */}
              <section className="space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-black" /> Drizzle ORM Relational Sandbox
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={clearTestRecords}
                      disabled={dbStatus !== 'ready'}
                      className="text-xs bg-red-300 hover:bg-red-400 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-black font-sans font-bold py-1.5 px-3 rounded-xl border-2 border-black shadow-neobrutal-sm transition-all disabled:opacity-50 min-h-[44px]"
                    >
                      Clear DB
                    </button>
                    <button
                      onClick={runInsertTest}
                      disabled={dbStatus !== 'ready'}
                      className="text-xs bg-purple-500 text-white hover:bg-purple-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] font-sans font-bold py-1.5 px-3 rounded-xl border-2 border-black shadow-neobrutal-sm transition-all disabled:opacity-50 min-h-[44px]"
                    >
                      Add Test Record
                    </button>
                  </div>
                </div>

                {/* Records List */}
                <div className="bg-white rounded-xl border-2 border-black overflow-hidden shadow-neobrutal-sm">
                  {testRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50 text-black" />
                      No records stored yet. Click "Add Test Record" to run Drizzle insert commands.
                    </div>
                  ) : (
                    <div className="divide-y-2 divide-black max-h-60 overflow-y-auto">
                      {testRecords.map((record) => (
                        <div key={record.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-yellow-50 transition-colors">
                          <div className="space-y-1">
                            <p className="font-sans font-bold text-black">{record.description}</p>
                            <p className="text-slate-600 font-mono">{new Date(record.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right space-y-1 shrink-0">
                            <p className="font-display font-bold text-black">৳{(record.amount / 100).toFixed(2)}</p>
                            <span className="inline-block bg-yellow-200 text-black font-sans font-bold text-[10px] px-2 py-0.5 rounded-md border-2 border-black uppercase tracking-wide shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                              {record.category.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Section: Stock Grid / Cards */}
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-sans font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-black" /> Active Stock Items
                </h2>
                <span className="text-xs font-sans font-bold text-slate-600">
                  Total Batches: {inventoryRecords.length}
                </span>
              </div>

              {inventoryRecords.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-black p-12 text-center text-slate-500 text-sm shadow-neobrutal-sm">
                  <Package className="w-10 h-10 mx-auto mb-3 text-black opacity-60" />
                  <p className="font-sans font-bold text-black text-base uppercase">No Inventory Items Logged</p>
                  <p className="mt-2 text-xs text-slate-600">Tap the "+" button below to import your first multi-brand shipment batch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventoryRecords.map((item) => {
                    // Badge configuration based on stock count
                    let badgeClass = '';
                    let badgeLabel = '';
                    if (item.quantity === 0) {
                      badgeClass = 'bg-red-400 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
                      badgeLabel = 'Out of Stock';
                    } else if (item.quantity <= 3) {
                      badgeClass = 'bg-yellow-300 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
                      badgeLabel = `Low Stock (${item.quantity})`;
                    } else {
                      badgeClass = 'bg-green-400 text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]';
                      badgeLabel = `${item.quantity} in Stock`;
                    }

                    return (
                      <div key={item.id} className="bg-white rounded-xl border-2 border-black p-4 shadow-neobrutal-sm flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neobrutal transition-all duration-200">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">Batch #{item.id}</span>
                            <h3 className="text-base font-sans font-bold text-black truncate max-w-[130px]">{item.brand}</h3>
                          </div>
                          <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-md border-2 ${badgeClass} uppercase tracking-wider shrink-0`}>
                            {badgeLabel}
                          </span>
                        </div>

                        <div className="border-t-2 border-black pt-3 grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-slate-600 block font-sans font-bold text-[9px] uppercase tracking-wider">Wholesale</span>
                            <span className="text-black font-extrabold">৳{(item.wholesaleCost / 100).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 block font-sans font-bold text-[9px] uppercase tracking-wider">True Cost</span>
                            <span className="text-green-600 font-extrabold">৳{(item.trueCost / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (fixed position above tab bar) */}
      <button
        onClick={() => {
          if (activeTab === 'inventory') {
            setIsShipmentFormOpen(true);
          } else {
            setIsFormOpen(true);
          }
        }}
        disabled={dbStatus !== 'ready'}
        className="fixed bottom-24 right-6 w-14 h-14 bg-purple-600 text-white rounded-full border-[3px] border-black shadow-neobrutal-sm hover:shadow-neobrutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-all z-40 disabled:opacity-50 disabled:pointer-events-none"
        aria-label={activeTab === 'inventory' ? 'Import Shipment' : 'Add Transaction'}
      >
        <Plus className="w-7 h-7 stroke-[3px]" />
      </button>

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
          <Package className="w-5 h-5 shrink-0" />
          <span>Inventory</span>
        </button>
      </div>

      {/* Financial Logger Sheet */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async () => {
          await refreshTestRecords();
          await refreshMetrics();
        }}
      />

      {/* Shipment Intake Sheet */}
      <ShipmentForm
        isOpen={isShipmentFormOpen}
        onClose={() => setIsShipmentFormOpen(false)}
        onSave={async () => {
          await refreshInventoryRecords();
          await refreshTestRecords(); // In case a courier fee is logged under transactions
          await refreshMetrics();
        }}
      />

      {/* Product Sale execution sheet */}
      <SellSheet
        isOpen={isSellOpen}
        onClose={() => {
          setIsSellOpen(false);
          setSelectedSellItem(null);
        }}
        onSave={async () => {
          await refreshInventoryRecords();
          await refreshMetrics();
          await refreshTestRecords();
        }}
        item={selectedSellItem}
      />
    </div>
  );
}

export default App;

