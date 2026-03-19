## LeadLeap App — Overview

- **Название**: `leadleap-app`
- **Назначение**: внутренняя система для команды маркетингового агентства LeadLeap:
  - управление проектами клиентов и интеграциями;
  - база знаний (RAG) поверх клиентских документов;
  - модуль звонков (список, детали, оценки, инсайты) и рейтинг менеджеров;
  - генератор креативов (внешний API по `NEXT_PUBLIC_API_URL`);
  - раздел рекламы (Meta Ads): аккаунты, синхронизация инсайтов, дашборд, кампании, адсеты, объявления, демография/плейсменты/гео/почасовые.

Дополнительно:

- Подробная документация по Meta Ads: `meta.md` (запросы к Meta, поля, таблицы, синхронизация, UI-метрики, `outbound_clicks`).

## Технологический стек

- **Фреймворк**: Next.js 16 (App Router, `src/`-директория)
- **Язык**: TypeScript (`strict: true`)
- **UI**:
  - Tailwind CSS v4
  - shadcn/ui (card, badge, dropdown-menu, avatar, tooltip, separator, button, dialog, input, label, switch, select, textarea, alert, skeleton, sheet, **calendar**, **popover**, **table**, **chart** — ChartContainer, ChartTooltip, ChartTooltipContent)
  - Lucide React (иконки)
  - date-fns (форматирование дат, в т.ч. в дашборде рекламы)
- **Тема**:
  - `next-themes` (dark/light, default: dark)
  - собственный `ThemeProvider` и `ThemeToggle`
- **Аутентификация**: Clerk (`ClerkProvider`, middleware, /sign-in, /sign-up)
- **Состояние**: Zustand — `project-store` (активный проект, список проектов), `use-meta-account` (выбранный Meta-аккаунт, persist в localStorage)
- **Графики**: Recharts (LineChart, BarChart и др.) в разделе «Реклама»
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
  - `/` — корневая страница (`src/app/page.tsx`) редиректит на `/ads`.
  - `(app)` — индекс (`src/app/(app)/page.tsx`) редиректит на `/knowledge-base`.
  - `/sign-in/[[...sign-in]]`
  - `/sign-up/[[...sign-up]]`

### 2. Sidebar и навигация

- `src/components/sidebar.tsx`
  - Русский UI, разворачиваемый/сворачиваемый сайдбар.
  - Навигация:
    - `/knowledge-base` — "База знаний"
    - `/calls` — "Звонки"
    - `/managers` — "Менеджеры"
    - `/creatives` — "Креативы"
    - `/ads/[slug]` — "Реклама" (slug берётся из активного проекта или из URL при гидрации)
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

#### Таблицы Calls (Phase 3)

- **managers** — менеджеры по проекту: `id`, `project_id`, `name`, `pbx_user`, `amo_user_id`, `created_at`. RLS: Allow all.
- **clients** — клиенты: `id`, `project_id`, `phone`, `name`, `amo_lead_id`, `created_at`, `updated_at`. RLS: Allow all.
- **calls** — звонки: `id`, `project_id`, `callid`, `manager_id`, `client_id`, `type`, `duration`, `audio_path`, `transcript`, `status`, `amo_lead_id`, `created_at`. RLS: Allow all.
- **evaluations** — оценки звонков: `id`, `project_id`, `call_id`, `manager_id`, `score_greeting`, `score_needs`, `score_presentation`, `score_objections`, `score_closing`, `score_total`, `recommendations`, `raw_analysis` (jsonb), `created_at`. RLS: Allow all.
- **call_insights** — инсайты по звонку: `id`, `project_id`, `call_id`, `client_id`, `extracted_name`, `extracted_property`, `extracted_budget`, `extracted_concerns`, `extracted_source`, `extracted_timeline`, `extracted_notes`, `created_at`. RLS: Allow all.

#### Таблицы Meta Ads

