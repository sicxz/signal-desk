import { Suspense } from "react";
import { NewsletterDashboard } from "@/components/newsletter-dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterDashboard />
    </Suspense>
  );
}
