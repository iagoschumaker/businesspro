import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Upload, Download, Loader, RefreshCw } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import ImportModal from '../../components/Common/ImportModal';
import ProductForm from './ProductForm';
import { productsService } from '../../services/api';

interface Product {
  id: number;
  name: string;
  description: string;
  code: string;
  ncm: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  category: string;
  status: string;
}

const Products: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Carregar produtos do banco de dados
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('Buscando produtos do banco de dados...');
        const response = await productsService.getAll();
        
        if (response && Array.isArray(response)) {
          console.log('Produtos recebidos:', response);
          
          // Log detalhado de cada produto para depuração
          response.forEach((product: any) => {
            console.log(`Produto ID: ${product.id}, Nome: ${product.name}, Categoria: "${product.category}", Tipo categoria: ${typeof product.category}`);
          });
          
          // Formatar os dados recebidos para o formato esperado pelo componente
          const formattedProducts = response.map((product: any) => ({
            id: product.id,
            name: product.name || 'Sem nome',
            description: product.description || '',
            code: product.code || '',
            ncm: product.ncm || '',
            unit: product.unit || 'UN',
            costPrice: product.cost_price || 0,
            salePrice: product.price || 0, // Usando o campo 'price' do banco em vez de 'sale_price'
            stock: product.stock || 0,
            minStock: product.min_stock || 0,
            category: product.category || 'Sem categoria',
            status: product.stock <= product.min_stock ? 'Baixo Estoque' : 'Ativo'
          }));
          
          setProducts(formattedProducts);
          setError(null);
        } else {
          console.error('Resposta da API não contém dados de produtos');
          setError('Não foi possível carregar os produtos');
          setProducts([]);
        }
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        setError('Erro ao carregar produtos do banco de dados');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Função para atualizar a lista após criar ou editar um produto
  const refreshProductList = async () => {
    try {
      setLoading(true);
      const response = await productsService.getAll();
      
      if (response && Array.isArray(response)) {
        const formattedProducts = response.map((product: any) => ({
          id: product.id,
          name: product.name || 'Sem nome',
          description: product.description || '',
          code: product.code || '',
          ncm: product.ncm || '',
          unit: product.unit || 'UN',
          costPrice: product.cost_price || 0,
          salePrice: product.price || 0, // Usando o campo 'price' do banco em vez de 'sale_price'
          stock: product.stock || 0,
          minStock: product.min_stock || 0,
          category: product.category || 'Sem categoria',
          status: product.stock <= product.min_stock ? 'Baixo Estoque' : 'Ativo'
        }));
        
        setProducts(formattedProducts);
        setError(null);
      }
    } catch (err) {
      console.error('Erro ao atualizar lista de produtos:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleImportProducts = async (importedData: any[]) => {
    console.log('Dados importados:', importedData);
    
    if (!importedData || importedData.length === 0) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Aqui poderia ter um loop para enviar cada produto para a API
      // Para este exemplo, apenas atualizamos o estado local após receber os dados
      
      // Após enviar para API, atualizamos a lista
      await refreshProductList();
      setIsImportModalOpen(false);
    } catch (err) {
      console.error('Erro ao importar produtos:', err);
      setError('Falha ao importar produtos');
    } finally {
      setLoading(false);
    }
  };

  // Função de exportação para CSV
  const exportProducts = () => {
    if (products.length === 0) {
      return;
    }
    
    // Lógica para exportar os produtos como CSV
    // Apenas um exemplo, sem implementação real
    console.log('Exportando produtos:', products);
    
    // Aqui seria implementada a geração do arquivo CSV
  };
  
  // Função para lidar com a edição de um produto
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };
  
  // Função para iniciar o processo de exclusão
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  };
  
  // Função para confirmar a exclusão do produto
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setLoading(true);
      await productsService.delete(productToDelete.id);
      console.log(`Produto ID ${productToDelete.id} excluído com sucesso`);
      
      // Atualiza a lista de produtos
      await refreshProductList();
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      setError('Falha ao excluir produto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
        
        <div className="flex space-x-3">
          <Button 
            variant="secondary"
            size="sm"
            icon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Importar
          </Button>
          
          <Button 
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={exportProducts}
          >
            Exportar
          </Button>

          <Button 
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={refreshProductList}
          >
            Atualizar
          </Button>
          
          <Button 
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Novo Produto
          </Button>
        </div>
      </div>
      
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-grow max-w-sm">
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 sm:text-sm"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              icon={Filter}
            >
              Filtrar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Carregando produtos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="secondary" onClick={refreshProductList}>Tentar novamente</Button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">Nenhum produto encontrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              {searchTerm ? 'Tente outro termo de busca ou' : 'Cadastre seu primeiro produto ou'} importe uma lista.
            </p>
            {searchTerm && (
              <Button 
                variant="secondary" 
                className="mb-2"
                onClick={() => setSearchTerm('')}
              >
                Limpar busca
              </Button>
            )}
            <Button 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Novo Produto
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-center">
              <thead className="bg-gray-50 dark:bg-gray-800 text-center">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Preço
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Estoque
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Categoria
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
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
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        Venda: R$ {product.salePrice.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Custo: R$ {product.costPrice.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {product.stock} {product.unit}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Mín: {product.minStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {product.category || 'Sem categoria'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex space-x-2 justify-center">
                        <Button size="sm" variant="secondary" onClick={() => handleEditProduct(product)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteProduct(product)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Product Form Modal - New Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Produto"
        size="xl"
      >
        <ProductForm 
          onClose={() => {
            setIsModalOpen(false);
            refreshProductList();
          }} 
        />
      </Modal>

      {/* Product Form Modal - Edit Product */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Editar Produto: ${selectedProduct?.name || ''}`}
        size="xl"
      >
        <ProductForm 
          product={selectedProduct!} 
          onClose={() => {
            setIsEditModalOpen(false);
            refreshProductList();
          }} 
        />
      </Modal>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar Produtos"
        templateColumns={importTemplateColumns}
        onImport={handleImportProducts}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="p-6 space-y-6">
          <p className="text-gray-700 dark:text-gray-300">
            Tem certeza que deseja excluir o produto <strong>{productToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Esta ação não pode ser desfeita.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeleteProduct}
              disabled={loading}
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;