- Все таблицы привязаны к `project_id` (FK на `projects(id)` on delete cascade), RLS: Allow all.
- **meta_ad_accounts** — аккаунты Meta по проекту: `id`, `project_id`, `account_id`, `account_name`, `account_currency`, `is_active`, `created_at`. Уникальность: `(project_id, account_id)`.
- **meta_campaign_insights** — дневные инсайты по кампаниям: `project_id`, `account_id`, `campaign_id`, `campaign_name`, `date`, метрики (spend, impressions, clicks, **outbound_clicks**, results, cpm, cpc, ctr, reach, frequency, video_*, а также quality/roas/json-поля), `account_currency`, `fetched_at`. Уникальность: `(project_id, account_id, campaign_id, date)` (устраняет дубли при переименовании кампаний).
- **meta_adset_insights** — инсайты по адсетам: структура аналогична, уникальность `(project_id, account_id, adset_name, campaign_name, date)`.
- **meta_ad_insights** — инсайты по объявлениям: уникальность `(project_id, account_id, ad_id, date)`.
- **meta_demographic_insights** — разбивка по возрасту/полу: уникальность `(project_id, account_id, campaign_name, date, age, gender)`.
- **meta_placement_insights** — по платформам/позициям: уникальность `(project_id, account_id, campaign_name, date, publisher_platform, platform_position)`.
- **meta_geo_insights** — по странам/регионам: уникальность `(project_id, account_id, campaign_name, date, country, region)`.
- **meta_hourly_insights** — почасовые: уникальность `(project_id, account_id, campaign_name, date, hour)`.
- **meta_device_insights** — разбивка по `device_platform`: уникальность `(project_id, account_id, campaign_name, date, device_platform)`.

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

### 3. Calls API

- `src/app/api/calls/route.ts`
  - `GET` — список звонков: `projectId` обязателен, опционально `managerId`. Выборка с джойнами `manager`, `client`. Сортировка по `created_at` desc, limit 100. Ответ: `{ data: calls }`.
- `src/app/api/calls/[id]/route.ts`
  - `GET` — один звонок с `manager`, `client`; параллельно `evaluations` и `call_insights` по `call_id` (maybeSingle). Ответ: `{ call, evaluation, insight }`. 404 при отсутствии звонка.

### 4. Managers API

- `src/app/api/managers/route.ts`
  - `GET` — список менеджеров проекта (`projectId`), сортировка по `name` asc. Ответ — массив.
  - `POST` — создание менеджера: body `{ projectId, name, pbx_user }`, вставка в `managers`. Ответ 201 — созданная запись.
- `src/app/api/managers/stats/route.ts`
  - `GET` — статистика по менеджерам: `projectId` обязателен. Загрузка всех менеджеров и evaluations проекта; для каждого менеджера — `total_calls`, средние по всем score (округление до 1 знака). Менеджеры с `total_calls = 0` отфильтровываются. Сортировка по `avg_score` desc. Ответ — массив `ManagerStats` (тип в `@/types`).

### 5. Meta Ads API

- Токен Meta: один на приложение — `META_ACCESS_TOKEN` (env). Все роуты используют `supabaseAdmin` из `@/lib/supabase`.
- `src/lib/meta-api.ts` — утилиты: `normalizeAccountId`, `extractResults`, `extractActionValue`, `fetchWithBackoff`, `fetchAllPages`; функции загрузки: `fetchMetaAdAccounts`, `fetchMetaInsights`, `fetchMetaAdsetInsights`, `fetchMetaAdInsights`, `fetchMetaDemographicInsights`, `fetchMetaDeviceInsights`, `fetchMetaPlacementInsights`, `fetchMetaGeoInsights`, `fetchMetaHourlyInsights`, `fetchMetaAds`, `fetchMetaAdPreview`.
- `src/app/api/meta/accounts/route.ts` — `GET` — список аккаунтов проекта (`projectId` обязателен), активные, сортировка по `account_name`.
- `src/app/api/meta/sync-accounts/route.ts` — `POST` — body `{ projectId }`: загрузка аккаунтов из Meta API, upsert в `meta_ad_accounts` по `(project_id, account_id)`.
- `src/app/api/meta/sync/route.ts` — `POST` — body `{ projectId, accountId, dateFrom?, dateTo? }`: синхронизация всех инсайтов (campaigns, adsets, ads, demographic, placement, geo, hourly) в соответствующие таблицы.
- `src/app/api/meta/sync-all/route.ts` — `POST` — cron: для всех активных записей `meta_ad_accounts` вызывает внутренне `/api/meta/sync` с `projectId` и `accountId`. Защита: `CRON_SECRET` или заголовок `x-vercel-cron`.
- `src/app/api/meta/insights/route.ts` — `GET` — `projectId`, `accountId`, опционально `dateFrom`, `dateTo`, `campaignId`, `groupBy=campaign`: дневные строки или агрегат по кампаниям (`CampaignAggregateRow`).
- `src/app/api/meta/adsets/route.ts` — `GET` — `projectId`, `accountId`, `campaignId`, опционально даты, `groupBy=adset`: строки или агрегат по адсетам (`AdsetAggregateRow`).
- `src/app/api/meta/ad-insights/route.ts` — `GET` — `projectId`, `accountId`, `adsetId`, опционально даты: инсайты по объявлениям.
- `src/app/api/meta/demographics/route.ts` — `GET` — `projectId`, `accountId`, опционально даты, `campaignName` (список через запятую).
- `src/app/api/meta/placements/route.ts` — то же для плейсментов.
- `src/app/api/meta/geo/route.ts` — то же для гео.
- `src/app/api/meta/hourly/route.ts` — то же для почасовых, сортировка по `hour`.
- `src/app/api/meta/preview/route.ts` — `GET` — `adId`, опционально `adFormat`: HTML-превью объявления из Meta API.

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

