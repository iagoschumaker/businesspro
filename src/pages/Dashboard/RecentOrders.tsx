import React from 'react';
<<<<<<< HEAD
import { ExternalLink, CheckCircle2, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Common/Button';
import { formatBRFlexible } from '../../utils/date';

interface Order {
  id?: number | string;
  _id?: string;
  order_number?: string;
  customer_name?: string;
  customer?: string;
  customer_id?: { name?: string } | string;
  total?: number;
  status?: string;
  created_at?: string;
  createdAt?: string;
  date?: string;
  due_date?: string;
  dueDate?: string;
  payment_method?: string;
  paymentMethod?: string;
=======
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
<<<<<<< HEAD
  const navigate = useNavigate();
  const getInstallmentsCount = (o: any): number | undefined => {
    return (
      o?.installments ??
      o?.parcelas ??
      (Array.isArray(o?.installment_details) ? o.installment_details.length : undefined) ??
      (Array.isArray(o?.installmentDetails) ? o.installmentDetails.length : undefined) ??
      (Array.isArray(o?.payment_plan?.installments) ? o.payment_plan.installments.length : undefined)
    );
  };
  // Usa apenas dados reais; ordena desc por data e limita a 5
  const displayOrders = (Array.isArray(orders) ? orders : [])
    .slice()
    .sort((a: any, b: any) => {
      const ad = new Date((a as any).created_at || (a as any).date || (a as any).createdAt || 0).getTime();
      const bd = new Date((b as any).created_at || (b as any).date || (b as any).createdAt || 0).getTime();
      return bd - ad;
    })
    .slice(0, 5);

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

  if (displayOrders.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">Sem pedidos recentes.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Desktop table */}
      <table className="hidden md:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
          {displayOrders.map((order, idx) => {
            const key = String((order as any)._id ?? order.id ?? order.order_number ?? `${(order as any).customer_name ?? ''}-${(order as any).created_at ?? ''}-${idx}`);
            const orderNo = (order as any).order_number ?? `#${(order as any).id ?? (order as any)._id ?? idx+1}`;
            const dateRaw = (order as any).created_at ?? (order as any).date ?? (order as any).createdAt ?? null;
            const dueRaw = (order as any).dueDate ?? (order as any).due_date ?? null;
            const customerName = (order as any).customer_name || (order as any).customer || (typeof (order as any).customer_id === 'object' ? (order as any).customer_id?.name : undefined) || '—';
            const paymentMethod = (order as any).paymentMethod || (order as any).payment_method || 'N/A';
            const installments = getInstallmentsCount(order);
            const total = Number((order as any).total) || 0;
            const status = (order as any).status || 'Pendente';
            return (
            <tr key={key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white" title={orderNo}>
                    {orderNo}
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{installments ? `${paymentMethod} (${installments}x)` : paymentMethod}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">{customerName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900 dark:text-white">{dateRaw ? formatBRFlexible(dateRaw) : '—'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{dueRaw ? `Venc: ${formatBRFlexible(dueRaw)}` : ''}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-center">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {(() => {
                  const meta = getStatusMeta(status);
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
                <div className="flex justify-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="p-2"
                    onClick={() => {
                      const openId = (order as any)?.id || (order as any)?._id || (order as any)?.order_number;
                      navigate(openId ? `/orders?open=${openId}` : '/orders');
                    }}
                    aria-label="Ver detalhes"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {displayOrders.map((order, idx) => {
          const key = String((order as any)._id ?? order.id ?? order.order_number ?? `${(order as any).customer_name ?? ''}-${(order as any).created_at ?? ''}-${idx}`);
          const orderNo = (order as any).order_number ?? `#${(order as any).id ?? (order as any)._id ?? idx+1}`;
          const dateRaw = (order as any).created_at ?? (order as any).date ?? (order as any).createdAt ?? null;
          const dueRaw = (order as any).dueDate ?? (order as any).due_date ?? null;
          const customerName = (order as any).customer_name || (order as any).customer || (typeof (order as any).customer_id === 'object' ? (order as any).customer_id?.name : undefined) || '—';
          const paymentMethod = (order as any).paymentMethod || (order as any).payment_method || 'N/A';
          const installments = getInstallmentsCount(order);
          const total = Number((order as any).total) || 0;
          const status = (order as any).status || 'Pendente';
          const meta = getStatusMeta(status);
          const Icon = meta.icon;
          return (
            <div key={key} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{orderNo}</div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${meta.classes}`}>
                  <Icon className={`h-3 w-3 ${meta.iconColor}`} />
                  {meta.label}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{installments ? `${paymentMethod} (${installments}x)` : paymentMethod}</div>
              <div className="text-sm text-gray-900 dark:text-white mb-1">{customerName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {dateRaw ? formatBRFlexible(dateRaw) : '—'}{dueRaw ? ` · Venc: ${formatBRFlexible(dueRaw)}` : ''}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="px-2 py-1"
                  onClick={() => {
                    const openId = (order as any)?.id || (order as any)?._id || (order as any)?.order_number;
                    navigate(openId ? `/orders?open=${openId}` : '/orders');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
=======

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pedido
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Cliente
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {orders.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                <p>Nenhum pedido encontrado</p>
                <p className="text-sm mt-1">Os pedidos recentes aparecerão aqui.</p>
              </div>
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {order.order_number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {order.customer_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
      {orders.length > 0 && (
        <div className="flex justify-center mt-4">
          <Link 
            to="/orders" 
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Ver todos os pedidos
          </Link>
        </div>
      )}
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    </div>
  );
};

export default RecentOrders;