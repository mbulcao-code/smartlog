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
- Journal v3: wizard 6 passos, detail view v2, reports com other issues, AI report endpoint ✅
- Journal v3.2: stop+target merged em único passo de outcome ✅
- Reports redesenhados: framing data-driven, "FOMO pirate fee", stop verdict com dados ✅
- Step 4: multi-select outcomes (respected_stop, changed_stop, panic_exit, target_not_hit, early_exit, last_target_hit) ✅
- Admin dashboard: auth gate, whitelist, Sessions tab, Journal tab por usuário ✅

**Concluído (maio 26, 2026):**
- Contact form fix: `noreply@smartlogtrading.com` → `marcos@smartlogtrading.com` ✅ (precisa de git push)

**Pendente (ações do usuário):**
- [ ] **Git push** o fix do contact form
- [ ] **Migrations Supabase** — rodar bloco "SmartLog App" do `PENDING_MIGRATIONS.md`
- [ ] Recriar setup de teste (deletar "Reversal 1" com formato antigo variantA/variantB)
- [ ] Enviar para 2 amigos para teste beta

**Quirks importantes:**
- Stripe SDK v22 (basil API): `current_period_end` retorna `undefined` → usar `resolvePeriodEnd()` no webhook
- Pushes ao GitHub devem ser feitos do terminal local (sandbox não autentica)
- Se git travar: `rm -f .git/HEAD.lock .git/index.lock`
- DNS gerenciado pelo Namecheap BasicDNS — NÃO mudar para cPanel mode (apaga os registros)
- Todos os registros DNS estão no Namecheap Advanced DNS (não no Netlify)

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

### 9. Trading Without Ego — Rewrite + Interactive AI Book

#### 9a. Book rewrite
**Status:** Planejado — alta prioridade ⏳
**Conceito:** Reescrever o livro com o novo norte: *"You can't remove uncertainty from trading. But you can remove regret from your decisions."*
**O que muda:**
- Novo spine: de "emotions aren't the enemy" → para "remove regret" como destino, não só reframe
- Nova intro abrindo com a formulação regret/uncertainty
- Cada capítulo fecha com o "closing experiment" (já mapeado em `INTERACTIVE_BOOK_MAP.md`)
- Cap VI (Mind as Problem-Solver) elevado — é o coração mecânico do método
- Conclusão vira call to action genuíno e concreto
**Matéria-prima pronta:** chapter map + regret angles + closing experiments em `INTERACTIVE_BOOK_MAP.md`
**Próximo passo:** Iniciar rewrite quando momentum permitir

#### 9b. Interactive AI Book (produto separado)
**Status:** App scaffolado — pronto para deploy 🚀
**Domínio:** `book.smartlogtrading.com`
**Stack:** Next.js + Supabase (mesmo projeto `jxftwnwvdkmolnufvmcj`) + Anthropic Sonnet + Vercel
**Pasta do app:** `/Users/marcosbulcao/Documents/smartlog/book-app/`
**Pricing:** Free (1 conversa) / $29 mês / $79 ano / $199 lifetime — yearly+lifetime do SmartLog incluídos

**Conteúdo completo ✅:**
- `INTERACTIVE_BOOK_SYSTEM_PROMPT.md` — system prompt completo
- `INTERACTIVE_BOOK_MAP.md` — mapa de capítulos e experimentos
- `INTERACTIVE_BOOK_CONTENT.md` — 7 capítulos fundação (F1–F7)
- `INTERACTIVE_BOOK_PATTERNS.md` — 15 blocos de padrões

**App scaffolado ✅:**
- Landing page com grid de entry points (pain / concept / browse)
- Chat UI com streaming, free-tier wall, auth gate
- Auth compartilhada com SmartLog (Google OAuth + email)
- API route Claude Sonnet com system prompt
- Check-access: verifica lifetime_users, subscriptions, book_subscriptions
- Stripe checkout + webhook
- Pricing page ($29/$79/$199)

**Pendente (ações do usuário) — ver `book-app/DEPLOY.md`:**
- [ ] Rodar SQL migrations (bloco "Interactive AI Book" do `PENDING_MIGRATIONS.md`)
- [ ] Criar price IDs no Stripe (3 preços)
- [ ] Adicionar redirect URLs no Supabase
- [ ] Deploy no Vercel (nova project, root: `book-app/`, env vars do `.env.example`)
- [ ] CNAME `book` → `cname.vercel-dns.com` no Namecheap
- [ ] Adicionar domínio no Vercel

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

### 8. Webapp Psiu — Projeto em Exploração

**Status:** Em negociação inicial ⏳
**Contexto:** Projeto Psiu (UFBA) — Marcelo Veras (diretor clínico) foi abordado por Belintani (capitalista) para criar plataforma nacional de saúde mental digital com IA. Marcos foi semi-convidado por Veras como alguém com perfil híbrido (psi + negócios + tecnologia).

**Personagens:**
- **Veras** — diretor do PSIU/UFBA, credencial clínica, contato direto de Marcos
- **Belintani** — capitalista do mega projeto, abordou Veras
- **Filha de Veras** — fez observações práticas (WhatsApp como canal, restrições ao app)

**Campo identificado (nosso diferencial):**
- O business plan oscila entre dois enquadramentos: substituição humana (rejeitada pelo CFP) e triagem protocolar (o que a maioria dos sistemas faz)
- Existe uma posição intermediária não explorada: **AI como zona de contato** — espaço de exploração guiada antes da demanda clínica estar formada
- Distinção clínica chave: **procura vs demanda** — a triagem pressupõe demanda formada; a maioria das pessoas que sofre ainda está na procura

**Objeções antecipadas:**
- CFP: compatível — AI apoia, não decide; clínico é arquiteto do sistema, não supervisor formal
- Jurídico: produto como "ferramenta de suporte", não serviço de saúde; protocolo de crise documentado; escopo declarado no onboarding
- Resistência de Veras: se houver, campo alternativo = burnout corporativo (B2B, sem enquadramento clínico, sem CFP)

**Insights táticos:**
- Quarto motivo de não buscar ajuda: sigilo + possibilidade de explorar sem se comprometer
- Burnout corporativo: atendimento humano é parte da barreira (funcionário não quer que empresa saiba)
- App vs webapp: webapp = sem download, sem rastro no app store, só um link — vantagem enorme em contextos de sigilo
- SmartLog como proof of concept: webapp com lógica de escuta guiada aplicada à psicologia do mercado

**Próximos passos:**
- [ ] Aguardar resposta de Veras ao email enviado em 14/05
- [ ] Se positivo: brainstorming mais detido, definir papel de Marcos e modelo de compensação
- [ ] Documento de proposta formal: preparar após confirmar interesse de Veras

**Arquivo:** `psiu-proposta-veras.docx` (rascunho conceitual — não enviado, guardado para referência)

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
