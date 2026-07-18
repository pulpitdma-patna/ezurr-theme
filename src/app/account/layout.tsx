"use client";

import { AccountAuthGate } from "@/components/account/AccountAuthGate";
import { AccountShell } from "@/components/account/AccountShell";
import { FooterCompact } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MicroBar } from "@/components/layout/MicroBar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header />
      <main>
        <AccountAuthGate>
          <AccountShell>{children}</AccountShell>
        </AccountAuthGate>
      </main>
      <FooterCompact />
    </div>
  );
}
