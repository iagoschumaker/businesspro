// Serviço para gerenciar notificações de lembrete para visitas
import { visitsService } from './api';

interface ReminderNotification {
  id: number;
  visitId: number;
  title: string;
  message: string;
  scheduledTime: Date;
  shown: boolean;
  customerName: string;
}

class NotificationService {
  private reminders: ReminderNotification[] = [];
  private checkInterval: number | null = null;
  
  constructor() {
    // Carrega lembretes salvos do localStorage
    this.loadReminders();
    
    // Inicia verificação de lembretes a cada minuto
    this.startChecking();
  }
  
  /**
   * Carrega lembretes salvos do localStorage
   */
  private loadReminders() {
    try {
      const savedReminders = localStorage.getItem('visitReminders');
      if (savedReminders) {
        const parsedReminders: ReminderNotification[] = JSON.parse(savedReminders);
        
        // Converte strings de data para objetos Date
        this.reminders = parsedReminders.map(reminder => ({
          ...reminder,
          scheduledTime: new Date(reminder.scheduledTime)
        }));
        
        console.log('Lembretes carregados do localStorage:', this.reminders);
      }
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
    }
  }
  
  /**
   * Salva lembretes no localStorage
   */
  private saveReminders() {
    try {
      localStorage.setItem('visitReminders', JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Erro ao salvar lembretes:', error);
    }
  }
  
  /**
   * Inicia verificação periódica de lembretes
   */
  startChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Verificar imediatamente na inicialização
    this.checkReminders();
    
    // Verificar a cada 30 segundos para maior precisão
    this.checkInterval = window.setInterval(() => {
      console.log('Verificando lembretes...', new Date().toLocaleTimeString());
      this.checkReminders();
    }, 30000); // Verifica a cada 30 segundos
    
    console.log('Sistema de verificação de lembretes iniciado');
  }
  
  /**
   * Para a verificação periódica
   */
  stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * Adiciona um novo lembrete
   */
  addReminder(
    visitId: number, 
    visitDate: string, 
    visitTime: string, 
    customerName: string,
    reminderMinutes: number
  ) {
    try {
      // Corrige o formato da hora se necessário
      const timeFormatted = visitTime.includes(':') ? visitTime : `${visitTime}:00`;
      
      // Calcula quando o lembrete deve ser mostrado
      const [year, month, day] = visitDate.split('-').map(n => parseInt(n));
      const [hours, minutes] = timeFormatted.split(':').map(n => parseInt(n));
      
      // Cria objeto de data para a visita e para o lembrete
      const visitDateTime = new Date(year, month - 1, day, hours, minutes);
      const reminderTime = new Date(visitDateTime.getTime() - (reminderMinutes * 60000));
      
      console.log('Data/hora da visita:', visitDateTime.toLocaleString());
      console.log('Data/hora do lembrete:', reminderTime.toLocaleString());
      console.log('Tempo atual:', new Date().toLocaleString());
      
      // Formata hora para exibição
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Gera ID único para o lembrete
      const reminderId = Date.now() + Math.floor(Math.random() * 1000);
      
      const reminder: ReminderNotification = {
        id: reminderId,
        visitId,
        title: 'Lembrete de Visita',
        message: `Visita para ${customerName} às ${timeStr} (em ${reminderMinutes} minutos)`,
        scheduledTime: reminderTime,
        shown: false,
        customerName
      };
      
      // Remove lembretes antigos para a mesma visita antes de adicionar o novo
      this.reminders = this.reminders.filter(r => r.visitId !== visitId);
      
      // Adiciona o novo lembrete
      this.reminders.push(reminder);
      this.saveReminders();
      
      console.log(`Lembrete ${reminderId} agendado:`);
      console.log(`- Visita ID: ${visitId}`);
      console.log(`- Cliente: ${customerName}`);
      console.log(`- Hora da visita: ${visitDate} ${timeStr}`);
      console.log(`- Lembrete: ${reminderMinutes} minutos antes (${reminderTime.toLocaleString()})`);
      
      // Força verificação imediata
      this.checkReminders();
      
      return reminder;
    } catch (error) {
      console.error('Erro ao adicionar lembrete:', error);
      return null;
    }
  }
  
  /**
   * Remove um lembrete para uma visita
   */
  removeRemindersForVisit(visitId: number) {
    this.reminders = this.reminders.filter(reminder => reminder.visitId !== visitId);
    this.saveReminders();
  }
  
  /**
   * Verifica se há lembretes para mostrar
   */
  checkReminders() {
    const now = new Date();
    console.log('Verificando lembretes em:', now.toLocaleString());
    console.log('Lembretes registrados:', this.reminders.length);
    
    // Verifica lembretes não mostrados e que já passaram do tempo programado
    const pendingReminders = this.reminders.filter(reminder => {
      // Debug de tempo para verificar se o lembrete está no passado
      const isPast = reminder.scheduledTime <= now;
      const timeUntil = (reminder.scheduledTime.getTime() - now.getTime()) / 60000;
      
      console.log(`Lembrete ID ${reminder.id} para ${reminder.customerName}:`); 
      console.log(`- Agendado para: ${reminder.scheduledTime.toLocaleString()}`); 
      console.log(`- Já passou? ${isPast ? 'Sim' : 'Não'}`); 
      console.log(`- Faltam aproximadamente ${timeUntil.toFixed(1)} minutos`); 
      console.log(`- Já mostrado? ${reminder.shown ? 'Sim' : 'Não'}`); 
      
      return !reminder.shown && isPast;
    });
    
    if (pendingReminders.length > 0) {
      console.log(`${pendingReminders.length} lembretes para mostrar AGORA:`, pendingReminders);
      
      pendingReminders.forEach(reminder => {
        // Mostra notificação
        this.showNotification(reminder);
        
        // Marca como mostrado
        reminder.shown = true;
      });
      
      this.saveReminders();
    } else {
      console.log('Nenhum lembrete pendente para exibir agora');
    }
  }
  
