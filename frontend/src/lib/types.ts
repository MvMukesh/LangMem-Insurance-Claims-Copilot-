export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type DraftStatus = "pending" | "accepted" | "discarded" | "failed";

export interface Ticket {
  id: number;
  customer_id: number;
  customer_email: string;
  customer_name: string | null;
  customer_company: string | null;
  subject: string;
  description: string;
  status: string;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
}

export interface TicketCreatePayload {
  customer_email: string;
  customer_name?: string | null;
  customer_company?: string | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  auto_generate: boolean;
}

export interface DraftSignals {
  memory_hit_count?: number;
  knowledge_hit_count?: number;
  tool_call_count?: number;
  tool_error_count?: number;
  knowledge_sources?: string[];
}

export interface DraftHighlights {
  memory?: string[];
  knowledge?: string[];
  tools?: string[];
}

export interface DraftToolCall {
  tool_name: string;
  tool_call_id?: string | null;
  arguments?: Record<string, unknown>;
  status: string;
  summary?: string | null;
  output?: Record<string, unknown> | null;
  output_text: string;
}

export interface DraftContext {
  version?: number;
  ticket?: Record<string, unknown> | null;
  customer?: Record<string, unknown> | null;
  signals?: DraftSignals | null;
  highlights?: DraftHighlights | null;
  memory_hits?: Record<string, unknown>[];
  knowledge_hits?: Record<string, unknown>[];
  tool_calls?: DraftToolCall[];
  errors?: string[];
}

export interface Draft {
  id: number;
  ticket_id: number;
  content: string;
  context_used: DraftContext | null;
  status: DraftStatus;
  created_at: string;
}

export interface MemorySearchResult {
  memory?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeIngestResult {
  files_indexed: number;
  chunks_indexed: number;
  collection_count: number;
}

export interface ApiErrorPayload {
  detail?: string | { loc: string[]; msg: string; type: string }[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