### 3. Calls (Звонки)

- `src/app/(app)/calls/page.tsx`
  - Заголовок h-14, контент flex-1 overflow-y-auto. Таблица звонков: дата, менеджер, клиент, длительность, оценка/статус. Фильтр по менеджеру (Select). При клике — Sheet справа с деталями звонка: вкладки «Резюме», «Оценка», «Инсайты», «Транскрипт». Данные через API `/api/calls` и `/api/calls/[id]`. Типы: `Call`, `Evaluation`, `CallInsight`, `Manager` из `@/types`.

### 4. Managers (Менеджеры)

- `src/app/(app)/managers/page.tsx`
  - Рейтинг менеджеров: карточки с аватаром (инициалы), именем, бейджем «Лучший» для первого, средним баллом (ScoreRing), числом звонков и мини-барами по критериям (приветствие, потребности, презентация, возражения, закрытие). Данные через `/api/managers/stats`. Тип `ManagerStats` из `@/types`.

### 5. Creatives (Креативы)

- `src/app/(app)/creatives/page.tsx`
  - Генератор креативов. Данные с внешнего API: `NEXT_PUBLIC_API_URL` (Railway и т.п.). Паттерн: хедер h-14, галерея (flex-1 overflow-y-auto), две Sheet справа — «Создать» и «Настройки».
  - **Генератор (Sheet «Создать»)**: URL продукта (парсинг с дебаунсом 800 мс и по Enter), цена, зона загрузки фото (drag-drop, paste, до 3), референсы (до 5), выбор формата (1:1, 9:16, 16:9, 4:5), тексты (headline, subheadline, cta, extraText), преимущества (до 4), промпт. Кнопка «Сгенерировать» — FormData в `POST ${API_URL}/creatives/generate`.
  - **Настройки (Sheet «Настройки»)**: логотип, модель (NB / NB 2 / NB Pro), разрешение (0.5K–4K), стиль, цели (multi), язык, индустрия, ЦА, цвета (picker + hex), шрифты. Сохранение в localStorage (`leadleap_creatives_settings`), без сериализации `logoFile`.
  - **Автозаполнение при `parse-product`**: помимо текстовых полей парсер пытается автоматически добавить изображение товара в composition (из `image_url` / `product_image` / `image` / `image_base64`, включая data URL и raw base64; при необходимости fallback на `POST .../creatives/fetch-image`).
  - **Галерея**: masonry (CSS columns), skeleton-карточка при активной генерации, empty state, карточки с кнопкой «Скачать».
  - **Модалка по клику**: по нажатию на карточку креатива открывается модальное окно с подробностями (модель, формат, headline, дата) и кнопкой «Скачать».
  - **API вызовы**: `GET ${API_URL}/creatives/history` — галерея; `POST .../creatives/parse-product` — парсинг по URL; `POST .../creatives/fetch-image` — картинка по URL в composition; `POST .../creatives/generate` — генерация (FormData: model, format, imageSize, тексты, benefits, goals, photos, references, brandbook/logo и др.).

### 6. Ads (Реклама)

- `src/types/meta.ts` — типы: `MetaAdAccount`, `MetaCampaignInsight`, `MetaAdsetInsight`, `MetaAdInsight`, `MetaDemographicInsight`, `MetaPlacementInsight`, `MetaGeoInsight`, `MetaHourlyInsight`, `MetaDeviceInsight`, `CampaignAggregateRow`, `AdsetAggregateRow`.
- `src/hooks/use-meta-account.ts` — Zustand store `useMetaAccountStore`: `selectedAccountId`, `setSelectedAccountId`; persist в localStorage `meta-account-store`.
- Дашборды:
  - `src/app/(app)/ads/page.tsx` — легковесный client-редирект на `/ads/[slug]` после монтирования (учёт асинхронной гидрации Zustand).
  - `src/app/(app)/ads/[slug]/page.tsx` — роутинг дашборда по `slug` **из URL** (source of truth): `topmag` → `TopmagDashboard`, иначе → `GenericAdsDashboard`.
  - `src/components/dashboards/generic/index.tsx` — `GenericAdsDashboard` (базовый дашборд рекламы).
  - `src/components/dashboards/topmag/index.tsx` — `TopmagDashboard` (кастомный дашборд TopMag; `projectId/accountId` захардкожены константами внутри компонента).

