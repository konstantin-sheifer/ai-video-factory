# Creative Producer → video: отчёт реализации

Основа: `cb485bb293496916e8902dc6483bc82f3864074d`. Дата проверки: 2026-09-11.

## Результат и границы

`POST /api/script` строит план на сервере, оценивает обязательные gates и сохраняет неизменяемый snapshot до ответа браузеру. `POST /api/video` принимает только `{packageId, version}`, загружает собственный snapshot пользователя, повторно проверяет контракт и атомарно резервирует единственный вызов существующего video-адаптера. Loading и Studio используют общий клиент этих двух маршрутов.

Схема Prisma не менялась. Существующих полей `Generation` достаточно: `id`, `userId`, `productionPackageJson`, `promptVersionJson`, `qualitySummaryJson`, `architectureVersion`, `schemaVersion`, `version`, `status`. Неизменяемость обеспечена выделенным repository и запретом generic `GenerationRepository.updateOwned` менять строки `production-package-v1`; это гарантия текущего приложения, не запрет административного SQL на уровне БД.

Snapshot хранит исходную идею, production idea, hook/core event/escalation/payoff, происхождение mock/live, полный план как evidence, точный prompt для провайдера, модель/формат, duration contract и все результаты gate. SHA-256 нормализованного JSON обнаруживает изменение snapshot; порядок ключей JSONB не влияет на digest. Хеш не является подписью против администратора БД.

Версия snapshot — `1`, версия контракта — `2026-09-11.1`. Каждая новая подготовка создаёт новый ID, существующий snapshot не редактируется. `Generation.version` отдельно увеличивается при резервировании и фиксации результата. API редактирования/цепочки творческих ревизий этот этап не добавляет. Ссылка на уже использованный snapshot отклоняется, включая неоднозначный сбой после отправки.

## Доказательство восьми критериев

| № | Реализация | Проверяемое доказательство |
|---|---|---|
| 1 | `lib/production/contract.ts`, `lib/services/production-package-service.ts`, `lib/repositories/production-package-repository.ts`: серверный snapshot с owner, ID, версиями, замыслом, данными адаптера, duration, gate и evidence. Сохранение предшествует ответу. | `contract.test.ts`: approved immutable snapshot; проверка owner/version/intent, записи до ответа, точного prompt, неизменности JSON после video. Проверены ошибка сохранения, digest и перестановка ключей JSON. |
| 2 | `quality-controller.ts`: среднее оценок 0–10 переводится в шкалу 0–100. 75+ без критических исправлений допускает GOOD_ENOUGH; 90+ — PRODUCTION_READY. Любое критическое исправление блокирует. Producer, его checks, brief, emotion, quality, provenance, duration и budget обязательны. Ошибка live Producer больше не становится fallback-одобрением. | `planning.test.ts`: шкала, блокировка даже при высоком среднем, malformed/failed live response. `contract.test.ts`: отказы всех gates, score 74, pending/пустые checks, ошибки auth/JSON/planning/store/claim — ноль вызовов адаптера. |
| 3 | `keyframe-director.ts` сохраняет поля StoryboardFrame, cameraDirection/composition/timeRange и общую duration. `camera-planner.ts` читает именно `keyFrames`, проверяет непрерывность диапазонов и полноту duration; fallback-кадры удалены. | `planning.test.ts`: реальные кадры для 10/30/60 секунд, уникальные cameraDirection/composition доходят до shots, совпадают все диапазоны времени; пустые и некорректные keyframes отклоняются. |
| 4 | `/api/video` использует строгую схему только ID+version. Prompt, brief и добавочные поля не принимаются. Провайдер получает исключительно сохранённый promptText. | `contract.test.ts`: пять вариантов обхода возвращают 400, вызовов ноль; разрешённый запрос передаёт точный сохранённый текст. |
| 5 | `lib/production/client.ts` общий для Loading и Studio. В страницах удалены обе самостоятельные сборки video prompt/brief. В legacy-журнал записывается сериализованная ссылка на пакет. | `client-studio.test.ts`: исполняются настоящие generatePipeline обеих страниц; отказ останавливает путь на script, успех передаёт только полученный ID/version через тот же HTTP service и достигает прежнего сохранения проекта с подменёнными downstream-адаптерами. |
| 6 | Owner-scoped lookup; схема/contractVersion/digest; проверка версии, состояния и duration; проверка текущей конфигурации провайдера. Atomic conditional update до вызова адаптера. | `contract.test.ts`: чужой/несуществующий пакет, неверная версия, устаревшая схема/контракт, повреждение, consumed/cancelled/failed/completed, provider drift и mock→live блокируются. Восемь параллельных запросов дают один вызов адаптера. `planning.test.ts`: 30 секунд сохраняются как 30 и отклоняются как несовместимые. |
| 7 | JSX, CSS, Download, обработчики preview, voice/music и subtitle toggle не изменялись. Меняется только получение video через утверждённый пакет и текст существующего сообщения ошибки. | `client-studio.test.ts`: все JSX-деревья обеих страниц побайтно равны базе `cb485bb`; настоящий Download не вызывает setters preview; после Download проверены voice off/on с синхронизацией времени, music off/on/volume и subtitles off/on. |
| 8 | Добавлены 39 контрактных и поведенческих тестов, npm script и запуск в CI. | Весь локальный набор: 87/87, включая 48 прежних тестов. Внешние модели, video, voice, render и хранилище заменены тестовыми зависимостями. Платных генераций не было. |

## Предсказуемые ответы API

