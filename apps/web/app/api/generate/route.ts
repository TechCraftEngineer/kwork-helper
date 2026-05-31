import { NextRequest, NextResponse } from "next/server";
import { generateProposal } from "@repo/ai-service";
import type {
  GenerateProposalRequest,
  GenerateProposalResponse,
  ApiError,
} from "@repo/types";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<GenerateProposalResponse | ApiError>> {
  try {
    console.log("API: Starting generation request");
    
    const body: GenerateProposalRequest = await request.json();
    console.log("API: Request body parsed", { profile: !!body.profile, task: !!body.task });

    if (!body.profile || !body.task) {
      return NextResponse.json(
        { error: "Необходимо указать profile и task" },
        { status: 400 },
      );
    }

    if (!body.profile.name || !body.profile.specialization) {
      return NextResponse.json(
        { error: "Профиль должен содержать имя и специализацию" },
        { status: 400 },
      );
    }

    if (!body.task.description) {
      return NextResponse.json(
        { error: "ТЗ должно содержать описание" },
        { status: 400 },
      );
    }

    const options = body.options ?? {};

    console.log("API: Starting generation");
    
    // Увеличиваем таймаут для долгих запросов
    const result = await Promise.race([
      generateProposal(body.profile, body.task, options) as Promise<GenerateProposalResponse>,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Таймаут генерации (5 минут)")), 300000)
      )
    ]);

    console.log("API: Generation completed successfully");
    console.log("API: Result data:", { 
      hasText: !!result.text, 
      textLength: result.text?.length,
      hasAlternatives: !!result.alternatives,
      alternativesCount: result.alternatives?.length,
      metadata: result.metadata 
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Ошибка генерации отклика:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Не удалось сгенерировать отклик";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
