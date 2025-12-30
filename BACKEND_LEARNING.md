# Backend Learning Checklist (DropDate)

Це чекліст тем, які вже присутні в поточній кодовій базі, і тем, які знадобляться далі.  
Став галочки, щоб відмічати прогрес.

## 1) Теми, що вже є в коді (максимально детально)

### Go basics
- [ ] Типи даних: `string`, `int`, `bool`, `time.Time`, `[]T`, `map[K]V`
- [ ] Змінні/константи, пакетна структура, імпорти
- [ ] Функції, повернення значень, множинне повернення
- [ ] Умови, цикли, `switch`

### Структури, методи, інтерфейси
- [ ] `struct` і поля, композиція структур
- [ ] Методи з receiver (`func (s *Service) ...`)
- [ ] Інтерфейси як контракти (`ReleaseProvider`, `SuggestionProvider`)

### Обробка помилок
- [ ] `error`, `fmt.Errorf`, `errors.Is`
- [ ] Коли повертати помилку vs. логувати/повертати HTTP status

### HTTP в Go
- [ ] `net/http`, `ServeMux`
- [ ] `http.HandlerFunc`, `Request/Response`
- [ ] Статуси відповіді, headers, JSON-відповіді

### JSON
- [ ] `encoding/json` (Decode/Encode)
- [ ] Теги `json:"..."` в структурах

### Конфігурація
- [ ] ENV змінні (`os.Getenv`)
- [ ] `.env` завантаження (ручне)

### Логи
- [ ] `log.Printf`, базове логування подій/помилок

### Час і таймаути
- [ ] `time.Duration`, `time.Now()`, `time.ParseDuration`
- [ ] HTTP timeout, TTL, порівняння дат

### Контекст
- [ ] `context.Context`, передача в `DB`/HTTP операції
- [ ] Таймаути в `db.PingContext` / shutdown сервера

### База даних
- [ ] `database/sql` як абстракція
- [ ] `pgx` драйвер
- [ ] `sql.DB`, `QueryRowContext`, `ExecContext`
- [ ] Підключення через DSN

### SQL + міграції
- [ ] DDL: `create table`, `index`, `constraint`
- [ ] Тригери (`updated_at`)
- [ ] Міграції через `cmd/migrate` + `schema_migrations`

### Аутентифікація
- [ ] bcrypt (`golang.org/x/crypto/bcrypt`)
- [ ] JWT access token (`github.com/golang-jwt/jwt/v5`)
- [ ] refresh token (генерація, хешування, зберігання)
- [ ] access/refresh TTL
- [ ] httpOnly cookies, SameSite, Secure
- [ ] dual-mode refresh (cookie для web + body для mobile)

### Архітектура коду
- [ ] `cmd/api` як entrypoint
- [ ] `internal/*` як ізольовані пакети домену
- [ ] Service layer (`release.Service`, `auth.Service`)
- [ ] Data access layer (`UserStore`, `TokenStore`)

### Інтеграції
- [ ] HTTP клієнт до TMDB (retries/таймаути на клієнті)
- [ ] Кешування в памʼяті (в `release.Service`)


## 2) Теми, які знадобляться далі

### Безпека
- [ ] CSRF захист (для cookie-авторизації у web)
- [ ] Rate limiting / brute-force захист
- [ ] Password reset flow + email verification

### Middleware / Auth guards
- [ ] Middleware для перевірки access token
- [ ] Контекст користувача в handlers
- [ ] `/auth/me` endpoint

### Стабільність і масштабування
- [ ] Кешування з TTL (Redis)
- [ ] Background jobs / queues (наприклад, оновлення тайтлів)
- [ ] Ідемпотентність (idempotency keys)

### Observability
- [ ] Структурні логи (zap/zerolog)
- [ ] Метрики (Prometheus)
- [ ] Трасування (OpenTelemetry)

### Тести
- [ ] Unit tests (services)
- [ ] HTTP tests (handlers)
- [ ] Інтеграційні тести (DB)

### База даних (глибше)
- [ ] Індекси та аналіз запитів
- [ ] Транзакції, ізоляція, блокування
- [ ] Міграційні стратегії (up/down)

### Деплой
- [ ] CI/CD пайплайн
- [ ] Secrets management
- [ ] Health checks/rollbacks
