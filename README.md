# ⬡ TaskFlow — Sistema de Gerenciamento de Tarefas

O **TaskFlow** é uma aplicação Full-Stack moderna projetada para oferecer uma experiência de organização de tarefas intuitiva, sofisticada e segura. Desenvolvido com foco em UX/UI de alto padrão, o sistema utiliza o conceito de *Glassmorphism* e uma paleta de cores executiva.

![TaskFlow Preview](https://via.placeholder.com/1200x600/0f172a/ffffff?text=TaskFlow+Dashboard+Preview)

## 🚀 Funcionalidades Principais

- **Autenticação Segura:** Sistema de login e registro com JWT (JSON Web Tokens) e criptografia de senhas (BCrypt).
- **Recuperação de Senha:** Fluxo completo de "Esqueci minha senha" com envio de e-mails em HTML profissional via SMTP.
- **Quadro Kanban:** Interface interativa para arrastar e organizar tarefas em diferentes estágios.
- **Perfil Customizável:** Edição de perfil com ferramenta de recorte de imagem (Image Cropper) integrada para avatares.
- **Categorização Inteligente:** Sistema de categorias personalizadas com ícones e cores para melhor organização.
- **Design Responsivo:** Interface totalmente adaptável para dispositivos móveis e desktops, com suporte a Dark e Light Mode.

## 🛠 Tecnologias Utilizadas

### Backend
- **Java 17** com **Spring Boot 3**
- **Spring Security** (Autenticação e Autorização)
- **Spring Data JPA** (Persistência de Dados)
- **PostgreSQL** (Banco de Dados Relacional)
- **JavaMailSender** (Integração com serviços de e-mail)
- **Lombok** (Produtividade e código limpo)

### Frontend
- **HTML5 & CSS3** (Vanilla, com variáveis CSS modernas)
- **JavaScript Moderno (ES6+)**
- **Cropper.js** (Manipulação de imagens)
- **Google Fonts** (Tipografia profissional)

## 🔧 Como Rodar o Projeto Localmente

### Pré-requisitos
- JDK 17+
- Maven
- PostgreSQL rodando localmente

### Configuração
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/task-manager.git
   ```

2. Configure as variáveis de ambiente (ou edite o `application.properties`):
   - `DB_URL`: jdbc:postgresql://localhost:5432/taskmanager
   - `DB_USER`: seu-usuario
   - `DB_PASSWORD`: sua-senha
   - `MAIL_USERNAME`: seu-email-smtp
   - `MAIL_PASSWORD`: sua-senha-de-app

3. Execute o Backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

4. Execute o Frontend:
   Abra o arquivo `frontend/index.html` usando um servidor local (como a extensão Live Server do VS Code).

## 🌍 Deploy

O projeto está configurado para ser hospedado facilmente no **Render**:
- **Backend:** Web Service (Java/Maven)
- **Frontend:** Static Site
- **Database:** PostgreSQL Service

---

Desenvolvido por [Seu Nome](https://www.linkedin.com/in/seu-perfil/) — Sinta-se à vontade para se conectar!
