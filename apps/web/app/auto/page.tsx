"use client";

import { useState } from "react";
import type { AutoRespondSettings, AutoRespondResult } from "@repo/types";

const DEFAULT_SETTINGS: AutoRespondSettings = {
  kworkLogin: "",
  kworkPassword: "",
  priceFrom: undefined,
  priceTo: undefined,
  dryRun: true,
};

export default function AutoRespondPage() {
  const [settings, setSettings] = useState<AutoRespondSettings>(DEFAULT_SETTINGS);
  const [results, setResults] = useState<AutoRespondResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof AutoRespondSettings>(
    key: K,
    value: AutoRespondSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auto-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Ошибка запроса");
      }

      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const matchCount = results?.filter((r) => r.analysis.isMatch).length ?? 0;
  const sentCount = results?.filter((r) => r.sent).length ?? 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Kwork Auto-Respond
              </h1>
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
                Автоматический анализ и отклик на проекты
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ← Ручной режим
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Настройки
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="login"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Логин Kwork <span className="text-gray-400">(опционально)</span>
                </label>
                <input
                  id="login"
                  type="text"
                  value={settings.kworkLogin}
                  onChange={(e) => updateField("kworkLogin", e.target.value)}
                  placeholder="Ваш логин или email"
                  autoComplete="username"
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Можно указать в переменной окружения KWORK_LOGIN
                </p>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Пароль Kwork <span className="text-gray-400">(опционально)</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={settings.kworkPassword}
                  onChange={(e) => updateField("kworkPassword", e.target.value)}
                  placeholder="Ваш пароль"
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Можно указать в переменной окружения KWORK_PASSWORD
                </p>
              </div>
            </div>



            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="priceFrom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Бюджет проекта от (руб.)
                </label>
                <input
                  id="priceFrom"
                  type="number"
                  min={0}
                  value={settings.priceFrom ?? ""}
                  onChange={(e) =>
                    updateField(
                      "priceFrom",
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  placeholder="Не ограничено"
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="priceTo"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Бюджет проекта до (руб.)
                </label>
                <input
                  id="priceTo"
                  type="number"
                  min={0}
                  value={settings.priceTo ?? ""}
                  onChange={(e) =>
                    updateField(
                      "priceTo",
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  placeholder="Не ограничено"
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Примечание:</span> Всегда используется категория с ID 11 (разработка и IT)
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <input
                id="dryRun"
                type="checkbox"
                checked={settings.dryRun}
                onChange={(e) => updateField("dryRun", e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label
                htmlFor="dryRun"
                className="text-sm font-medium text-amber-800 dark:text-amber-200"
              >
                Тестовый режим (dry run) — анализировать, но не отправлять отклики
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading
                ? "Анализирую проекты..."
                : settings.dryRun
                  ? "Проанализировать (без отправки)"
                  : "Запустить автоответ"}
            </button>
          </form>
        </section>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">
              Загружаю проекты и анализирую с помощью AI...
            </p>
          </div>
        )}

        {results && (
          <section className="space-y-4">
            <div className="flex items-center gap-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {results.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Проектов
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {matchCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Подходящих
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {sentCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Отправлено
                </div>
              </div>
            </div>

            {results.map((result) => (
              <ProjectResultCard key={result.projectId} result={result} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function ProjectResultCard({ result }: { result: AutoRespondResult }) {
  const [expanded, setExpanded] = useState(false);
  const { analysis } = result;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow border ${
        analysis.isMatch
          ? "border-green-200 dark:border-green-700"
          : "border-gray-200 dark:border-gray-700"
      } p-6`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                analysis.isMatch
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {analysis.isMatch ? "✓ Подходит" : "✗ Не подходит"}
            </span>
            {result.sent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                Отправлено
              </span>
            )}
            {result.error && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Ошибка
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {result.projectTitle}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {analysis.reason}
          </p>
          {result.error && (
            <p className="text-sm text-red-500 mt-1">{result.error}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Бюджет: {result.projectPrice.toLocaleString("ru")} ₽
          </div>
          {analysis.isMatch && (
            <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Моя цена: {analysis.suggestedPrice.toLocaleString("ru")} ₽
            </div>
          )}
        </div>
      </div>

      {analysis.isMatch && analysis.proposalText && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {expanded ? "Скрыть отклик" : "Показать отклик"}
          </button>
          {expanded && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {analysis.proposalText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
