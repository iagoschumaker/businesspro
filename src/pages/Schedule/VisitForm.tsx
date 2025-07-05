import React, { useState } from 'react';
import Button from '../../components/Common/Button';

interface VisitFormProps {
  onClose: () => void;
}

const VisitForm: React.FC<VisitFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    type: 'Visita Comercial',
    notes: '',
    reminder: '30' // minutes before
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Visit data:', formData);
    onClose();
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
            Tipo de Visita *
          </label>
          <select
            name="type"
            required
            value={formData.type}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="Visita Comercial">Visita Comercial</option>
            <option value="Apresentação">Apresentação</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Demonstração">Demonstração</option>
            <option value="Reunião">Reunião</option>
            <option value="Suporte">Suporte</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data *
          </label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Horário *
          </label>
          <input
            type="time"
            name="time"
            required
            value={formData.time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Local da Visita *
        </label>
        <input
          type="text"
          name="location"
          required
          placeholder="Digite o endereço completo"
          value={formData.location}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Lembrete
        </label>
        <select
          name="reminder"
          value={formData.reminder}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        >
          <option value="0">Sem lembrete</option>
          <option value="15">15 minutos antes</option>
          <option value="30">30 minutos antes</option>
          <option value="60">1 hora antes</option>
          <option value="120">2 horas antes</option>
          <option value="1440">1 dia antes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          name="notes"
          rows={4}
          placeholder="Digite informações importantes sobre a visita..."
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
          Agendar Visita
        </Button>
      </div>
    </form>
  );
};

export default VisitForm;