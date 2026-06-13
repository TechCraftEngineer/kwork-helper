"use client";

import type { GenerationOptions, TaskBrief } from "@repo/types";
import { useState } from "react";

interface TaskFormProps {
  onSubmit: (task: TaskBrief, options: GenerationOptions) => void;
  isLoading?: boolean;
}

export default function TaskForm({ onSubmit, isLoading }: TaskFormProps) {
  const [task, setTask] = useState<Partial<TaskBrief>>({
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.description) {
      onSubmit(task as TaskBrief, {
        maxWords: 200,
        includeQuestions: true,
        includeTimeline: true,
        mentionExperience: true,
        creativity: 0.6,
      });
    }
  };

  const updateField = <K extends keyof TaskBrief>(
    key: K,
    value: TaskBrief[K],
  ) => {
    setTask((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Техническое задание
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Вставьте описание заказа с Kwork
      </p>

      <div>
        <label
          htmlFor="taskDesc"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Описание задания
        </label>
        <textarea
          id="taskDesc"
          value={task.description}
          onChange={(e) => updateField("description", e.target.value)}
          placeholder="Полное описание ТЗ заказчика — чем подробнее, тем лучше отклик"
          rows={6}
          required
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Генерация..." : "Сгенерировать отклик"}
      </button>
    </form>
  );
}
