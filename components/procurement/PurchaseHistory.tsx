import React, { useMemo } from 'react';
import { ShoppingCart, Calendar, ArrowRight } from 'lucide-react';
import { Quotation, Supplier } from '../../types';

interface PurchaseHistoryProps {
  purchaseOrders: Quotation[];
  suppliers: Supplier[];
}

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ purchaseOrders, suppliers }) => {
  const groupedHistory = useMemo(() => {
    const paid = purchaseOrders.filter(q => q.status === 'Comprado' || q.status === 'Entregue');
    const groups: Record<string, any> = {};

    paid.forEach(q => {
      const dateStr = q.settlementDate || q.date;
      const dateObj = new Date(dateStr);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const sId = `${year}-${month}`;

      if (!groups[sId]) {
        groups[sId] = {
          id: sId,
          date: dateStr,
          total: 0,
          ordersCount: 0,
          suppliers: new Set<string>(),
          projects: new Set<string>()
        };
      }
      const item = groups[sId];
      const orderTotal = q.items.reduce((acc, i) => acc + ((i.materialValue || 0) * i.quantity), 0);
      item.total += orderTotal;
      item.ordersCount += 1;
      const sName = suppliers.find(s => s.id === q.supplierId)?.name || 'Fornecedor';
      item.suppliers.add(sName);
      item.projects.add(q.workName);
    });

    return Object.values(groups).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseOrders, suppliers]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Histórico de Liquidações</h4>
        <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fechamentos Mensais</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groupedHistory.map((group: any) => (
          <div key={group.id} className="bg-card p-10 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h5 className="text-3xl font-black text-foreground uppercase italic tracking-tighter leading-none mb-1">
                        {new Date(group.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.ordersCount} Pedidos Liquidados</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                    <ShoppingCart size={28} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investimento Total</p>
                    <p className="text-2xl font-black text-emerald-600 italic tracking-tighter leading-none">R$ {group.total.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fornecedores</p>
                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">{group.suppliers.size}</p>
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Obras atendidas neste ciclo</p>
                <div className="flex flex-wrap gap-2">
                    {Array.from(group.projects).map((p: any) => (
                        <span key={p} className="px-4 py-2 bg-white rounded-full border border-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider shadow-sm">
                            {p}
                        </span>
                    ))}
                </div>
            </div>
            
            <button className="mt-8 w-full py-4 bg-slate-50 text-slate-900 rounded-[20px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                Ver Detalhes do Fechamento <ArrowRight size={16} />
            </button>
          </div>
        ))}
        {groupedHistory.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">Nenhum histórico de compra liquidada encontrado.</div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistory;
