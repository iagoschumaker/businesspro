import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/superAdminApi';
import toast from 'react-hot-toast';
import { User } from '../../types/superadmin';

interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, user, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '',
    subdomain: '',
    plan: 'trial',
    status: 'active',
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        subdomain: user.subdomain || '',
        plan: user.plan || 'basic',
        status: user.status || 'active',
        contactName: user.contact?.name || '',
        contactEmail: user.contact?.email || '',
        contactPhone: user.contact?.phone || '',
      });
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      await superAdminApi.updateTenant(user._id, {
        name: form.name,
        subdomain: form.subdomain?.toLowerCase().trim(),
        plan: form.plan,
        status: form.status,
        contact: {
          name: form.contactName,
          email: form.contactEmail,
          phone: form.contactPhone
        }
      });
      toast.success('Tenant atualizado com sucesso');
      onSaved();
    } catch (error: any) {
      console.error('Erro ao atualizar tenant:', error);
      const data = error?.response?.data;
      const base = data?.error || 'Erro ao atualizar tenant';
      const details = Array.isArray(data?.details) ? `: ${data.details.join(', ')}` : '';
      toast.error(base + details);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Editar Usuário</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Nome do tenant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subdomínio</label>
            <input
              name="subdomain"
              value={form.subdomain}
              onChange={handleChange}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="ex: acme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Plano</label>
            <select
              name="plan"
              value={form.plan}
              onChange={handleChange}
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="trial">Trial</option>
              <option value="basic">Básico</option>
              <option value="professional">Profissional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contato - Nome</label>
              <input
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contato - Email</label>
              <input
                type="email"
                name="contactEmail"
                value={form.contactEmail}
                onChange={handleChange}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Contato - Telefone</label>
              <input
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                className="mt-1 w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
