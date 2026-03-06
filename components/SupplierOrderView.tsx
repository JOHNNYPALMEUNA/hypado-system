
import React, { useEffect, useState } from 'react';
import { Check, X, FileText, MapPin, Calendar, Package, Factory, Printer, MessageCircle, ShoppingCart } from 'lucide-react';
import { Supplier } from '../types';
import { decompressOrderData } from '../utils';

interface OrderItem {
    name: string;
    quantity: number;
    unit: string;
}

interface OrderData {
    workName: string;
    supplierName: string;
    items: OrderItem[];
    date: string;
    adminPhone?: string; // To reply back
    orderId?: string;
    totalItems?: number;
    companyName?: string;
}

const SupplierOrderView: React.FC = () => {
    const [data, setData] = useState<OrderData | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const dataParam = params.get('data');

            if (!dataParam) {
                setError('Dados do pedido não encontrados no link.');
                return;
            }

            // Decompress/Decode using new utility that handles both compressed AND legacy formats
            const orderData = decompressOrderData(dataParam);

            if (orderData) {
                setData(orderData);
            } else {
                setError('Dados inválidos ou corrompidos.');
            }
        } catch (err) {
            console.error("Erro ao processar link:", err);
            setError('Link inválido ou expirado.');
        }
    }, []);

    const handleConfirmReceipt = () => {
        if (!data) return;

        // Default admin phone (Company Phone)
        const targetPhone = data.adminPhone || '5511999998888';

        const text = `*CONFIRMAÇÃO DE PEDIDO - HYPADO*\n\n` +
            `✅ Olá, aqui é da *${data.supplierName}*.\n` +
            `Confirmamos o recebimento do pedido para a obra *${data.workName}*.\n\n` +
            `📋 *Itens:* ${data.items.length} itens listados.\n` +
            `📅 *Data:* ${data.date}\n\n` +
            `Estaremos processando o orçamento/pedido.`;

        const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        window.print();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-muted/50 flex items-center justify-center p-6">
                <div className="bg-card p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} />
                    </div>
                    <h2 className="text-xl font-black text-foreground mb-2">Erro no Link</h2>
                    <p className="text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-muted/50 flex items-center justify-center">
                <div className="animate-spin text-amber-500"><Factory size={40} /></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted p-4 md:p-8 font-sans print:bg-card print:p-0">
            <div className="max-w-2xl mx-auto bg-card rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 print:shadow-none print:rounded-none">

                {/* Header - "Cabeçalho Ripado" Style */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden print:bg-card print:text-black print:border-b-2 print:border-black">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 print:hidden"></div>

                    {/* Decorative Elements (Ripado simulation) */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,transparent_50%,#ffffff_50%)] bg-[length:20px_20px] print:hidden pointer-events-none"></div>

                    <div className="w-20 h-20 bg-card/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm relative z-10 print:hidden">
                        <ShoppingCart size={32} className="text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter relative z-10 print:text-black">{data.companyName || 'Hypado Planejados'}</h1>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 relative z-10 print:text-muted-foreground">Pedido de Compra</p>
                </div>

                <div className="p-8 space-y-8 print:p-0 print:mt-4">

                    {/* Intro */}
                    <div className="text-center print:text-left">
                        <h2 className="text-lg font-bold text-foreground">Olá, <span className="text-foreground font-black uppercase">{data.supplierName}</span></h2>
                        <p className="text-muted-foreground text-sm mt-1 print:hidden">Por favor, verifique os itens abaixo para cotação/separação.</p>
                    </div>

                    {/* Details Card */}
                    <div className="bg-muted/50 rounded-[32px] p-6 space-y-4 border border-slate-100 shadow-inner print:bg-transparent print:border-2 print:border-black print:rounded-none">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-card rounded-2xl text-foreground shadow-sm print:hidden"><Factory size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Obra / Cliente</p>
                                <p className="text-sm font-bold text-foreground print:text-xl">{data.workName}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-card rounded-2xl text-foreground shadow-sm print:hidden"><Calendar size={20} /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest print:text-black">Data do Pedido</p>
                                <p className="text-sm font-bold text-foreground">{data.date}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b-2 border-slate-100 pb-2 mb-4 print:border-black">
                            <Package size={18} className="text-amber-500 print:text-black" />
                            <h3 className="font-black uppercase italic text-foreground tracking-wider text-sm">Lista de Itens ({data.items.length})</h3>
                        </div>

                        <div className="divide-y divide-slate-100 print:divide-slate-300">
                            {data.items.map((item, idx) => (
                                <div key={idx} className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground uppercase text-sm">{item.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-lg text-foreground">{item.quantity}</span>
                                        <span className="block text-[10px] uppercase font-bold text-slate-400">{item.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 print:hidden">
                        <button onClick={handleConfirmReceipt} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[24px] uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                            <MessageCircle size={20} /> Confirmar Recebimento via WhatsApp
                        </button>
                        <button onClick={handlePrint} className="w-full bg-muted hover:bg-slate-200 text-muted-foreground font-black py-4 rounded-[24px] uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                            <Printer size={20} /> Imprimir Pedido
                        </button>
                    </div>

                    {/* Footer Print Only */}
                    <div className="hidden print:block text-center mt-8 pt-8 border-t border-black">
                        <p className="text-xs font-bold">Gerado por Hypado System para {data.companyName || 'Hypado Planejados'}</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SupplierOrderView;