  /**
   * Mostra uma notificação ao usuário
   */
  private showNotification(reminder: ReminderNotification) {
    console.log('Exibindo notificação para lembrete:', reminder);
    
    try {
      // SEMPRE mostrar um alerta visual na interface primeiro
      this.showVisualAlert(reminder);
      
      // Tentar notificação nativa em seguida
      this.showBrowserNotification(reminder);
      
      // Registrar no console para debug
      console.log('Notificação exibida com sucesso para:', reminder.customerName);
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      
      // Garantir que pelo menos um alerta seja mostrado
      alert(`Lembrete de Visita: ${reminder.message}`);
    }
  }
  
  /**
   * Mostra uma notificação do navegador
   */
  private showBrowserNotification(reminder: ReminderNotification) {
    // Verifica se o navegador suporta notificações
    if ('Notification' in window) {
      console.log('Status de permissão de notificação:', Notification.permission);
      
      if (Notification.permission === 'granted') {
        // Já tem permissão, mostra notificação
        const notification = new Notification(reminder.title, {
          body: reminder.message,
          icon: '/logo.png',
          requireInteraction: true // Mantém até o usuário interagir
        });
        
        // Adiciona evento de click na notificação
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
      } else if (Notification.permission !== 'denied') {
        // Solicita permissão e mostra a notificação se concedida
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            const notification = new Notification(reminder.title, {
              body: reminder.message,
              icon: '/logo.png'
            });
            
            // Adiciona evento de click na notificação
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } else {
            console.log('Permissão de notificação negada pelo usuário');
          }
        });
      }
    }
  }
  
  /**
   * Mostra um alerta visual na interface
   */
  private showVisualAlert(reminder: ReminderNotification) {
    // Cria o container do alerta
    const alertContainer = document.createElement('div');
    alertContainer.className = 'fixed top-4 right-4 z-50 max-w-md';
    alertContainer.style.zIndex = '9999';
    
    // Configura o estilo e conteúdo do alerta
    const alertContent = document.createElement('div');
    alertContent.className = 'bg-blue-600 text-white p-4 rounded-lg shadow-xl flex items-start';
    alertContent.style.animation = 'fadeIn 0.3s';
    alertContent.innerHTML = `
      <div>
        <h4 class="font-bold text-lg">${reminder.title}</h4>
        <p class="mt-1">${reminder.message}</p>
      </div>
      <button class="ml-4 text-white text-xl font-bold" id="close-alert-${reminder.id}">&times;</button>
    `;
    
    // Usar um beep padrão do sistema ao invés de arquivo de áudio externo
    try {
      // Criar um oscilador para gerar um som simples
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Configurar o som
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Lá (A)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      // Conectar e tocar
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 300);
      
      // Fazer um segundo beep após 300ms
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(1174.66, audioContext.currentTime); // Ré (D)
        oscillator2.connect(gainNode);
        
        oscillator2.start();
        setTimeout(() => {
          oscillator2.stop();
        }, 300);
      }, 400);
      
    } catch (e) {
      console.error('Erro ao gerar som de alerta:', e);
    }
    
    // Adiciona ao DOM
    alertContainer.appendChild(alertContent);
    document.body.appendChild(alertContainer);
    
    // Remove o alerta após 20 segundos
    setTimeout(() => {
      if (document.body.contains(alertContainer)) {
        alertContainer.style.animation = 'fadeOut 0.5s';
        setTimeout(() => {
          if (document.body.contains(alertContainer)) {
            document.body.removeChild(alertContainer);
          }
        }, 500);
      }
    }, 20000);
    
    // Adiciona evento de click para fechar
    document.getElementById(`close-alert-${reminder.id}`)?.addEventListener('click', () => {
      if (document.body.contains(alertContainer)) {
        document.body.removeChild(alertContainer);
      }
    });
  }
  
  /**
   * Sincroniza lembretes com visitas atuais
   */
  async syncRemindersWithVisits() {
    try {
      // Carrega todas as visitas futuras
      const response = await visitsService.getAll();
      const visits = Array.isArray(response) ? response : (response?.data || []);
      
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Filtra visitas futuras com lembrete ativado
      const futureVisits = visits.filter((visit: any) => 
        visit.date >= todayStr && 
        visit.reminder === true
      );
      
      // Carrega também visitas temporárias
      const tempVisitsJson = localStorage.getItem('tempVisits');
      const tempVisits = tempVisitsJson ? JSON.parse(tempVisitsJson) : [];
      
      // Combina as visitas
      const allVisits = [...futureVisits, ...tempVisits.filter((visit: any) => visit.reminder)];
      
      console.log('Sincronizando lembretes para visitas:', allVisits);
      
      // Remove lembretes obsoletos (visitas passadas)
      this.reminders = this.reminders.filter(reminder => {
        const found = allVisits.some((visit: any) => visit.id === reminder.visitId);
        return found;
      });
      
      // Adiciona lembretes para novas visitas
      allVisits.forEach((visit: any) => {
        if (!this.reminders.some(r => r.visitId === visit.id)) {
          const reminderMinutes = visit.reminderMinutes || 30; // Padrão: 30 minutos
          this.addReminder(
            visit.id, 
            visit.date, 
            visit.time || '00:00',
            visit.customer_name || 'Cliente', 
            reminderMinutes
          );
        }
      });
      
      this.saveReminders();
    } catch (error) {
      console.error('Erro ao sincronizar lembretes:', error);
    }
  }
}

// Exporta uma instância única do serviço
export const notificationService = new NotificationService();
