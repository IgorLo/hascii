# hascii

Локальная лаборатория цифрового арта: цветной ASCII, пикселизация, ограниченные палитры и дизеринг. SvelteKit + Svelte 5, TypeScript, Canvas и Web Worker. Интерфейс — [Svelte ASCII UI](https://github.com/IgorLo/svelte-ascii-ui), бордовая тема.

## Запуск

Нужен Node.js 24 (см. `.nvmrc`) и npm.

```sh
npm ci
npm run dev
```

Открыть http://127.0.0.1:4173. Если порт занят старым прототипом, сначала остановить его.

Сборка и локальный запуск production-версии:

```sh
npm run build
npm start
```

`npm start` по умолчанию слушает только `127.0.0.1:4173`. Переменные `HOST`, `PORT`, `ORIGIN` позволяют изменить адрес. Исходники: [IgorLo/hascii](https://github.com/IgorLo/hascii).

## Vercel

Импортировать `IgorLo/hascii` в Vercel: framework SvelteKit, корень репозитория, Node.js 24.x, команда сборки `npm run build`, Output Directory — автоматически. Секреты и база данных не нужны.

При системной переменной `VERCEL=1` сборка использует `@sveltejs/adapter-vercel` и создаёт `.vercel/output`: статические ресурсы и серверную функцию, в том числе для импорта Lospec. В настройках Vercel нужно оставить включённым **Automatically expose System Environment Variables**. Само подключение проекта и первый deploy выполняются в Vercel.

Без `VERCEL=1` используется `@sveltejs/adapter-node`: локальные `npm run dev`, `npm run build` и `npm start` работают как раньше. `npm start` запускает именно локальную Node-сборку, не `.vercel/output`. Изображения обрабатываются в браузере при обоих вариантах размещения.

## Возможности

- PNG/JPG/WebP, перетаскивание изображения, пример и четыре пресета.
- Коррекция тона, рабочее разрешение без увеличения исходника, пикселизация.
- Встроенные палитры и импорт Lospec по имени или ссылке; сохранение в браузере.
- Bayer, Floyd–Steinberg, Atkinson; регулировка силы дизеринга.
- ASCII по яркости или форме, шрифты, интервалы и собственные Unicode-наборы.
- Заливка ровных областей без символов; отдельные прозрачности символов и фона.
- Три расположения превью и экспорт PNG.

Изображения не отправляются на сервер. Серверный маршрут обращается только к Lospec за палитрами. Старые сохранения GLYPH/LAB не мигрируют. Размытие и сглаживание текста могут давать промежуточные цвета даже при включённой палитре.

## Проверки

```sh
npm run format
npm run lint
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm run verify
```

E2E собирает и запускает Node-версию на отдельном порту 4174, проверяет Chromium desktop и mobile. Husky запускает lint-staged перед коммитом, commitlint проверяет Conventional Commits. GitHub Actions запускает verify после подключения удалённого репозитория.

## Структура

- `src/routes` — тонкие SvelteKit маршруты и Lospec API.
- `src/pages/playground` — элементы редактора, композиция страницы и браузерное состояние.
- `src/shared/lib/renderer` — независимая математика и Worker.
- `src/shared/lib/palettes` — встроенные палитры и проверка данных.
- `src/app/styles` — тема и базовые стили приложения.

Первый коммит `ad0984c` содержит рабочий прототип GLYPH/LAB с исходными ресурсами. Материалы блога, ZIP, временные файлы и зависимости не входят в Git.

## Лицензия

[MIT](LICENSE) · Copyright (c) 2026 IgorLo. Зависимости распространяются по собственным лицензиям.
