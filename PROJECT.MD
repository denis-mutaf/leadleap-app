## LeadLeap App — Overview

- **Название**: `leadleap-app`
- **Назначение**: внутренняя система для команды маркетингового агентства LeadLeap:
  - управление проектами клиентов и интеграциями;
  - база знаний (RAG) поверх клиентских документов;
  - разделы для звонков, креативов и рекламных дашбордов (пока как заглушки).

## Технологический стек

- **Фреймворк**: Next.js 16 (App Router, `src/`-директория)
- **Язык**: TypeScript (`strict: true`)
- **UI**:
  - Tailwind CSS v4
  - shadcn/ui (card, badge, dropdown-menu, avatar, tooltip, separator, button, dialog, input, label, switch, select, textarea, alert, skeleton, sheet)
  - Lucide React (иконки)
- **Тема**:
  - `next-themes` (dark/light, default: dark)
  - собственный `ThemeProvider` и `ThemeToggle`
- **Аутентификация**: Clerk (`ClerkProvider`, middleware, /sign-in, /sign-up)
- **Состояние**: Zustand (`src/store/project-store.ts`) — активный проект и список проектов
- **Анимации**: Framer Motion (анимированный сайдбар)
- **Тосты**: Sonner
- **Бэкенд/БД**: Supabase (Postgres + Storage + pgvector)
- **RAG / ИИ**:
  - OpenAI (эмбеддинги + возможные модели)
  - Anthropic Claude (генерация названий документов и ответов в RAG)
  - `ai`, `pdf-parse`, `mammoth` для работы с текстом и файлами

## Структура основных модулей

### 1. Аутентификация и layout’ы

- `src/app/layout.tsx`
  - Оборачивает приложение в `ClerkProvider`, `ThemeProvider` и `Toaster`.
- `src/app/(app)/layout.tsx`
  - Основной layout для "приложения" с левой панелью `Sidebar` и правым `main`.
