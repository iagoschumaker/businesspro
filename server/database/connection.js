const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = path.join(__dirname, 'businesspro.db');
        
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Erro ao conectar com o banco de dados:', err.message);
            } else {
                console.log('✅ Conectado ao banco de dados SQLite');
                this.createTables();
            }
        });

        // Configurações de performance
        this.db.run('PRAGMA foreign_keys = ON');
        this.db.run('PRAGMA journal_mode = WAL');
        this.db.run('PRAGMA synchronous = NORMAL');
        this.db.run('PRAGMA cache_size = 1000');
        this.db.run('PRAGMA temp_store = MEMORY');
    }

    createTables() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        this.db.exec(schema, (err) => {
            if (err) {
                console.error('Erro ao criar tabelas:', err.message);
            } else {
                console.log('✅ Tabelas criadas/verificadas com sucesso');
            }
        });
    }

    // Método para executar queries com Promise
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Método para buscar um registro
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Método para buscar múltiplos registros
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Método para transações
    async transaction(queries) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                const promises = queries.map(({ sql, params }) => this.run(sql, params));
                
                Promise.all(promises)
                    .then((results) => {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(results);
                            }
                        });
                    })
                    .catch((error) => {
                        this.db.run('ROLLBACK');
                        reject(error);
                    });
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Conexão com banco de dados fechada');
                    resolve();
                }
            });
        });
    }
}

module.exports = new Database();