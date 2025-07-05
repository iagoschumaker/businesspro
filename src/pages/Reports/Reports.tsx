import React, { useState } from 'react';
import { Download, FileText, BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import SalesReport from './SalesReport';
import CustomersReport from './CustomersReport';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const reportTypes = [
    {
      id: 'sales',
      name: 'Vendas',
      icon: TrendingUp,
      description: 'Relatório de vendas e faturamento'
    },
    {
      id: 'customers',
      name: 'Clientes',
      icon: PieChart,
      description: 'Análise de clientes e comportamento'
    },
    {
      id: 'products',
      name: 'Produtos',
      icon: BarChart3,
      description: 'Performance de produtos e estoque'
    },
    {
      id: 'financial',
      name: 'Financeiro',
      icon: FileText,
      description: 'Fluxo de caixa e recebimentos'
    }
  ];

  const quickReports = [
    {
      name: 'Vendas do Mês',
      description: 'Relatório completo das vendas do mês atual',
      format: 'PDF'
    },
    {
      name: 'Clientes Ativos',
      description: 'Lista de clientes com pedidos nos últimos 30 dias',
      format: 'Excel'
    },
    {
      name: 'Produtos em Baixa',
      description: 'Produtos com estoque abaixo do mínimo',
      format: 'PDF'
    },
    {
      name: 'Boletos Vencidos',
      description: 'Relatório de boletos em atraso',
      format: 'Excel'
    }
  ];

  const generateReport = (reportName: string, format: string) => {
    console.log(`Generating ${reportName} in ${format} format`);
    alert(`Relatório "${reportName}" sendo gerado em formato ${format}...`);
  };

  const exportCurrentReport = (format: string) => {
    console.log(`Exporting current report in ${format} format`);
    alert(`Exportando relatório atual em formato ${format}...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Relatórios
        </h1>
        <div className="flex space-x-3">
          <Button variant="secondary" icon={Download} onClick={() => exportCurrentReport('PDF')}>
            Exportar PDF
          </Button>
          <Button variant="secondary" icon={Download} onClick={() => exportCurrentReport('Excel')}>
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Período:
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Report Type Tabs */}
      <Card>
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex space-x-8 overflow-x-auto">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === type.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{type.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Content */}
        <div className="min-h-[400px]">
          {activeTab === 'sales' && <SalesReport dateRange={dateRange} />}
          {activeTab === 'customers' && <CustomersReport dateRange={dateRange} />}
          {activeTab === 'products' && (
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                Relatório de Produtos
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Análise de performance de produtos em desenvolvimento.
              </p>
            </div>
          )}
          {activeTab === 'financial' && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                Relatório Financeiro
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Relatório de fluxo de caixa em desenvolvimento.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Reports */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Relatórios Rápidos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickReports.map((report, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {report.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {report.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                    {report.format}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={() => generateReport(report.name, report.format)}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Reports;