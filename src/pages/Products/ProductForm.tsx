import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Check, X, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/Common/Button';
import { productsService, categoriesService, Product } from '../../services/api';

// Definição local da interface ProductCategory
export interface ProductCategory {
  id: number;
  name: string;
}
import { useApi } from '../../hooks/useApi';

interface ProductFormProps {
  onClose: () => void;
  productToEdit?: Product;
  onSave?: (newProduct: Product) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ onClose, productToEdit, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para controlar a entrada de nova categoria
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: number, name: string } | null>(null);
  
  // Referência para o input de categoria
  const newCategoryInputRef = useRef<HTMLInputElement>(null);
  
  // Buscar categorias da API
  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
    execute: loadCategories
  } = useApi(categoriesService.getAll);
  
  // Lista de categorias - Lidar com diferentes formatos de resposta da API
  const categories = Array.isArray(categoriesData) ? categoriesData : 
                   (categoriesData?.data && Array.isArray(categoriesData.data)) ? categoriesData.data : [];
  
  // Estado para controlar tentativas de carregamento de categorias
  const [categoriesEndpointUnavailable, setCategoriesEndpointUnavailable] = useState(false);
  
  // Carregar categorias apenas uma vez ao iniciar o componente
  useEffect(() => {
    // Se já sabemos que o endpoint não está disponível, não tente novamente
    if (categoriesEndpointUnavailable) return;
    
    // Criar uma função para carregar as categorias
    const fetchCategories = async () => {
      try {
        await loadCategories();
      } catch (err: any) {
        // Marcar endpoint como indisponível para evitar novas tentativas
        setCategoriesEndpointUnavailable(true);
        console.log('Endpoint de categorias não está disponível:', err.message || 'Erro desconhecido');
      }
    };
    
    // Executar apenas uma vez ao montar o componente
    fetchCategories();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removendo loadCategories das dependências para evitar loop
  
  // Gerar código de produto automaticamente
  const generateProductCode = () => {
    // Formato: PRD + 5 dígitos aleatórios
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
    return `PRD${randomPart}`;
  };
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: generateProductCode(),
    ncm: '',
    cest: '',
    unit: 'UN',
    cost_price: '',
    sale_price: '',
    stock: '',
    min_stock: '',
    category_id: '',
    category: '',
    status: 'active'
  });
  
  // Carregar dados do produto se estiver editando
  // Evita sobrescrever o formData após interação do usuário
