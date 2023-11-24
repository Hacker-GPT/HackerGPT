# HackerGPT

HackerGPT is your indispensable digital companion in the world of hacking. Crafted with the unique needs of ethical hackers in mind, this AI-powered assistant stands at the forefront of hacking knowledge and assistance. Equipped with an extensive database of hacking techniques, tools, and strategies, HackerGPT is more than just an information resource—it's an active participant in your hacking journey. Whether you're a beginner looking to learn the ropes or a seasoned professional seeking deeper insights, HackerGPT is your ally in navigating the ever-changing landscape of hacking challenges.

## How does HackerGPT work?

When you ask a question, it's sent to our server. We verify user authenticity and manage the number of questions you can submit based on your user type (free or plus). Our next step is to search our database for information closely matching your question. If we find a strong match, we incorporate this into the AI's response process. Finally, your question is securely passed to either Google or OpenAI for processing. Importantly, we only send the question and previous ones from the same chat without any personal information. The response you receive varies based on the selected module:

- **HackerGPT**: A tuned version of gpt-3.5-turbo-1106 with semantic search on our data.
- **GPT-4 Turbo**: The latest and greatest from OpenAI, paired with our unique prompt.

## Getting Started with HackerGPT Locally

**1. Clone Repo**

```bash
git clone https://github.com/Hacker-GPT/HackerGPT.git
```

**2. Install Dependencies**

```bash
npm i
```

**3. Configure Environment Variables**

Initialize your environment settings by creating a `.env.local` file in the project's root directory. Simply duplicate the `.env.local.example` file, rename it to `.env.local`, and then update the values with your specific configurations. For HackerGPT usage, you'll need to modify the following entries:

```bash
SECRET_OPENAI_API_KEY=YOUR_OPENAI_API_KEY
SECRET_OPENAI_SYSTEM_PROMPT=YOUR_SYSTEM_PROMPT
```

**4. Run App**

```bash
npm run dev
```

**5. Use It**

You should be able to start chatting.

## Have a feature request, question, comment?

You can get in touch with us through email at [github@hackergpt.chat](mailto:github@hackergpt.chat) or connect with us on [X](https://twitter.com/thehackergpt).

## Contributing Code

Please see [CONTRIBUTING.md](https://github.com/Hacker-GPT/HackerGPT/blob/main/CONTRIBUTING.md) for setup instructions and guidelines for new contributors.

## Contributing Funds

If you'd like to contribute financially to the development of HackerGPT, you can make a donation at the following link: [Donate to HackerGPT Development](https://donate.stripe.com/9AQeWn6UScl6dlm5ks).

## License

Licensed under the [GNU General Public License v3.0](https://github.com/Hacker-GPT/HackerGPT/blob/main/LICENSE)
