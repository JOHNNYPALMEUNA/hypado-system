
import React, { useState } from 'react';
import { Client, Project } from '../types';
import {
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  X,
  Briefcase,
  TrendingUp,
  Loader2,
  Edit2,
  Trash2,
  Ban,
  CheckCircle2,
  Search,
  User,
  Filter,
  Save
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import CRMFunnelView from './CRMFunnelView';

interface Props {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  projects: Project[];
}

const CRMView: React.FC<Props> = ({ clients, setClients, projects }) => {
  const { addClient, updateClient, deleteClient, userRole } = useData();
  const [crmSubTab, setCrmSubTab] = useState<'funnel' | 'list'>('funnel');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cep: '',
    address: '',
    quadra: '',
    lote: '',
    description: '',
    isBlocked: false,
    cpf: '',
    isCorporate: false,
    sendNotifications: true,
    storeName: 'Hypado Planejados',
    leadSource: '',
    hasAddress: false,
    isCompleteRegistration: false
  });

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name || '',
        email: client.email || '',
        phone: client.phone || '',
        cep: '',
        address: client.address || '',
        quadra: client.quadra || '',
        lote: client.lote || '',
        description: client.description || '',
        isBlocked: client.isBlocked || false,
        cpf: client.cpf || '',
        isCorporate: client.isCorporate || false,
        sendNotifications: client.sendNotifications !== false,
        storeName: client.storeName || 'Hypado Planejados',
        leadSource: client.leadSource || '',
        hasAddress: !!client.address || !!client.quadra || !!client.lote,
        isCompleteRegistration: !!client.cpf || !!client.description
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '', email: '', phone: '', cep: '', address: '',
        quadra: '', lote: '', description: '', isBlocked: false,
        cpf: '', isCorporate: false, sendNotifications: true,
        storeName: 'Hypado Planejados', leadSource: '',
        hasAddress: false, isCompleteRegistration: false
      });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;

    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '').substring(0, 8);
      setFormData(prev => ({ ...prev, [name]: cleanCep }));
      if (cleanCep.length === 8) fetchAddress(cleanCep);
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const fetchAddress = async (cep: string) => {
    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        const fullAddress = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
        setFormData(prev => ({ ...prev, address: fullAddress }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Por favor, preencha pelo menos o Nome e o Celular Principal.');
      return;
    }

    const clientPayload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.hasAddress ? formData.address : '',
      quadra: formData.hasAddress ? formData.quadra : '',
      lote: formData.hasAddress ? formData.lote : '',
      description: formData.isCompleteRegistration ? formData.description : '',
      cpf: formData.isCompleteRegistration ? formData.cpf : '',
      isBlocked: formData.isBlocked,
      isCorporate: formData.isCorporate,
      sendNotifications: formData.sendNotifications,
      storeName: formData.storeName,
      leadSource: formData.leadSource
    };

    if (editingClient) {
      updateClient({
        ...editingClient,
        ...clientPayload
      });
    } else {
      const newClient: Client = {
        id: `c-${Date.now()}`,
        ...clientPayload,
        projectsCount: 0,
        averageRating: 0,
        lastVisit: new Date().toISOString().split('T')[0]
      };
      addClient(newClient);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingClient) return;
    if (confirm(`Excluir cliente ${editingClient.name}?`)) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'admin123') {
        alert('Senha incorreta!');
        return;
      }
      deleteClient(editingClient.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* CRM Sub-navigation Tabs */}
      <div className="flex border-b border-border pb-2 gap-6">
        <button
          onClick={() => setCrmSubTab('funnel')}
          className={`pb-2 px-1 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            crmSubTab === 'funnel'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Filter size={14} />
          Funil de Vendas (CRM)
        </button>
        <button
          onClick={() => setCrmSubTab('list')}
          className={`pb-2 px-1 text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            crmSubTab === 'list'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User size={14} />
          Clientes Cadastrados
        </button>
      </div>

      {crmSubTab === 'funnel' ? (
        <CRMFunnelView projects={projects} clients={clients} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Clientes</h3>
              <p className="text-muted-foreground text-sm">Gerencie sua base de clientes e histórico.</p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <button
                onClick={() => openModal()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            </div>
          </div>

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-card w-full max-w-xl rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                  <h4 className="text-md font-black text-foreground uppercase tracking-widest">
                    Cadastro
                  </h4>
                  <button onClick={() => setIsModalOpen(false)} title="Fechar" className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-card">
                  <div className="space-y-4">
                    
                    {/* Toggle: Pessoa jurídica */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Pessoa jurídica: <span className="text-primary font-black ml-1">{formData.isCorporate ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isCorporate: !prev.isCorporate }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isCorporate ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.isCorporate ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Campo: Nome */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        * Nome
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder={formData.isCorporate ? "Razão Social ou Nome Fantasia" : "Nome Completo"}
                        title="Nome Completo"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                        required
                      />
                    </div>

                    {/* Campo: Celular Principal (com Alerta Rosa) */}
                    <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl space-y-2">
                      <label className="text-xs font-bold text-foreground block">
                        * Celular Principal
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(00) 00000-0000"
                        title="Telefone"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                        required
                      />
                      <p className="text-[10px] text-red-500 font-semibold leading-relaxed">
                        Número que o cliente precisa inserir no aplicativo para ter acesso ao projeto!
                      </p>
                    </div>

                    {/* Campo: Origem do lead */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                        Origem do lead (procedência do cliente)
                      </label>
                      <select
                        name="leadSource"
                        value={formData.leadSource}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-semibold"
                      >
                        <option value="">Selecione uma origem</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Indicação">Indicação de Cliente</option>
                        <option value="Arquiteto">Parceria com Arquiteto</option>
                        <option value="Google">Google / Pesquisa Web</option>
                        <option value="WhatsApp">WhatsApp Business / Prospecção</option>
                        <option value="Outro">Outro Canal</option>
                      </select>
                    </div>

                    {/* Campo: E-mail */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                        E-mail
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="cliente@email.com"
                        title="E-mail"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                      />
                    </div>

                    {/* Toggle: Enviar notificação */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Enviar notificação para este e-mail: <span className="text-primary font-black ml-1">{formData.sendNotifications ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sendNotifications: !prev.sendNotifications }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.sendNotifications ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.sendNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Campo: Loja */}
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1 uppercase tracking-wider">
                        Loja
                      </label>
                      <select
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary/50 transition-all font-black text-primary"
                      >
                        <option value="Hypado Planejados">Hypado Planejados</option>
                      </select>
                    </div>

                    {/* Toggle: Já sabe o endereço? */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Já sabe o endereço?: <span className="text-primary font-black ml-1">{formData.hasAddress ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hasAddress: !prev.hasAddress }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.hasAddress ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.hasAddress ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Seção Endereço Revelada */}
                    {formData.hasAddress && (
                      <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block flex items-center gap-1">
                              CEP {isFetchingCep && <Loader2 size={10} className="animate-spin text-primary" />}
                            </label>
                            <input
                              type="text"
                              name="cep"
                              value={formData.cep}
                              onChange={handleInputChange}
                              maxLength={8}
                              placeholder="00000000"
                              title="CEP"
                              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                              Endereço / Logradouro
                            </label>
                            <input
                              type="text"
                              name="address"
                              value={formData.address}
                              onChange={handleInputChange}
                              placeholder="Rua, Número, Bairro"
                              title="Endereço"
                              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                              Quadra
                            </label>
                            <input
                              type="text"
                              name="quadra"
                              value={formData.quadra}
                              onChange={handleInputChange}
                              placeholder="Quadra"
                              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                              Lote
                            </label>
                            <input
                              type="text"
                              name="lote"
                              value={formData.lote}
                              onChange={handleInputChange}
                              placeholder="Lote"
                              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Toggle: Fazer cadastro completo */}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Fazer cadastro completo: <span className="text-primary font-black ml-1">{formData.isCompleteRegistration ? 'Sim' : 'Não'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isCompleteRegistration: !prev.isCompleteRegistration }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isCompleteRegistration ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.isCompleteRegistration ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Seção Cadastro Completo Revelada */}
                    {formData.isCompleteRegistration && (
                      <div className="pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                            {formData.isCorporate ? 'CNPJ' : 'CPF'}
                          </label>
                          <input
                            type="text"
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleInputChange}
                            placeholder={formData.isCorporate ? "00.000.000/0000-00" : "000.000.000-00"}
                            title="Documento"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">
                            Anotações / Descrição do Cliente
                          </label>
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Informações adicionais do cliente..."
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:border-primary/50 outline-none transition-all font-semibold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Toggle: Bloquear Cliente (Editar) */}
                    {editingClient && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                          Bloquear Cliente: <span className="font-black ml-1">{formData.isBlocked ? 'Bloqueado' : 'Ativo'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isBlocked: !prev.isBlocked }))}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.isBlocked ? 'bg-red-600' : 'bg-muted'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${formData.isBlocked ? 'translate-x-5' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    )}

                  </div>

                  <div className="pt-4 border-t border-border flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-background border border-border text-foreground hover:bg-muted py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                    {editingClient && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-4 py-3 border border-red-500/30 text-red-650 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <Save size={14} /> Salvar Dados de Cadastro
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(clients || []).map(client => {
              const clientProjects = (projects || []).filter(p => p.clientId === client.id);
              const totalValue = clientProjects.reduce((acc, p) => acc + (p.value || 0), 0);

              return (
                <div key={client.id} className={`group bg-card text-card-foreground rounded-xl border p-5 transition-all hover:shadow-md ${client.isBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 ${client.isBlocked ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                        {(client.name || 'C').charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground truncate max-w-[150px]">{client.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star size={12} className={client.averageRating > 0 ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                          <span>{client.averageRating > 0 ? client.averageRating.toFixed(1) : 'Novo'}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => openModal(client)} title="Editar Cliente" className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Edit2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Obras</p>
                      <p className="text-lg font-bold">{clientProjects.length}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {userRole === 'owner' ? `${(totalValue / 1000).toFixed(1)}k` : '***'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone size={14} className="shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{client.email || '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMView;
