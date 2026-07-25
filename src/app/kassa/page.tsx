import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSession, isAdminEmail } from "@/auth";
import { isMollieTerminalConfigured } from "@/lib/payments";
import { PRIMARY_STORE_ID } from "@/lib/stock";
import { getStoreName } from "@/lib/data";
import { PosTerminal } from "@/components/pos/pos-terminal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KLUSR Kassa",
  description: "Omnichannel kassasysteem (POS) voor de KLUSR-winkel.",
  robots: { index: false, follow: false },
};

export default async function KassaPage() {
  const session = await getSession();
  if (!session) redirect("/inloggen?redirect=/kassa");

  if (!isAdminEmail(session.user?.email)) {
    return (
      <div className="container-klusr flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Geen toegang</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            De kassa is alleen voor beheerders. Vraag een beheerder om je toe te voegen aan{" "}
            <code className="rounded bg-secondary px-1">ADMIN_EMAILS</code>.
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold text-primary hover:underline">
          Terug naar de winkel
        </Link>
      </div>
    );
  }

  const cashier = (session.user?.email ?? "").split("@")[0] || undefined;

  return (
    <PosTerminal
      storeId={PRIMARY_STORE_ID}
      storeName={getStoreName(PRIMARY_STORE_ID) || "KLUSR"}
      cashier={cashier}
      terminalConfigured={isMollieTerminalConfigured()}
      printAgentUrl={process.env.NEXT_PUBLIC_POS_PRINT_AGENT_URL || ""}
    />
  );
}
