import type { KworkApiResponse, KworkProject } from "@repo/types";

const KWORK_API_BASE_URL = "https://api.kwork.ru";
const KWORK_WEB_BASE_URL = "https://kwork.ru";
const KWORK_STATIC_AUTH = "Basic bW9iaWxlX2FwaTpxRnZmUmw3dw==";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

export class KworkOfferLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KworkOfferLimitError";
  }
}

export class KworkProjectNotOfferableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KworkProjectNotOfferableError";
  }
}

const OFFER_LIMIT_PATTERNS = [
  /лимит/i,
  /limit/i,
  /исчерпан/i,
  /превышен/i,
  /максимальное количество/i,
  /нельзя отправить/i,
  /достигнут/i,
];

const NOT_OFFERABLE_PATTERNS = [
  /не можете отправить предложения/i,
  /проект недоступен/i,
  /проект закрыт/i,
  /запрещено/i,
];

function isOfferLimitMessage(msg: string): boolean {
  return OFFER_LIMIT_PATTERNS.some((re) => re.test(msg));
}

function isNotOfferableMessage(msg: string): boolean {
  return NOT_OFFERABLE_PATTERNS.some((re) => re.test(msg));
}

class CookieJar {
  private cookies: Map<string, string> = new Map();

  ingest(setCookieHeaders: string[]): void {
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      if (!pair) continue;
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

export class KworkClient {
  private userToken: string;
  private cookieJar = new CookieJar();

  constructor(userToken: string) {
    this.userToken = userToken;
  }

  static async signIn(login: string, password: string): Promise<KworkClient> {
    const [apiClient, _] = await Promise.all([
      KworkClient.signInApi(login, password),
      Promise.resolve(),
    ]);
    await apiClient.webSignIn(login, password);
    return apiClient;
  }

  private static async signInApi(
    login: string,
    password: string,
  ): Promise<KworkClient> {
    const response = await fetch(`${KWORK_API_BASE_URL}/signIn`, {
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

  private async webSignIn(login: string, password: string): Promise<void> {
    const response = await fetch(`${KWORK_WEB_BASE_URL}/api/user/login`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9",
        "Content-Type": "application/json",
        Origin: KWORK_WEB_BASE_URL,
        Referer: `${KWORK_WEB_BASE_URL}/`,
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        l_username: login,
        l_password: password,
        jlog: 1,
        recaptcha_pass_token: "",
        track_client_id: false,
        "smart-token": "",
        l_remember_me: "1",
      }),
      redirect: "follow",
    });

    const setCookies = response.headers.getSetCookie?.() ?? [];
    this.cookieJar.ingest(setCookies);

    if (!response.ok) {
      throw new Error(`Kwork web login HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as {
      success?: boolean;
      error?: string;
    };
    if (data.success === false) {
      throw new Error(data.error ?? "Kwork web login вернул success=false");
    }
  }

  private async request<T>(
    path: string,
    queryParams: Record<string, string | number | undefined> = {},
    body?: Record<string, string>,
  ): Promise<KworkApiResponse<T>> {
    const url = new URL(`${KWORK_API_BASE_URL}${path}`);

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

  async submitOffer(params: {
    projectId: number;
    description: string;
    price: number;
    duration?: number;
    offerName?: string;
  }): Promise<void> {
    const csrfToken = this.cookieJar.get("csrf_user_token");
    if (!csrfToken) {
      throw new Error("csrf_user_token не найден — web-авторизация не прошла");
    }

    const form = new FormData();
    form.append("wantId", String(params.projectId));
    form.append("offerType", "custom");
    form.append("description", params.description);
    form.append("kwork_duration", String(params.duration ?? 3));
    form.append("kwork_price", String(params.price));
    form.append(
      "kwork_name",
      params.offerName ?? `<div>Отклик на проект #${params.projectId}</div>`,
    );

    const response = await fetch(
      `${KWORK_WEB_BASE_URL}/api/offer/createoffer?wantId=${params.projectId}&offerType=custom`,
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "ru-RU,ru;q=0.7",
          Cookie: this.cookieJar.toHeader(),
          Origin: KWORK_WEB_BASE_URL,
          Referer: `${KWORK_WEB_BASE_URL}/new_offer?project=${params.projectId}`,
          "User-Agent": USER_AGENT,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: form,
      },
    );

    const text = await response.text();

    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // not JSON
    }

    if (json?.success === false) {
      const msg = (json.message ??
        json.error ??
        json.response ??
        "Ошибка создания отклика") as string;
      if (isOfferLimitMessage(msg)) {
        throw new KworkOfferLimitError(msg);
      }
      if (isNotOfferableMessage(msg)) {
        throw new KworkProjectNotOfferableError(msg);
      }
      throw new Error(`createoffer: ${msg}`);
    }

    if (!response.ok) {
      throw new Error(
        `createoffer HTTP ${response.status}: ${text.slice(0, 200)}`,
      );
    }
  }

  async getProjects(
    params: { priceFrom?: number; priceTo?: number; page?: number } = {},
  ): Promise<KworkProject[]> {
    const result = await this.request<KworkProject[]>("/projects", {
      categories: "11",
      price_from: params.priceFrom,
      price_to: params.priceTo,
      page: params.page,
    });
    return result.response;
  }

  async getAllProjects(
    params: { priceFrom?: number; priceTo?: number } = {},
  ): Promise<KworkProject[]> {
    const all: KworkProject[] = [];
    let page = 1;

    while (true) {
      const result = await this.request<KworkProject[]>("/projects", {
        categories: "11",
        price_from: params.priceFrom,
        price_to: params.priceTo,
        page,
      });

      const batch = result.response;
      if (!batch || batch.length === 0) break;

      all.push(...batch);

      const totalPages = result.pages;
      if (totalPages !== undefined) {
        if (page >= totalPages) break;
      } else {
        if (batch.length === 0) break;
      }

      page++;
    }

    return all;
  }

  async getProject(id: number): Promise<KworkProject> {
    const result = await this.request<KworkProject>("/project", { id });
    return result.response;
  }
}
