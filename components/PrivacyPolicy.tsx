import React from 'react';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                        Privacy Policy
                    </h1>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Last updated: February 12, 2026
                    </p>
                </header>

                <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm p-6 sm:p-8 space-y-6">
                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Introduction
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            GeoNotes AI ("we", "our", or "us") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, and safeguard your information
                            when you use our location-aware note-taking application.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Information We Collect
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                    Location Data
                                </h3>
                                <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                    With your explicit permission, we collect your device's location to provide
                                    location-aware features. You can disable location access at any time through
                                    your browser settings.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                    Note Content
                                </h3>
                                <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                    The notes you create are stored securely in our database. We use AI services
                                    to enhance your notes, which may involve processing your content through
                                    third-party AI providers (Google Gemini).
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                                    Authentication Data
                                </h3>
                                <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                    We use Supabase for authentication, which collects your email address when
                                    you sign up.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc list-inside space-y-2 text-base text-neutral-700 dark:text-neutral-300">
                            <li>To provide and improve our note-taking services</li>
                            <li>To suggest relevant locations based on your notes</li>
                            <li>To categorize and organize your notes automatically</li>
                            <li>To enable AI-powered features like content generation</li>
                            <li>To sync your notes across devices</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Data Storage & Security
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                            Your data is stored securely using industry-standard encryption:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-base text-neutral-700 dark:text-neutral-300">
                            <li><strong>Local Storage:</strong> Notes are cached in your browser's IndexedDB for offline access</li>
                            <li><strong>Cloud Storage:</strong> Synced to Supabase with row-level security (RLS) enabled</li>
                            <li><strong>Encryption:</strong> All data transmitted over HTTPS</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Third-Party Services
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                            We use the following third-party services:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-base text-neutral-700 dark:text-neutral-300">
                            <li><strong>Supabase:</strong> Database and authentication</li>
                            <li><strong>Google Gemini AI:</strong> AI-powered features</li>
                            <li><strong>OpenStreetMap/Leaflet:</strong> Map display</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Your Rights
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">
                            You have the right to:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-base text-neutral-700 dark:text-neutral-300">
                            <li>Access your personal data</li>
                            <li>Request deletion of your data</li>
                            <li>Opt-out of location tracking</li>
                            <li>Export your notes at any time</li>
                            <li>Disable AI features</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Changes to This Policy
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any
                            changes by updating the "Last updated" date at the top of this page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                            Contact Us
                        </h2>
                        <p className="text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us through
                            the app's settings or email us at privacy@geonotes.ai
                        </p>
                    </section>
                </div>

                <footer className="mt-8 text-center">
                    <a
                        href="/"
                        className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                        ← Back to App
                    </a>
                </footer>
            </div>
        </div>
    );
};
