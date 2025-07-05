import React, { useState } from 'react';
import { Plus, Search, Filter, CreditCard, Download, Eye } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import BilletForm from './BilletForm';
import { generateBilletPDF, BilletPDFData } from '../../utils/pdfGenerator';

const Billing: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const billets = [
    {
      id: '#BOL001',
      customer: 'João Silva',
      amount: 1250.00,
      dueDate: '2024-01-25',
      issueDate: '2024-01-15',
      status: 'Em Aberto',
      paymentDate: null,
      barcode: '23791.12345 67890.123456 78901.234567 8 91230000125000'
    },
    {
      id: '#BOL002',
      customer: 'Maria Santos',
      amount: 890.00,
      dueDate: '2024-01-20',
      issueDate: '2024-01-10',
      status: 'Pago',
      paymentDate: '2024-01-18',
      barcode: '23791.12345 67890.123456 78901.234567 8 91230000089000'
    },
    {
      id: '#BOL003',
      customer: 'Carlos Oliveira',
      amount: 2100.00,
      dueDate: '2024-01-18',
      issueDate: '2024-01-08',
      status: 'Vencido',
      paymentDate: null,
      barcode: '23791.12345 67890.123456 78901.234567 8 91230000210000'
    },
    {
      id: '#BOL004',
      customer: 'Ana Costa',
      amount: 750.00,
      dueDate: '2024-01-30',
      issueDate: '2024-01-20',
      status: 'Em Aberto',
      paymentDate: null,
      barcode: '23791.12345 67890.123456 78901.234567 8 91230000075000'
    }
  ];

  const filteredBillets = billets.filter(billet =>
    billet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    billet.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Em Aberto':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Vencido':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Cancelado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const generateBilletPDF = (billetId: string) => {
    const billet = billets.find(b => b.id === billetId);
    if (!billet) return;

    const billetData: BilletPDFData = {
      id: billet.id,
      customer: {
        name: billet.customer,
        document: '123.456.789-00',
        address: 'Rua das Flores, 123 - Centro, São Paulo - SP'
      },
      amount: billet.amount,
      dueDate: billet.dueDate,
      issueDate: billet.issueDate,
      barcode: billet.barcode,
      instructions: 'Não receber após o vencimento. Sujeito a multa de 2% e juros de 1% ao mês.',
      interest: 1.0,
      fine: 2.0
    };

    generateBilletPDF(billetData);
  };

  const totalAmount = billets.reduce((sum, billet) => sum + billet.amount, 0);
  const paidAmount = billets.filter(b => b.status === 'Pago').reduce((sum, billet) => sum + billet.amount, 0);
  const openAmount = billets.filter(b => b.status === 'Em Aberto').reduce((sum, billet) => sum + billet.amount, 0);
  const overdueAmount = billets.filter(b => b.status === 'Vencido').reduce((sum, billet) => sum + billet.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Boletos
        </h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Gerar Boleto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Emitido
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              R$ {paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Pagos
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              R$ {openAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Em Aberto
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              R$ {overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Vencidos
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por número do boleto ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <Button variant="secondary" icon={Filter}>
            Filtros
          </Button>
        </div>
      </Card>

      {/* Billets Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Boleto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vencimento
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
              {filteredBillets.map((billet) => (
                <tr key={billet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {billet.id}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Emitido: {new Date(billet.issueDate).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {billet.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    R$ {billet.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(billet.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                    {billet.paymentDate && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        Pago: {new Date(billet.paymentDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(billet.status)}`}>
                      {billet.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary" icon={Eye}>
                        Ver
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        icon={Download}
                        onClick={() => generateBilletPDF(billet.id)}
                      >
                        PDF
                      </Button>
                      {billet.status !== 'Pago' && (
                        <Button size="sm" variant="secondary" icon={CreditCard}>
                          Registrar Pagamento
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Billet Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Gerar Boleto"
        size="lg"
      >
        <BilletForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Billing;