"use client";

import { EmptyState, PageHeader } from "@/components/ui/kit";

export default function AiPage() {
  return (
    <div>
      <PageHeader title="AI" subtitle="Usage, keys, services, and prompts" />
      <EmptyState
        title="Coming soon"
        hint="AI usage stats, API key management, service on/off switches, and prompt editing — backed by the Convex settings table. Planned for the next iteration."
      />
    </div>
  );
}
