export interface UserProfile {
  /** Имя фрилансера */
  name: string;
  /** Специализация: frontend, backend, fullstack, mobile, devops, etc. */
  specialization: string;
  /** Годы опыта */
  experienceYears: number;
  /** Ключевые навыки и технологии */
  skills: string[];
  /** Краткое описание портфолио / достижений */
  portfolioDescription: string;
  /** Желаемый стиль общения: formal, friendly, confident */
  communicationStyle: "formal" | "friendly" | "confident";
  /** Уровень ценовой политики: budget, mid, premium */
  pricingTier: "budget" | "mid" | "premium";
  /** Дополнительные заметки о себе */
  bio: string;
  /** Часовой пояс */
  timezone?: string;
  /** Среднее время отклика */
  responseTime?: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: "Максим",
  specialization: "Fullstack & AI-разработка",
  experienceYears: 10,
  skills: [
    "Next.js", "React", "TypeScript", "Tailwind CSS",
    "Node.js", "Bun.js", "tRPC", "Hono.js",
    "PostgreSQL", "ClickHouse", "Docker", "k3s",
    "ChatGPT", "LLM", "AI интеграция", "trigger.dev", "Inngest",
    "Vercel AI SDK", "Vercel",
  ],
  portfolioDescription:
    "Создаю прибыльные и масштабируемые веб-приложения с интеграцией AI. Работаю с CRM, ERP, личными кабинетами и корпоративными решениями «под ключ».",
  communicationStyle: "confident",
  pricingTier: "premium",
  bio: "Опытный Fullstack & AI-разработчик с 10+ лет опыта. Интегрирую ChatGPT/LLM для автоматизации и аналитики, строю быстрые интерфейсы и надёжный backend.",
  timezone: "UTC+3 (Москва)",
  responseTime: "1-2 часа",
};

export interface TaskBrief {
  /** Полное описание технического задания */
  description: string;
  /** Бюджет (если указан) */
  budget?: string;
  /** Сроки (если указаны) */
  deadline?: string;
  /** Требуемые навыки из ТЗ */
  requiredSkills?: string[];
  /** Имя заказчика (если известно) */
  clientName?: string;
}

export interface GenerationOptions {
  /** Максимальная длина ответа в словах */
  maxWords?: number;
  /** Включить конкретные вопросы по ТЗ */
  includeQuestions?: boolean;
  /** Включить примерные сроки */
  includeTimeline?: boolean;
  /** Упомянуть релевантный опыт */
  mentionExperience?: boolean;
  /** Степень уникальности текста (0-1) */
  creativity?: number;
}

export interface GeneratedProposal {
  /** Сгенерированный текст отклика */
  text: string;
  /** Варианты для выбора (при генерации нескольких) */
  alternatives?: string[];
  /** Метаданные генерации */
  metadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    generatedAt: string;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface GenerateProposalRequest {
  profile: UserProfile;
  task: TaskBrief;
  options?: GenerationOptions;
}

export interface GenerateProposalResponse extends GeneratedProposal {}

export interface KworkProject {
  id: number;
  status: string;
  user_id: number;
  username: string;
  price: number;
  title: string;
  description: string;
  offers: number;
  time_left: number;
  parent_category_id: number;
  category_id: number;
  category_base_price: number;
  allow_higher_price: boolean;
  possible_price_limit: number;
  has_offer: boolean;
  user_hired_percent: number;
}

export interface KworkApiResponse<T> {
  success: boolean;
  response: T;
  error?: string;
  error_code?: number;
  pages?: number;
  total?: number;
}

export interface AutoRespondSettings {
  dryRun: boolean;
  maxOffers?: number;
}

export interface ProjectAnalysis {
  isMatch: boolean;
  reason: string;
  suggestedPrice: number;
  proposalText: string;
}

export interface AutoRespondResult {
  projectId: number;
  projectTitle: string;
  projectPrice: number;
  analysis: ProjectAnalysis;
  sent: boolean;
  error?: string;
}