- Маршруты:
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`

### 2. Sidebar и навигация

- `src/components/sidebar.tsx`
  - Русский UI, разворачиваемый/сворачиваемый сайдбар.
  - Навигация:
    - `/knowledge-base` — "База знаний"
    - `/calls` — "Звонки"
    - `/creatives` — "Креативы"
    - `/ads` — "Реклама"
    - `/settings` — "Настройки"
  - Включает `ProjectSwitcher`, `ThemeToggle`, аватар пользователя Clerk и кнопку "Выйти".
- `src/components/settings-nav.tsx`
  - Табы настроек: сейчас один пункт `/settings/projects` — "Проекты".

### 3. Supabase

- Клиенты создаются **один раз**:
  - `src/lib/supabase.ts`:
    - `supabase` — анонимный клиент
    - `supabaseAdmin` — сервисный клиент
  - Все остальные модули импортируют только из `@/lib/supabase`.

#### Таблицы и RLS

- **projects**
  - `id`, `name`, `slug`, `logo_url`, `settings`, `created_at`, `updated_at`
  - RLS: `enable row level security` + политика `Allow all for authenticated`.
- **project_integrations**
  - Интеграции по проекту: `service`, `credentials`, `settings`, `is_active`.
  - Уникальность по `(project_id, service)`.
  - Используется для хранения API‑ключей OpenAI/Anthropic, Meta, AmoCRM, PBX и т.д.
- **jobs**
  - Таблица фоновых джоб с enum `job_status`.
- **api_usage**
  - Учет токенов и стоимости (service, tokens, cost_usd).
- **notification_events**
  - События уведомлений по проектам.
- **storage buckets**:
  - `project-logos` — публичные логотипы проектов (для `logo_url`).
    - Политики: публичное чтение, заливка/удаление для аутентифицированных.
  - `rag-documents` — приватные оригиналы документов для RAG.
    - Политики: insert/select/delete для аутентифицированных.

#### RAG-таблицы (Phase 2)

- **documents**
  - `id`, `project_id`, `title`, `file_name`, `file_type`, `file_size`, `storage_path`, `created_at`, `updated_at`.
- **document_chunks**
  - `id`, `document_id`, `project_id`, `content`, `embedding vector(1536)`, `chunk_index`, `created_at`.
- Индекс:
  - `ivfflat` по `embedding vector_cosine_ops` с `lists = 100` для быстрого similarity search.
- Функция:
  - `match_chunks(query_embedding, match_project_id, match_threshold, match_count)` — возвращает чанки с косинусной близостью выше порога.

## API слои

### 1. Projects API

- `src/app/api/projects/route.ts`
  - `GET` — список проектов (`id, name, slug, logo_url, settings, created_at, updated_at`).
  - `POST` — создание проекта (валидация `slug`, обработка конфликта `23505`).
- `src/app/api/projects/[id]/route.ts`
  - `PATCH` — обновление проекта (обновляет `updated_at`).
  - `DELETE` — удаление проекта.
- `src/app/api/projects/[id]/integrations/route.ts`
  - `GET` — список интеграций по проекту.
  - `POST` — upsert интеграции (`credentials`, `settings`, `is_active: true`).
  - `DELETE` — удаляет интеграцию по `service` query‑параметру.
- `src/app/api/projects/[id]/logo/route.ts`
  - `POST` — загрузка логотипа (PNG/JPG/WebP/SVG до 2MB) в bucket `project-logos`, обновление `logo_url`.
  - `DELETE` — удаление логотипа из Storage и сброс `logo_url` в `projects`.

### 2. RAG API

- `src/lib/rag.ts`
  - `parseDocument` — извлечение текста из PDF (pdf-parse), DOCX (mammoth) и текстовых форматов.
  - `chunkText` — разбиение на перекрывающиеся чанки.
  - `getOpenAIClient(projectId)` — достает `api_key` из `project_integrations` (`openai`) и создает клиент.
  - `getAnthropicClient(projectId)` — аналогично для `anthropic`.
  - `generateEmbeddings` — батч‑эмбеддинги через `text-embedding-3-small`.
  - `generateTitle` — короткое название документа через Claude (Haiku).
  - `searchChunks` — RPC к функции `match_chunks`.
- `src/app/api/rag/documents/route.ts`
  - `GET` — список документов проекта.
  - `POST` — загрузка файла:
    - проверка типа/размера;
    - `parseDocument` → `generateTitle`;
    - заливка файла в `rag-documents`;
    - вставка записи в `documents`;
    - `chunkText` + `generateEmbeddings` → вставка в `document_chunks`.
- `src/app/api/rag/documents/[id]/route.ts`
  - `DELETE` — удаление документа и связанного файла в Storage.
- `src/app/api/rag/ask/route.ts`
  - Принимает `projectId`, `question` → эмбеддинг вопроса → `searchChunks`.
  - Если чанков нет — сообщает, что релевантных данных нет.
  - Генерирует ответ через Claude с жестким ограничением на использование только переданного контекста.
  - Возвращает `answer` и `sources` (id/title документов).
- `src/app/api/rag/search/route.ts`
  - Возвращает "сырые" результаты similarity search (чанки + similarity) для произвольного запроса.

## UI-модули

### 1. Settings → Projects

- `src/app/(app)/settings/layout.tsx` + `SettingsNav`:
  - Заголовок "Settings" и таб "Проекты".
- `src/app/(app)/settings/projects/page.tsx`
  - Список проектов:
    - создание проекта через `Dialog` (русский UI);
    - удаление проекта;
    - отображение активного проекта (`Badge "Активный"`).
  - Использует `ProjectAvatar` (логотип/инициалы).
  - Навигация на детальную страницу `/settings/projects/[id]`.
- `src/app/(app)/settings/projects/[id]/page.tsx`
  - Табы:
    - **Основное** — логотип, имя, slug (нельзя менять), сохранение.
    - **Интеграции** — список всех сервисов из `INTEGRATION_CONFIGS`, подключение/отключение, редактирование `credentials`.
    - **Webhook** — URL для PBX, кнопка "Копировать", инструкция по настройке.
  - Логотип:
    - загрузка/удаление через API `/api/projects/[id]/logo`.
  - Использует `ProjectAvatar` и `IntegrationLogo`.
- `src/components/project-avatar.tsx`
  - Унифицированный компонент аватара проекта (sm/md/lg, логотип или инициалы).
- `src/components/integration-logo.tsx`
  - SVG‑иконки для OpenAI, Meta, Gemini + emoji‑fallback для остальных сервисов.

### 2. Knowledge Base (База знаний)

- `src/app/(app)/knowledge-base/page.tsx`
  - Новый универсальный паттерн:
    - **полноширинная таблица** документов;
    - **Sheet‑панель справа** для:
      - загрузки (`upload`),
      - вопросов к AI (`ask`),
      - семантического поиска (`search`).
  - Состояния:
    - список документов с типом/размером/датой;
    - загрузка, удаление;
    - вопрос/ответ AI + источники;
    - результаты поиска с релевантностью.

## Стор состояния

- `src/store/project-store.ts`
  - Zustand + `persist`:
    - `projects: Project[]`
    - `activeProject: Project | null`
    - `setProjects`, `setActiveProject`
  - Хранится в localStorage как `leadleap-project`.

## ENV и деплой

- `.env.local` / `.env.example`:
  - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, URL’ы sign-in/sign-up.
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  - App: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` (для Express backend и webhook).
- Деплой предполагается на Vercel:
  - проект `leadleap-app`, preset — Next.js;
  - env‑переменные с Vercel синхронизируются с `.env.example` (значения заполняются вручную).

