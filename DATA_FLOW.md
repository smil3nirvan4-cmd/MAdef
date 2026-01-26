# 📊 Fluxo de Dados e Triagem Whatsapp

## Onde os dados são salvos?

Como o ambiente atual não tem um Banco de Dados SQL (Postgres) configurado, implementamos um sistema de **Persistência em Arquivo JSON**.

1. **Captura:** O bot coleta as respostas (Nome, CPF, Quiz, etc).
2. **Memória:** Os dados ficam na memória RAM do processo `npm run whatsapp`.
3. **Arquivo:** A cada atualização, os dados são salvos automaticamente em `.wa-state.json` na raiz do projeto.
4. **Visualização:** O Painel Admin (`/admin/triagens`) lê este arquivo em tempo real.

## Como acessar os dados

1. **Visualize:** Acesse [http://localhost:3000/admin/triagens](http://localhost:3000/admin/triagens)
2. **Arquivo Bruto:** Você pode abrir o arquivo `.wa-state.json` com qualquer editor de texto.
3. **Backup:** Basta copiar esse arquivo para fazer backup dos cadastros.

## Migrando para Banco de Dados Real (Produção)

Para salvar em um banco de dados SQL real no futuro:
1. Configure um banco PostgreSQL.
2. Adicione a `DATABASE_URL` no `.env`.
3. O sistema detectará automaticamente e passará a usar o `PrismaState` ao invés do `MemoryState`.
