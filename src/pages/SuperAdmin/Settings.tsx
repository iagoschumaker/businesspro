import React, { useState } from 'react';
import { 
  Save, 
  Mail, 
  Shield, 
  Database,
  Bell,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      siteName: 'BusinessPro SaaS',
      siteUrl: 'https://businesspro.com',
      supportEmail: 'support@businesspro.com',
      timezone: 'America/Sao_Paulo'
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@businesspro.com',
      fromName: 'BusinessPro'
    },
    security: {
      requireEmailVerification: true,
      passwordMinLength: 8,
      sessionTimeout: 24,
      maxLoginAttempts: 5
    },
    notifications: {
      newTenantAlert: true,
      paymentFailureAlert: true,
      systemMaintenanceAlert: true,
      weeklyReports: true
    }
  });

  const handleInputChange = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Aqui você implementaria a chamada para salvar as configurações
      // await superAdminApi.updateSettings(settings);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Gerais */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Configurações Gerais</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome do Site
              </label>
              <input
                type="text"
                value={settings.general.siteName}
                onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL do Site
              </label>
              <input
                type="url"
                value={settings.general.siteUrl}
                onChange={(e) => handleInputChange('general', 'siteUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email de Suporte
              </label>
              <input
                type="email"
                value={settings.general.supportEmail}
                onChange={(e) => handleInputChange('general', 'supportEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fuso Horário
              </label>
              <select
                value={settings.general.timezone}
                onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              >
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="America/New_York">New York (UTC-5)</option>
                <option value="Europe/London">London (UTC+0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Configurações de Email */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Mail className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Configurações de Email</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Servidor SMTP
              </label>
              <input
                type="text"
                value={settings.email.smtpHost}
                onChange={(e) => handleInputChange('email', 'smtpHost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="smtp.gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Porta SMTP
              </label>
              <input
                type="number"
                value={settings.email.smtpPort}
                onChange={(e) => handleInputChange('email', 'smtpPort', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Usuário SMTP
              </label>
              <input
                type="email"
                value={settings.email.smtpUser}
                onChange={(e) => handleInputChange('email', 'smtpUser', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha SMTP
              </label>
              <input
                type="password"
                value={settings.email.smtpPassword}
                onChange={(e) => handleInputChange('email', 'smtpPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Segurança */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-red-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Segurança</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verificação de Email Obrigatória
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Usuários devem verificar email antes de acessar</p>
              </div>
              <input
                type="checkbox"
                checked={settings.security.requireEmailVerification}
                onChange={(e) => handleInputChange('security', 'requireEmailVerification', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tamanho Mínimo da Senha
              </label>
              <input
                type="number"
                min="6"
                max="20"
                value={settings.security.passwordMinLength}
                onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeout da Sessão (horas)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Máximo de Tentativas de Login
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Configurações de Notificações */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notificações</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alerta de Novo Tenant
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notificar quando um novo tenant se registrar</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.newTenantAlert}
                onChange={(e) => handleInputChange('notifications', 'newTenantAlert', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alerta de Falha de Pagamento
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notificar quando um pagamento falhar</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.paymentFailureAlert}
                onChange={(e) => handleInputChange('notifications', 'paymentFailureAlert', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alerta de Manutenção
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notificar sobre manutenções do sistema</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.systemMaintenanceAlert}
                onChange={(e) => handleInputChange('notifications', 'systemMaintenanceAlert', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Relatórios Semanais
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receber relatórios semanais por email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.weeklyReports}
                onChange={(e) => handleInputChange('notifications', 'weeklyReports', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ações Perigosas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-red-500 dark:border-red-700">
        <div className="flex items-center mb-4">
          <Database className="w-5 h-5 text-red-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Zona de Perigo</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Backup do Banco de Dados</h3>
              <p className="text-xs text-red-600 dark:text-red-500">Criar backup completo do sistema</p>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
              Criar Backup
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Limpar Logs do Sistema</h3>
              <p className="text-xs text-red-600 dark:text-red-500">Remover logs antigos (mais de 30 dias)</p>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
              Limpar Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
