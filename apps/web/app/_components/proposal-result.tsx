"use client";

import type { GeneratedProposal } from "@repo/types";
import { useState } from "react";

interface ProposalResultProps {
  result: GeneratedProposal | null;
  isLoading: boolean;
  error: string | null;
}

export default function ProposalResult({
  result,
  isLoading,
  error,
}: ProposalResultProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [copied, setCopied] = useState(false);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-4">
          Ошибка
        </h3>
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border rounded-xl p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="mb-2">Генерация отклика...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Подбираю оптимальную формулировку
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 border rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Отклик появится здесь
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Заполните профиль и ТЗ, затем нажмите «Сгенерировать»
        </p>
      </div>
    );
  }

  const allTexts = [result.text ?? "", ...(result.alternatives ?? [])];
  const currentText = allTexts[selectedVariant] ?? "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = currentText.split(/\s+/).length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Сгенерированный отклик
        </h3>
        <div className="flex items-baseline gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {wordCount} слов
          </span>
          {result.metadata && (
            <span className="text-gray-600 dark:text-gray-400">
              {result.metadata.promptTokens + result.metadata.completionTokens}
              токенов
            </span>
          )}
        </div>
      </div>

      {allTexts.length > 1 && (
        <div className="mt-4 space-x-2 overflow-x-auto">
          {allTexts.map((text, idx) => (
            <button
              key={text}
              type="button"
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedVariant === idx
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
              onClick={() => setSelectedVariant(idx)}
            >
              Вариант {idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed">
          {currentText}
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleCopy}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            copied
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          {copied ? "Скопировано!" : "Копировать"}
        </button>
      </div>
    </div>
  );
}
