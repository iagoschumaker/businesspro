import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, UserPlus, Phone, Mail, MapPin, Gift } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import CustomerForm from './CustomerForm';
import { customersService, Customer, notificationsService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import FloatingActionButton from '../../components/Common/FloatingActionButton';
import { formatBRFlexible } from '../../utils/date';

const Customers: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const upcomingRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  
  // Carregar clientes da API com debounce
  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const data = await customersService.getAll({ search: searchTerm });
        setCustomers(Array.isArray(data) ? data : []);
        // Após carregar clientes, gerar notificações de aniversário do dia (uma vez por dia)
        try {
          const todayKey = (() => {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          })();
          const notifiedFlagKey = `birthday_notifications_${todayKey}`;
          const alreadyNotified = localStorage.getItem(notifiedFlagKey) === '1';
          if (!alreadyNotified) {
            const list = (Array.isArray(data) ? data : []) as Customer[];
            const md = (() => {
              const d = new Date();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${m}-${dd}`;
            })();
            const toMMDD = (raw: string): string | null => {
              const b = (raw || '').trim();
              if (!b) return null;
              // ISO: YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}$/.test(b)) return `${b.slice(5,7)}-${b.slice(8,10)}`;
              // BR: DD/MM/YYYY
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(b)) return `${b.slice(3,5)}-${b.slice(0,2)}`;
              // Alt: DD-MM-YYYY
              if (/^\d{2}-\d{2}-\d{4}$/.test(b)) return `${b.slice(3,5)}-${b.slice(0,2)}`;
              // US: MM/DD/YYYY
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(b)) return `${b.slice(0,2)}-${b.slice(3,5)}`;
              // Fallback: tentar pegar MM-DD dos últimos 5
              if (b.length >= 5 && /\d{2}.\d{2}$/.test(b.slice(-5))) {
                const only = b.slice(-5).replace(/[^0-9]/g, '');
                if (only.length === 4) return `${only.slice(0,2)}-${only.slice(2,4)}`;
              }
              return null;
            };
            const birthdaysToday = list.filter((c) => {
              const mmdd = toMMDD(c.birth_date || '');
              return mmdd === md;
            });
            const toISO = (raw: string): string | null => {
              const s = (raw || '').trim();
              if (!s) return null;
              if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO
              if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR /
              if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR -
              return null;
            };
            const calcAge = (isoDate: string | null): number | null => {
              if (!isoDate) return null;
              const y = parseInt(isoDate.slice(0,4), 10);
              const m = parseInt(isoDate.slice(5,7), 10) - 1;
              const d = parseInt(isoDate.slice(8,10), 10);
              const dob = new Date(Date.UTC(y, m, d));
              const now = new Date();
              let age = now.getUTCFullYear() - dob.getUTCFullYear();
              const mDiff = now.getUTCMonth() - dob.getUTCMonth();
              if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
              return age >= 0 && age < 130 ? age : null;
            };
            for (const c of birthdaysToday) {
              const iso = toISO(c.birth_date || '');
              const age = calcAge(iso);
              try {
                await notificationsService.create({
                  type: 'info',
                  title: 'Aniversário de cliente',
                  message: age !== null
                    ? `${c.name} faz ${age} anos hoje. Entre em contato para parabenizar!`
                    : `${c.name} faz aniversário hoje. Entre em contato para parabenizar!`,
                });
              } catch (e) {
                // silencioso para não quebrar UX
                console.warn('Falha ao criar notificação de aniversário', e);
              }
            }
            // Notifica central para atualizações imediatas
            try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch {}
            try { localStorage.setItem(notifiedFlagKey, '1'); } catch {}
          }
        } catch (e) {
          // ignora erros de notificação
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Não foi possível carregar os clientes.');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    
    // Implementar debounce para evitar múltiplas chamadas à API
    const timeoutId = setTimeout(() => {
      loadCustomers();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showFilter && filterRef.current && !filterRef.current.contains(target)) {
        setShowFilter(false);
      }
      if (showUpcoming && upcomingRef.current && !upcomingRef.current.contains(target)) {
        setShowUpcoming(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter, showUpcoming]);
  
  // Função para adicionar novo cliente ao estado após cadastro
  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers([newCustomer, ...customers]);
    toast.success('Cliente adicionado com sucesso!');
    setIsModalOpen(false);
  };

  // Função para criar novo pedido para cliente
  const handleNewOrder = (customerId: string | number) => {
    navigate(`/orders/new?customer=${customerId}`);
  };

  // Função para ver perfil do cliente
  const handleViewProfile = (customerId: string | number) => {
    navigate(`/customers/${customerId}`);
  };
  
  // Removido: geração manual de notificações de aniversário
  
  // Filtragem local caso a API não ofereça filtragem
  const filteredCustomers = loading 
    ? [] 
    : customers.filter(customer => {
        const matchesSearch =
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm) ||
          customer.document.includes(searchTerm);
        const matchesStatus =
          !statusFilter || customer.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  
  // Função para busca local de clientes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  

  return (
    <div className="space-y-6">
      

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-row items-stretch gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
          <div className="relative shrink-0" ref={filterRef}>
            <button
              type="button"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 px-4 py-2 text-sm"
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              aria-haspopup="true"
            >
              <Filter className="mr-2 h-4 w-4" />Filtros
            </button>
            {showFilter && (
              <div className="absolute right-0 mt-2 z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Filtrar clientes</h3>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-200">Status</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Desativado">Desativado</option>
                </select>
                <div className="flex justify-end mt-3">
                  <button
                    className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                    onClick={() => setShowFilter(false)}
                    type="button"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative shrink-0" ref={upcomingRef}>
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 rounded-md"
              onClick={() => setShowUpcoming(v => !v)}
              aria-expanded={showUpcoming}
              aria-haspopup="true"
              title="Próximos aniversários"
              aria-label="Próximos aniversários"
            >
              <Gift className="h-5 w-5" />
            </button>
            {showUpcoming && (
              <div className="absolute right-0 mt-2 z-40 w-80 max-w-[22rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Próximos aniversários</h3>
                {(() => {
                  const normalizeISO = (raw: string): string | null => {
                    const s = (raw || '').trim();
                    if (!s) return null;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ISO
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR /
                    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`; // BR -
                    return null;
                  };
                  const ageOnNextBirthday = (iso: string | null): number | null => {
                    if (!iso) return null;
                    const y = parseInt(iso.slice(0,4), 10);
                    const m = parseInt(iso.slice(5,7), 10) - 1;
                    const d = parseInt(iso.slice(8,10), 10);
                    const dob = new Date(Date.UTC(y, m, d));
                    const now = new Date();
                    let age = now.getUTCFullYear() - dob.getUTCFullYear();
                    const thisYearBD = new Date(Date.UTC(now.getUTCFullYear(), m, d));
                    if (thisYearBD > now) {
                      // turning 'age' this year
                      return age;
                    }
                    return age + 1;
                  };
                  const nextOccurrence = (iso: string | null): Date | null => {
                    if (!iso) return null;
                    const m = parseInt(iso.slice(5,7), 10) - 1;
                    const d = parseInt(iso.slice(8,10), 10);
                    const now = new Date();
                    const thisYear = new Date(now.getFullYear(), m, d);
                    if (thisYear >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return thisYear;
                    return new Date(now.getFullYear() + 1, m, d);
                  };
                  const upcoming = customers
                    .map(c => {
                      const iso = normalizeISO(c.birth_date || '');
                      const next = nextOccurrence(iso);
                      const age = ageOnNextBirthday(iso);
                      return next ? { c, next, age } : null;
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => (a.next as Date).getTime() - (b.next as Date).getTime())
                    .slice(0, 10) as { c: Customer; next: Date; age: number | null }[];
                  if (upcoming.length === 0) {
                    return <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum aniversário encontrado.</p>;
                  }
                  const fmt = (d: Date) => {
                    const dd = String(d.getDate()).padStart(2,'0');
                    const mm = String(d.getMonth()+1).padStart(2,'0');
                    const yyyy = d.getFullYear();
                    return `${dd}/${mm}/${yyyy}`;
                  };
                  return (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {upcoming.map(({ c, next, age }) => (
                        <li key={String(c._id ?? c.id)} className="py-2 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{fmt(next)}{age !== null ? ` • Faz ${age} anos` : ''}</p>
                          </div>
                          <button
                            type="button"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                            onClick={() => navigate(`/customers/${c._id ?? c.id}`)}
                          >
                            Ver
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            )}
          </div>
          {/* Removido: botão de gerar notificações de aniversário */}
        </div>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
            <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
              <span className="text-lg font-medium text-gray-700 dark:text-gray-200">Carregando clientes...</span>
            </div>
          </div>
        </Card>
      )}
      
      {/* Customers Grid */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
          <Card key={customer._id} padding="sm" className="hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {customer.name}
                </h3>

                <div className="space-y-1.5 mb-3">
  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
    <Phone className="h-4 w-4 mr-2" />
    <span>
      {customer.phone
        ? customer.phone.replace(
            customer.phone.length === 10
              ? /(\d{2})(\d{4})(\d{4})/
              : /(\d{2})(\d{5})(\d{4})/,
            '($1) $2-$3'
          )
        : ''}
    </span>
    {(() => {
      const digits = (customer.phone || '').replace(/\D/g, '');
      const e164 = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
      const href = e164 ? `https://wa.me/${e164}` : undefined;
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir WhatsApp"
          title={href ? 'Abrir conversa no WhatsApp' : 'Telefone indisponível'}
          className={`ml-2 inline-flex items-center justify-center p-1.5 transition ${href ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 cursor-pointer' : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'}`}
          onClick={(e) => { if (!href) e.preventDefault(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-4 w-4" aria-hidden>
            <path fill="currentColor" d="M19.11 17.42c-.27-.13-1.58-.78-1.82-.87c-.24-.09-.42-.13-.6.13c-.18.27-.69.87-.85 1.05c-.16.18-.31.2-.58.07c-.27-.13-1.13-.42-2.16-1.33c-.8-.71-1.34-1.59-1.5-1.86c-.16-.27-.02-.42.11-.55c.11-.11.27-.29.4-.44c.13-.16.18-.27.27-.45c.09-.18.04-.33-.02-.46c-.07-.13-.6-1.44-.82-1.98c-.22-.53-.44-.46-.6-.46c-.16 0-.33 0-.51 0c-.18 0-.46.07-.71.33c-.24.27-.93.91-.93 2.22c0 1.31.95 2.57 1.08 2.75c.13.18 1.87 3.05 4.57 4.29c.64.28 1.13.45 1.52.58c.64.2 1.22.17 1.68.1c.51-.08 1.58-.65 1.8-1.28c.22-.64.22-1.19.16-1.28c-.07-.09-.24-.16-.51-.29z"/>
            <path fill="currentColor" d="M16.01 3.2C9.48 3.2 4.2 8.47 4.2 15c0 2.04.54 3.95 1.49 5.6L4 28.05l7.64-1.99A11.7 11.7 0 0 0 16 26.8c6.53 0 11.8-5.27 11.8-11.8s-5.27-11.8-11.8-11.8zm0 21.06c-1.78 0-3.44-.46-4.88-1.27l-.35-.2l-4.54 1.18l1.21-4.42l-.22-.36A9.58 9.58 0 0 1 6.42 15A9.6 9.6 0 1 1 16 24.26z"/>
          </svg>
        </a>
      );
    })()}
  </div>
  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
    <Mail className="h-4 w-4 mr-2" />
    {customer.email}
  </div>
  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
    <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
    <span className="line-clamp-2">{[customer.address, customer.address_number].filter(Boolean).join(', ')}</span>
  </div>
  {/* Aniversário */}
  {(() => {
    const b = (customer.birth_date || '').trim();
    if (!b) return null;
    const toISO = (raw: string): string | null => {
      const s = (raw || '').trim();
      if (!s) return null;
      // ISO: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // BR: DD/MM/YYYY
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`;
      // Alt: DD-MM-YYYY
      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`;
      return null;
    };
    const iso = toISO(b);
    const ddmmyyyy = iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : b;
    const calcAge = (isoDate: string | null): number | null => {
      if (!isoDate) return null;
      const y = parseInt(isoDate.slice(0,4), 10);
      const m = parseInt(isoDate.slice(5,7), 10) - 1;
      const d = parseInt(isoDate.slice(8,10), 10);
      const dob = new Date(Date.UTC(y, m, d));
      const now = new Date();
      let age = now.getUTCFullYear() - dob.getUTCFullYear();
      const mDiff = now.getUTCMonth() - dob.getUTCMonth();
      if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
      return age >= 0 && age < 130 ? age : null;
    };
    const age = calcAge(iso);
    const today = new Date();
    const mmddToday = `${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const isToday = b.length >= 5 && b.slice(-5) === mmddToday;
    return (
      <div className={`flex items-center text-sm ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <Gift className="h-4 w-4 mr-2" />
        <span>
          {isToday ? 'Aniversário hoje: ' : 'Aniversário: '}<strong>{ddmmyyyy}</strong>{age !== null ? ` • ${age} anos` : ''}
        </span>
      </div>
    );
  })()}
                </div>

              </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{typeof customer.totalValue === 'number' ? customer.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Último pedido: {customer.lastOrder ? formatBRFlexible(customer.lastOrder) : '—'}
                </p>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                    ${customer.status === 'Ativo'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}
                  `}
                >
                  {customer.status}
                </span>
              </div>
            <div className="mt-4 flex space-x-2">
              <Button 
                size="sm" 
                variant="secondary" 
                className="flex-1"
                onClick={() => handleViewProfile(customer._id ?? customer.id)}
              >
                Ver Perfil
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleNewOrder(customer._id ?? customer.id)}
              >
                Novo Pedido
              </Button>
            </div>
          </Card>
          ))}
          
          {filteredCustomers.length === 0 && (
            <div className="col-span-3">
              <Card>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Nenhum cliente encontrado
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                    Não encontramos nenhum cliente com os critérios de busca atuais.
                  </p>
                  {/* Ação removida: usar o botão flutuante "+" */}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Customer Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Cliente"
        size="lg"
      >
        <CustomerForm 
          onClose={() => setIsModalOpen(false)} 
          onCustomerAdded={handleCustomerAdded}
        />
      </Modal>

      {/* Floating Action Button */}
      <FloatingActionButton
        ariaLabel="Novo Cliente"
        onClick={() => setIsModalOpen(true)}
      />
    </div>
  );
};

export default Customers;