<<<<<<< HEAD
import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Edit, Trash2, Boxes, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
=======
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Upload, Download, Loader, RefreshCw } from 'lucide-react';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import ImportModal from '../../components/Common/ImportModal';
import ProductForm from './ProductForm';
<<<<<<< HEAD
import { productsService, Product } from '../../services/api';
import FloatingActionButton from '../../components/Common/FloatingActionButton';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Products: React.FC = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const filterRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'todos' | 'ativos' | 'baixo' | 'inativos'>('todos');
  const location = useLocation();

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await productsService.getAll({ search: searchTerm });
        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Não foi possível carregar os produtos.');
        console.error('Erro ao carregar produtos:', error);
        
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      } finally {
        setLoading(false);
      }
    };
<<<<<<< HEAD
    
    // Usar um timeout para implementar um debounce simples na busca
    const timeoutId = setTimeout(() => {
      loadProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!showFilter) return;
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setShowFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilter]);

  // Ler aba da URL (?tab=baixo|ativos|inativos|todos)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = (params.get('tab') || '').toLowerCase();
    if (tab === 'baixo' || tab === 'ativos' || tab === 'inativos' || tab === 'todos') {
      setActiveTab(tab as any);
    }
  }, [location.search]);

  

  // Helper: detecta baixo estoque com base em stock e min_stock
  const isLowStock = (p: Product) => {
    const stock = Number((p as any).stock ?? 0);
    const min = Number((p as any).min_stock ?? 0);
    return min > 0 && stock < min;
  };

  // Status calculado para exibição
  const getComputedStatus = (p: Product): string => {
    const stock = Number((p as any).stock ?? 0);
    if (stock === 0) return 'Sem Estoque';
    if (isLowStock(p)) return 'Baixo Estoque';
    return p.status || 'Ativo';
  };

  // Agrupamentos para as abas
  const categorized = {
    todos: products,
    ativos: products.filter(p => p.status === 'Ativo'),
    baixo: products.filter(p => isLowStock(p) || p.status === 'Baixo Estoque'),
    inativos: products.filter(p => p.status === 'Inativo'),
  } as const;

  // Base conforme aba ativa + filtro adicional (dropdown)
  const baseProducts = activeTab === 'todos' ? products : categorized[activeTab];
  const filteredProducts = loading
    ? []
    : baseProducts.filter(p => {
        if (!statusFilter) return true;
        const computed = getComputedStatus(p);
        if (statusFilter === 'Baixo Estoque') return computed === 'Baixo Estoque';
        if (statusFilter === 'Sem Estoque') return computed === 'Sem Estoque';
        return computed === statusFilter;
      });

  const hasPermission = (required: string) => {
    if (!user) return false;
    if (user.role === 'Administrador') return true;
    const rawPerms = (user as any)?.permissions;
    const perms: string[] = Array.isArray(rawPerms) ? rawPerms : [];
    const [mod, action] = String(required).split(':');
    if (action) {
      return perms.includes(required) || perms.includes(mod);
    }
    return perms.includes(mod) || perms.some((p: string) => p.startsWith(`${mod}:`));
  };

  const canDeleteProducts = hasPermission('Produtos:Excluir');
=======

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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
<<<<<<< HEAD
      case 'Sem Estoque':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
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

