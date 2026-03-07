
import React, { useMemo } from 'react';
import { Quotation, Supplier } from '../types';
import {
    ShoppingCart,
    Calendar,
    User,
    DollarSign,
    FileText,
    Printer,
    ArrowLeft,
    ShieldCheck,
    Package,
    CheckCircle2
} from 'lucide-react';

interface Props {
    settlementId: string;
    quotations: Quotation[];
    suppliers: Supplier[];
    onBack?: () => void;
}

const PurchaseSettlementReportView: React.FC<Props> = ({ settlementId, quotations, suppliers, onBack }) => {
    const sId = settlementId || '';

    const settlementOrders = useMemo(() => {
        if (sId.length === 7 && sId.includes('-')) {
            // Lote Mensal Format YYYY-MM
            return quotations.filter(q => {
                if (q.status !== 'Comprado' && q.status !== 'Entregue') return false;
                const dateStr = q.settlementDate || q.date;
                return dateStr && dateStr.startsWith(sId);
            });
        }
        return quotations.filter(q => q.settlementId === sId);
    }, [quotations, sId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(value);
    };

    if (settlementOrders.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-950">
                <ShoppingCart size={64} className="mb-4 opacity-20" />
                <h1 className="text-xl font-black uppercase italic">Lote de Compra não encontrado</h1>
                <p className="text-sm">O ID {settlementId} não possui pedidos vinculados.</p>
                {onBack && (
                    <button onClick={onBack} className="mt-8 px-6 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all">
                        Voltar ao Sistema
                    </button>
                )}
            </div>
        );
    }

    const stats = useMemo(() => {
        let total = 0;
        const supplierCounts: Record<string, number> = {};

        settlementOrders.forEach(q => {
            const orderTotal = q.items.reduce((acc, item) => acc + ((item.materialValue || 0) * item.quantity), 0);
            total += orderTotal;
            const sName = suppliers.find(s => s.id === q.supplierId)?.name || 'Fornecedor';
            supplierCounts[sName] = (supplierCounts[sName] || 0) + 1;
        });

        return { total, supplierCounts };
    }, [settlementOrders, suppliers]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-10 font-sans selection:bg-amber-500/30 selection:text-amber-200">
            <div className="max-w-5xl mx-auto space-y-10">

                {/* Header - Non-Printable */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-900 shadow-xl shadow-amber-500/20">
                                <ShieldCheck size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                    Espelho de Lote: Compras
                                </h1>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest italic flex items-center gap-2">
                                    REFERÊNCIA: <span className="text-slate-300 font-black">
                                        {sId.length === 7 && sId.includes('-') ? `LOTE MENSAL ${sId.split('-')[1]}/${sId.split('-')[0]}` : (sId || 'DESCONHECIDO')}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handlePrint}
                            className="flex-1 md:flex-none px-6 py-3 bg-amber-500 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Printer size={16} /> Imprimir Relatório
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] space-y-2">
                        <div className="flex items-center gap-3 text-amber-400 mb-2">
                            <DollarSign size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Valor Total do Lote</span>
                        </div>
                        <p className="text-4xl font-black text-white tracking-tighter">
                            {formatCurrency(stats.total)}
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] space-y-2">
                        <div className="flex items-center gap-3 text-blue-400 mb-2">
                            <Package size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Pedidos Liquidados</span>
                        </div>
                        <p className="text-4xl font-black text-white tracking-tighter">
                            {settlementOrders.length}
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[40px] space-y-2">
                        <div className="flex items-center gap-3 text-emerald-400 mb-2">
                            <Calendar size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Data da Operação</span>
                        </div>
                        <p className="text-2xl font-black text-white tracking-tighter uppercase italic">
                            {settlementOrders.length > 0
                                ? new Date(settlementOrders[0].settlementDate || settlementOrders[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                : 'DATA INDISPONÍVEL'}
                        </p>
                    </div>
                </div>

                {/* Orders List */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-[48px] overflow-hidden">
                    <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                            <FileText size={24} className="text-amber-500" /> Detalhamento dos Pedidos
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-800/50">
                        {settlementOrders.map((q, qIndex) => {
                            if (!q || typeof q !== 'object') return null;
                            const items = Array.isArray(q.items) ? q.items : [];
                            const orderTotal = items.reduce((acc, item) => acc + ((item?.materialValue || 0) * (item?.quantity || 1)), 0);
                            const supplier = suppliers.find(s => s.id === q.supplierId);
                            const safeKey = q.id || `order-${qIndex}`;

                            return (
                                <div key={safeKey} className="p-8 hover:bg-slate-800/20 transition-all group">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-900 transition-all">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none group-hover:text-amber-400 transition-colors">
                                                        {q.workName}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                                        PEDIDO: {q.id.split('-').pop()} • FORNECEDOR: {supplier?.name || 'Não identificado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">VALOR DO PEDIDO</span>
                                            <span className="text-2xl font-black text-white tracking-widest group-hover:text-emerald-400 transition-colors">
                                                {formatCurrency(orderTotal)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items Table */}
                                    {items.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-slate-800/30">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50">
                                                        <th className="pb-4 px-2">Item</th>
                                                        <th className="pb-4 px-2 text-center">Qtd</th>
                                                        <th className="pb-4 px-2 text-center">Unidade</th>
                                                        <th className="pb-4 px-2 text-right">Valor Unit.</th>
                                                        <th className="pb-4 px-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/10">
                                                    {items.map((item, idx) => {
                                                        if (!item) return null;
                                                        return (
                                                            <tr key={`item-${safeKey}-${idx}`} className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                                                                <td className="py-4 px-2 uppercase">{item.name || 'Sem nome'}</td>
                                                                <td className="py-4 px-2 text-center">{item.quantity || 1}</td>
                                                                <td className="py-4 px-2 text-center text-[10px]">{item.unit || 'UN'}</td>
                                                                <td className="py-4 px-2 text-right font-mono">{formatCurrency(item.materialValue || 0)}</td>
                                                                <td className="py-4 px-2 text-right font-mono text-slate-200">
                                                                    {formatCurrency((item.materialValue || 0) * (item.quantity || 1))}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer / Signature Area for Printing */}
                <div className="mt-20 pt-20 border-t border-slate-800 flex flex-col items-center gap-10 text-center pb-20">
                    <div className="w-16 h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Lote Validado</h3>
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                            Este documento é um registro digital de liquidação financeira para suprimentos.
                            Todos os valores foram conferidos e integrados ao DRE da empresa.
                        </p>
                    </div>
                    <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] mt-10">
                        HYPADO SYSTEM • GESTÃO DE ALTO IMPACTO
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .bg-slate-950, .bg-slate-900, .bg-slate-900\\/50, .bg-slate-900\\/30 { background: white !important; }
                    .text-white, .text-slate-100, .text-slate-300, .text-slate-200, .text-slate-400 { color: black !important; }
                    .border-slate-800, .border-slate-800\\/50, .border-slate-800\\/30, .border-slate-800\\/10 { border-color: #eee !important; }
                    .text-transparent { background-clip: initial !important; -webkit-background-clip: initial !important; background: none !important; color: black !important; }
                    .shadow-xl, .shadow-2xl, .shadow-lg { shadow: none !important; box-shadow: none !important; }
                    .selection\\:bg-amber-500\\/30 { background: none !important; }
                    .bg-amber-500 { background: #f59e0b !important; border: 1px solid #000 !important; }
                    .text-emerald-400, .text-emerald-500, .text-emerald-600 { color: #059669 !important; font-weight: 900 !important; }
                    .text-amber-400, .text-amber-500 { color: #d97706 !important; font-weight: 900 !important; }
                    .divide-slate-800\\/50, .divide-slate-800\\/10 { border-color: #eee !important; }
                    @page { margin: 1.5cm; }
                }
            ` }} />
        </div>
    );
};

export default PurchaseSettlementReportView;
