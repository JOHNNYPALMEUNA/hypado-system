
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
  User
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface Props {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  projects: Project[];
}

const CRMView: React.FC<Props> = ({ clients, setClients, projects }) => {
  const { addClient, updateClient, deleteClient, userRole } = useData();
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
    isBlocked: false
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
        isBlocked: client.isBlocked || false
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '', email: '', phone: '', cep: '', address: '',
        quadra: '', lote: '', description: '', isBlocked: false
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
      alert('Por favor, preencha pelo menos o Nome e o Telefone.');
      return;
    }

    if (editingClient) {
      updateClient({
        ...editingClient,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        quadra: formData.quadra,
        lote: formData.lote,
        description: formData.description,
        isBlocked: formData.isBlocked
      });
    } else {
      const newClient: Client = {
        id: `c-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        quadra: formData.quadra,
        lote: formData.lote,
        description: formData.description,
        projectsCount: 0,
        averageRating: 0,
        lastVisit: new Date().toISOString().split('T')[0],
        isBlocked: formData.isBlocked
      };
      addClient(newClient);
    }

    setIsModalOpen(false);
  };

  const handleDelete = () => {
    if (!editingClient) return;
    if (confirm(`Excluir cliente ${editingClient.name}?`)) {
      const pwd = prompt('Digite a senha de administrador:');
      if (pwd !== 'adm123') {
        alert('Senha incorreta!');
        return;
      }
      deleteClient(editingClient.id);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
              <h4 className="text-lg font-semibold">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">


              <div className="space-y-4">
                {/* URL input replaced by file upload above */}

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Nome Completo</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Telefone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">E-mail</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block flex items-center gap-1">CEP {isFetchingCep && <Loader2 size={10} className="animate-spin" />}</label>
                      <input type="text" name="cep" value={formData.cep} onChange={handleInputChange} maxLength={8} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Endereço</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {editingClient && (
                  <button type="button" onClick={handleDelete} className="px-4 py-2 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Trash2 size={16} /> Excluir
                  </button>
                )}
                <button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
                <button onClick={() => openModal(client)} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
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
  );
};

export default CRMView;
