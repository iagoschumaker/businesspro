import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard, Download, Eye, Loader, RefreshCw, Edit } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import BilletForm from './BilletForm';
import { generateBilletPDF, BilletPDFData } from '../../utils/pdfGenerator';
import { billetsService } from '../../services/api';

const Billing: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [billets, setBillets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBillet, setSelectedBillet] = useState<any>(null);

  // Carregar boletos do banco de dados
  useEffect(() => {
    fetchBillets();
  }, []);

  const fetchBillets = async () => {
    try {
      setLoading(true);
      console.log('Buscando boletos do banco de dados...');
      const response = await billetsService.getAll();
      
      console.log('Resposta bruta da API de boletos:', response);
      
      // A API pode estar retornando os dados em diferentes formatos
      // Vamos tentar várias estruturas possíveis
      let billetsData = [];
      
      if (Array.isArray(response)) {
        // Se a resposta já é um array
        billetsData = response;
      } else if (response && Array.isArray(response.data)) {
        // Se a resposta tem uma propriedade data que é um array
        billetsData = response.data;
      } else if (response && response.data && Array.isArray(response.data.data)) {
        // Se a resposta tem uma estrutura data.data que é um array (comum em APIs paginadas)
        billetsData = response.data.data;
      } else if (response && typeof response === 'object') {
        // Se for um objeto único, transformamos em array
        billetsData = [response];
      } else {
        // Se não conseguimos identificar a estrutura
        console.error('Estrutura de resposta da API desconhecida:', response);
        throw new Error('Formato de resposta inválido');
      }
      
      console.log('Boletos extraídos da resposta:', billetsData);
      
      // Mesmo que não tenhamos boletos, não é um erro - apenas uma lista vazia
      if (billetsData.length === 0) {
        console.log('Nenhum boleto encontrado');
        setBillets([]);
        setError(null);
        return;
      }
      
      // Formatar os dados recebidos para o formato esperado pelo componente
      const formattedBillets = billetsData.map((billet: any) => ({
        id: billet.id || '',
        customer: billet.customer_name || 'Cliente não identificado',
        amount: billet.amount || 0,
        dueDate: billet.due_date || '',
        issueDate: billet.issue_date || '',
        status: billet.status || 'Em Aberto',
        paymentDate: billet.payment_date || null,
        barcode: billet.barcode || '',
        // Preservar os dados originais para edição
        customer_id: billet.customer_id,
        order_id: billet.order_id,
        description: billet.description,
        instructions: billet.instructions,
        interest: billet.interest,
        fine: billet.fine,
        discount: billet.discount,
        discount_date: billet.discount_date
      }));
      
      setBillets(formattedBillets);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar boletos:', err);
      setError('Erro ao carregar boletos do banco de dados');
      setBillets([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleGeneratePDF = (billetId: string) => {
    const billet = billets.find(b => b.id === billetId);
    if (!billet) return;

    const billetData: BilletPDFData = {
      id: billet.id,
      customer: {
        name: billet.customer,
        document: billet.document || 'Sem documento',
        address: billet.address || 'Endereço não disponível'
      },
      amount: billet.amount,
      dueDate: billet.dueDate,
      issueDate: billet.issueDate,
      barcode: billet.barcode || 'Código de barras não disponível',
      instructions: 'Não receber após o vencimento. Sujeito a multa de 2% e juros de 1% ao mês.',
      interest: 1.0,
      fine: 2.0
    };

    // Passar o objeto billetData para a função de geração de PDF
    generateBilletPDF(billetData as any);
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
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader className="animate-spin h-8 w-8 text-blue-500" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando boletos...</span>
            </div>
          )}
          
          {error && !loading && (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{error}</div>
              <Button 
                icon={RefreshCw} 
                variant="secondary" 
                onClick={fetchBillets}
              >
                Tentar Novamente
              </Button>
            </div>
          )}
          
          {!loading && !error && billets.length === 0 && (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                Nenhum boleto encontrado
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Comece gerando um novo boleto para um cliente.
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsModalOpen(true)}>
                  Gerar Boleto
                </Button>
              </div>
            </div>
          )}
          
          {!loading && !error && billets.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
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
                          onClick={() => handleGeneratePDF(billet.id)}
                        >
                          PDF
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          icon={Edit}
                          onClick={() => {
                            setSelectedBillet(billet);
                            setIsModalOpen(true);
                          }}
                        >
                          Editar
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
          )}
        </div>
      </Card>

      {/* Billet Form Modal */}
      <Modal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBillet(null);
        }}
        title={selectedBillet ? 'Editar Boleto' : 'Novo Boleto'}
        size="lg"
      >
        <BilletForm 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBillet(null);
          }} 
          billetToEdit={selectedBillet}
          onSuccess={() => {
            // Atualizar a lista após criar/editar um boleto
            fetchBillets();
          }}
        />
      </Modal>
    </div>
  );
};

export default Billing;
