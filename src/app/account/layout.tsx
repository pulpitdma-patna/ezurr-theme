import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterCompact } from "@/components/layout/Footer";
import { AccountShell } from "@/components/account/AccountShell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header />
      <main>
        <AccountShell>{children}</AccountShell>
      </main>
      <FooterCompact />
    </div>
  );
}
