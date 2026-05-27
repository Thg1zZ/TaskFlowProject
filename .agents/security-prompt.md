# Prompt de Segurança — Task Manager Colaborativo

## Contexto do sistema

Analise a segurança deste sistema com base no contexto abaixo. Não invente features que não foram descritas. Não sugira refatorações de código que funciona. Foque em vulnerabilidades reais e exploráveis.

---

## Stack de tecnologia

**Frontend:**
- Next.js + React + TypeScript
- Tailwind CSS
- SWR (cache e sincronização de dados)

**Backend:**
- Java 17 + Spring Boot
- Spring Security + JWT (autenticação stateless)
- Spring Data JPA + Hibernate
- SSE — Server-Sent Events (comunicação em tempo real servidor → cliente)

**Banco de dados:**
- PostgreSQL

**Infraestrutura:**
- Docker
- Render (hospedagem do backend e banco)

---

## O que o sistema faz

Gerenciador de tarefas colaborativo em tempo real. Usuários criam tarefas, convidam outras pessoas via link, e colaboram com permissões distintas. Alterações aparecem na tela de todos os participantes instantaneamente via SSE.

---

## Recursos implementados

### 1. Autenticação
- Cadastro e login com JWT
- Tokens temporários e stateless

### 2. Onboarding
- Tutorial interativo no primeiro acesso do usuário

### 3. Gerenciamento de tarefas
- Criar, editar, excluir tarefas
- Status: A Fazer → Em Progresso → Concluído
- Modais com modo Leitura e modo Edição
- Lista "Minhas Tarefas" e tarefas recentes

### 4. Colaboração por links e permissões
- Geração de link de convite para tarefas específicas
- Papéis de acesso:
  - **Admin** — apenas o criador (dono) da tarefa
  - **Editor** — pode modificar a tarefa
  - **Visualizador** — apenas leitura
- Avatares em tempo real mostrando quem está na tarefa no momento

### 5. Sincronização em tempo real
- SSE: servidor envia eventos para todos os participantes da tarefa
- Notificações no dashboard (sino) para novas atividades e tarefas atribuídas

### 6. Interface
- Responsiva (mobile, tablet, desktop)

---

## O que já está implementado de segurança

- Autenticação JWT (Spring Security)
- RBAC básico (Admin / Editor / Visualizador)
- Rate limiting
- Validação de input

---

## Superfície de ataque específica deste sistema

Ao analisar, priorize os vetores abaixo — são os mais prováveis dado o modelo de negócio colaborativo:

### Links de convite
- O link dá acesso direto a uma tarefa. Como é gerado? Tem expiração? Pode ser revogado?
- Um link vazado dá acesso a qualquer um? Existe validação de domínio ou restrição de uso?
- Após aceitar o convite, o papel (Editor/Visualizador) é validado no servidor em cada operação, ou apenas na entrada?

### IDOR entre participantes
- Um Visualizador pode chamar diretamente o endpoint de edição se souber a URL?
- Um Editor de uma tarefa pode editar tarefas de outros projetos/usuários que não o convidaram?
- O papel é verificado por operação, ou apenas uma vez no carregamento?

### IDOR entre donos
- Um usuário autenticado pode acessar tarefas de outros usuários incrementando o ID da tarefa?
- Queries de listagem filtram por `userId` do usuário autenticado, ou retornam tudo?

### SSE — Server-Sent Events
- A conexão SSE valida que o usuário tem acesso à tarefa que está "ouvindo"?
- Um usuário pode se inscrever no canal SSE de uma tarefa que não participa?
- O que acontece com a conexão SSE quando o usuário é removido de uma tarefa ou tem o papel rebaixado?
- O servidor limpa conexões SSE de tokens expirados ou revogados?

### Permissões no modelo colaborativo
- Apenas o Admin (criador) pode deletar a tarefa — isso é validado no backend, não só no frontend?
- Um Editor pode reatribuir o papel de outro participante?
- Um Editor pode gerar novos links de convite, ou apenas o Admin?
- O que acontece se o Admin sair da tarefa — existe transferência de ownership ou a tarefa fica sem dono?

### Notificações
- As notificações do sino expõem dados de tarefas que o usuário não deveria mais acessar (ex: foi removido)?
- É possível forjar uma notificação para outro usuário?

---

## Vulnerabilidades a verificar obrigatoriamente

