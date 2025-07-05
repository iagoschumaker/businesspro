import React, { useState } from 'react';
import { Plus, Search, Filter, Package, Upload, Download } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import ImportModal from '../../components/Common/ImportModal';
import ProductForm from './ProductForm';

const Products: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Produto Premium A',
      description: 'Descrição detalhada do produto premium A',
      code: 'PRD-001',
      ncm: '12345678',
      unit: 'UN',
      costPrice: 45.50,
      salePrice: 89.90,
      stock: 150,
      minStock: 20,
      category: 'Categoria A',
      status: 'Ativo'
    },
    {
      id: 2,
      name: 'Produto Standard B',
      description: 'Descrição detalhada do produto standard B',
      code: 'PRD-002',
      ncm: '87654321',
      unit: 'KG',
      costPrice: 25.30,
      salePrice: 49.90,
      stock: 8,
      minStock: 10,
      category: 'Categoria B',
      status: 'Baixo Estoque'
    },
    {
      id: 3,
      name: 'Produto Especial C',
      description: 'Descrição detalhada do produto especial C',
      code: 'PRD-003',
      ncm: '11223344',
      unit: 'UN',
      costPrice: 120.00,
      salePrice: 199.90,
      stock: 45,
      minStock: 15,
      category: 'Categoria C',
      status: 'Ativo'
    }
  ]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Baixo Estoque':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Inativo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const importTemplateColumns = [
    'nome',
    'codigo',
    'descricao',
    'categoria',
    'ncm',
    'cest',
    'unidade',
    'preco_custo',
    'preco_venda',
    'estoque_atual',
    'estoque_minimo'
  ];

  const handleImportProducts = (importedData: any[]) => {
    // Convert imported data to product format
    const newProducts = importedData.map((item, index) => ({
      id: products.length + index + 1,
      name: item.nome || `Produto Importado ${index + 1}`,
      code: item.codigo || `IMP-${String(index + 1).padStart(3, '0')}`,
      description: item.descricao || '',
      category: item.categoria || '',
      ncm: item.ncm || '',
      cest: item.cest || '',
      unit: item.unidade || 'UN',
      costPrice: parseFloat(item.preco_custo) || 0,
      salePrice: parseFloat(item.preco_venda) || 0,
      stock: parseInt(item.estoque_atual) || 0,
      minStock: parseInt(item.estoque_minimo) || 0,
      status: 'Ativo'
    }));

    setProducts([...products, ...newProducts]);
    alert(`${newProducts.length} produtos importados com sucesso!`);
  };

  const exportProducts = () => {
    const csvContent = [
      importTemplateColumns.join(','),
      ...products.map(product => [
        product.name,
        product.code,
        product.description,
        product.category,
        product.ncm,
        '', // cest
        product.unit,
        product.costPrice,
        product.salePrice,
        product.stock,
        product.minStock
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Produtos
        </h1>
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Importar
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={exportProducts}
          >
            Exportar
          </Button>
          <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {products.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total de Produtos
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {products.filter(p => p.status === 'Ativo').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Produtos Ativos
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {products.filter(p => p.status === 'Baixo Estoque').length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Baixo Estoque
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              R$ {products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Valor em Estoque
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
              placeholder="Buscar por nome ou código..."
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

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Preços
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estoque
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
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      Venda: R$ {product.salePrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Custo: R$ {product.costPrice.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {product.stock} {product.unit}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mín: {product.minStock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        Editar
                      </Button>
                      <Button size="sm" variant="danger">
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Produto"
        size="xl"
      >
        <ProductForm onClose={() => setIsModalOpen(false)} />
      </Modal>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Produtos"
        templateColumns={importTemplateColumns}
        onImport={handleImportProducts}
      />
    </div>
  );
};

export default Products;