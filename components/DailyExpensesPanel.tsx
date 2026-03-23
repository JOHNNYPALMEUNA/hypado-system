import React, { useState, useMemo } from 'react';
import { X, Search, Calendar as CalendarIcon, DollarSign, ExternalLink, Factory, Eye } from 'lucide-react';
import { Project, Quotation } from '../types';
import { formatCurrency } from '../utils';

interface DailyExpensesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  purchaseOrders: Quotation[];
}

const DailyExpensesPanel: React.FC<DailyExpensesPanelProps> = ({
  isOpen,
  onClose,
  projects,
  purchaseOrders
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Aggregate expenses from projects
  const dailyProjectExpenses = useMemo(() => {
    return projects.flatMap(p => 
      (p.expenses || [])
        .filter(e => e.date === selectedDate)
        .map(e => ({
          ...e,
          projectName: p.workName,
          type: 'expense',
          isInternal: e.metadata?.type === 'stock_consumption',
          receiptUrl: purchaseOrders.find(po => po.id === e.metadata?.orderId)?.receiptUrl
        }))
    );
  }, [projects, selectedDate, purchaseOrders]);

  // Aggregate stock purchases that don't have project expenses
  const dailyStockPurchases = useMemo(() => {
    return purchaseOrders
      .filter(po => 
        po.projectId === 'ESTOQUE' && 
        (po.status === 'Comprado' || po.status === 'Entregue') && 
        po.date.startsWith(selectedDate)
      )
      .map(po => {
        const total = po.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0);
        return {
          id: po.id,
          description: `Compra p/ Estoque Geral (${po.items.length} itens)`,
          value: total,
          date: po.date.split('T')[0],
          category: 'Estoque',
          projectName: 'ESTOQUE DA EMPRESA',
          type: 'stock_purchase',
          isInternal: false,
          receiptUrl: po.receiptUrl
        };
      });
  }, [purchaseOrders, selectedDate]);

  const allDailyItems = [...dailyProjectExpenses, ...dailyStockPurchases]
    .sort((a, b) => b.value - a.value);

  const totalSpent = allDailyItems
    .filter(i => !i.isInternal)
    .reduce((acc, item) => acc + item.value, 0);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-white/10 shadow-2xl flex flex-col z-[100] animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
              <DollarSign size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest leading-tight">Gastos Diários</h2>
              <p className="text-xs text-slate-400 font-bold uppercase">Visão Rápida de Despesas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            title="Fechar"
            className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Date Filter */}
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50 shrink-0">
          <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all p-2">
              <div className="pl-3 flex items-center text-slate-400">
                  <CalendarIcon size={18} />
              </div>
              <input 
                type="date"
                title="Data"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 outline-none ml-2 cursor-pointer"
              />
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
              <div>
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Lançado Hoje</p>
                  <p className="text-2xl font-black text-emerald-700 italic tracking-tighter leading-none">
                      {formatCurrency(totalSpent)}
                  </p>
              </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {allDailyItems.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Search size={24} className="text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-500 uppercase tracking-widest">Nenhum Gasto</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">Nenhuma despesa ou compra foi registrada no dia selecionado.</p>
                  </div>
              </div>
          )}

          {allDailyItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white border text-sm border-slate-100 rounded-[20px] p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                        {item.category}
                    </span>
                    <span className="font-black text-emerald-600">
                        {formatCurrency(item.value)}
                    </span>
                </div>
                
                <h4 className="font-bold text-foreground leading-snug pr-8" title={item.description}>
                    {item.description}
                    {item.isInternal && (
                      <span className="block text-[8px] font-black text-amber-500 uppercase mt-1 tracking-widest bg-amber-50 w-fit px-1 rounded">Consumo de Estoque (Internal)</span>
                    )}
                </h4>

                {item.receiptUrl && (
                  <button 
                    onClick={() => window.open(item.receiptUrl, '_blank')}
                    title="Ver Comprovante"
                    className="absolute right-4 bottom-4 p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all scale-75 group-hover:scale-100 origin-bottom-right"
                  >
                    <Eye size={18} />
                  </button>
                )}
                
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-500">
                    <span className="truncate flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest">
                        {item.type === 'stock_purchase' ? <Factory size={12}/> : null}
                        {item.projectName}
                    </span>
                </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default DailyExpensesPanel;
