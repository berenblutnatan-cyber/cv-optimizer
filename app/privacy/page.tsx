import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SiteFooter } from '@/components/shared/SiteFooter';

const LAST_UPDATED = "May 11, 2026";

export default function PrivacyPolicy() {
  const lastUpdated = LAST_UPDATED;

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
            Back to Home
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-8">Last Updated: {lastUpdated}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed text-sm sm:text-base">
            
            {/* Section 1: Introduction */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                At Hired ("we," "our," or "the Service"), we are committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you 
                use our website and services.
              </p>
            </section>

            {/* Section 2: Information We Collect */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li>
                  <strong>Resume Data:</strong> The content of your resume/CV, including personal information, 
                  work history, education, skills, and other details you upload.
                </li>
                <li>
                  <strong>Job Descriptions:</strong> Any job descriptions or requirements you provide for optimization.
                </li>
                <li>
                  <strong>Account Information:</strong> If you create an account, we collect your email address and 
                  authentication credentials.
                </li>
                <li>
                  <strong>Usage Data:</strong> Information about how you interact with our Service, including IP addresses, 
                  browser type, and access times.
                </li>
              </ul>
            </section>

            {/* Section 3: How We Use Your Information */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <p className="mb-3">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li>To provide, maintain, and improve our resume optimization services</li>
                <li>To process your resume through AI models for analysis and optimization</li>
                <li>To communicate with you about your account and our services</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            {/* Section 4: Third-Party Services */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">4. Third-Party AI Services</h2>
              <p className="mb-3">
                To provide our optimization services, we use third-party AI providers (such as OpenAI, Anthropic) 
                to process your resume content. These providers have their own privacy policies and data handling practices.
              </p>
              <p>
                <strong>Important:</strong> When you upload your resume, it may be processed by these third-party services. 
                We do not control how these providers handle your data, but we select providers with strong privacy commitments.
              </p>
            </section>

            {/* Section 5: Data Storage and Retention */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">5. Data Storage and Retention</h2>
              <p>
                We may temporarily store your resume data to provide our services. We do not retain your personal 
                information longer than necessary to fulfill the purposes outlined in this policy. You may request 
                deletion of your data at any time.
              </p>
            </section>

            {/* Section 6: Your Rights */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">6. Your Rights</h2>
              <p className="mb-3">You have the right to:</p>
              <ul className="list-disc list-outside ml-5 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete data</li>
                <li>Request deletion of your personal information</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
            </section>

            {/* Section 7: Security */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">7. Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information. 
                However, no method of transmission over the Internet or electronic storage is 100% secure. 
                While we strive to use commercially acceptable means to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Section 8: Children's Privacy */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
              <p>
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect 
                personal information from children. If you believe we have collected information from a child, 
                please contact us immediately.
              </p>
            </section>

            {/* Section 9: Changes to This Policy */}
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review 
                this Privacy Policy periodically for any changes.
              </p>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-4">
                  For questions regarding our privacy practices, please contact our support team.
                </p>
                <a
                  href="https://tally.so/r/Zjaz0a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  Contact Support Team
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
