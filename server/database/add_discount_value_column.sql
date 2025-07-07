-- Script para adicionar coluna de valor de desconto à tabela de pedidos
ALTER TABLE orders ADD COLUMN discount_value REAL DEFAULT 0;
