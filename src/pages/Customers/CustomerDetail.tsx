import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ShoppingCart, Phone, Mail, MapPin, FileText, Calendar, Circle, Trash, CheckCircle2, Clock, Send, User } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import CustomerForm from './CustomerForm';
import { customersService, ordersService, Customer } from '../../services/api';
import { formatBRDateTime } from '../../utils/date';
import { toast } from 'react-hot-toast';

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomerData();
    }
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Carregar dados do cliente
      const customerData = await customersService.getById(id);
      setCustomer(customerData);

      // Carregar pedidos do cliente
      try {
        const ordersData = await ordersService.getAll({ customer_id: id });
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (error) {
        console.log('Erro ao carregar pedidos:', error);
        setOrders([]);
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast.error('Não foi possível carregar os dados do cliente.');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  // Formata telefone brasileiro (10 ou 11 dígitos)
  const formatPhone = (value?: string) => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    if (digits.length === 9) return digits.replace(/(\d{5})(\d{4})/, '$1-$2');
    if (digits.length === 8) return digits.replace(/(\d{4})(\d{4})/, '$1-$2');
    return value || '—';
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomer(updatedCustomer);
    toast.success('Cliente atualizado com sucesso!');
    setIsEditModalOpen(false);
  };

  const handleNewOrder = () => {
    navigate(`/orders/new?customer=${id}`);
  };

  // Estatísticas derivadas a partir dos pedidos quando não vierem agregadas do backend
  const { totalOrders, totalSpent, lastOrderISO } = useMemo(() => {
    const c: any = customer || {};
    const o = Array.isArray(orders) ? orders : [];

    const totalOrders = typeof c.orders === 'number' && c.orders >= 0 ? c.orders : o.length;

    const totalSpent = typeof c.totalValue === 'number' && c.totalValue > 0
      ? c.totalValue
      : o.reduce((sum: number, ord: any) => sum + (Number(ord?.total) || 0), 0);

    const lastOrderISO = c.lastOrder ?? (() => {
      if (!o.length) return null;
      const getDateVal = (ord: any) => ord?.created_at || ord?.date || ord?.createdAt || null;
      const latest = o.reduce((acc: any, cur: any) => {
        const a = new Date(getDateVal(acc) || 0).getTime();
        const b = new Date(getDateVal(cur) || 0).getTime();
        return b > a ? cur : acc;
      });
      return getDateVal(latest);
    })();

    return { totalOrders, totalSpent, lastOrderISO };
  }, [customer, orders]);

  // Alinha com Orders.tsx: mapeamento visual de status
  const getStatusMeta = (status: string) => {
    const key = (status || '').toLowerCase();
    switch (key) {
      case 'pendente':
        return {
          label: 'Pendente',
          icon: Clock,
          classes:
            'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'enviado':
        return {
          label: 'Enviado',
          icon: Send,
          classes:
            'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'entregue':
        return {
          label: 'Entregue',
          icon: CheckCircle2,
          classes:
            'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'pago':
        return {
          label: 'Pago',
          icon: CheckCircle2,
          classes:
            'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      default:
        return {
          label: status || '—',
          icon: Clock,
          classes:
            'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-700',
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  // Quantidade de parcelas do pedido (suporta diversos formatos de backend)
  const getInstallmentsCount = (o: any): number | undefined => {
    return (
      o?.installments ??
      o?.parcelas ??
      (Array.isArray(o?.installment_details) ? o.installment_details.length : undefined) ??
      (Array.isArray(o?.installmentDetails) ? o.installmentDetails.length : undefined) ??
      (Array.isArray(o?.payment_plan?.installments) ? o.payment_plan.installments.length : undefined)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-200">Carregando cliente...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cliente não encontrado</h2>
          <Button onClick={() => navigate('/customers')}>
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/customers')}
        >
          Voltar
        </Button>
        </div>
        
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full items-stretch">
        {/* Contact Information */}
        <Card padding="sm" className="lg:col-span-2 w-full h-full flex flex-col">
          <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informações de Contato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Telefone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatPhone(customer.phone)}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{customer.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    {customer.cpf && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CPF</p>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.cpf && customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</p>
                      </>
                    )}
                    {customer.cnpj && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">CNPJ</p>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.cnpj && customer.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</p>
                      </>
                    )}
                    {customer.rg && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">RG</p>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.rg}</p>
                      </>
                    )}
                    {customer.ie && (
                      <>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">IE</p>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.ie}</p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Cliente desde */}
                {customer.created_at && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Cliente desde</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatBRDateTime(customer.created_at)}</p>
                    </div>
                  </div>
                )}

              </div>
              <div className="space-y-4">
                {customer.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-6 w-6 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Endereço</p>
                      <p className="leading-snug text-base text-gray-900 dark:text-white">
                        <span className="font-semibold uppercase tracking-wide tabular-nums break-words">
                          {customer.address}
                          {customer.address_number ? `, ${customer.address_number}` : ''}
                          {customer.address_complement ? ` - ${customer.address_complement}` : ''}
                        </span>
                      </p>
                      {(customer.district || customer.city || customer.state || customer.zip_code || customer.country) && (
                        (() => {
                          const parts: string[] = [];
                          if (customer.district) parts.push(String(customer.district));
                          if (customer.city || customer.state) {
                            const cityState = [customer.city, customer.state].filter(Boolean).join(' - ');
                            if (cityState) parts.push(cityState);
                          }
                          if (customer.zip_code) {
                            const cepDigits = String(customer.zip_code).replace(/\D/g, '');
                            const cepMask = cepDigits.replace(/(\d{5})(\d{3}).*/, '$1-$2');
                            if (cepMask) parts.push(cepMask);
                          }
                          if (customer.country) parts.push(String(customer.country));
                          return (
                            <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide tabular-nums">
                              {parts.join(' • ')}
                            </p>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}
                {customer.person_type && (
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Pessoa</p>
                      <p className="font-medium text-gray-900 dark:text-white">{customer.person_type === 'FISICA' ? 'Física' : 'Jurídica'}</p>
                    </div>
                  </div>
                )}
                {customer.birth_date && (
                  (() => {
                    const raw = String(customer.birth_date || '').trim();
                    const toISO = (s: string): string | null => {
                      if (!s) return null;
                      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`;
                      if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`;
                      return null;
                    };
                    const iso = toISO(raw);
                    const ddmmyyyy = iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : raw;
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
                    return (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Data de Nascimento</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {ddmmyyyy}{age !== null ? ` • ${age} anos` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                )}
                <div className="flex items-center space-x-3">
                  <Circle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <select
                      value={customer.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          await customersService.update(customer._id ?? customer.id, { status: newStatus });
                          setCustomer({ ...customer, status: newStatus });
                          toast.success('Status atualizado!');
                        } catch (error) {
                          toast.error('Erro ao atualizar status.');
                        }
                      }}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full focus:outline-none
                        ${customer.status === 'Ativo'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}
                      `}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Desativado">Desativado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Observações</h3>
                <p className="text-gray-900 dark:text-white">{customer.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Statistics */}
        <Card className="lg:col-span-1 w-full h-full flex flex-col justify-between p-4 items-center text-center">
          <div className="p-4">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
    Estatísticas
  </h2>
  <div className="space-y-4">
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Total de Pedidos</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Valor Total Gasto</p>
      <p className="text-2xl font-bold text-green-600">{totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Último Pedido</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{lastOrderISO ? formatBRDateTime(lastOrderISO) : '—'}</p>
    </div>
  </div>
  <div className="mt-8">
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ações</h3>
    <div className="flex flex-row justify-center space-x-3">
      <Button
        icon={Trash}
        variant="danger"
        onClick={() => setIsDeleteModalOpen(true)}
      >
        Excluir
      </Button>
      <Button
        variant="secondary"
        icon={Edit}
        onClick={() => setIsEditModalOpen(true)}
      >
        Editar
      </Button>
    </div>
  </div>
</div>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card padding="sm">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pedidos Recentes
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/orders?customer=${id}`)}
            >
              Ver Todos
            </Button>
          </div>
          {orders.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pedido</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {[...orders]
                    .sort((a: any, b: any) => {
                      const ad = new Date(a?.created_at || a?.date || a?.createdAt || 0).getTime();
                      const bd = new Date(b?.created_at || b?.date || b?.createdAt || 0).getTime();
                      return bd - ad;
                    })
                    .slice(0, 5)
                    .map((order, idx) => {
                    const key = String((order as any)._id ?? order.id ?? order.order_number ?? `${order.customer_id ?? ''}-${order.created_at ?? ''}-${idx}`);
                    const orderNo = (order as any).order_number ?? `#${order.id ?? (order as any)._id ?? idx+1}`;
                    const dateRaw = (order as any).created_at ?? (order as any).date ?? (order as any).createdAt ?? null;
                    return (
                    <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white" title={orderNo}>
                            {orderNo}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {(() => {
                            const pm = (order as any).paymentMethod || (order as any).payment_method || 'N/A';
                            const inst = getInstallmentsCount(order);
                            return inst ? `${pm} (${inst}x)` : pm;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">
                        {customer?.name || (order as any).customer || (order as any).customer_name || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 dark:text-white">{dateRaw ? formatBRDateTime(dateRaw) : '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {(() => {
                            const dueRaw = (order as any).dueDate || (order as any).due_date || null;
                            return dueRaw ? `Venc: ${formatBRDateTime(dueRaw)}` : '';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                        R$ {(Number((order as any).total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const s = (order as any).status || 'Pendente';
                          const meta = getStatusMeta(s);
                          const Icon = meta.icon;
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${meta.classes}`}>
                              <Icon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                              {meta.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="p-2"
                            onClick={() => {
                              const openId = (order as any)?.id || (order as any)?._id || (order as any)?.order_number;
                              navigate(openId ? `/orders?open=${openId}` : '/orders');
                            }}
                          >
                            Ver
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {[...orders]
                  .sort((a: any, b: any) => {
                    const ad = new Date(a?.created_at || a?.date || a?.createdAt || 0).getTime();
                    const bd = new Date(b?.created_at || b?.date || b?.createdAt || 0).getTime();
                    return bd - ad;
                  })
                  .slice(0, 5)
                  .map((order, idx) => {
                    const key = String((order as any)._id ?? order.id ?? order.order_number ?? `${order.customer_id ?? ''}-${order.created_at ?? ''}-${idx}`);
                    const orderNo = (order as any).order_number ?? `#${order.id ?? (order as any)._id ?? idx+1}`;
                    const dateRaw = (order as any).created_at ?? (order as any).date ?? (order as any).createdAt ?? null;
                    const dueRaw = (order as any).dueDate || (order as any).due_date || null;
                    const total = Number((order as any).total) || 0;
                    const payMethod = (order as any).paymentMethod || (order as any).payment_method || '—';
                    const s = (order as any).status || 'Pendente';
                    const meta = getStatusMeta(s);
                    const Icon = meta.icon;
                    return (
                      <div key={key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white" title={orderNo}>{orderNo}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {(() => {
                                const inst = getInstallmentsCount(order);
                                return inst ? `${payMethod} (${inst}x)` : payMethod;
                              })()}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${meta.classes}`}>
                            <Icon className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-gray-900 dark:text-white font-medium">
                          {customer?.name || (order as any).customer || (order as any).customer_name || '—'}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{dateRaw ? formatBRDateTime(dateRaw) : '—'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{dueRaw ? `Venc: ${formatBRDateTime(dueRaw)}` : '—'}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              const openId = (order as any)?.id || (order as any)?._id || (order as any)?.order_number;
                              navigate(openId ? `/orders?open=${openId}` : '/orders');
                            }}
                          >
                            Ver
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Este cliente ainda não fez nenhum pedido.
              </p>
              <Button onClick={handleNewOrder}>
                Criar Primeiro Pedido
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Cliente"
        size="lg"
      >
        <CustomerForm 
          onClose={() => setIsEditModalOpen(false)} 
          onCustomerAdded={handleCustomerUpdated}
          initialData={customer}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Cliente"
        size="sm"
      >
        <div className="p-4">
          <p className="mb-4 text-gray-900 dark:text-white">
            Deseja realmente excluir o cliente <strong>{customer?.name}</strong>? Esta ação não poderá ser desfeita.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!customer?._id && !customer?.id) {
                  toast.error('ID do cliente inválido.');
                  return;
                }
                try {
                  await customersService.delete(customer._id ?? customer.id);
                  toast(
                    <span className="font-medium">Cliente excluído com sucesso!</span>,
                    {
                      icon: <Trash className="text-red-500" size={20} />, 
                      className: 'dark:bg-gray-900 dark:text-white bg-white text-black',
                    }
                  );
                  navigate('/customers');
                } catch (error: any) {
                  console.error('Erro ao excluir cliente:', error);
                  toast.error('Erro ao excluir cliente.');
                }
              }}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerDetail;
