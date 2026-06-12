import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function composeClaimDescription(params: {
  claimType: string;
  policyNumber: string;
  incidentDate: string;
  lossLocation: string;
  estimatedLossAmount: number;
  narrative: string;
}): string {
  return [
    `Claim type: ${params.claimType}`,
    `Policy number: ${params.policyNumber.trim()}`,
    `Incident date: ${params.incidentDate}`,
    `Loss location: ${params.lossLocation.trim()}`,
    `Estimated loss amount: ${formatCurrency(params.estimatedLossAmount)}`,
    "",
    "FNOL narrative:",
    params.narrative.trim(),
  ].join("\n");
}

export function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
