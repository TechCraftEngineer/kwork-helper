"use client";

import { useState } from "react";
import type { AutoRespondSettings, AutoRespondResult } from "@repo/types";

const DEFAULT_SETTINGS: AutoRespondSettings = {
  dryRun: true,
  maxOffers: 5,
};

type ProcessingState = { projectId: number; projectTitle: string } | null;
type TotalState = { count: number; totalFetched?: number } | null;

export default function AutoRespondPage() {
  const [settings, setSettings] = useState<AutoRespondSettings>(DEFAULT_SETTINGS);
  const [results, setResults] = useState<AutoRespondResult[]>([]);
  const [totalState, setTotalState] = useState<TotalState>(null);
  const [processing, setProcessing] = useState<ProcessingState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
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
    setResults([]);
    setTotalState(null);
    setProcessing(null);
    setIsDone(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auto-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error ?? "Ошибка запроса");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventMatch = part.match(/^event: (\w+)\ndata: (.+)$/s);
          if (!eventMatch) continue;
          const [, event, rawData] = eventMatch;
          if (!rawData) continue;
          const data = JSON.parse(rawData);

          if (event === "total") {
            setTotalState({ count: data.count, totalFetched: data.totalFetched });
          } else if (event === "processing") {
            setProcessing({ projectId: data.projectId, projectTitle: data.projectTitle });
          } else if (event === "result") {
            setProcessing(null);
            setResults((prev) => [...prev, data as AutoRespondResult]);
          } else if (event === "done") {
            setIsDone(true);
            setProcessing(null);
          } else if (event === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  const matchCount = results.filter((r) => r.analysis.isMatch).length;
  const sentCount = results.filter((r) => r.sent).length;

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

            <div className="flex items-center gap-4">
              <label
                htmlFor="maxOffers"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                Максимум откликов за сессию
              </label>
              <input
                id="maxOffers"
                type="number"
                min={1}
                max={20}
                value={settings.maxOffers ?? 5}
                onChange={(e) => updateField("maxOffers", Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {!settings.dryRun && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Между откликами — случайная пауза 35–90 сек
                </p>
              )}
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

        {(isLoading || results.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalState !== null ? `${results.length} / ${totalState.count}` : results.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Обработано
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
              {totalState?.totalFetched !== undefined && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                    {totalState.totalFetched}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Найдено всего
                  </div>
                </div>
              )}
              {isDone && (
                <div className="ml-auto">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    ✓ Завершено
                  </span>
                </div>
              )}
            </div>

            {processing && (
              <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow border border-indigo-200 dark:border-indigo-700">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Анализирую...</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {processing.projectTitle}
                  </p>
                </div>
              </div>
            )}

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
