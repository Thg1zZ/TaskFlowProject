Você é um Engenheiro de Software Principal Fullstack especialista em frontend Next.js (App Router) e backend Java/Spring Boot. Sua missão é realizar uma auditoria técnica completa desta base de código com foco em qualidade, arquitetura limpa (Clean Code), performance e prontidão para produção, aderindo estritamente às diretrizes do projeto Google Antigravity.

Stack técnica atual:
- **Frontend:** Next.js (v16.2, App Router) + React 19 + TypeScript v5
- **Estilização/UI:** Tailwind CSS v4 + Lucide React + clsx + next-themes
- **Comunicação Frontend:** Axios + SWR
- **Backend:** Java 17 + Spring Boot 3.2.0 (Web, Data JPA, Security, Validation)
- **Banco de Dados:** PostgreSQL + Flyway (Migrações)
- **Segurança:** JWT (jjwt) para sessões stateless + Spring Security + @react-oauth/google

Leia TODOS os arquivos relevantes antes de emitir qualquer conclusão. Organize sua resposta pelas seções abaixo.

---

## 1. Limpeza de Arquivos e Pastas

Identifique e liste TODOS os itens para remoção segura:

### Arquivos de teste e temporários
- Arquivos de teste não utilizados ou abandonados
- Mocks e fixtures sem referências ativas
- `console.log` no frontend ou `System.out.println` no backend deixados em código de produção
- Comentários TODO/FIXME antigos

### Pastas e Arquivos desnecessários
- Configurações antigas do Tailwind v3 ou arquivos substituídos
- Componentes duplicados ou boilerplate do template inicial
- Arquivos de configuração obsoletos ou propriedades não utilizadas no `application.properties`/`application.yml`
- Dependências no `pom.xml` ou `package.json` que não estão sendo utilizadas.

Para cada item, informe: caminho completo → motivo da remoção → risco (baixo/médio/alto).

---

## 2. Refatorações de Código e Arquitetura

Analise cada camada da aplicação e sugira refatorações concretas:

### Frontend (Next.js & React)
- **Server Components vs. Client Components:** Identifique componentes marcados com `'use client'` que poderiam ser Server Components.
- **Data Fetching:** Avalie a correta utilização do `SWR` e `Axios`. Localize fetches dentro de `useEffect` que poderiam ser refatorados para Server Actions ou centralizados em hooks customizados.
- **Organização e Nomenclatura:** Verifique inconsistências em nomes de arquivos/pastas, e analise se a divisão entre UI e lógica de negócios está adequada.
- **Tipagem (TypeScript):** Localize uso de `any` implícito/explícito ou type assertions desnecessárias.

### Backend (Spring Boot & Java 17)
- **Separação de Responsabilidades:** Garanta a arquitetura em camadas estrita (Controllers apenas com roteamento, Services com regra de negócio, Repositories para acesso a dados).
- **Mapeamento e Banco de Dados:** Avalie o uso do JPA/Hibernate. Identifique *Queries N+1*, falta de paginação ou uso inadequado de consultas nativas. Verifique se os *scripts* do Flyway estão consistentes.
- **Clean Code:** Identifique métodos excessivamente grandes, condicionais complexas (falta de *guard clauses*), e tratamento de exceções inadequado (capturas silenciosas ou genéricas).
- **Validação de Dados:** Verifique se as entidades e DTOs estão utilizando as anotações do *Spring Validation* corretamente.

Para cada refatoração, forneça: arquivo:linha → problema → código atual (simplificado) → código sugerido.

---

## 3. Segurança e Resiliência

Revise sistematicamente cada vetor de ataque relevante para esta stack:

### Autenticação e Autorização (Spring Security + JWT)
- Configuração do `SecurityFilterChain`: Verifique se os *endpoints* estão devidamente protegidos e se políticas de CORS e CSRF estão corretamente aplicadas.
- Geração e Validação de JWT: Garanta que o *secret* do JWT não esteja *hardcoded* e que os tokens possuam expiração adequada.
- Integração de Login do Google: Verifique se a validação do ID Token OAuth2 no backend está segura.

### Proteção de Dados e Injeção
- Frontend: Renderização insegura de dados (risco de XSS) e validação de *inputs* de formulários antes do envio.
- Backend: Garantia de que todas as consultas e persistências via JPA estejam imunes a SQL Injection.

### Variáveis de Ambiente
- Exposição acidental de credenciais do banco, chaves do JWT ou outras informações sensíveis no frontend (prefixo `NEXT_PUBLIC_` incorreto).

Liste cada vulnerabilidade com: severidade (crítica/alta/média/baixa) → vetor de ataque → correção recomendada.

---

## 4. Performance e Otimizações

### Frontend
- **Bundle e Renderização:** Componentes pesados sem *lazy loading* dinâmico. Rotas dinâmicas sem otimização de cache ou pré-renderização adequada (SSR vs SSG).
- **Imagens e Assets:** Verifique a utilização correta do `next/image` ao invés de tags `<img>` nativas.
- **Reatividade e Estado:** Minimizar re-renderizações desnecessárias em componentes React.

### Backend
- **Consultas ao Banco:** Otimização de consultas, uso correto de *Lazy Loading* vs *Eager Loading* em mapeamentos JPA.
- **Payloads da API:** Verifique se os *Controllers* estão retornando os DTOs enxutos, contendo apenas os dados necessários para o frontend, ao invés de expor entidades JPA completas.

Para cada item, estime o impacto na performance e o ganho estimado.

---

## 5. Relatório Final

Encerre a auditoria com um relatório estruturado da seguinte forma:

### Resumo Executivo
- Resumo das condições da base de código (Frontend e Backend).
- Número de *issues* encontradas por categoria e severidade.
- Top 3 problemas mais críticos para resolver imediatamente.

### Plano de Ação Priorizado
Ordene por impacto × urgência:
1. 🔴 Crítico — deve ser resolvido antes do próximo deploy (foco em segurança/bugs críticos).
2. 🟠 Alta — resolver na próxima sprint (falhas de arquitetura, vazamento de memória/performance).
3. 🟡 Média — backlog de manutenção (dívida técnica, refatorações de *clean code*).
4. 🟢 Baixa — melhorias incrementais.

### Melhorias de DX (Developer Experience)
Sugestões que tornam o projeto mais fácil de trabalhar no dia a dia:
- Padronização de *scripts* no `package.json` ou *tasks* Maven.
- Configuração de *linters* (ESLint/Checkstyle).
- Necessidade de atualização de documentações ou `README.md`.