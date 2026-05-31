"use client";

import TaskForm from "./_components/task-form";
import ProposalResult from "./_components/proposal-result";
import { useState } from "react";
import type {
  TaskBrief,
  GenerationOptions,
  GeneratedProposal,
} from "@repo/types";

// Предзаполненный профиль Максима
const DEFAULT_PROFILE = {
  name: "Максим",
  specialization: "Fullstack & AI-разработка",
  experienceYears: 10,
  skills: [
    "Next.js", "React", "TypeScript", "Tailwind CSS", 
    "Node.js", "Bun.js", "tRPC", "Hono.js",
    "PostgreSQL", "ClickHouse", "Docker", "k3s",
    "ChatGPT", "LLM", "AI интеграция", "trigger.dev", "Inngest"
  ],
  portfolioDescription: "Создаю прибыльные и масштабируемые веб-приложения с интеграцией AI. Работаю с CRM, ERP, личными кабинетами и корпоративными решениями «под ключ». Развиваю стартапы от идеи до реализации. Специализируюсь на автоматизации бизнес-процессов с помощью trigger.dev (фоновые задачи) и Inngest (системы событий).",
  communicationStyle: "confident" as const,
  pricingTier: "premium" as const,
  bio: "Опытный Fullstack & AI-разработчик с 10+ лет опыта. Интегрирую ChatGPT/LLM для автоматизации и аналитики, строю быстрые интерфейсы и надёжный backend. Настраиваю фоновые процессы, базы данных и оркестрацию. Использую trigger.dev для создания надежных фоновых задач с автоматическими повторами и Inngest для построения распределенных систем обработки событий. Что получаете: прозрачность разработки, соблюдение сроков, решения, ориентированные на прибыль и рост бизнеса.",
  timezone: "UTC+3 (Москва)",
  responseTime: "1-2 часа",
};

export default function Home() {
  const [result, setResult] = useState<GeneratedProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTaskSubmit = async (
    taskData: TaskBrief,
    opts: GenerationOptions,
  ) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile: DEFAULT_PROFILE,
          task: taskData,
          options: opts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка генерации");
      }

      const data = await response.json();
      console.log("Frontend: Received data:", { 
        hasText: !!data.text, 
        textLength: data.text?.length,
        hasAlternatives: !!data.alternatives,
        alternativesCount: data.alternatives?.length,
        metadata: data.metadata 
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Kwork Helper
              </h1>
              <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
                AI-генератор откликов для фрилансеров
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/auto"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Авто-режим →
              </a>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Готов к работе</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-300 max-w-3xl">
            Вставьте техническое задание и получите профессиональный отклик, который выделит вас среди других фрилансеров на Kwork
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 ml-3">
                Техническое задание
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Скопируйте описание заказа с Kwork и вставьте в поле ниже. AI проанализирует требования и создаст персонализированный отклик.
            </p>
            <TaskForm onSubmit={handleTaskSubmit} isLoading={isLoading} />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002 2V9a2 2 0 00-2-2h-1m-6 4l-2-2m2 2l-2-2m2 2l2-2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 ml-3">
                Результат
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Получите убедительный отклик, который выглядит как написанный профессионалом и повышает ваши шансы на получение заказа.
            </p>
            <ProposalResult
              result={result}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </section>
      </div>

      <footer className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              © {new Date().getFullYear()} Kwork Helper
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-right mt-2 sm:mt-0">
              Сгенерировано с помощью AI через OpenRouter
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
