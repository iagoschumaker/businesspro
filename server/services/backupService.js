const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class BackupService {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDir();
        this.startScheduledBackups();
    }

    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `backup_${timestamp}.db`;
            const backupPath = path.join(this.backupDir, backupFileName);
            const dbPath = path.join(__dirname, '../database/businesspro.db');

            // Copiar arquivo do banco
            fs.copyFileSync(dbPath, backupPath);

            console.log(`✅ Backup criado: ${backupFileName}`);

            // Manter apenas os últimos 30 backups
            this.cleanOldBackups();

            return backupFileName;
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            throw error;
        }
    }

    cleanOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    time: fs.statSync(path.join(this.backupDir, file)).mtime
                }))
                .sort((a, b) => b.time - a.time);

            // Manter apenas os 30 mais recentes
            if (files.length > 30) {
                const filesToDelete = files.slice(30);
                filesToDelete.forEach(file => {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Backup antigo removido: ${file.name}`);
                });
            }
        } catch (error) {
            console.error('Erro ao limpar backups antigos:', error);
        }
    }

    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        created: stats.mtime
                    };
                })
                .sort((a, b) => b.created - a.created);

            return files;
        } catch (error) {
            console.error('Erro ao listar backups:', error);
            return [];
        }
    }

    async restoreBackup(backupFileName) {
        try {
            const backupPath = path.join(this.backupDir, backupFileName);
            const dbPath = path.join(__dirname, '../database/businesspro.db');

            if (!fs.existsSync(backupPath)) {
                throw new Error('Arquivo de backup não encontrado');
            }

            // Criar backup do estado atual antes de restaurar
            await this.createBackup();

            // Restaurar backup
            fs.copyFileSync(backupPath, dbPath);

            console.log(`✅ Backup restaurado: ${backupFileName}`);
            return true;
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            throw error;
        }
    }

    startScheduledBackups() {
        // Backup diário às 2h da manhã
        cron.schedule('0 2 * * *', () => {
            console.log('🔄 Iniciando backup automático...');
            this.createBackup();
        });

        console.log('✅ Backup automático agendado para 2h da manhã');
    }
}

module.exports = new BackupService();