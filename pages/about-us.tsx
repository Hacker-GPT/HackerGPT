import React from 'react';

const AboutUs = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-10">
      <div className="container mx-auto max-w-2xl space-y-6 rounded-md border bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-4xl font-bold">About us</h1>

        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-2xl font-semibold">What is HackerGPT?</h3>
            <p className="text-lg">
              HackerGPT is your intelligent robot assistant, specialized for bug
              bounty hunters. Built on an extensive dataset of hacking
              resources, including detailed guides, hacking write-ups and bug
              bounty reports, we continuously evolve and enhance its
              capabilities.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">
              How does HackerGPT work?
            </h3>
            <p className="mb-4 text-lg">
              When you ask a question, it&apos;s sent to our server. We verify
              user authenticity and manage your question quota based on whether
              you&apos;re a free or plus user. We then search our database for
              information that closely matches your question. For questions not
              in English, we translate them to find relevant information from
              our database. If a strong match is found, it&apos;s incorporated
              into the AI&apos;s response process. Your question is then
              securely passed to OpenAI for processing, with no personal
              information sent. Responses vary based on the module:
            </p>
            <ul className="ml-8 list-disc space-y-2">
              <li>
                HackerGPT: A tuned version of gpt-3.5-turbo-1106 with semantic
                search on our data.
              </li>
              <li>
                GPT-4 Turbo: The latest and greatest from OpenAI, paired with
                our unique prompt.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-2xl font-semibold">
              Is HackerGPT Open Source?
            </h3>
            <p className="mb-4 text-lg">
              Absolutely! HackerGPT is committed to transparency and community
              collaboration. Our code is open source, allowing anyone to view,
              study, and understand how our software works. This also enables
              developers around the world to contribute to its development and
              improvement. Check out our GitHub repository for more details:{' '}
              <a
                href="https://github.com/Hacker-GPT/HackerGPT"
                className="text-blue-500 hover:text-blue-600 hover:underline"
              >
                HackerGPT on GitHub
              </a>
              .
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-2xl font-semibold">
              Is my information safe?
            </h3>
            <p className="mb-4 text-lg">
              Absolutely! We take your privacy seriously:
            </p>
            <ul className="ml-8 list-disc space-y-2">
              <li>Simple email sign-in.</li>
              <li>Your questions aren&apos;t logged by us.</li>
              <li>Chats are device-exclusive; we don&apos;t store them.</li>
              <li>OpenAI doesn&apos;t know who&apos;s asking.</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-2xl font-semibold">
              Need help or have questions?
            </h3>
            <p className="text-lg">
              We&apos;re here for you. Get in touch for any help, questions, or
              feedback at{' '}
              <a
                className="text-blue-500 hover:text-blue-600 hover:underline"
                href="mailto:contact@hackergpt.chat"
              >
                contact@hackergpt.chat
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
