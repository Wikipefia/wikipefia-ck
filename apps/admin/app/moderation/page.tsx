"use client";

import { Empty, PageHeader } from "@/components/ui/kit";

export default function ModerationPage() {
  return (
    <div>
      <PageHeader title="Moderation" subtitle="Review and act on content" />
      <Empty
        title="Coming soon"
        hint="Content moderation queue: flagged articles, chat reports, and approve / reject actions. Planned for the next iteration."
      />
    </div>
  );
}
