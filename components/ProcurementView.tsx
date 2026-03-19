import React from 'react';
import { Project, Supplier, Material, Quotation, Company, Installer, Client } from '../types';
import { useData } from '../contexts/DataContext';

// Modular Components
import MaterialLibrary from './procurement/MaterialLibrary';
import SupplierManagement from './procurement/SupplierManagement';
import PurchaseOrderManager from './procurement/PurchaseOrderManager';
import MdoManager from './procurement/MdoManager';
import PurchaseHistory from './procurement/PurchaseHistory';

interface Props {
  projects: Project[];
  setProjects: any;
  purchaseOrders: Quotation[];
  addQuotation: (q: Quotation) => Promise<void>;
  updateQuotation: (q: Quotation) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  company: Company;
  installers: Installer[];
  clients: Client[];
  externalActiveTab?: 'cotacoes' | 'concluidas' | 'apontamento' | 'diario' | 'produtos' | 'fornecedores';
  setExternalActiveTab?: (tab: any) => void;
  materialCategories: string[];
  setMaterialCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

const ProcurementView: React.FC<Props> = ({
  projects,
  purchaseOrders,
  addQuotation,
  updateQuotation,
  deleteQuotation,
  company,
  installers,
  externalActiveTab,
  setExternalActiveTab,
  materialCategories
}) => {
  const { 
    updateProject, 
    suppliers, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    materials, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial, 
    userRole 
  } = useData();

  const activeTab = externalActiveTab || 'cotacoes';
  const setActiveTab = setExternalActiveTab || (() => { });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER NAVEGAÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <h3 className="text-3xl font-black text-foreground tracking-tighter uppercase italic leading-none">Suprimentos & MDO</h3>
        <div className="flex bg-slate-200/60 p-1.5 rounded-[24px] border border-border shadow-inner overflow-x-auto max-w-full">
          {[
            { id: 'cotacoes', label: 'Pedidos' },
            { id: 'concluidas', label: 'Concluídas' },
            { id: 'apontamento', label: 'Empreitas' },
            { id: 'diario', label: 'Diário MDO' },
            { id: 'fornecedores', label: 'Parceiros' },
            { id: 'produtos', label: 'Biblioteca' }
          ].filter(tab => {
            if (tab.id === 'diario') return userRole === 'owner';
            return true;
          }).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'cotacoes' && (
          <PurchaseOrderManager 
            purchaseOrders={purchaseOrders}
            projects={projects}
            suppliers={suppliers}
            materials={materials}
            addQuotation={addQuotation}
            updateQuotation={updateQuotation}
            deleteQuotation={deleteQuotation}
            updateProject={updateProject}
            company={company}
          />
        )}

        {activeTab === 'concluidas' && (
          <PurchaseHistory 
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
          />
        )}

        {activeTab === 'apontamento' && (
          <MdoManager 
            projects={projects}
            installers={installers}
            suppliers={suppliers}
            updateProject={updateProject}
            company={company}
            mode="apontamento"
          />
        )}

        {activeTab === 'diario' && (
          <MdoManager 
            projects={projects}
            installers={installers}
            suppliers={suppliers}
            updateProject={updateProject}
            company={company}
            mode="diario"
          />
        )}

        {activeTab === 'fornecedores' && (
          <SupplierManagement 
            suppliers={suppliers}
            addSupplier={addSupplier}
            updateSupplier={updateSupplier}
            deleteSupplier={deleteSupplier}
          />
        )}

        {activeTab === 'produtos' && (
          <MaterialLibrary 
            materials={materials}
            addMaterial={addMaterial}
            updateMaterial={updateMaterial}
            deleteMaterial={deleteMaterial}
            materialCategories={materialCategories}
          />
        )}
      </div>
    </div>
  );
};

export default ProcurementView;
