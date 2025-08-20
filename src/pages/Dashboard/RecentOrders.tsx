import React from 'react';
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
}

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
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
    </div>
  );
};

export default RecentOrders;