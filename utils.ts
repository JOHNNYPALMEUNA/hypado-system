import LZString from 'lz-string';
import { ProductionStatus } from './types';

export const getStatusColor = (status: ProductionStatus): string => {
    switch (status) {
        case 'Venda': return 'bg-blue-500';
        case 'Projeto': return 'bg-cyan-500';
        case 'Corte': return 'bg-orange-500';
        case 'Produção': return 'bg-purple-500';
        case 'Entrega': return 'bg-indigo-500';
        case 'Instalação': return 'bg-amber-500';
        case 'Vistoria': return 'bg-pink-500';
        case 'Finalizada': return 'bg-emerald-600';
        case 'Cancelada': return 'bg-slate-500';
        default: return 'bg-slate-400';
    }
};

export const getStatusBadgeClass = (status: ProductionStatus): string => {
    switch (status) {
        case 'Finalizada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Vistoria': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'Cancelada': return 'bg-red-100 text-red-700 border-red-200';
        case 'Projeto': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

export const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value || '0') : value;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'A combinar';
    try {
        return new Date(date).toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
};

interface OrderItem {
    // ... existing code ...
    name: string;
    quantity: number;
    unit: string;
    // Optional extra fields that might exist
    materialValue?: number;
    productId?: string;
}

interface OrderData {
    workName: string;
    supplierName: string;
    items: OrderItem[];
    date: string;
    adminPhone?: string;
    orderId?: string;
    totalItems?: number;
    companyName?: string;
}

// Minified keys mapping (kept for internal structure optimization before compression)
// workName -> w
// supplierName -> s
// items -> i
// items[].name -> n
// items[].quantity -> q
// items[].unit -> u
// date -> d
// adminPhone -> p
// orderId -> oid

const minifyOrderData = (data: OrderData): any => {
    return {
        w: data.workName,
        s: data.supplierName,
        d: data.date,
        p: data.adminPhone,
        oid: data.orderId,
        cn: data.companyName,
        i: data.items.map(item => ({
            n: item.name,
            q: item.quantity,
            u: item.unit
        }))
    };
};

const expandOrderStructure = (minified: any): OrderData => {
    // Check if it's actually minified (has 'w' key). If not, assume legacy format
    if (!minified.w && minified.workName) {
        return minified as OrderData;
    }

    return {
        workName: minified.w || 'Obra Desconhecida',
        supplierName: minified.s || 'Fornecedor',
        date: minified.d || new Date().toLocaleDateString(),
        adminPhone: minified.p,
        orderId: minified.oid,
        companyName: minified.cn || 'Hypado Planejados',
        items: (minified.i || []).map((item: any) => ({
            name: item.n || 'Item sem nome',
            quantity: item.q || 0,
            unit: item.u || 'un'
        })),
        totalItems: (minified.i || []).length
    };
};

export const compressOrderData = (data: OrderData): string => {
    const minified = minifyOrderData(data);
    const jsonString = JSON.stringify(minified);
    return LZString.compressToEncodedURIComponent(jsonString);
};

export const decompressOrderData = (encoded: string): OrderData | null => {
    try {
        // Try LZString decompression first
        const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
        if (decompressed) {
            const parsed = JSON.parse(decompressed);
            return expandOrderStructure(parsed);
        }

        // Fallback: Try Legacy Base64 (for links sent before compression update)
        const decodedStr = decodeURIComponent(escape(atob(encoded)));
        const parsedLegacy = JSON.parse(decodedStr);
        return expandOrderStructure(parsedLegacy);
    } catch (error) {
        console.error("Failed to decompress/decode order data:", error);
        return null;
    }
};
