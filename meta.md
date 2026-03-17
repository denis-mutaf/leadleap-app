# Meta Ads (Meta Marketing API) — полная документация

Этот документ описывает **всё**, что приложение делает с Meta (Meta Marketing API / Graph API): какие данные запрашиваем, как нормализуем/сохраняем в Supabase, какие API-роуты есть в Next.js, и как UI использует эти данные для метрик и графиков.

## 1) Источники данных и авторизация

- **Источник**: Meta Graph API `v21.0` (базовый URL: `https://graph.facebook.com/v21.0`).
- **Авторизация**: единый токен приложения из env:
  - `META_ACCESS_TOKEN` — используется всеми серверными роутами синхронизации.
- **Account ID**:
  - В UI/роутах может приходить `6170...` или `act_6170...`.
  - Нормализация делается функцией `normalizeAccountId(accountId)` в `src/lib/meta-api.ts` — гарантирует префикс `act_`.

## 2) Как именно мы запрашиваем инсайты у Meta

### 2.1 Базовый “инсайт” запрос

В `src/lib/meta-api.ts` строится URL для `/act_<AD_ACCOUNT_ID>/insights` со следующими параметрами:

- **fields**: набор полей (см. ниже).
- **level**: `'campaign' | 'adset' | 'ad'` (уровень агрегации).
- **time_increment**: `'1'` — дневная детализация.
- **time_range**: `{ since, until }` (если переданы `dateFrom` и `dateTo`).
- **limit**: `'500'`.
- **breakdowns**: опционально (для демографии/плейсментов/гео/часов/устройств).

### 2.2 Пагинация и backoff

`fetchAllPages()` в `src/lib/meta-api.ts`:

- Загружает страницы по `paging.next` до конца.
- Между страницами ставит паузу ~300ms.

`fetchWithBackoff()`:

- При `429` ретраит до 3 раз с экспоненциальной задержкой: 1s, 2s, 4s.

## 3) Какие поля мы запрашиваем у Meta (fields)

Ниже — **реальные наборы полей**, которые мы передаём в `fields=` при запросе `/insights`.

### 3.1 Campaign level (`INSIGHT_FIELDS`)

Используется в `fetchMetaInsights()`:

- `campaign_id`
- `campaign_name`
- `spend`
- `impressions`
- `clicks`
- `outbound_clicks` (**клики по ссылке / link clicks**; нужны для корректных CTR/CPC в некоторых кампаниях)
- `results`
- `cpm`
- `cpc`
- `ctr`
- `reach`
- `frequency`
- `actions`
- `action_values`
- `date_start`
- `account_currency`
- `video_p25_watched_actions`
- `video_p50_watched_actions`
- `video_p75_watched_actions`
- `video_p100_watched_actions`
- `video_thruplay_watched_actions`
- `purchase_roas`
- `quality_ranking`
- `engagement_rate_ranking`
- `conversion_rate_ranking`
- `cost_per_action_type`

### 3.2 Adset level (`ADSET_FIELDS`)

Используется в `fetchMetaAdsetInsights()`:

- `campaign_id`, `campaign_name`
- `adset_id`, `adset_name`
- `spend`, `impressions`, `clicks`, `outbound_clicks`
- `results`, `cpm`, `cpc`, `ctr`
- `reach`, `frequency`
- `actions`, `action_values`
- `date_start`, `account_currency`
- видео метрики (`video_p25...`, `video_p50...`, `video_p75...`, `video_p100...`, `video_thruplay...`)
- `purchase_roas`, `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`
- `cost_per_action_type`

### 3.3 Ad level (`AD_FIELDS`)

Используется в `fetchMetaAdInsights()`:

- `campaign_id`, `campaign_name`
- `adset_id`, `adset_name`
- `ad_id`, `ad_name`
- `spend`, `impressions`, `clicks`, `outbound_clicks`
- `results`, `cpm`, `cpc`, `ctr`
- `reach`, `frequency`
- `actions`, `action_values`
- `date_start`, `account_currency`
- видео метрики
- `purchase_roas`, `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`
- `cost_per_action_type`

### 3.4 Breakdowns (разрезы)

Помимо “основных” инсайтов, мы запрашиваем **разрезы** на уровне кампаний:

- **Demographics**: breakdowns `age,gender`
  - fields: `campaign_id,campaign_name,age,gender,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start`
- **Placement**: breakdowns `publisher_platform,platform_position`
  - fields: `campaign_id,campaign_name,publisher_platform,platform_position,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start`
- **Geo**: breakdowns `country,region`
  - fields: `campaign_id,campaign_name,country,region,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start`
- **Hourly**: breakdowns `hourly_stats_aggregated_by_advertiser_time_zone`
  - fields: `campaign_id,campaign_name,hourly_stats_aggregated_by_advertiser_time_zone,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start`
