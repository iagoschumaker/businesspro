-- Script para adicionar coluna de frete à tabela de pedidos
ALTER TABLE orders ADD COLUMN shipping REAL DEFAULT 0;