Подробнее по всем данным Meta (какие поля забираем, как сохраняем, как считаем CTR/CPC, включая `outbound_clicks`) см. `meta.md`.
- `src/app/(app)/ads/layout.tsx` — layout с анимацией (Framer Motion, AnimatePresence по pathname).
- `GenericAdsDashboard` — дашборд «Реклама»:
  - Тулбар: Select аккаунта (из `/api/meta/accounts?projectId=...`), период — **Popover + Calendar** (date-fns, даты «От»/«До»), кнопки «Аккаунты» (POST sync-accounts) и «Синхронизировать» (POST sync). В API даты передаются как `yyyy-MM-dd`.
  - **8 KPI-карточек** (KpiCard): Расход, Показы, Клики, Результаты, CTR, CPC, CPM, Цена за результат; тренд-иконки (TrendingUp / TrendingDown / Minus). Сетка `grid-cols-4`.
  - Два графика (Recharts): «Расход по дням» (AreaChart с градиентом, ResponsiveContainer, нативный Tooltip с theme-стилями), «CTR по дням» (LineChart, ResponsiveContainer, Tooltip).
  - Таблица кампаний — **Table** (shadcn): топ **10** по расходам, колонки Кампания, Расход, Показы, Клики, CTR, CPC, Результаты. Ссылка «Все кампании» → `/ads/campaigns`.
  - Состояния: скелетоны, пустое состояние при отсутствии проекта/аккаунта или данных.
- `src/app/(app)/ads/campaigns/layout.tsx` — такой же анимированный layout.
- `src/app/(app)/ads/campaigns/page.tsx` — список кампаний (из insights с `groupBy=campaign`), ссылки на `/ads/campaigns/[campaignId]`.
- `src/app/(app)/ads/campaigns/[campaignId]/page.tsx` — детали кампании: breadcrumbs, метрики (в т.ч. частота), график расхода по дням — **ChartContainer** (config `spend`), **ChartTooltip** + **ChartTooltipContent** из `@/components/ui/chart`, LineChart, stroke `var(--color-spend)` (без ResponsiveContainer). Таблица адсетов (частота > 3 — красный текст), ссылки на `/ads/campaigns/[campaignId]/[adsetId]`.
- `src/app/(app)/ads/campaigns/[campaignId]/[adsetId]/page.tsx` — детали адсета: breadcrumbs, метрики, графики расхода и частоты (ResponsiveContainer + Recharts Tooltip, reference line «Выгорание» при y=3), воронка видео-просмотров (BarChart при наличии данных), табы Демография/Плейсменты/По часам (ленивая подгрузка), таблица объявлений с раскрытием дневных инсайтов по клику.

## Стор состояния

- `src/store/project-store.ts`
  - Zustand + `persist`:
    - `projects: Project[]`
    - `activeProject: Project | null`
    - `setProjects`, `setActiveProject`
  - `Project.settings?: { meta_account_id?: string; [key: string]: unknown }`
  - Хранится в localStorage как `leadleap-project`.
- `src/hooks/use-meta-account.ts`
  - Zustand + `persist`: `selectedAccountId`, `setSelectedAccountId`.
  - Ключ localStorage: `meta-account-store`.

## ENV и деплой

- `.env.local` / `.env.example`:
  - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, URL’ы sign-in/sign-up.
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
  - App: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` (креативы — history, parse-product, fetch-image, generate; webhook).
  - Creatives: `NEXT_PUBLIC_CREATIVES_LOGO_FIELD` (опционально) — имя multipart-поля для логотипа в `POST ${API_URL}/creatives/generate`. Если не задано — логотип не отправляется (чтобы избежать ошибок `Unexpected field`).
  - Meta Ads: `META_ACCESS_TOKEN` — единый токен доступа к Meta Marketing API.
  - Cron: `CRON_SECRET` — секрет для авторизации вызова `/api/meta/sync-all` (если не Vercel Cron).
- `vercel.json`:
  - `crons`: `{ "path": "/api/meta/sync-all", "schedule": "0 6 * * *" }` — ежедневная синхронизация инсайтов в 06:00.
- Деплой предполагается на Vercel:
  - проект `leadleap-app`, preset — Next.js;
  - env‑переменные с Vercel синхронизируются с `.env.example` (значения заполняются вручную).

