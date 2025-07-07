# Instruções para Atualizar o Banco de Dados

Foi necessário adicionar uma nova coluna `shipping` (frete) à tabela `orders` para suportar a funcionalidade solicitada.

## Opção 1: Usando o DB Browser for SQLite

1. Abra o DB Browser for SQLite
2. Clique em "Abrir Banco de Dados" e selecione o arquivo: `c:\PROGRAMAS\Sistema de Clientes\project\server\database\businesspro.db`
3. Vá para a aba "Executar SQL"
4. Cole o seguinte código SQL e execute-o:

```sql
ALTER TABLE orders ADD COLUMN shipping REAL DEFAULT 0;
```

5. Clique em "Escrever Alterações" para salvar as mudanças
6. Reinicie o servidor da aplicação

## Opção 2: Usando o arquivo SQL criado

1. Abra o DB Browser for SQLite
2. Clique em "Abrir Banco de Dados" e selecione o arquivo: `c:\PROGRAMAS\Sistema de Clientes\project\server\database\businesspro.db`
3. Vá para a aba "Executar SQL" 
4. Clique em "Abrir" e selecione o arquivo: `c:\PROGRAMAS\Sistema de Clientes\project\server\database\add_shipping_column.sql`
5. Execute o script
6. Clique em "Escrever Alterações" para salvar as mudanças
7. Reinicie o servidor da aplicação

## Resumo das alterações implementadas:

1. Adicionados campos para desconto e frete no formulário de pedidos
2. O desconto é aplicado apenas ao subtotal dos produtos
3. O frete é adicionado após o cálculo do desconto
4. Ambos os valores são salvos no banco de dados e exibidos no resumo do pedido
