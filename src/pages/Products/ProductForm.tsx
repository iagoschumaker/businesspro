import React, { useState, useEffect } from 'react';
import Button from '../../components/Common/Button';
import { Plus, X } from 'lucide-react';
import { productsService } from '../../services/api';
import { categoriesService } from '../../services/categoriesService';

interface Product {
  id?: number;
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
  status?: string;
}

interface ProductFormProps {
  onClose: () => void;
  product?: Product;
}

const ProductForm: React.FC<ProductFormProps> = ({ onClose, product }) => {
  // Estado para listar as categorias disponíveis
  const [categories, setCategories] = useState<string[]>([]);
  // Estado para mostrar/ocultar o modal de adicionar categoria
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  // Estado para a nova categoria a ser adicionada
  const [newCategory, setNewCategory] = useState('');
  
  // Função para gerar um código interno automático
  const generateProductCode = () => {
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `P${timestamp}${randomPart}`;
  };
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: generateProductCode(),
    ncm: '',
    cest: '',
    unit: 'UN',
    costPrice: '',
    salePrice: '',
    stock: '',
    minStock: '',
    category: '',
    notes: ''
  });
  
  // Carregar categorias da API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesList = await categoriesService.getAll();
        console.log('Categorias carregadas:', categoriesList);
        setCategories(categoriesList);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        // Categorias padrão caso a API falhe
        setCategories([
          'Material de Escritório',
          'Informática',
          'Móveis'
        ]);
      }
    };
    
    loadCategories();
  }, []);

  // Se receber um produto, preencher o formulário com os dados dele
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        code: product.code || '', // Mantém o código original se for edição
        ncm: product.ncm || '',
        cest: '',
        unit: product.unit || 'UN',
        costPrice: product.costPrice?.toString() || '',
        salePrice: product.salePrice?.toString() || '',
        stock: product.stock?.toString() || '',
        minStock: product.minStock?.toString() || '',
        category: product.category || '',
        notes: ''
      });
    }
  }, [product]);
  
  // Função para adicionar uma nova categoria
  const handleAddCategory = async () => {
    if (newCategory.trim() !== '' && !categories.includes(newCategory.trim())) {
      try {
        // Salva a categoria no backend
        await categoriesService.create(newCategory.trim());
        console.log('Categoria salva com sucesso');
        
        // Atualiza a lista local de categorias
        setCategories(prev => [...prev, newCategory.trim()]);
        
        // Atualiza o campo de categoria no formulário
        setFormData(prev => ({
          ...prev,
          category: newCategory.trim()
        }));
        
        setNewCategory('');
        setShowCategoryModal(false);
      } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        alert('Ocorreu um erro ao salvar a categoria. Tente novamente.');
      }
    } else if (categories.includes(newCategory.trim())) {
      // Se a categoria já existe, apenas seleciona ela
      setFormData(prev => ({
        ...prev,
        category: newCategory.trim()
      }));
      setNewCategory('');
      setShowCategoryModal(false);
    }
  };
  
  // Função para remover uma categoria
  const handleRemoveCategory = (categoryToRemove: string) => {
    // Remove a categoria da lista
    setCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    
    // Se a categoria atual do formulário for a que está sendo removida, limpa o campo
    if (formData.category === categoryToRemove) {
      setFormData(prev => ({
        ...prev,
        category: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validar campos obrigatórios (name e price são NOT NULL no banco)
      if (!formData.name || !formData.salePrice) {
        alert('Nome do produto e preço de venda são obrigatórios');
        return;
      }

      // Garantir que todos os valores numéricos sejam tratados corretamente
      const salePrice = formData.salePrice ? parseFloat(formData.salePrice) : 0;
      if (isNaN(salePrice)) {
        alert('Preço de venda deve ser um valor numérico válido');
        return;
      }

      // Preparar dados básicos do produto de acordo com o esquema do banco de dados
      // Garantindo que a categoria não seja undefined ou empty string
      const categoryValue = formData.category?.trim();
      
      console.log('Debug - Categoria selecionada:', formData.category);
      console.log('Debug - Categoria após trim:', categoryValue);
      
      const productData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        code: formData.code.trim(),
        // Removendo o campo ncm que não existe no banco de dados
        unit: formData.unit || 'UN',
        cost_price: formData.costPrice ? parseFloat(formData.costPrice) : 0,
        sale_price: salePrice, // A API espera 'sale_price', mesmo que o banco use 'price'
        stock: parseInt(formData.stock || '0'),
        min_stock: parseInt(formData.minStock || '0'),
        category: categoryValue || 'Sem categoria' // Garantindo que sempre tenha um valor
      };
      
      console.log('Enviando dados para o servidor:', productData);

      if (product?.id) {
        // Atualizar produto existente
        await productsService.update(product.id, productData);
        console.log('Produto atualizado com sucesso!');
      } else {
        // Criar novo produto
        await productsService.create(productData);
        console.log('Produto criado com sucesso!');
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Ocorreu um erro ao salvar o produto. Verifique o console para mais detalhes.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Categoria
          </label>
          <div className="flex">
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-r-lg flex items-center justify-center transition-colors"
              title="Adicionar nova categoria"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {/* Modal para adicionar nova categoria */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 max-w-full">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Gerenciar Categorias</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nova Categoria
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="Digite o nome da categoria"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      className="ml-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:bg-gray-400"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Lista de categorias existentes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categorias Existentes
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {categories.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Nenhuma categoria cadastrada</p>
                    ) : (
                      <ul className="space-y-1">
                        {categories.map((cat) => (
                          <li key={cat} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="text-sm">{cat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCategory(cat)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remover categoria"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="primary"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Concluído
                  </Button>
                </div>
              </div>
            </div>
          )}
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
            Preço de Custo
          </label>
          <input
            type="number"
            name="costPrice"
            step="0.01"
            value={formData.costPrice}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Preço de Venda *
          </label>
          <input
            type="number"
            name="salePrice"
            step="0.01"
            required
            value={formData.salePrice}
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
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estoque Mínimo
          </label>
          <input
            type="number"
            name="minStock"
            value={formData.minStock}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          name="notes"
          rows={2}
          value={formData.notes}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar Produto
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;