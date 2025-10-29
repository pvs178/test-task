# WB Tariffs Sync

Минимальное приложение для регулярной синхронизации тарифов Wildberries в PostgreSQL и выгрузки в Google Таблицы. Запуск одной командой в Docker.

## Что делает
- Раз в час запрашивает тарифы WB (`/api/v1/tariffs/box`).
- Сохраняет в PostgreSQL по датам (в течение дня обновляет записи).
- Выгружает актуальные тарифы в указанные Google-таблицы (лист `stocks_coefs`) с сортировкой по коэффициенту.

## Быстрый старт
1) Скопируйте пример окружения и заполните значения:
```bash
cp example.env .env
```

Обязательные переменные в `.env`:
```env
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

WB_API_TOKEN=ваш_токен_wb_api

GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_IDS=spreadsheet_id_1,spreadsheet_id_2

# по умолчанию – каждый час
SYNC_CRON_SCHEDULE=0 * * * *
```

2) Дайте сервисному аккаунту доступ (Editor) к каждой таблице из `GOOGLE_SHEETS_IDS`.
   - ID таблицы берётся из URL вида: `https://docs.google.com/spreadsheets/d/<ID>/edit`.

3) Запустите:
```bash
docker compose up --build
```

## Проверка
- Логи приложения: `docker compose logs -f app`
- Должны появиться сообщения об успешной загрузке тарифов и обновлении таблиц.

## Технологии
Node.js, PostgreSQL, knex.js, Google Sheets API, node-cron, Docker.

## Замечания
- Типы описаны через JSDoc.
- Конфигурации без чувствительных данных находятся в репозитории; реальные значения задаются через `.env`.