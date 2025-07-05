import React, { useState } from 'react';
import Button from '../../components/Common/Button';

interface BilletFormProps {
  onClose: () => void;
}

const BilletForm: React.FC<BilletFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    dueDate: '',
    description: '',
    instructions: '',
    interest: '2.0', // percentage per month
    fine: '2.0', // percentage
    discount: '0',
    discountDate: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const billetData = {
      ...formData,
      id: `#BOL${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      barcode: generateBarcode(),
      status: 'Em Aberto'
    };
    console.log('Billet data:', billetData);
    alert('Boleto gerado com sucesso!');
    onClose();
  };

  const generateBarcode = () => {
    // This is a mock barcode generation
    const bankCode = '237';
    const currency = '9';
    const dueDate = '1234'; // Days since base date
    const amount = formData.amount.replace('.', '').padStart(10, '0');
    return `${bankCode}${currency}1.12345 67890.123456 78901.234567 8 ${dueDate}${amount}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cliente *
          </label>
          <select
            name="customerId"
            required
            value={formData.customerId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">Selecione um cliente</option>
            <option value="1">João Silva</option>
            <option value="2">Maria Santos</option>
            <option value="3">Carlos Oliveira</option>
            <option value="4">Ana Costa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor *
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            required
            placeholder="0,00"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data de Vencimento *
          </label>
          <input
            type="date"
            name="dueDate"
            required
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Juros ao Mês (%)
          </label>
          <input
            type="number"
            name="interest"
            step="0.1"
            placeholder="2.0"
            value={formData.interest}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Multa (%)
          </label>
          <input
            type="number"
            name="fine"
            step="0.1"
            placeholder="2.0"
            value={formData.fine}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Desconto (%)
          </label>
          <input
            type="number"
            name="discount"
            step="0.1"
            placeholder="0"
            value={formData.discount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {parseFloat(formData.discount) > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Limite para Desconto
          </label>
          <input
            type="date"
            name="discountDate"
            value={formData.discountDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição
        </label>
        <input
          type="text"
          name="description"
          placeholder="Descrição do boleto"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Instruções para o Banco
        </label>
        <textarea
          name="instructions"
          rows={3}
          placeholder="Instruções especiais para o banco..."
          value={formData.instructions}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Configurações Automáticas:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Registro automático no banco</li>
          <li>• Envio por e-mail para o cliente</li>
          <li>• Notificações de vencimento</li>
          <li>• Atualização automática de status</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Gerar Boleto
        </Button>
      </div>
    </form>
  );
};

export default BilletForm;