Verifique e reporte cada item abaixo. Se não tiver acesso ao código de um item específico, indique o que precisaria ver para validar.

### Autenticação e tokens
- [ ] JWT com expiração curta (access token ≤ 15 min)?
- [ ] Refresh token existe e está em httpOnly cookie (não em localStorage)?
- [ ] Logout invalida o token no servidor (não apenas remove do cliente)?
- [ ] Troca de senha invalida todos os tokens anteriores do usuário?
- [ ] Token revogado é rejeitado imediatamente (denylist no Redis ou equivalente)?

### Autorização em nível de objeto
- [ ] Toda query que busca tarefa por ID inclui `userId` ou validação de participação no filtro?
- [ ] IDs das tarefas são UUIDs (não inteiros sequenciais)?
- [ ] Endpoints de `PUT /tasks/{id}` e `DELETE /tasks/{id}` revalidam papel do usuário no servidor?
- [ ] Endpoint de alteração de status valida que o usuário é Editor ou Admin da tarefa?

### Links de convite
- [ ] Token do link de convite é aleatório e não previsível (UUID v4 ou equivalente)?
- [ ] Link de convite tem expiração configurada?
- [ ] Dono da tarefa pode revogar links de convite ativos?
- [ ] Aceitar o mesmo link duas vezes não cria duplicidade de participação?
- [ ] Link de convite revela o mínimo de informação antes de o usuário aceitar?

### SSE
- [ ] Endpoint SSE valida JWT antes de abrir a conexão?
- [ ] Endpoint SSE valida que o usuário tem acesso à tarefa específica que está ouvindo?
- [ ] Servidor desconecta o stream SSE quando o token expira durante a conexão?
- [ ] Servidor desconecta ou para de enviar eventos para usuários removidos de uma tarefa?
- [ ] Eventos SSE não vazam dados de outras tarefas no mesmo stream?

### Dados e respostas
- [ ] Stack traces nunca chegam ao cliente em respostas de erro?
- [ ] Senhas hashadas com bcrypt (custo ≥ 12)?
- [ ] DTOs de resposta não incluem campos internos (IDs de banco, hashes, flags internas)?
- [ ] Endpoint de listagem de participantes de uma tarefa é acessível apenas por participantes?

### Frontend
- [ ] Proteção de rota implementada no `middleware.ts` (não apenas no `useEffect`)?
- [ ] `dangerouslySetInnerHTML` não é usado com dados de usuário sem sanitização?
- [ ] Secrets não estão em variáveis `NEXT_PUBLIC_*`?
- [ ] SWR não cacheia dados sensíveis entre usuários (ex: em ambiente compartilhado)?
- [ ] Cliente HTTP tem timeout configurado?
- [ ] Erros 401 forçam logout e limpeza de estado local?

### Lógica de negócio colaborativa
- [ ] Somente Admin pode deletar a tarefa — validado no backend?
- [ ] Somente Admin pode alterar papéis de participantes?
- [ ] Somente Admin pode gerar e revogar links de convite?
- [ ] Não é possível degradar o próprio papel (Admin se tornando Visualizador acidentalmente)?
- [ ] Existe limite de participantes por tarefa para prevenir abuso?

### Rate limiting
- [ ] `/auth/login` tem limite por IP + email (não apenas por IP)?
- [ ] Endpoint de geração de link de convite tem rate limit?
- [ ] Endpoint SSE tem proteção contra abertura massiva de conexões?

---

## Formato de resposta esperado

Para cada vulnerabilidade encontrada:

```
VULNERABILIDADE
Local: [arquivo ou endpoint]
Tipo: [IDOR / XSS / Race Condition / etc.]
Severidade: [CRÍTICA / ALTA / MÉDIA]

Problema: [o que está errado em termos concretos]
Cenário de ataque: [como um atacante exploraria isso, passo a passo]
Correção: [mudança mínima necessária para corrigir]
```

Para itens não verificáveis sem acesso ao código:

```
REQUER CÓDIGO
Item: [o que precisa ser verificado]
Arquivo provável: [onde esperaria encontrar isso na stack descrita]
O que verificar: [exatamente o que procurar]
```

---

## O que não fazer

- Não sugerir trocar a stack de tecnologia
- Não sugerir adicionar dependências externas sem necessidade comprovada
- Não refatorar código que funciona para "ficar mais limpo"
- Não inventar recursos que o sistema não tem
- Não reportar preferências subjetivas de estilo como problemas de segurança
