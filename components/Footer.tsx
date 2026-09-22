"use client";

import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer id="signup" className="relative z-10 border-t border-hairline px-6 py-16 md:px-12 md:py-20">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="label mb-6">Notified at launch</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            className="flex items-baseline gap-4 border-b border-hairline pb-3 focus-within:border-bone"
          >
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full bg-transparent font-mono text-sm text-bone outline-none placeholder:text-bone-dim"
            />
            <button type="submit" className="label transition-colors hover:!text-accent">
              {sent ? "Done" : "Send"}
            </button>
          </form>
          <p className="label mt-4 h-4 !text-accent">
            {sent ? `Saved — ${email}` : ""}
          </p>
        </div>

        <div className="md:col-span-3 md:col-start-8">
          <p className="label mb-6">Index</p>
          <ul className="space-y-3">
            {["Optics", "Spec", "Material", "Gallery"].map((l) => (
              <li key={l}>
                <a
                  href={`#${l.toLowerCase()}`}
                  className="font-mono text-sm text-bone-dim transition-colors hover:text-bone"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 md:col-start-11">
          <p className="label mb-6">Contact</p>
          <p className="font-mono text-sm text-bone-dim">hello@obscura.cc</p>
        </div>
      </div>

      <div className="mt-20 flex flex-col gap-3 border-t border-hairline pt-6 md:flex-row md:justify-between">
        <p className="label">Obscura — RS-1</p>
        <p className="label">&copy; 2026 — All rights reserved</p>
      </div>
    </footer>
  );
}
