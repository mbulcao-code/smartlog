# Marcos Bulcão — Projetos Ativos

> Atualizar este arquivo ao fim de cada sessão de trabalho.
> No início de qualquer conversa nova: **"Claude, leia o PROJETOS.md antes de começar."**

---

## PROJETOS CRUCIAIS (arquivos e inteligência ficam comigo)

---

### 1. SmartLog — Site de Marketing

**Status:** No ar ✅
**Plataforma:** Netlify · plano Personal ($9/mês) · projeto `serene-seahorse-ccb5a2` (NOT `cool-semifreddo-2faf5f`)
**Domínio:** `smartlogtrading.com` (DNS gerenciado pelo Netlify)
**Arquivos:** `outputs/smartlog-site/` — 11 HTMLs + styles.css + imagens + PDF
**Deploy:** Netlify → projeto → Deploys → arrastar o zip

**Páginas:**
- `index.html` — Homepage / landing
- `smartlog.html` — Página do produto SmartLog (tem versão IOTAF também)
- `about.html` — Sobre o Marcos
- `book.html` — Trading Without Ego
- `work-together.html` — Enrollment / pricing
- `iotaf.html` — Página de referral IOTAF (código `SMARTLOG2026`, sem desconto prometido)
- `waitlist.html` + `waitlist-thank-you.html` — Fluxo de waitlist
- `book-thank-you.html` — Confirmação de download do livro
- `styles.css` — Stylesheet compartilhado
- `images/` — book-cover.jpg, marcos.jpg, screenshots do SmartLog

**Decisões tomadas:**
- Coaching Program CTA aponta para Stripe: `https://buy.stripe.com/bJe7sNcwgb0Pb9p6hg6Vq0c`
- Zoom cancelado (ativo até 30 maio) → substituir por Google Meet
- IOTAF: Nick é contato operacional, Marcos é o dono. Desconto autorizado comunicado por mensagem (já enviada).
- Site foi ao ar e caiu (free tier esgotado) → atualizado para plano pago

**Próximos passos:**
- [ ] Adicionar seção/link do SmartLog app (`app.smartlogtrading.com`) na homepage
- [ ] Tennis Lab GOAT site (mesmo Netlify, sem custo extra) — adiado

---

### 2. SmartLog — Webapp

**Status:** No ar ✅ (em beta, enviando para 2 amigos para teste)
**URL:** `https://app.smartlogtrading.com`
**Repo:** `/Users/marcosbulcao/Documents/smartlog`
**Stack:** Next.js (App Router) · Supabase · Stripe · Resend · Anthropic API (Claude Haiku) · Vercel
**Notas detalhadas:** ver `CLAUDE.md` no mesmo repo

**O que faz:**
Diário comportamental de trading. Usuário escolhe um padrão (FOMO, hesitação, saída prematura, etc.), tem uma conversa guiada com IA, recebe um experimento A/B definido, registra operações e recebe relatórios baseados em dados.

**Planos:**
- Free: 1 sessão completa
- Monthly: $19/mês
- Yearly: $159/ano
- Lifetime: $299 (pagamento único)

**Infraestrutura:**
- Auth: Supabase (Google OAuth + email/senha)
- DB tables: `conversations`, `trade_logs`, `subscriptions`, `lifetime_users`, `beta_users`, `leads`
- Pagamentos: Stripe. Webhook: `app/api/stripe/webhook/route.js`
- Email: Resend via `app/api/contact/route.js`
- Relatórios: Claude Haiku, desbloqueado aos 10 trades

**Concluído (maio 2026):**
- Google OAuth + fluxo de auth completo ✅
- Todos os planos de assinatura (monthly, yearly, lifetime) ✅
- Webhook Stripe corrigido (bug basil API: `current_period_end` undefined) ✅
- Sidebar: settings sempre visíveis, badge Pro/Free, data de validade, portal de billing ✅
- Tabela `leads` auto-populada no signup ✅
- Badge Free/Pro na homepage ✅
- Experimento FOMO redesenhado: Variante A = "Seu nível também foi atingido?" ✅
- Prompts de relatório atualizados com framing conceitual completo do FOMO ✅
- Botões de teste beta (R$1/R$2) removidos da página de subscribe ✅
- Política de Privacidade + Termos de Serviço ✅
- i18n PT/EN completo ✅

**Pendente:**
- Resend SPF TXT ainda pendente → quando verde, atualizar `app/api/contact/route.js`: `from: "SmartLog <noreply@smartlogtrading.com>"`, `to: "marcos@smartlogtrading.com"`
- Enviar para 2 amigos para teste beta
- Fine-tuning dos relatórios FOMO após primeiros trades reais

