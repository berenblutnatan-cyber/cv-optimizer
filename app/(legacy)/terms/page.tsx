import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { getServerT } from '@/lib/i18n/server';

export default async function TermsOfService() {
  const { t } = await getServerT();
  const lastUpdated = "May 11, 2026";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col"><div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-8 sm:p-10">
          {/* Back Button */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("Back to Home")}
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("Terms of Service")}</h1>
          <p className="text-gray-500 text-sm mb-8">{t("Last Updated:")} {lastUpdated}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed text-sm sm:text-base">
            
            {/* Section 1: Introduction */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("1. Introduction")}</h2>
              <p>
                {t("Welcome to Hired, operated by")} <strong>Hired</strong> {t('("we," "our," or "us") ("the Service"). By accessing or using our website and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.')}
              </p>
            </section>

            {/* Section 2: AI Disclaimer (Crucial) */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("2. AI Disclaimer & No Guarantees")}</h2>
              <p className="mb-3">
                {t("Our Service utilizes Artificial Intelligence (AI) and Large Language Models (LLMs) to analyze and optimize content. By using this Service, you acknowledge and agree to the following:")}
              </p>
              <ul className="list-disc list-outside ms-5 space-y-2 bg-yellow-50 p-4 rounded-md border border-yellow-100 text-gray-800">
                <li>
                  <strong>{t("Accuracy:")}</strong> {t('AI can occasionally generate incorrect information ("hallucinations"). You are solely responsible for reviewing, verifying, and editing the final output before sending it to employers.')}
                </li>
                <li>
                  <strong>{t("No Job Guarantee:")}</strong> {t("We do not guarantee that using our Service will result in job interviews, offers, or successful employment. Resume optimization is just one part of the hiring process.")}
                </li>
                <li>
                  <strong>{t("Content Suitability:")}</strong> {t("You are responsible for ensuring the generated content accurately reflects your actual experience and skills.")}
                </li>
              </ul>
            </section>

            {/* Section 3: User Data */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("3. User Data & Privacy")}</h2>
              <p>
                {t("To provide the Service, the data you upload (CVs, job descriptions) is processed using third-party AI providers (e.g., OpenAI). We do not claim ownership of your personal content. You retain all rights to your original resume and the generated output. Please do not upload highly sensitive data (e.g., Social Security Numbers, credit card details) to the Service.")}
              </p>
            </section>

            {/* Section 4: Acceptable Use */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("4. Acceptable Use")}</h2>
              <p>
                {t("You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. Automated scraping or reverse engineering of the application is strictly prohibited.")}
              </p>
            </section>

             {/* Section 5: Limitation of Liability */}
             <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t("5. Limitation of Liability")}</h2>
              <p>
                {t("To the fullest extent permitted by law, the Service and its owners shall not be liable for any indirect, incidental, or consequential damages (including loss of data, opportunities, or employment) arising from your use of the Service.")}
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  {t("For questions regarding these terms, please contact our support team.")}
                </p>
                <a
                  href="https://tally.so/r/Zjaz0a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  {t("Contact Support Team")}
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}
