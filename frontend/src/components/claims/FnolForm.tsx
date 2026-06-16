"use client";

import { api } from "@/lib/api";
import type { TicketPriority } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FieldGroup,
  FormGrid,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { composeClaimDescription } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const CLAIM_TYPES = [
  "Collision",
  "Comprehensive",
  "Theft",
  "Glass Damage",
  "Bodily Injury",
  "Property Damage",
  "Other",
];

export function FnolForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const customerEmail = String(form.get("customer_email") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const narrative = String(form.get("narrative") ?? "").trim();
    const policyNumber = String(form.get("policy_number") ?? "").trim();
    const lossLocation = String(form.get("loss_location") ?? "").trim();

    if (!customerEmail || !subject || !narrative) {
      toast("error", "Email, claim summary, and FNOL description are required");
      return;
    }
    if (!policyNumber || !lossLocation) {
      toast("error", "Policy number and loss location are required");
      return;
    }
    if (subject.length < 3) {
      toast("error", "Claim summary must be at least 3 characters");
      return;
    }
    if (narrative.length < 10) {
      toast("error", "FNOL description must be at least 10 characters");
      return;
    }

    setSubmitting(true);
    try {
      const description = composeClaimDescription({
        claimType: String(form.get("claim_type")),
        policyNumber,
        incidentDate: String(form.get("incident_date")),
        lossLocation,
        estimatedLossAmount: Number(form.get("estimated_loss") ?? 0),
        narrative,
      });

      const ticket = await api.createTicket({
        customer_email: customerEmail,
        customer_name: String(form.get("customer_name") || "") || null,
        customer_company: String(form.get("customer_company") || "") || null,
        subject,
        description,
        priority: String(form.get("priority")) as TicketPriority,
        auto_generate: form.get("auto_generate") === "on",
      });

      toast("success", `Claim #${ticket.id} registered`);
      router.push(`/claims/${ticket.id}`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>First Notice of Loss (FNOL)</CardTitle>
        <CardDescription>
          Capture claim intake details. Optionally auto-generate a coverage
          recommendation on submit.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <FormGrid>
            <FieldGroup>
              <Label htmlFor="customer_email">Claimant Email *</Label>
              <Input
                id="customer_email"
                name="customer_email"
                type="email"
                placeholder="alex@acme.io"
                required
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="customer_name">Claimant Name</Label>
              <Input
                id="customer_name"
                name="customer_name"
                placeholder="Alex Rivera"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="customer_company">Insured Organization</Label>
              <Input
                id="customer_company"
                name="customer_company"
                placeholder="Acme Logistics"
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="priority">Severity</Label>
              <Select id="priority" name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FieldGroup>
          </FormGrid>

          <FormGrid>
            <FieldGroup>
              <Label htmlFor="claim_type">Claim Type (Auto)</Label>
              <Select id="claim_type" name="claim_type" defaultValue="Collision">
                {CLAIM_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="policy_number">Policy Number *</Label>
              <Input
                id="policy_number"
                name="policy_number"
                placeholder="POL-2026-001234"
                required
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="incident_date">Incident Date</Label>
              <Input
                id="incident_date"
                name="incident_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="loss_location">Loss Location *</Label>
              <Input
                id="loss_location"
                name="loss_location"
                placeholder="San Jose, CA"
                required
              />
            </FieldGroup>
          </FormGrid>

          <FieldGroup>
            <Label htmlFor="estimated_loss">Estimated Loss Amount (USD)</Label>
            <Input
              id="estimated_loss"
              name="estimated_loss"
              type="number"
              min={0}
              step={100}
              defaultValue={0}
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="subject">Claim Summary *</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Rear-end collision on I-280"
              required
            />
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="narrative">FNOL Description *</Label>
            <Textarea
              id="narrative"
              name="narrative"
              rows={6}
              placeholder="Describe the incident, damages, and parties involved…"
              required
            />
          </FieldGroup>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-border bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              name="auto_generate"
              defaultChecked
              className="h-4 w-4 rounded border-surface-border text-brand-600 focus-ring"
            />
            <span className="text-sm text-slate-700">
              Auto-generate coverage recommendation after registration
            </span>
          </label>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Register Claim
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
