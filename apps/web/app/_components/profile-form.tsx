"use client";

import { useState } from "react";
import type { UserProfile } from "@repo/types";

interface ProfileFormProps {
  onSubmit: (profile: UserProfile) => void;
  initialData?: Partial<UserProfile>;
}

const SPECIALIZATIONS = [
  "Frontend-разработка",
  "Backend-разработка",
  "Fullstack-разработка",
  "Fullstack & AI-разработка",
  "Мобильная разработка",
  "DevOps / Инфраструктура",
  "Дизайн UI/UX",
  "Data Science / ML",
  "QA / Тестирование",
  "Парсинг и автоматизация",
  "WordPress / CMS",
];

export default function ProfileForm({
  onSubmit,
  initialData,
}: ProfileFormProps) {
  const defaultProfile = {
    name: "Максим",
    specialization: "Fullstack & AI-разработка",
    experienceYears: 10,
    skills: [
      "Next.js", "React", "TypeScript", "Tailwind CSS", 
      "Node.js", "Bun.js", "tRPC", "Hono.js",
      "PostgreSQL", "ClickHouse", "Docker", "k3s",
      "ChatGPT", "LLM", "AI интеграция", "trigger.dev", "Inngest"
    ],
    portfolioDescription: "Создаю прибыльные и масштабируемые веб-приложения с интеграцией AI. Работаю с CRM, ERP, личными кабинетами и корпоративными решениями «под ключ». Развиваю стартапы от идеи до реализации.",
    communicationStyle: "confident" as const,
    pricingTier: "premium" as const,
    bio: "Опытный Fullstack & AI-разработчик с 10+ лет опыта. Интегрирую ChatGPT/LLM для автоматизации и аналитики, строю быстрые интерфейсы и надёжный backend. Настраиваю фоновые процессы, базы данных и оркестрацию. Что получаете: прозрачность разработки, соблюдение сроков, решения, ориентированные на прибыль и рост бизнеса.",
    timezone: "UTC+3 (Москва)",
    responseTime: "1-2 часа",
  };

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    ...defaultProfile,
    ...initialData,
  });

  const [skillsInput, setSkillsInput] = useState(
    defaultProfile.skills.join(", "),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.name && profile.specialization && profile.skills?.length) {
      onSubmit(profile as UserProfile);
    }
  };

  const updateField = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value);
    const skills = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField("skills", skills);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Ваш профиль
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Заполните один раз — потом можно сохранить и использовать повторно
      </p>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Имя
        </label>
        <input
          id="name"
          type="text"
          value={profile.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Как к вам обращаться"
          required
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="specialization"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Специализация
        </label>
        <select
          id="specialization"
          value={profile.specialization}
          onChange={(e) => updateField("specialization", e.target.value)}
          required
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Выберите...</option>
          {SPECIALIZATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="experience"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Опыт (лет)
        </label>
        <input
          id="experience"
          type="number"
          min={0}
          max={30}
          value={profile.experienceYears}
          onChange={(e) =>
            updateField("experienceYears", parseInt(e.target.value) || 0)
          }
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="skills"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Навыки и технологии
        </label>
        <input
          id="skills"
          type="text"
          value={skillsInput}
          onChange={(e) => handleSkillsChange(e.target.value)}
          placeholder="React, Node.js, PostgreSQL, Docker..."
          required
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Через запятую
        </p>
      </div>

      <div>
        <label
          htmlFor="portfolio"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Портфолио / Достижения
        </label>
        <textarea
          id="portfolio"
          value={profile.portfolioDescription}
          onChange={(e) => updateField("portfolioDescription", e.target.value)}
          placeholder="Краткое описание: что за проекты делали, какие результаты достигали"
          rows={3}
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          О себе
        </label>
        <textarea
          id="bio"
          value={profile.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          placeholder="Что важно знать заказчикам о вас"
          rows={3}
          className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="style"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Стиль общения
          </label>
          <select
            id="style"
            value={profile.communicationStyle}
            onChange={(e) =>
              updateField(
                "communicationStyle",
                e.target.value as UserProfile["communicationStyle"],
              )
            }
            className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="formal">Деловой</option>
            <option value="friendly">Дружелюбный</option>
            <option value="confident">Уверенный</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="pricing"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Ценовой сегмент
          </label>
          <select
            id="pricing"
            value={profile.pricingTier}
            onChange={(e) =>
              updateField(
                "pricingTier",
                e.target.value as UserProfile["pricingTier"],
              )
            }
            className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="budget">Бюджетный</option>
            <option value="mid">Средний</option>
            <option value="premium">Премиум</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Часовой пояс
          </label>
          <input
            id="timezone"
            type="text"
            value={profile.timezone}
            onChange={(e) => updateField("timezone", e.target.value)}
            placeholder="UTC+3 (Москва)"
            className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label
            htmlFor="responseTime"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Время отклика
          </label>
          <input
            id="responseTime"
            type="text"
            value={profile.responseTime}
            onChange={(e) => updateField("responseTime", e.target.value)}
            placeholder="1-2 часа"
            className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Сохранить профиль
      </button>
    </form>
  );
}