**Quirks importantes:**
- Stripe SDK v22 (basil API): `current_period_end` retorna `undefined` → usar `resolvePeriodEnd()` no webhook
- Pushes ao GitHub devem ser feitos do terminal local (sandbox não autentica)
- Se git travar: `rm -f .git/HEAD.lock .git/index.lock`

---

### 3. Alex — Caso Clínico (Supervisão)

**Status:** Em andamento — sessões semanais às quartas
**Supervisor:** Pai do Marcos (supervisão presencial)

**Perfil:**
- ~45–50 anos, russo do sul, imigrante em Montreal
- Veio pelo workshop SmartLog
- 5 sessões realizadas (1 assessment gratuita + 4 pagas)

**Hipóteses clínicas em construção:**
- Estrutura de autossuficiência endurecida = incapacidade de receber
- Mulher ucraniana como disruptora do modelo de vida (não só perda amorosa)
- Modelo relacional: "mulheres contratam homens" — gramática transacional que protege do risco de ser desejado como sujeito
- Paradoxo: teme não ser atraente o suficiente / não aceita ser amado contratualmente = impasse estruturalmente insolúvel
- Fantasia fundamental: sujeito completo/autossuficiente que jamais precisa responder à questão do desejo do Outro
- Objeto a provisório: desejo do Outro irredutível à necessidade (ucraniana como caso exemplar)
- Gozo: na invulnerabilidade, na hipervigilância, no "ainda não" da procrastinação
- Detalhe clínico: ela voltava 2h da manhã — ruptura real, não o "arranjo combinado"
- Memória do patins: medo de cair = não conseguir aproveitar (intervenção com riso envergonhado — sinal de toque)

**Material produzido:**
- Narrativa clínica em português para apresentar ao supervisor (sem interpretações — só os significantes do paciente)

**Próximo passo:** Atualizar notas aqui após cada sessão de quarta.

---

### 4. Projetos de Escrita

**"O Sintoma como Estratégia"**
- Status: Concluído ✅
- Arquivo final: `outputs/O Sintoma como Estratégia — final.pdf`
- Convertido de capítulo de livro para paper acadêmico standalone
- Vinheta clínica substituiu exemplo do fumante
- Parágrafo evolucionista reescrito em termos lacanianos
- Mensagem enviada para grupo PSIU-UFBA
- Próximos passos: nenhum por enquanto

**Livro em andamento**
- Base do paper acima
- A definir próximos passos

---

## PROJETOS AUTÔNOMOS (conteúdo não depende de mim)

---

### 5. marcosbulcao.com — Site de Psicanálise

**Status:** No ar ✅
**Plataforma:** WordPress (Marcos tem acesso direto)
**Domínio:** `marcosbulcao.com`
**Nota:** Claude pode ajudar com textos e estratégia, mas os arquivos vivem no WordPress.
**Próximos passos:** A definir.

---

### 6. Redes Sociais — Conteúdo

**Status:** Modelo definido, aguardando primeira gravação

**Modelo:**
- TikTok + Instagram Reels (cross-post)
- Entrada com punchline (tirada dos módulos do curso existente — sem criar do zero)
- Conteúdo real com entrada pontiaguda
- Gravar segundas-feiras / postar ter + qui + sab
- Fundo: estante de livros (já validado)
- Idioma inicial: inglês

**Próximo passo:** Extrair punchlines dos módulos do curso antes da primeira gravação.

---

### 7. Tennis Lab GOAT — Site

**Status:** Adiado ⏸
**Plano:** Hospedar no mesmo Netlify do SmartLog (sem custo extra)
**Próximo passo:** Confirmar se ainda está no radar e quando retomar.

---

## Contas e serviços externos

| Serviço | Conta | Notas |
|---|---|---|
| Supabase | bulcaoacademy@gmail.com | Project ID: `jxftwnwvdkmolnufvmcj` |
| Stripe | — | Webhook: `https://app.smartlogtrading.com/api/stripe/webhook` |
| Vercel | — | Deploy automático do smartlog app no push ao main |
| Resend | mbulcao@gmail.com | DKIM ✅ verificado · SPF TXT pendente |
| Netlify | — | Projeto `serene-seahorse-ccb5a2` para o site de marketing |
| Google Cloud | bulcaoacademy@gmail.com | OAuth project: `smartlog-495617` |
| Google Search Console | bulcaoacademy@gmail.com | Domínio verificado para branding OAuth |