const [formInitialized, setFormInitialized] = useState(false);
useEffect(() => {
  if (productToEdit && !formInitialized) {
    setFormData({
      name: productToEdit.name,
      description: productToEdit.description || '',
      code: productToEdit.code,
      ncm: productToEdit.ncm || '',
      cest: productToEdit.cest || '',
      unit: productToEdit.unit,
      cost_price: productToEdit.cost_price.toString(),
      sale_price: productToEdit.sale_price.toString(),
      stock: productToEdit.stock.toString(),
      min_stock: productToEdit.min_stock.toString(),
      category_id: (productToEdit as any).category_id?.toString() || '',
      category: (productToEdit.category || '').toUpperCase(),
      status: productToEdit.status
    });
    setFormInitialized(true);
  }
}, [productToEdit, formInitialized]);


  // Após carregar categorias, se tivermos apenas o nome da categoria no produto, sincronizar o category_id
  useEffect(() => {
    if (!formData.category_id && formData.category && categories && categories.length > 0) {
      const found = (categories as any[]).find((c) =>
        (c.name || '').toString().toUpperCase() === formData.category.toUpperCase()
      );
      if (found && found.id != null) {
        setFormData((prev) => ({
          ...prev,
          category_id: found.id.toString()
        }));
      }
    }
  }, [categories, formData.category, formData.category_id]);
  
  // Focar no input de nova categoria quando mostrado
  useEffect(() => {
    if (showNewCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showNewCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
  console.log('[DEBUG] Valor de estoque no submit:', formData.stock);

    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Converter campos numéricos
      const parsedCost = parseFloat(formData.cost_price);
      const parsedSale = parseFloat(formData.sale_price);
      const parsedStock = parseInt(formData.stock, 10);
      const parsedMinStock = parseInt(formData.min_stock, 10);
      // Mapear status para os valores esperados pelo backend
      const mappedStatus = formData.status === 'inactive' || formData.status === 'Inativo' ? 'Inativo' : 'Ativo';

      const productData = {
        ...formData,
        cost_price: isNaN(parsedCost) ? 0 : parsedCost,
        sale_price: isNaN(parsedSale) ? 0 : parsedSale,
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        min_stock: isNaN(parsedMinStock) ? 0 : parsedMinStock,
        status: mappedStatus,
        // Garantir que ambos category_id e category sejam enviados
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : undefined,
        // Manter o campo category (nome da categoria) para exibição
        category: formData.category || ''
      };
      
      if (productToEdit) {
        // Atualizar produto existente
        console.log('=== ATUALIZANDO PRODUTO ===');
        console.log('Product ID:', productToEdit.id);
        console.log('Product data being sent:', JSON.stringify(productData, null, 2));
        
        const result = await productsService.update(productToEdit.id, productData);
        console.log('Update result:', result);

        // ALERTA DE INCONSISTÊNCIA DE ESTOQUE
        if (result && typeof result.stock !== 'undefined' && result.stock !== productData.stock) {
          toast.error(
            `Atenção: valor de estoque salvo (${result.stock}) é diferente do enviado (${productData.stock}). O backend pode estar recalculando o estoque.`
          );
        }
        
        if (typeof onSave === 'function') onSave(result || productData);
      } else {
        // Criar novo produto (o código já é gerado automaticamente)
        const created = await productsService.create(productData);
        if (typeof onSave === 'function') onSave(created || productData);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar o produto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  if (e.target.name === 'stock') {
    // Não faz nada aqui, pois o campo estoque usa handleStockInput
    return;
  }
  const { name, value } = e.target;
  
  // Campos que devem ser salvos em MAIÚSCULO
  const uppercaseFields = new Set([
    'name',
    'description',
    'code',
    'ncm',
    'cest',
    'unit',
    'category'
  ]);
  
  // Tratamento especial para quando o campo é category_id
  if (name === 'category_id' && value) {
    // Encontrar o nome da categoria pelo ID selecionado
    const selectedCategory = categories.find((cat: ProductCategory) => cat.id.toString() === value);
    
    setFormData({
      ...formData,
      [name]: value,
      // Armazenar também o nome da categoria para exibição (em maiúsculo)
      category: selectedCategory ? selectedCategory.name.toUpperCase() : ''
    });
  } else {
    const nextValue = uppercaseFields.has(name) ? (value || '').toUpperCase() : value;
    setFormData({
      ...formData,
      [name]: nextValue
    });
  }
};

// Handler específico para o campo de estoque
const handleStockInput = (e: React.FormEvent<HTMLInputElement>) => {
  const value = (e.target as HTMLInputElement).value;
  console.log('[DEBUG] Alteração no campo estoque:', value);
  setFormData({
    ...formData,
    stock: value
  });
};

  // Adicionar nova categoria
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      setLoading(true);
      const upperName = newCategoryName.trim().toUpperCase();
      
      // Verificar se já sabemos que o endpoint de categorias não está disponível
      if (categoriesEndpointUnavailable) {
        // Usar diretamente o fallback se o endpoint não estiver disponível
        setFormData({
          ...formData,
          category: upperName
        });
      } else {
        try {
          // Tentar criar categoria via API
          const result = await categoriesService.create({ name: upperName });
          await loadCategories().catch(() => {}); // Recarregar categorias, ignorando erros
          
          // Selecionar a categoria recém-criada
          // Verificar a estrutura da resposta e extrair os dados corretamente
          const categoryId = result.id || (result.data && result.data.id);
          const categoryName = (result.name || (result.data && result.data.name) || upperName).toString().toUpperCase();
          
          if (categoryId) {
            setFormData({
              ...formData,
              category_id: categoryId.toString(),
              category: categoryName
            });
          } else {
            // Fallback se não receber o ID da categoria
            setFormData({
              ...formData,
              category: upperName
            });
          }
        } catch (apiErr) {
          // Marcar o endpoint como indisponível para evitar futuras tentativas
          setCategoriesEndpointUnavailable(true);
          console.log('Endpoint de categorias não está disponível para criação:', apiErr);
          
          // Fallback para quando a API de categorias não está disponível
          // Apenas usar como uma string de categoria
          setFormData({
            ...formData,
            category: upperName
          });
        }
      }
      
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a categoria');
    } finally {
      setLoading(false);
    }
  };
  
  // Excluir categoria
  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm('Deseja realmente excluir esta categoria? Esta ação não poderá ser desfeita.')) return;
    
    try {
      setLoading(true);
      
      // Verificar se o endpoint de categorias está disponível
      if (categoriesEndpointUnavailable) {
        // Se o endpoint não estiver disponível, apenas limpar o campo se for a categoria selecionada
        if (formData.category_id === categoryId.toString()) {
          setFormData({
            ...formData,
            category_id: '',
            category: ''
          });
        }
        // Mostrar uma notificação ao usuário
        setError('Não foi possível excluir a categoria. O servidor de categorias não está disponível.');
      } else {
        // Tentar excluir via API
        try {
          await categoriesService.delete(categoryId);
          
          // Se a categoria excluída for a selecionada, limpar o campo
          if (formData.category_id === categoryId.toString()) {
            setFormData({
              ...formData,
              category_id: '',
              category: ''
            });
          }
          
          await loadCategories().catch(() => {
            // Se falhar ao recarregar categorias, marcar o endpoint como indisponível
            setCategoriesEndpointUnavailable(true);
          });
        } catch (apiErr) {
          // Marcar o endpoint como indisponível para evitar futuras tentativas
          setCategoriesEndpointUnavailable(true);
          console.log('Endpoint de categorias não está disponível para exclusão:', apiErr);
          setError('Não foi possível excluir a categoria. O servidor de categorias não está disponível.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao excluir a categoria');
    } finally {
      setLoading(false);
    }
  };
  
  // Iniciar edição de categoria
  const startEditCategory = (category: ProductCategory) => {
    setEditingCategory({ id: category.id, name: category.name });
    setNewCategoryName(category.name);
  };
  
  // Salvar edição de categoria
  const saveEditCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    try {
      setLoading(true);
      const upperName = newCategoryName.trim().toUpperCase();
      if (categoriesEndpointUnavailable) {
        if (formData.category_id === editingCategory.id.toString()) {
          setFormData({
            ...formData,
            category: upperName
          });
        }
        setError('Não foi possível atualizar a categoria no servidor. O servidor de categorias não está disponível.');
        setNewCategoryName('');
        setEditingCategory(null);
        return;
      }
      try {
        await categoriesService.update(editingCategory.id, { name: upperName }).catch(() => {});
        await loadCategories().catch(() => {});
        if (formData.category_id === editingCategory.id.toString()) {
          setFormData({
            ...formData,
            category: upperName
          });
        }
        setNewCategoryName('');
        setEditingCategory(null);
      } catch (apiErr) {
        setCategoriesEndpointUnavailable(true);
        console.log('Endpoint de categorias não está disponível para edição:', apiErr);
        if (formData.category_id === editingCategory.id.toString()) {
          setFormData({
            ...formData,
            category: upperName
          });
        }
        setError('Não foi possível atualizar a categoria no servidor. O servidor de categorias não está disponível.');
        setNewCategoryName('');
        setEditingCategory(null);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Cancelar edição de categoria
  const cancelEditCategory = () => {
    setEditingCategory(null);
    setNewCategoryName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Produto *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Código Interno *
          </label>
          <input
            type="text"
            name="code"
            required
            value={formData.code}
            onChange={handleChange}
            readOnly={!productToEdit}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          {!productToEdit && (
            <p className="text-xs text-gray-500 mt-1">Código gerado automaticamente</p>
          )}
        </div>

        <div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoria
            </label>
            <div className="relative flex items-center">
              {/* Exibir dropdown de seleção quando categorias estão disponíveis, entrada de texto se não */}
              <div className="relative flex-grow">
                {categories.length > 0 && !categoriesEndpointUnavailable ? (
                  <select
                    name="category_id"
                    value={formData.category_id || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={categoriesLoading || loading}
                  >
                    <option value="">Selecionar categoria</option>
                    {categories.map((category: ProductCategory) => (
                      <option key={category.id} value={category.id}>
                        {category.name?.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Digite uma categoria"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                )}

                {/* Botão para abrir o popup de gerenciamento de categorias */}
                <button
                  type="button"
                  onClick={() => setShowCategoryPopup(!showCategoryPopup)}
                  className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-10 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300"
                  title="Gerenciar categorias"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {/* Popup para gerenciamento de categorias */}
            {showCategoryPopup && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-72">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">Gerenciar categorias</h4>
                  <button
                    onClick={() => setShowCategoryPopup(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title="Fechar"
                    type="button"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Lista de categorias existentes */}
                <div className="max-h-60 overflow-y-auto mb-2">
                  {!categoriesLoading ? (
                    categories.length > 0 ? (
                      <div className="space-y-1">
                        {categories.map((category: ProductCategory) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/60 px-2 py-1 rounded-lg text-sm"
                          >
                            {editingCategory?.id === category.id ? (
                              <div className="flex items-center w-full">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  className="flex-grow px-2 py-1 border border-blue-300 dark:border-blue-700 rounded mr-1 text-xs"
                                  ref={newCategoryInputRef}
                                />
                                <button
                                  onClick={saveEditCategory}
                                  className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
                                  title="Salvar"
                                  type="button"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={cancelEditCategory}
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                                  title="Cancelar"
                                  type="button"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-grow text-gray-800 dark:text-gray-100">{category.name?.toUpperCase()}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => startEditCategory(category)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
                                    title="Editar"
                                    type="button"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                                    title="Excluir"
                                    type="button"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : categoriesError ? (
                      <div className="text-center py-2 text-sm text-red-600 dark:text-red-400 font-semibold">
                        Erro ao carregar categorias
                      </div>
                    ) : (
                      <div className="text-center py-2 text-sm text-gray-600 dark:text-gray-300">
                        Nenhuma categoria disponível
                      </div>
                    )
                  ) : (
                    <div className="text-center py-2 text-sm text-gray-600 dark:text-gray-300">
                      Carregando...
                    </div>
                  )}
                </div>

                {/* Botão/Form para adicionar nova categoria */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  {showNewCategory ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Nome da categoria"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-grow px-2 py-1 border border-blue-300 dark:border-blue-700 rounded mr-1 text-sm"
                        ref={newCategoryInputRef}
                      />
                      <button
                        onClick={handleAddCategory}
                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
                        title="Adicionar"
                        type="button"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName('');
                        }}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                        title="Cancelar"
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewCategory(true)}
                      className="flex items-center w-full justify-center bg-blue-100 dark:bg-blue-800/30 px-2 py-1.5 rounded-lg text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50"
                      title="Nova categoria"
                      type="button"
                    >
                      <Plus size={14} className="mr-1" /> Nova categoria
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            NCM
          </label>
          <input
            type="text"
            name="ncm"
            value={formData.ncm}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CEST
          </label>
          <input
            type="text"
            name="cest"
            value={formData.cest}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unidade *
          </label>
          <select
            name="unit"
            required
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="UN">Unidade (UN)</option>
            <option value="KG">Quilograma (KG)</option>
            <option value="MT">Metro (MT)</option>
            <option value="LT">Litro (LT)</option>
            <option value="CX">Caixa (CX)</option>
            <option value="PC">Peça (PC)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preço de Custo *
          </label>
          <input
            type="number"
            name="cost_price"
            step="0.01"
            required
            value={formData.cost_price}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preço de Venda *
          </label>
          <input
            type="number"
            name="sale_price"
            step="0.01"
            required
            value={formData.sale_price}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estoque Atual
          </label>
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onInput={handleStockInput}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estoque Mínimo
          </label>
          <input
            type="number"
            name="min_stock"
            value={formData.min_stock}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição
        </label>
        <textarea
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 dark:bg-red-900/20 dark:border-red-600/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          Salvar Produto
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
