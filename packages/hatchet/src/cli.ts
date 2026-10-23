import { parseArgs } from "node:util";
import { runAutoRespond } from "./auto-respond";

const USAGE = `
Локальный запуск авто-отклика Kwork (без Hatchet).

Использование:
  bun run auto-respond [--dry-run] [--max N] [--min-price N]

Флаги:
  --dry-run      проанализировать и показать отклики, но не отправлять и не писать в БД
  --max N        максимум откликов за запуск (по умолчанию MAX_OFFERS_PER_RUN)
  --min-price N  минимальный бюджет проекта в рублях (по умолчанию MIN_PROJECT_PRICE или 10000)
  -h, --help     показать эту справку
`.trim();

function parsePositiveInt(flag: string, raw: string | undefined) {
  if (raw === undefined) return undefined;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value < 0) {
    throw new Error(`${flag} должен быть неотрицательным целым числом`);
  }
  return value;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      max: { type: "string" },
      "min-price": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  await runAutoRespond({
    dryRun: values["dry-run"],
    maxOffers: parsePositiveInt("--max", values.max),
    minPrice: parsePositiveInt("--min-price", values["min-price"]),
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) console.error("Причина:", err.cause);
  process.exit(1);
});