- **Device**: breakdowns `device_platform`
  - fields: `campaign_id,campaign_name,device_platform,spend,impressions,clicks,actions,cpm,cpc,ctr,date_start`

Примечание: в breakdown-таблицах сейчас сохраняются базовые метрики `clicks`, а не `outbound_clicks`.

## 4) Как Meta возвращает `outbound_clicks` и как мы это парсим

Meta возвращает `outbound_clicks` **не числом**, а массивом объектов (аналогично `actions`):

- пример: `[{"action_type": "outbound_click", "value": "123"}]`

В `src/app/api/meta/sync/route.ts` мы парсим так:

- берём `(row.outbound_clicks as Array<{action_type;value}>)?.[0]?.value`
- приводим к строке и `parseInt(..., 10)`
- fallback на `'0'`

Итог в БД: **целое число** `outbound_clicks` (по умолчанию `0`).

## 5) Что мы считаем “results” (лиды/конверсии)

В `src/lib/meta-api.ts` функция `extractResults(actions)` суммирует `value` только по action_type:

- `lead`
- `offsite_conversion`
- `onsite_conversion`
- `purchase`
- `complete_registration`

Это значение записывается как `results` в основные таблицы инсайтов и используется в UI как “Результаты” и “Цена за результат”.

## 6) Схема данных в Supabase (таблицы Meta)

Все таблицы привязаны к `project_id` и используют `supabaseAdmin` на сервере.

### 6.1 `meta_ad_accounts`

Назначение: список Meta-аккаунтов, привязанных к проекту.

Ключевые поля:

- `project_id`, `account_id`, `account_name`, `account_currency`, `is_active`, `created_at`
- уникальность: `(project_id, account_id)`

### 6.2 Основные инсайты: кампании / адсеты / объявления

#### `meta_campaign_insights`

Уникальность: `(project_id, account_id, campaign_id, date)`

Храним по дням:

- идентификаторы: `project_id`, `account_id`, `campaign_id`, `campaign_name`, `date`
- деньги/показы/клики:
  - `spend`
  - `impressions`
  - `clicks`
  - `outbound_clicks` (**добавлено для корректных CPC/CTR по кликам по ссылке**)
- результаты:
  - `results`
  - `cost_per_result` (рассчитываем на синке: `spend / results`, если `results > 0`)
- метрики Meta:
  - `cpm`, `cpc`, `ctr`, `reach`, `frequency`
- видео:
  - `video_p25_watched`, `video_p50_watched`, `video_p75_watched`, `video_p100_watched`, `video_thruplay`
- валюта/служебное:
  - `account_currency`, `fetched_at`
- качество/ROAS:
  - `purchase_roas`
  - `quality_ranking`, `engagement_rate_ranking`, `conversion_rate_ranking`
- json-дампы (для расширяемости/аудита):
  - `actions_json`, `action_values_json`, `cost_per_action_type_json`

#### `meta_adset_insights`

Уникальность: `(project_id, account_id, adset_name, campaign_name, date)`

По дням:

