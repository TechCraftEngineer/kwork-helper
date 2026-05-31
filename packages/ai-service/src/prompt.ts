import type { GenerationOptions, TaskBrief, UserProfile } from "@repo/types";

const STYLE_MAP: Record<UserProfile["communicationStyle"], string> = {
  formal:
    "Используй деловой, профессиональный тон. Обращайся на «Вы». Избегай разговорных выражений и эмодзи.",
  friendly:
    "Используй дружелюбный, но профессиональный тон. Допустимо лёгкое неформальное общение. Обращайся на «ты».",
  confident:
    "Используй уверенный, экспериментальный тон. Подчёркивай свой опыт и компетентность. Говори кратко и по делу.",
};

const PRICING_MAP: Record<UserProfile["pricingTier"], string> = {
  budget:
    "Упомяни, что работаешь по доступным ставкам и готов обсуждать бюджет.",
  mid: "Упомяни, что предлагаешь соотношение цены и качества.",
  premium:
    "Упомяни, что работаешь с премиальными проектами и качественный результат требует соответствующих вложений.",
};

function buildStyleInstruction(profile: UserProfile): string {
  const parts: string[] = [];

  parts.push(STYLE_MAP[profile.communicationStyle]);
  parts.push(PRICING_MAP[profile.pricingTier]);

  if (profile.timezone) {
    parts.push(`Часовой пояс: ${profile.timezone}.`);
  }

  if (profile.responseTime) {
    parts.push(`Время отклика: ${profile.responseTime}.`);
  }

  return parts.join("\n");
}

function buildProfileSection(profile: UserProfile): string {
  const skills = profile.skills.join(", ");

  return `
ПРОФИЛЬ ИСПОЛНИТЕЛЯ:
- Имя: ${profile.name}
- Специализация: ${profile.specialization}
- Опыт: ${profile.experienceYears} ${pluralizeYears(profile.experienceYears)}
- Навыки: ${skills}
- Портфолио: ${profile.portfolioDescription}
- О себе: ${profile.bio}
`.trim();
}

function buildTaskSection(task: TaskBrief): string {
  const parts = [`ТЕХНИЧЕСКОЕ ЗАДАНИЕ:`, `- Описание: ${task.description}`];

  if (task.budget) parts.push(`- Бюджет: ${task.budget}`);
  if (task.deadline) parts.push(`- Сроки: ${task.deadline}`);
  if (task.requiredSkills?.length) {
    parts.push(`- Требуемые навыки: ${task.requiredSkills.join(", ")}`);
  }
  if (task.clientName) parts.push(`- Заказчик: ${task.clientName}`);

  return parts.join("\n");
}

function buildOptionsInstruction(options: GenerationOptions): string {
  const rules: string[] = [];

  if (options.maxWords) {
    rules.push(`Развернутый ответ, не более ${options.maxWords} слов.`);
  }

  if (options.includeQuestions) {
    rules.push(
      "Вместо вопросов опиши потенциальные риски и как ты решишь их с помощью AI.",
    );
  }

  if (options.includeTimeline) {
    rules.push(
      "Детально опиши этапы выполнения с использованием AI-инструментов и сроки каждого этапа.",
    );
  }

  if (options.mentionExperience) {
    rules.push(
      "Подробно расскажи о 2-3 похожих проектах, где ты использовал AI для автоматизации и получил конкретные результаты.",
    );
  }

  return rules.join("\n");
}

function pluralizeYears(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;

  if (lastTwo >= 11 && lastTwo <= 14) return "лет";
  if (last === 1) return "год";
  if (last >= 2 && last <= 4) return "года";
  return "лет";
}

export function buildSystemPrompt(): string {
  return `
Ты — опытный фрилансер, который активно использует AI и ботов для автоматизации работы. Напиши подробный и убедительный отклик на проект.

Начни с "Добрый день".

Структура отклика:
1. Как ты будешь решать задачу клиента с помощью AI-инструментов
2. Твой релевантный опыт (1-3 конкретных кейса с использованием AI)
3. План выполнения задания с акцентом на автоматизацию и ботов

Пиши развернуто и детально. Не задавай вопросов заказчику.
Покажи компетентность в AI и автоматизации.
Создавай уникальные отклики, не используй шаблонные фразы.
Пиши от первого лица, профессионально и уверенно.

ВАЖНО: Не используй markdown-разметку (нет жирного, курсива, кода, заголовков). Пиши простым текстом для textarea.
`.trim();
}

export function buildUserPrompt(
  profile: UserProfile,
  task: TaskBrief,
  options: GenerationOptions = {},
): string {
  const sections = [
    buildProfileSection(profile),
    "",
    buildTaskSection(task),
    "",
    "СТИЛЬ:",
    buildStyleInstruction(profile),
    "",
    "ТРЕБОВАНИЯ:",
    buildOptionsInstruction(options),
  ];

  return sections.join("\n");
}
