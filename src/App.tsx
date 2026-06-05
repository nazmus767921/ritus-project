import { useState, useEffect } from 'react';
import { initDb, getDb } from './db/client';
import { transactions } from './db/schema';
import { calculateOptionA } from './lib/math/allocator';
import { Terminal, Database, Calculator, RefreshCw, CheckCircle2, AlertCircle, Plus, DollarSign, Package } from 'lucide-react';
import { getTransactions } from './db/queries/transactions';
import { getInventoryItems } from './db/queries/inventory';
import TransactionForm from './components/TransactionForm';
import ShipmentForm from './components/ShipmentForm';

function App() {
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  const [testRecords, setTestRecords] = useState<any[]>([]);
  const [inventoryRecords, setInventoryRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'finances' | 'inventory'>('finances');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  
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
    } catch (err: any) {
      alert('Failed to insert record: ' + err.message);
    }
  };

  const clearTestRecords = async () => {
    try {
      const db = getDb();
      await db.delete(transactions);
      await refreshTestRecords();
    } catch (err: any) {
      alert('Failed to clear records: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 flex flex-col items-center pb-24">
      {/* iOS HIG compliant view container */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Bar Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {activeTab === 'finances' ? 'ClothEx Finances' : 'ClothEx Stock Inventory'}
          </h1>
          <div className="flex items-center gap-1.5">
            {dbStatus === 'loading' && (
              <span className="flex items-center gap-1 text-sky-600 text-xs font-semibold bg-sky-50 px-2.5 py-1 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> SQLite Init
              </span>
            )}
            {dbStatus === 'ready' && (
              <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Engine Active
              </span>
            )}
            {dbStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600 text-xs font-semibold bg-red-50 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Engine Fault
              </span>
            )}
          </div>
        </div>

        {/* Database Status Alert Banner */}
        {dbStatus === 'error' && (
          <div className="bg-red-50 border-b border-red-100 p-4 flex gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-red-950">Database Connection Failed</p>
              <p className="mt-1 font-mono text-xs">{dbError}</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {activeTab === 'finances' ? (
            <div className="space-y-8 animate-fade-in">
              {/* Section: SQLite & IndexedDB VFS Info */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4" /> Relational Storage Layer
                </h2>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">SQLite Engine</span>
                    <span className="font-mono text-slate-700 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">@vlcn.io/wa-sqlite (WASM)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Persistence Layer</span>
                    <span className="font-mono text-slate-700 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">IndexedDB VFS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">ORM Framework</span>
                    <span className="font-mono text-slate-700 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">Drizzle sqlite-proxy</span>
                  </div>
                </div>
              </section>

              {/* Section: Option A Math Calculator */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="w-4 h-4" /> Option A Allocator Playground
                </h2>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  {/* Courier fee input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Courier Delivery Fee (Taka)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">৳</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-7 pr-3 font-mono text-sm focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                        value={courierFee}
                        onChange={(e) => setCourierFee(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Items configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Item 1 */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                      <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">Brand Batch A</p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded py-1 px-2 font-mono text-xs focus:outline-none focus:border-sky-600"
                          value={item1Qty}
                          onChange={(e) => setItem1Qty(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Wholesale Cost (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 border border-slate-100 rounded py-1 px-2 font-mono text-xs focus:outline-none focus:border-sky-600"
                          value={item1Cost}
                          onChange={(e) => setItem1Cost(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                      <p className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1">Brand Batch B</p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-100 rounded py-1 px-2 font-mono text-xs focus:outline-none focus:border-sky-600"
                          value={item2Qty}
                          onChange={(e) => setItem2Qty(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Wholesale Cost (৳)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-slate-50 border border-slate-100 rounded py-1 px-2 font-mono text-xs focus:outline-none focus:border-sky-600"
                          value={item2Cost}
                          onChange={(e) => setItem2Cost(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-time Math Output Card */}
                  {mathError ? (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl p-3 flex gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {mathError}
                    </div>
                  ) : mathResult.length > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2.5">
                      <p className="text-xs font-semibold text-emerald-950">Option A Proportional Allocation Results</p>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 font-bold">Batch A True Cost:</span>
                          <p className="text-sm font-semibold text-emerald-700">৳{(mathResult[0] / 100).toFixed(2)} <span className="text-[10px] text-slate-400">({mathResult[0]} Poisha)</span></p>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Batch B True Cost:</span>
                          <p className="text-sm font-semibold text-emerald-700">৳{(mathResult[1] / 100).toFixed(2)} <span className="text-[10px] text-slate-400">({mathResult[1]} Poisha)</span></p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Section: Relational Drizzle Sandbox */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4" /> Drizzle ORM Relational Sandbox
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={clearTestRecords}
                      disabled={dbStatus !== 'ready'}
                      className="text-xs bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold py-1.5 px-3 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                      Clear DB
                    </button>
                    <button
                      onClick={runInsertTest}
                      disabled={dbStatus !== 'ready'}
                      className="text-xs bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                      Add Test Record
                    </button>
                  </div>
                </div>

                {/* Records List */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                  {testRecords.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No records stored yet. Click "Add Test Record" to run Drizzle insert commands.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {testRecords.map((record) => (
                        <div key={record.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-white transition-colors">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{record.description}</p>
                            <p className="text-slate-400 font-mono">{new Date(record.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-mono font-bold text-slate-800">৳{(record.amount / 100).toFixed(2)}</p>
                            <span className="inline-block bg-slate-200/60 text-slate-600 font-semibold px-2 py-0.5 rounded">
                              {record.category}
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
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" /> Active Stock Items
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  Total Batches: {inventoryRecords.length}
                </span>
              </div>

              {inventoryRecords.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-500" />
                  <p className="font-semibold text-slate-600">No Inventory Items Logged</p>
                  <p className="mt-1 text-xs text-slate-400">Tap the "+" button below to import your first multi-brand shipment batch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventoryRecords.map((item) => {
                    // Badge configuration based on stock count
                    let badgeClass = '';
                    let badgeLabel = '';
                    if (item.quantity === 0) {
                      badgeClass = 'bg-red-50 text-red-700 border-red-200';
                      badgeLabel = 'Out of Stock';
                    } else if (item.quantity <= 3) {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                      badgeLabel = `Low Stock (${item.quantity} left)`;
                    } else {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      badgeLabel = `${item.quantity} in Stock`;
                    }

                    return (
                      <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-200">
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch #{item.id}</span>
                            <h3 className="text-base font-bold text-slate-900">{item.brand}</h3>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                        </div>

                        <div className="border-t border-slate-100 pt-3.5 grid grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 block font-sans font-semibold text-[10px] uppercase">Wholesale</span>
                            <span className="text-slate-700 font-bold">৳{(item.wholesaleCost / 100).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-sans font-semibold text-[10px] uppercase">True Unit Cost</span>
                            <span className="text-emerald-700 font-bold">৳{(item.trueCost / 100).toFixed(2)}</span>
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
          if (activeTab === 'finances') {
            setIsFormOpen(true);
          } else {
            setIsShipmentFormOpen(true);
          }
        }}
        disabled={dbStatus !== 'ready'}
        className="fixed bottom-20 right-6 w-14 h-14 bg-sky-600 active:bg-sky-700 hover:bg-sky-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        aria-label={activeTab === 'finances' ? 'Add Transaction' : 'Import Shipment'}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* iOS-Style Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-6 flex justify-around items-center z-40 shadow-lg min-h-[64px]">
        <button
          onClick={() => setActiveTab('finances')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold min-h-[44px] min-w-[60px] justify-center transition-colors ${
            activeTab === 'finances' ? 'text-sky-600' : 'text-slate-400 active:text-slate-600'
          }`}
        >
          <DollarSign className="w-5 h-5" />
          <span>Finances</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 text-[11px] font-semibold min-h-[44px] min-w-[60px] justify-center transition-colors ${
            activeTab === 'inventory' ? 'text-sky-600' : 'text-slate-400 active:text-slate-600'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Inventory</span>
        </button>
      </div>

      {/* Financial Logger Sheet */}
      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={() => {
          refreshTestRecords();
        }}
      />

      {/* Shipment Intake Sheet */}
      <ShipmentForm
        isOpen={isShipmentFormOpen}
        onClose={() => setIsShipmentFormOpen(false)}
        onSave={async () => {
          await refreshInventoryRecords();
          await refreshTestRecords(); // In case a courier fee is logged under transactions
        }}
      />
    </div>
  );
}

export default App;