- идентификаторы: `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `date`
- метрики: `spend`, `impressions`, `clicks`, `outbound_clicks`, `results`, `cost_per_result`, `cpm`, `cpc`, `ctr`, `reach`, `frequency`
- прочее: видео, `purchase_roas`, ранкинги, json-поля, `account_currency`, `fetched_at`

#### `meta_ad_insights`

Уникальность: `(project_id, account_id, ad_id, date)`

По дням:

- идентификаторы: `campaign_id`, `campaign_name`, `adset_id`, `adset_name`, `ad_id`, `ad_name`, `date`
- метрики: `spend`, `impressions`, `clicks`, `outbound_clicks`, `results`, `cost_per_result`, `cpm`, `cpc`, `ctr`, `reach`, `frequency`
- прочее: видео, `purchase_roas`, ранкинги, json-поля, `account_currency`, `fetched_at`

### 6.3 Разрезы (breakdowns)

Таблицы:

- `meta_demographic_insights` (age, gender)
- `meta_placement_insights` (publisher_platform, platform_position)
- `meta_geo_insights` (country, region)
- `meta_hourly_insights` (hour)
- `meta_device_insights` (device_platform)

Общее:

- сохраняем: `spend`, `impressions`, `clicks`, `results`, `cpm`, `cpc`, `ctr`, `fetched_at`
- `results` вычисляем через `extractResults(actions)` из `row.actions`

## 7) Серверные API-роуты Next.js (App Router)

Все роуты Meta находятся в `src/app/api/meta/*`.

### 7.1 Аккаунты

- `GET /api/meta/accounts`
  - вход: `projectId`
  - выход: список активных аккаунтов из `meta_ad_accounts` (Supabase)

- `POST /api/meta/sync-accounts`
  - вход: `{ projectId }`
  - действие: запрашивает аккаунты у Meta (`/me/adaccounts`) и upsert’ит в `meta_ad_accounts`

### 7.2 Синхронизация инсайтов (главный pipeline)

- `POST /api/meta/sync`
  - вход: `{ projectId, accountId, dateFrom?, dateTo? }`
  - действие:
    - campaign insights → `meta_campaign_insights`
    - adset insights → `meta_adset_insights`
    - ad insights → `meta_ad_insights`
    - parallel breakdown sync:
      - demographics → `meta_demographic_insights`
      - placement → `meta_placement_insights`
      - geo → `meta_geo_insights`
      - hourly → `meta_hourly_insights`
      - device → `meta_device_insights`
  - результат: `{ success: true, rows_synced: number }`

Ключевые детали синка:

- Синк делает `.upsert(...)` с `onConflict`, чтобы:
  - обновлять данные за дату при повторном запуске;
  - не плодить дубли.
- `outbound_clicks` сохраняется **на campaign/adset/ad уровнях** и используется дальше в UI.

### 7.3 Cron синк по всем аккаунтам

- `POST /api/meta/sync-all`
  - выбирает активные `meta_ad_accounts`
  - для каждого вызывает `/api/meta/sync`
  - защита: `CRON_SECRET` или заголовок `x-vercel-cron`

### 7.4 Чтение данных (для UI)

Основные “read” роуты строятся поверх Supabase и возвращают данные в UI:

- `GET /api/meta/insights`
  - читает `meta_campaign_insights`
  - поддерживает фильтры: `projectId`, `accountId`, `dateFrom`, `dateTo`, `campaignId`
  - `groupBy=campaign` возвращает агрегат по кампаниям (средние метрики по дням + суммы)

- `GET /api/meta/adsets`
  - читает `meta_adset_insights` (с фильтрами и агрегированием)

- `GET /api/meta/ad-insights`
  - читает `meta_ad_insights` для конкретного adset/периода

- `GET /api/meta/demographics` / `placements` / `geo` / `hourly`
  - читают соответствующие breakdown-таблицы

- `GET /api/meta/preview`
  - запрос к Meta `/previews` для объявления, возвращает HTML превью

## 8) UI: как данные Meta используются в интерфейсе

В приложении есть два основных дашборда:

### 8.1 Generic Ads Dashboard (`src/components/dashboards/generic/index.tsx`)

- Период и аккаунт выбираются пользователем.
- KPI и графики строятся по `meta_campaign_insights`:
  - spend/impressions/clicks/results
  - CTR/CPC/CPM/Cost per result
- Кампании/адсеты/объявления раскрываются через страницы `/ads/campaigns/...` и read-роуты.

Примечание: Generic-дашборд ориентируется на стандартные поля `clicks`, `ctr`, `cpc` из таблицы (и/или агрегации), без специальных правил TopMag.

### 8.2 TopMag Dashboard (`src/components/dashboards/topmag/index.tsx`)

Особенности:

- `projectId` и `accountId` захардкожены константами.
- Кампании делятся на типы `messages/product/catalog` **по `campaign_id`**, не по имени.
  - маппинг задан в `TOPMAG_CAMPAIGN_IDS`.

Метрики (важно):

- `leads` для:
  - `messages`: action_type = `onsite_conversion.messaging_conversation_started_7d`
  - `product/catalog`: action_type = `lead`
- `linkClicks` = сумма `outbound_clicks`.
- Для расчёта CPC/CTR используется:
  - **messages**: “эффективные клики” = `clicks` (сообщения обычно не имеют outbound clicks)
  - **product/catalog**: “эффективные клики” = `outbound_clicks` (клики по ссылке)

Формулы в TopMag:

- `cpl = spend / leads` (если `leads > 0`)
- `cpc = spend / effectiveClicks` (если `effectiveClicks > 0`)
- `ctr = (effectiveClicks / impressions) * 100` (если `impressions > 0`)
- `cpm = (spend / impressions) * 1000` (если `impressions > 0`)

Графики:

- “Лиды по дням” и “Расход по дням” отображаются в две колонки (grid 2 columns).

## 9) Типы TypeScript (контракты данных)

Типы Meta лежат в `src/types/meta.ts`.

Ключевые инсайт-типы:

- `MetaCampaignInsight`, `MetaAdsetInsight`, `MetaAdInsight` содержат:
  - `clicks: number`
  - `outbound_clicks: number` (**добавлено для link clicks**)
  - прочие метрики (spend/impressions/results/...).

Эти типы используются на стороне UI/роутов для строгой типизации ответов и агрегированных таблиц.

## 10) “Почему так”: `clicks` vs `outbound_clicks`

- `clicks` — общий счётчик кликов (может включать клики не по ссылке, а по элементам объявления).
- `outbound_clicks` — клики по внешней ссылке (link clicks), которые **обычно** являются корректной базой для:
  - **CTR по клику на сайт**
  - **CPC по переходу**

В некоторых кампаниях (например, сообщения) outbound clicks могут быть пустыми/нулевыми, поэтому для них используем обычные `clicks`.

