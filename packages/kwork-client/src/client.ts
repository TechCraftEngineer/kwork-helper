import type { KworkApiResponse, KworkProject } from "@repo/types";

const KWORK_BASE_URL = "https://api.kwork.ru";
const KWORK_STATIC_AUTH = "Basic bW9iaWxlX2FwaTpxRnZmUmw3dw==";

export class KworkClient {
  private userToken: string;

  constructor(userToken: string) {
    this.userToken = userToken;
  }

  static async signIn(login: string, password: string): Promise<KworkClient> {
    const url = new URL(`${KWORK_BASE_URL}/signIn`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: KWORK_STATIC_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ login, password }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Kwork signIn HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as KworkApiResponse<{
      token: string;
      expired: number;
    }>;

    if (!data.success || !data.response?.token) {
      throw new Error(data.error ?? "Не удалось получить токен авторизации");
    }

    return new KworkClient(data.response.token);
  }

  private async request<T>(
    path: string,
    queryParams: Record<string, string | number | undefined> = {},
    body?: Record<string, string>,
  ): Promise<KworkApiResponse<T>> {
    const url = new URL(`${KWORK_BASE_URL}${path}`);

    url.searchParams.set("token", this.userToken);

    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: KWORK_STATIC_AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body ? new URLSearchParams(body).toString() : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Kwork API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as KworkApiResponse<T>;

    if (!data.success) {
      throw new Error(data.error ?? "Kwork API вернул success=false");
    }

    return data;
  }

  async getProjects(
    params: { priceFrom?: number; priceTo?: number; page?: number } = {},
  ): Promise<KworkProject[]> {
    const result = await this.request<KworkProject[]>("/projects", {
      categories: "11", // Всегда используем категорию с id 11
      price_from: params.priceFrom,
      price_to: params.priceTo,
      page: params.page,
    });
    return result.response;
  }

  async getProject(id: number): Promise<KworkProject> {
    const result = await this.request<KworkProject>("/project", { id });
    return result.response;
  }

  async sendOffer(params: {
    userId: number;
    text: string;
    kworkId?: number;
  }): Promise<{ id: number }> {
    const queryParams: Record<string, string | number | undefined> = {
      user_id: params.userId,
    };

    if (params.kworkId !== undefined) {
      queryParams.kwork_id = params.kworkId;
    }

    const result = await this.request<{ id: number }>(
      "/inboxCreate",
      queryParams,
      { text: params.text },
    );
    return result.response;
  }
}
