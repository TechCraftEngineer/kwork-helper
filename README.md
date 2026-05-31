# Kwork Helper

Turborepo монорепо для генерации убедительных откликов на фриланс-проекты с помощью AI.

## Архитектура

```
kwork-helper/
├── apps/
│   └── web/          # Next.js 16.2 App Router фронтенд + API
├── packages/
│   ├── ai-service/   # Основная логика генерации AI (OpenRouter + Vercel AI SDK)
│   ├── types/        # Общие TypeScript типы
│   ├── ui/           # Общие React компоненты
│   ├── typescript-config/
│   └── eslint-config/
```

## Ключевые технологии

- **Next.js 16.2** с App Router
- **Vercel AI SDK v6** (`ai` пакет) для `generateText` / `generateObject`
- **OpenRouter** через `@openrouter/ai-sdk-provider` — модель: `google/gemini-2.5-flash`
- **Turborepo** для управления монорепо
- **Bun** как пакетный менеджер (`bun@1.3.11`)
- **Tailwind CSS v4** для стилизации
- **TypeScript 6.0.2** с строгим режимом
- **Zod** для валидации схем

## Переменные окружения

Создайте `.env.local` в корне или в `apps/web/`:

```
OPENROUTER_API_KEY=sk-or-v1-...
KWORK_LOGIN=ваш_логин_или_email
KWORK_PASSWORD=ваш_пароль
```

Поля `KWORK_LOGIN` и `KWORK_PASSWORD` опциональны — их можно указать в интерфейсе, но рекомендуется использовать переменные окружения для безопасности.

## Команды

```bash
bun run dev          # Запустить все приложения в режиме разработки
bun run build        # Собрать все пакеты
bun run lint         # Проверить линтинг
bun run check-types  # Проверить типы
```

## Как работает генерация

1. Пользователь заполняет профиль (навыки, опыт, стиль) и описание задания
2. Фронтенд отправляет POST запрос на `/api/generate`
3. API route вызывает `generateProposal()` или `generateProposalVariants()` из `@repo/ai-service`
4. `ai-service` строит системный промпт (анти-детекция, естественный тон) + пользовательский промпт (профиль + задание)
5. Vercel AI SDK отправляет запрос в OpenRouter, возвращает текст или структурированный объект
6. Ответ возвращается на фронтенд для отображения и копирования

## Структура типов

- `UserProfile` — профиль фрилансера
- `TaskBrief` — краткое описание задания
- `GenerationOptions` — опции генерации
- `GeneratedProposal` — результат генерации с метаданными

## Особенности

- TypeScript строгий режим везде
- Server Components по умолчанию, `"use client"` только где необходимо
- API routes в `apps/web/app/api/` используя Next.js Route Handlers
- Общие типы в `packages/types/src/`
- Логика AI генерации в `packages/ai-service/src/`
