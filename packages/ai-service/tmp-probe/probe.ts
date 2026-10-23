import { DEFAULT_PROFILE, type KworkProject } from "@repo/types";
import { analyzeAndGenerateOffer } from "../src/auto-offer";
import { generateProposal } from "../src/generator";

const project = {
  id: 1, status: "active", user_id: 1, username: "x", price: 30000,
  title: "Telegram-бот с GPT для ответов клиентам",
  description: "Нужен бот на Node.js: отвечает на вопросы клиентов по базе знаний через OpenAI, хранит историю в PostgreSQL, есть админка для правки базы знаний.",
  offers: 3, time_left: 0, parent_category_id: 11, category_id: 41, category_base_price: 500,
  allow_higher_price: false, possible_price_limit: 30000, has_offer: false, user_hired_percent: 50,
} satisfies KworkProject;

const t = Date.now();
const a = await analyzeAndGenerateOffer(DEFAULT_PROFILE, project);
console.log(process.env.OPENAI_MODELS, "analysis", Date.now() - t, "ms:", JSON.stringify({ ...a, proposalText: a.proposalText.slice(0, 120) + "…" }));
const p = await generateProposal(DEFAULT_PROFILE, { description: project.description });
console.log(process.env.OPENAI_MODELS, "text proposal starts:", JSON.stringify(p.text.slice(0, 100)));
