import { FnolForm } from "@/components/claims/FnolForm";
import { Header } from "@/components/layout/Header";

export default function NewClaimPage() {
  return (
    <>
      <Header
        title="Register FNOL"
        subtitle="Intake a new First Notice of Loss and optionally trigger AI coverage analysis."
      />
      <main className="mx-auto max-w-4xl flex-1 px-8 py-8">
        <FnolForm />
      </main>
    </>
  );
}