| Ситуация | HTTP / code |
|---|---|
| Нет сессии | 401 / `UNAUTHENTICATED` |
| Невалидный JSON / произвольный prompt вместо ссылки | 400 / `INVALID_JSON` или `INVALID_PACKAGE_REFERENCE` |
| Чужой или отсутствующий пакет | 404 / `PACKAGE_NOT_FOUND` без раскрытия чужого owner |
| Неверная версия ссылки/схемы | 409 / `PACKAGE_VERSION_STALE` |
| Повреждённый snapshot или устаревший contractVersion | 409 / `PACKAGE_INVALID` |
| Уже использованное или неподходящее lifecycle-состояние | 409 / `PACKAGE_CONSUMED` |
| Изменился provider/model или live несовместим с provenance | 409 / `PROVIDER_INCOMPATIBLE` |
| Несовместимая длительность | 422 / `DURATION_INCOMPATIBLE` |
| Gate не утвердил пакет | 422 / `PACKAGE_NOT_APPROVED`; script возвращает gate reasons и `canGenerate: false` |
| Ошибка подготовки/хранилища | 500 / `PRODUCTION_FAILED`, генерация заблокирована |
| Ошибка/неопределённый результат video | 502 / `VIDEO_SUBMISSION_FAILED`, повторная отправка пакета запрещена |

## Проверки и пределы доказательства

- `node --conditions=react-server --import tsx --test tests/production/*.test.ts tests/queue/*.test.ts tests/deployment/*.test.ts tests/health/*.test.ts tests/studio/*.test.ts tests/channels/*.test.ts`: **87 passed, 0 failed**.
- `npm run test:production`: новый целевой набор; **39 тестов** включены в общий успешный запуск.
- `tsc --noEmit --incremental false`: **успешно**.
- ESLint новых и изменённых серверных модулей, API routes и production tests: **успешно**.
- Полный ESLint: **6 ошибок и 7 предупреждений**, существовавших в базе; оставлены вне scope. Диагностики изменённых Loading/Studio сверены с исходным текстом из `git show cb485bb`.
- `npm run build`: **успешно**, с локальными CI-placeholder параметрами Clerk/DB, без доступа к пользовательской БД.
- `node scripts/validate-render-manifest.mjs` и `git diff --check`: **успешно**.
- Среда локальной проверки — Node 24.19.0; репозиторий/CI требуют Node 20.x. Новый набор добавлен в CI, успешный удалённый запуск здесь не заявляется.
- Конкуренция проверена с in-memory store; отдельно проверена форма единственного Prisma `updateMany` с owner/version/status/snapshot в условии. Тест с реальным PostgreSQL не запускался.
- Studio проверен исполнением настоящих извлечённых обработчиков с тестовым окружением и сравнением JSX. Полный браузерный E2E с реальным media playback не запускался.
- Один вызов означает вызов существующего video-адаптера на уровне приложения. Внутренние retries SDK и гарантии биллинга провайдера не менялись и не проверялись.

## Важные ограничения продукта

1. Существующий video-адаптер фактически делает один клип 10 секунд. Пакеты на 30/60 секунд теперь честно блокируются до video; генерация нескольких клипов не добавлялась.
2. Убрано молчаливое жёсткое обрезание adapter prompt. Полный реальный mock-план про уборщика и манекены превышает сохранённый бюджет 2500 символов и **отклоняется**. Happy-path тесты контракта используют явно компактную синтетическую provider-ready fixture. Это доказательство правильности допуска, а не доказательство, что текущие творческие планы уже стабильно помещаются в бюджет. Оптимизация prompt не выполнялась.
3. Явный `AI_BRAIN_LIVE=false` остаётся mock-режимом с маркированным provenance. Отсутствие ключа в live-режиме — ошибка; live-сбой больше не разрешает скрытый fallback. Mock-план не допускается к Runway.
4. Quality Controller остаётся существующим эвристическим контролем плана. Он не оценивает реальные сгенерированные кадры и не гарантирует художественное качество publishable video.
5. `negativePrompt` сохранён в evidence/provider metadata, но помечен `negativePromptSubmitted: false`: существующий video-адаптер его не отправляет. Не выдаём это поле за реально применённый параметр.
6. Существующее браузерное продолжение voice/transcription/render/project persistence сохранено. Оно не стало серверной оркестрацией; legacy-журнал после генерации — отдельная строка со ссылкой на авторитетный пакет. После video пакет имеет статус `processing`, а не ложный `completed` всего фильма.
7. Очередь/BullMQ, voice/render, media storage, публикация и интерфейс вне этого изменения. Старые ограничения этих частей не исправлялись и не замаскированы.

## Полный список изменённых файлов

Изменены:

1. `.github/workflows/ci.yml`
2. `package.json`
3. `app/api/script/route.ts`
4. `app/api/video/route.ts`
5. `app/loading/page.tsx`
6. `app/studio/page.tsx`
7. `lib/ai-brain/creative-producer.ts`
8. `lib/ai-brain/providers/runway-adapter.ts`
9. `lib/ai-brain/quality-control/quality-controller.ts`
10. `lib/ai-brain/visual-development/camera-planner.ts`
11. `lib/ai-brain/visual-development/keyframe-director.ts`
12. `lib/repositories/generation-repository.ts`

Добавлены:

13. `lib/ai-brain/production-plan.ts`
14. `lib/http/production-package-handlers.ts`
15. `lib/production/contract.ts`
16. `lib/production/client.ts`
17. `lib/repositories/production-package-repository.ts`
18. `lib/services/production-package-service.ts`
19. `tests/production/fixtures.ts`
20. `tests/production/contract.test.ts`
21. `tests/production/planning.test.ts`
22. `tests/production/ui-harness.ts`
23. `tests/production/client-studio.test.ts`
24. `docs/implementation/CREATIVE_PRODUCER_VIDEO_CONTRACT.md`
