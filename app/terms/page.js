"use client";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-5 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            Smart<span className="text-blue-400">Log</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-semibold mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 8, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of terms</h2>
            <p>By creating an account or using SmartLog ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of service</h2>
            <p>SmartLog is a trading journal and behavioural experiment tool that helps traders identify and test specific patterns in their decision-making. The Service includes an AI-guided setup flow, experiment tracking, and trade logging.</p>
            <p className="mt-2 text-slate-400"><strong className="text-slate-300">SmartLog is not a financial advisor.</strong> Nothing in the Service constitutes financial advice, investment recommendations, or trading signals. All trading decisions are solely your responsibility.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscriptions and payments</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong className="text-slate-300">Monthly and yearly plans</strong> are recurring subscriptions billed automatically. You may cancel at any time; access continues until the end of the current billing period.</li>
              <li><strong className="text-slate-300">Lifetime plan</strong> is a one-time payment granting permanent access to the Service and all future updates, for as long as the Service operates.</li>
              <li>All prices are in USD. Payments are processed securely by Stripe.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Refund policy</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong className="text-slate-300">Monthly and yearly plans:</strong> if you are not satisfied, contact us within 30 days of your first payment for a full refund.</li>
              <li><strong className="text-slate-300">Lifetime plan:</strong> 30-day money-back guarantee from the date of purchase. In the event of permanent service discontinuation, lifetime users receive a prorated refund based on time of use (reference: annual plan price).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-slate-400">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to reverse-engineer, scrape, or copy the Service.</li>
              <li>Share your account credentials with others.</li>
              <li>Use the Service in a way that could harm other users or the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual property</h2>
            <p>The SmartLog platform, design, and AI prompts are owned by SmartLog. Your trading data and experiment logs belong to you. We do not claim ownership over content you create.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of liability</h2>
            <p>SmartLog is provided "as is." We are not liable for any trading losses, missed opportunities, or financial damages arising from use of the Service. Our total liability for any claim is limited to the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to these terms</h2>
            <p>We may update these terms from time to time. We will notify you of material changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact</h2>
            <p>Questions? Email us at <a href="mailto:marcos@smartlogtrading.com" className="text-blue-400 hover:text-blue-300">marcos@smartlogtrading.com</a>.</p>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-800 px-8 py-6">
        <div className="max-w-3xl mx-auto flex gap-6 text-xs text-slate-600">
          <button onClick={() => router.push("/privacy")} className="hover:text-slate-400 transition-colors">Privacy Policy</button>
          <button onClick={() => router.push("/contact")} className="hover:text-slate-400 transition-colors">Contact</button>
        </div>
      </footer>
    </div>
  );
}
