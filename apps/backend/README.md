# DropDate Backend

Просто мінімальний Go HTTP сервер, щоб перевірити, що ми можемо відповідати на GET-запити і віддавати `200`.

## Як запустити

```bash
cd apps/backend
GO111MODULE=on go run ./cmd/api
```

Очікуємо побачити в логах `DropDate API listening on :8080`. Потім можна:

- `curl http://localhost:8080/health` — швидкий пінг, повертає `{"status":"ok"}`.
- `curl "http://localhost:8080/next-release?title=Dune:%20Part%20Two"` — демо-запит про майбутній реліз фільму/серіалу.

## Автоперезапуск через Air

1. Один раз встанови тул: `go install github.com/air-verse/air@latest` (проєкт переїхав з `cosmtrek`).
2. Додай його в PATH (наприклад, у `.zshrc`):
   ```bash
   export PATH="$HOME/go/bin:$PATH"
   ```
3. Запускай із `apps/backend`: просто `air`. Він читатиме `.air.toml`, збиратиме бінарник у `.air/` і перезапускатиме сервер при зміні `.go`.

## Swagger UI

- `http://localhost:8080/swagger/` — вбудована сторінка Swagger UI (тягне CSS/JS з CDN).
- Спека розташована у `docs/swagger/openapi.yaml`. Редагуй її, коли додаєш або змінюєш ендпоінти.

## Що всередині

- `cmd/api/main.go` — точка входу. Там створюється `http.Server`, піднімається `ServeMux` і реєструється хендлер `/health`.
- `healthHandler` перевіряє, що це `GET`, і віддає маленький JSON `{"status": "ok"}`. Це гарантує статус `200` за замовчуванням.
- `nextReleaseHandler` читає query-параметр `title`, дергає моковий сервіс релізів і повертає інформацію у вигляді JSON.
- Структура `application` вже тримає моковий `release.Service`, але повноцінні залежності додамо, коли підтягнемо реальні API.

Це база для наступних ітерацій: додамо кеш, звернення до TMDB/TVMaze, а поки маємо стабільне «живе» API.