<<<<<<< HEAD
  // onSave é tratado inline no modal

  const handleEditProduct = (productId: number) => {
    const found = products.find(p => (p as any)._id === productId || p.id === productId);
    if (found) {
      setProductToEdit(found);
      setIsModalOpen(true);
    } else {
      // fallback: tentar carregar e abrir modal
      setProductToEdit({ id: productId } as any);
      setIsModalOpen(true);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    if (!canDeleteProducts) {
      toast.error('Você não tem permissão para excluir produtos.');
      return;
    }
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingId(productToDelete.id);
    try {
      await productsService.delete(productToDelete.id);
      setProducts(products.filter(product => product.id !== productToDelete.id));
      toast.success('Produto excluído com sucesso!');
      setProductToDelete(null);
    } catch (error) {
      toast.error('Erro ao excluir produto.');
      console.error('Erro ao excluir produto:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDeleteProduct = () => {
    setProductToDelete(null);
  };
  
  const handleImportProducts = async (importedData: any[]) => {
    try {
      // Convert imported data to product format
      const newProducts = importedData.map((item, index) => ({
        name: item.nome || `Produto Importado ${index + 1}`,
        code: item.codigo || `IMP-${String(index + 1).padStart(3, '0')}`,
        description: item.descricao || '',
        category: item.categoria || '',
        ncm: item.ncm || '',
        cest: item.cest || '',
        unit: item.unidade || 'UN',
        cost_price: parseFloat(item.preco_custo) || 0,
        sale_price: parseFloat(item.preco_venda) || 0,
        stock: parseInt(item.estoque_atual) || 0,
        min_stock: parseInt(item.estoque_minimo) || 0,
        status: 'Ativo'
      }));

      // Use productsService.import method to upload file if available
      // For now, just simulate a successful import
      setProducts([...products, ...newProducts as unknown as Product[]]);
      toast.success(`${newProducts.length} produtos importados com sucesso!`);
      setIsImportModalOpen(false);
    } catch (error) {
      toast.error('Erro ao importar produtos.');
      console.error('Erro ao importar produtos:', error);
    }
  };


  return (
    <div className="space-y-6">
      

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total de Produtos */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Produtos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-blue-600 dark:text-blue-400">{products.length}</span>
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Boxes className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Produtos Ativos */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Produtos Ativos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">{products.filter(p => p.status === 'Ativo').length}</span>
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        {/* Baixo Estoque */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Baixo Estoque</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-red-600 dark:text-red-400">{products.filter(p => isLowStock(p) || p.status === 'Baixo Estoque').length}</span>
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        {/* Valor em Estoque */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor em Estoque</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-purple-600 dark:text-purple-400">R$ {products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card padding="sm">
        <div className="flex flex-row space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="relative flex-shrink-0" ref={filterRef}>
            <Button
              variant="secondary"
              icon={Filter}
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              aria-haspopup="true"
            >
              Filtros
            </Button>
            {showFilter && (
              <div className="absolute right-0 mt-2 z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Filtrar produtos</h3>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-200">Status</label>
                <select
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Baixo Estoque">Baixo Estoque</option>
                  <option value="Inativo">Inativo</option>
                </select>
                <div className="flex justify-end mt-3">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                    onClick={() => setShowFilter(false)}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Products List with Tabs: Mobile cards + Desktop table */}
      <Card padding="sm">
        {/* Abas de filtro */}
        <div className="mb-2">
          <div className="flex space-x-8 overflow-x-auto overflow-y-hidden px-4">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'todos'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Boxes className="h-4 w-4" />
              <span>Todos ({categorized.todos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ativos')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'ativos'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Ativos ({categorized.ativos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('baixo')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'baixo'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Baixo Estoque ({categorized.baixo.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('inativos')}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'inativos'
                  ? 'border-gray-500 text-gray-600 dark:text-gray-300'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span>Inativos ({categorized.inativos.length})</span>
            </button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3 overflow-x-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum produto encontrado.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const statusLabel = getComputedStatus(product);
              return (
                <div key={product.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-gray-900 dark:text-white break-words">{product.name}</div>
                      {product.description ? (
                        <div className="text-xs text-gray-600 dark:text-gray-300 break-words mt-0.5">{product.description}</div>
                      ) : null}
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Código: {product.code}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(statusLabel)}`}>{statusLabel}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Venda:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">R$ {(product.sale_price ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Custo:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">R$ {(product.cost_price ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Estoque:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{product.stock} {product.unit}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Mínimo:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">{product.min_stock}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="secondary" aria-label="Editar" onClick={() => handleEditProduct(product.id)}>
                      <Edit size={16} className="mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="danger" aria-label="Excluir" onClick={() => handleDeleteProduct(product)} loading={deletingId === product.id} disabled={!canDeleteProducts}>
                      <Trash2 size={16} className="mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">
              Nenhum produto encontrado.
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Preços
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2 sm:px-6 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
<<<<<<< HEAD
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</span>
                      <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <span>{product.code}</span>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle whitespace-nowrap">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-sm text-gray-900 dark:text-white">Venda: R$ {(product.sale_price ?? 0).toFixed(2)}</span>
                      <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Custo: R$ {(product.cost_price ?? 0).toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle whitespace-nowrap">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900 dark:text-white">{product.stock} {product.unit}</span>
                      </div>
                      <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Mín: {product.min_stock}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle whitespace-nowrap">
                    {(() => {
                      const label = getComputedStatus(product);
                      return (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(label)}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center align-middle whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 justify-center">
                      <Button 
                        size="sm"
                        variant="secondary"
                        aria-label="Editar"
                        onClick={() => handleEditProduct(product.id)}
                        className="p-2"
                      >
                        <Edit size={18} />
                      </Button>
                      <Button 
                        size="sm"
                        variant="danger"
                        aria-label="Excluir"
                        onClick={() => handleDeleteProduct(product)}
                        loading={deletingId === product.id}
                        disabled={!canDeleteProducts}
                        className="p-2"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </Card>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!productToDelete}
        onClose={cancelDeleteProduct}
        title="Excluir Produto"
        size="sm"
      >
        <div className="py-2">
          <p className="text-lg text-gray-900 dark:text-white mb-4">
            Deseja realmente excluir o produto <span className="font-bold">{productToDelete?.name}</span>? Esta ação não poderá ser desfeita.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={cancelDeleteProduct}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDeleteProduct} loading={deletingId === productToDelete?.id}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setProductToEdit(null); }}
        title={productToEdit ? 'Editar Produto' : 'Novo Produto'}
        size="md"
      >
        <ProductForm 
          onClose={() => { setIsModalOpen(false); setProductToEdit(null); }} 
          productToEdit={productToEdit || undefined}
          onSave={async (saved: Product) => {
            console.log('=== PRODUTO SALVO ===');
            console.log('Produto salvo:', saved);
            console.log('Estava editando:', !!productToEdit);
            
            // Recarregar produtos do servidor para garantir dados atualizados
            try {
              const data = await productsService.getAll({ search: searchTerm });
              setProducts(Array.isArray(data) ? data : []);
              console.log('Lista de produtos recarregada');
            } catch (error) {
              console.error('Erro ao recarregar produtos:', error);
              // Fallback: atualizar lista localmente
              if (productToEdit) {
                setProducts(prev => prev.map(p => {
                  // Comparar tanto por id quanto por _id para compatibilidade
                  const isMatch = p.id === saved.id || (p as any)._id === (saved as any)._id;
                  return isMatch ? saved : p;
                }));
              } else {
                setProducts(prev => [saved, ...prev]);
              }
            }
            
            toast.success(productToEdit ? 'Produto atualizado com sucesso!' : 'Produto adicionado com sucesso!');
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
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

<<<<<<< HEAD
      {/* Floating Action Button */}
      <FloatingActionButton
        ariaLabel="Novo Produto"
        onClick={() => {
          setProductToEdit(null);
          setIsModalOpen(true);
        }}
      />
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    </div>
  );
};

export default Products;