import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, HelpCircle } from 'lucide-react';
import { SiteFooter } from '@/components/shared/SiteFooter';
import { getServerT } from '@/lib/i18n/server';

export default async function ContactPage() {
  const { t } = await getServerT();
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

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("Contact Us")}</h1>
          <p className="text-gray-500 text-sm mb-8">
            {t("Have a question, found a bug, or need assistance? We're here to help.")}
          </p>

          <div className="space-y-6 text-gray-700 leading-relaxed text-sm sm:text-base">
            
            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t("Get in Touch")}</h3>
                  <p className="text-gray-700 text-sm">
                    {t("Please fill out the form below, and our support team will get back to you via email as soon as possible (usually within 24-48 hours).")}
                  </p>
                </div>
              </div>
            </div>

            {/* What We Can Help With */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                {t("What We Can Help With")}
              </h2>
              <ul className="list-disc list-outside ms-5 space-y-2 text-gray-700">
                <li>{t("Questions about using Hired")}</li>
                <li>{t("Technical issues or bugs")}</li>
                <li>{t("Account and billing inquiries")}</li>
                <li>{t("Feature requests and feedback")}</li>
                <li>{t("Privacy and data concerns")}</li>
                <li>{t("Partnership opportunities")}</li>
              </ul>
            </section>

            {/* Contact Form CTA */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-6">
                  {t("Click the button below to open our contact form and send us a message.")}
                </p>
                <a
                  href="https://tally.so/r/Zjaz0a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  <Mail className="w-5 h-5" />
                  {t("Open Contact Form")}
                </a>
                <p className="text-xs text-gray-500 mt-4">
                  {t("The form will open in a new tab")}
                </p>
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
