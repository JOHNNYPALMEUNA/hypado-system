
import React, { useState } from 'react';
import { Company } from '../types';
import { Building2, Mail, Phone, MapPin, Fingerprint, Camera, Save, Globe, AlertTriangle, Download, Upload, Database } from 'lucide-react';

interface Props {
  company: Company;
  setCompany: React.Dispatch<React.SetStateAction<Company>>;
}

const CompanySettingsView: React.FC<Props> = ({ company, setCompany }) => {
  const [formData, setFormData] = useState<Company>({ ...company });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCompany(formData);
    alert('Dados da empresa salvos com sucesso!');
  };

  const handleExportBackup = () => {
    const data = { ...localStorage };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hypado_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('ATENÇÃO: Importar um backup substituirá TODOS os dados atuais. Deseja continuar?')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          localStorage.clear();
          Object.keys(data).forEach(key => {
            localStorage.setItem(key, data[key]);
          });
          alert('Backup restaurado com sucesso! A página será recarregada.');
          window.location.reload();
        } catch (error) {
          alert('Erro ao ler arquivo de backup. Verifique se é um arquivo .json válido.');
          console.error(error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Dados da Marcenaria</h3>
        <p className="text-slate-500">Estas informações aparecerão nos relatórios e ordens de serviço.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card de Logo */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-amber-500">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={48} className="text-slate-200" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-900 p-2.5 rounded-2xl shadow-lg cursor-pointer hover:bg-amber-400 transition-all">
                <Camera size={18} />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
              </label>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{formData.name || 'Sua Empresa'}</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{formData.cnpj || '00.000.000/0001-00'}</p>
            </div>
            <p className="text-xs text-slate-400 italic leading-relaxed px-4">
              Dica: Use um logo com fundo transparente para melhor acabamento nos relatórios.
            </p>
          </div>
        </div>

        {/* Formulário */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razão Social / Nome Fantasia</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Building2 size={16} /></div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                    placeholder="Hypado Planejados"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Fingerprint size={16} /></div>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={e => setFormData(p => ({ ...p, cnpj: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Comercial</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Mail size={16} /></div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Phone size={16} /></div>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço da Fábrica / Showroom</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><MapPin size={16} /></div>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-amber-500 outline-none transition-all"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Save size={20} className="text-amber-500" /> Atualizar Cadastro da Empresa
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="pt-12 border-t border-slate-200">
        <div className="bg-red-50 border border-red-100 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="flex items-center gap-2 text-red-600 font-black uppercase tracking-widest"><AlertTriangle size={20} /> Zona de Perigo</h4>
            <p className="text-red-400 text-sm mt-1 max-w-xl">
              Ações irreversíveis que afetam todo o sistema. Use com cautela.
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('TEM CERTEZA ABSOLUTA?\n\nIsso apagará TODOS os dados (Clientes, Obras, Financeiro) e resetará o sistema para o estado inicial.\n\nEssa ação NÃO pode ser desfeita.')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="px-6 py-3 bg-white border-2 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-500 font-extrabold uppercase text-xs tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
          >
            Resetar Sistema (Factory Reset)
          </button>
        </div>
      </div>

    </div >
  );
};

export default CompanySettingsView;
