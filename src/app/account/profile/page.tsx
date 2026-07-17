"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <span className="ez-section-kicker">Personal details</span>
      <h1 className="mt-3 text-[clamp(2.1rem,5vw,3.75rem)] font-semibold leading-none tracking-[-0.05em]">Your profile.</h1>
      <p className="mt-4 text-base text-[#6E6E73]">Keep your contact information current for faster checkout and delivery updates.</p>

      <form
        className="mt-8 max-w-3xl rounded-[28px] border border-black/[0.07] p-5 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" defaultValue="Arjun" />
          <Field label="Last name" defaultValue="Patel" />
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor="mobile">Mobile number</label>
            <div className="flex rounded-2xl border border-black/10 bg-[#F8F8FA] focus-within:border-[#1D1D1F] focus-within:ring-1 focus-within:ring-[#1D1D1F]">
              <span className="flex items-center border-r border-black/[0.07] px-4 text-sm font-semibold text-[#6E6E73]">+91</span>
              <input
                id="mobile"
                inputMode="numeric"
                defaultValue="9876543210"
                className="min-h-14 w-full bg-transparent px-4 text-base outline-none"
              />
              <button type="button" className="mr-2 self-center rounded-full bg-white px-3 py-2 text-xs font-semibold shadow-sm">Change</button>
            </div>
            <p className="mt-2 text-xs text-[#86868B]">A verification code is required when changing your number.</p>
          </div>
          <Field label="Date of birth" defaultValue="1995-08-18" type="date" />
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor="gender">Gender</label>
            <select id="gender" defaultValue="Prefer not to say" className="min-h-14 w-full rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 outline-none">
              <option>Prefer not to say</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-black/[0.06] pt-6">
          <button type="submit" className="min-h-12 rounded-full bg-[#1D1D1F] px-6 text-sm font-semibold text-white">Save changes</button>
          {saved && <span className="text-sm font-medium text-[#2D6B3C]">Profile updated</span>}
        </div>
      </form>

      <section className="mt-8 max-w-3xl rounded-[24px] border border-[#F0C7C2] bg-[#FFF8F7] p-5 sm:p-6">
        <h2 className="font-semibold text-[#7A271A]">Delete account</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9A4A40]">Permanently remove your account and personal data. Existing orders remain available for statutory recordkeeping.</p>
        <button type="button" className="mt-4 text-sm font-semibold text-[#B42318]">Request account deletion</button>
      </section>
    </div>
  );
}

function Field({ label, defaultValue, type = "text" }: { label: string; defaultValue: string; type?: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#424245]" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        defaultValue={defaultValue}
        className="min-h-14 w-full rounded-2xl border border-black/10 bg-[#F8F8FA] px-4 text-base outline-none transition focus:border-[#1D1D1F] focus:ring-1 focus:ring-[#1D1D1F]"
      />
    </div>
  );
}
