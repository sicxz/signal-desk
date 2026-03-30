import { Suspense } from "react";
import { NewsletterDashboard } from "@/components/newsletter-dashboard";

export default function SharedDashboardPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterDashboard mode="shared" />
    </Suspense>
  );
}
