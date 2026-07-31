"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { useAccountStore } from "@/hooks/useAccountStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { updateProfileExtras } from "@/lib/accountStore";
import { formatMobileDisplay, updateSessionProfile } from "@/lib/auth";
import { api, isApiEnabled } from "@/lib/apiClient";

export default function ProfilePage() {
  const apiOn = isApiEnabled();
  const { session } = useAuthSession();
  const account = useAccountStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(account.notify.whatsapp);
  const [dob, setDob] = useState(account.dob);
  const [gender, setGender] = useState(account.gender);
  const [notify, setNotify] = useState(account.notify);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const parts = session.name.split(/\s+/);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
  }, [session]);

  // Hydrate name/email/opt-in from the real profile when the API is live.
  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .accountProfile()
      .then((p) => {
        if (cancelled) return;
        if (p.email) setEmail(p.email);
        setWhatsappOptIn(p.whatsapp_opt_in);
        if (p.name) {
          const parts = p.name.split(/\s+/);
          setFirstName(parts[0] ?? "");
          setLastName(parts.slice(1).join(" "));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  useEffect(() => {
    setDob(account.dob);
    setGender(account.gender);
    setNotify(account.notify);
  }, [account.dob, account.gender, account.notify]);

  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Personal details"
        title="Your profile."
        description="Keep your contact information current for faster checkout and delivery updates."
      />

      <form
        className="mt-2 max-w-3xl rounded-2xl border border-black/[0.07] p-5 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          const name = [firstName, lastName].filter(Boolean).join(" ").trim();
          void (async () => {
            setError(null);
            if (apiOn) {
              try {
                await api.updateAccountProfile({
                  name: name || session?.name || "",
                  email: email.trim() || null,
                  whatsapp_opt_in: whatsappOptIn,
                });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not save profile");
                return;
              }
            }
            updateSessionProfile({ name: name || session?.name });
            updateProfileExtras({ dob, gender, notify: { ...notify, whatsapp: whatsappOptIn } });
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
          })();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" value={firstName} onChange={setFirstName} />
          <Field label="Last name" value={lastName} onChange={setLastName} />
          <div className="sm:col-span-2">
            <Field label="Email" value={email} onChange={setEmail} type="email" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor="mobile">
              Mobile number
            </label>
            <div className="flex min-h-14 items-center rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 text-base text-[#6E6E73]">
              {formatMobileDisplay(session?.mobile ?? "")}
            </div>
            <p className="mt-2 text-xs text-[#86868B]">
              Mobile is your sign-in identity — change it by verifying a new OTP session.
            </p>
          </div>
          <Field label="Date of birth" value={dob} onChange={setDob} type="date" />
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor="gender">
              Gender
            </label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="min-h-14 w-full rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 outline-none"
            >
              <option>Prefer not to say</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <fieldset className="mt-8 border-t border-black/[0.06] pt-6">
          <legend className="text-sm font-semibold text-[#1D1D1F]">Notifications</legend>
          <p className="mt-1 text-xs text-[#86868B]">
            {apiOn
              ? "WhatsApp updates control your real opt-in; email & offers are local prefs."
              : "Local prefs only — no messages leave this browser."}
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>WhatsApp updates</span>
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="h-4 w-4 accent-[#1D1D1F]"
              />
            </label>
            {(
              [
                ["email", "Order emails"],
                ["marketing", "Offers & drops"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={notify[key]}
                  onChange={(e) => setNotify((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-[#1D1D1F]"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-black/[0.06] pt-6">
          <button
            type="submit"
            className="min-h-12 rounded-full bg-[#1D1D1F] px-6 text-sm font-semibold text-white"
          >
            Save changes
          </button>
          {saved ? (
            <span className="text-sm font-medium text-[#2D6B3C]">Profile updated</span>
          ) : null}
          {error ? <span className="text-sm font-medium text-[#B42318]">{error}</span> : null}
        </div>
      </form>

      <section className="mt-8 max-w-3xl rounded-2xl border border-[#F0C7C2] bg-[#FFF8F7] p-5 sm:p-6">
        <h2 className="font-semibold text-[#7A271A]">Delete account</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9A4A40]">
          Permanently remove your account and personal data. Existing orders remain available for
          statutory recordkeeping.
        </p>
        <button
          type="button"
          onClick={() =>
            window.alert(
              "Account deletion is not self-serve yet. Contact store support to request removal.",
            )
          }
          className="mt-4 text-sm font-semibold text-[#B42318]"
        >
          Request account deletion
        </button>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-14 w-full rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 text-base outline-none transition focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
      />
    </div>
  );
}
