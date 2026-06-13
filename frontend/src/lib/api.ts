import type {
  ApiErrorPayload,
  Draft,
  KnowledgeIngestResult,
  MemorySearchResult,
  Ticket,
  TicketCreatePayload,
} from "./types";
import { ApiError } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    const { detail } = payload;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          const loc = item.loc?.join(".") ?? "";
          return loc ? `${loc}: ${item.msg}` : item.msg;
        })
        .join("; ");
    }
    return JSON.stringify(payload);
  } catch {
    return response.statusText || "Unknown API error";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE,

  health: () => request<{ status: string }>("/health"),

  listTickets: () => request<Ticket[]>("/api/tickets"),

  getTicket: (id: number) => request<Ticket>(`/api/tickets/${id}`),

  createTicket: (payload: TicketCreatePayload) =>
    request<Ticket>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  generateDraft: (ticketId: number) =>
    request<{ ticket_id: number; draft: Draft }>(
      `/api/tickets/${ticketId}/generate-draft`,
      { method: "POST" },
    ),

  getDraft: (ticketId: number) =>
    request<Draft>(`/api/drafts/${ticketId}`),

  updateDraft: (
    draftId: number,
    payload: { content?: string; status?: "pending" | "accepted" | "discarded" },
  ) =>
    request<Draft>(`/api/drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  ingestKnowledge: (clearExisting = false) =>
    request<KnowledgeIngestResult>("/api/knowledge/ingest", {
      method: "POST",
      body: JSON.stringify({ clear_existing: clearExisting }),
    }),

  searchMemory: (customerId: number, query: string, limit = 8) =>
    request<{ results: MemorySearchResult[] }>(
      `/api/customers/${customerId}/memory-search?${new URLSearchParams({
        query,
        limit: String(limit),
      })}`,
    ),
};
