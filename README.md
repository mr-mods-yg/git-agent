# Git Agent 🤖

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-latest-black)](https://sdk.vercel.ai/docs)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**Git Agent** is a modern, Next.js-powered AI chat interface built on top of the Vercel AI SDK. It connects directly with GitHub to let you manage, query, and analyze your repositories, commits, releases, and issues securely and efficiently.

---

## ✨ Key Features

- **Dynamic AI Provider Selector**: Connect using state-of-the-art models from leading AI providers:
  - **DeepSeek**: DeepSeek V4 Pro, DeepSeek V4 Flash, DeepSeek V3 (Chat), DeepSeek R1 (Reasoner).
  - **OpenAI**: GPT-5.5 Pro, GPT-5.5, GPT-5, GPT-5 mini, GPT-5 nano, GPT-4o, GPT-4o mini, o1-mini.
  - **Anthropic**: Claude Sonnet 4.6, Claude Sonnet 4.5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Haiku 4.5.
  - **Google Gemini**: Gemini 3.5 Flash, Gemini 3 Flash, Gemini 3.1 Pro Preview, Gemini 2.5 Pro.
- **Client-Side / Local Credentials**: 🔒 Your GitHub Personal Access Token (PAT) and provider API keys are stored exclusively on your device (`localStorage`). The backend receives them temporarily in request headers to execute the agent calls on-the-fly and **never persists them**.
- **Silky Smooth Streaming**: ⚡ AI text updates are throttled at 60ms to prevent main-thread UI lag and browser freeze during fast generation, ensuring a buttery-smooth UX.
- **Mobile-Responsive UI**: 📱 Full mobile-friendly sidebar overlay with backdrop-blur styling and a premium minimalist aesthetic.
- **Persistent Chat Sessions**: 💾 Create, rename, select, or delete multiple chat histories seamlessly. Sessions are safely cached locally in your browser.

---

## 🚀 Onboarding & Credentials Setup

To run Git Agent, you will need two things:

### 1. GitHub Personal Access Token (PAT)
   - Go to [GitHub Developer Settings](https://github.com/settings/personal-access-tokens) &rarr; **Personal access tokens** &rarr; **Fine-grained tokens**.
   - Generate a new token with:
     - `repositories` (Read and write repository content)
     - `permissions` (use content permission with read or write access to give the agent to write changes and push commits.)
   - Paste this token on the initial Git Agent welcome screen.

### 2. AI Provider API Key
   - Depending on your selected model, supply your OpenAI, Anthropic, Gemini, or DeepSeek API key in the UI.
   - *Note: If a provider key is already configured on the server environment variables (e.g., `DEEPSEEK_API_KEY`), entering it on the client is optional.*

---

## 💻 Local Development

### 1. Clone the repository and install dependencies
```bash
git clone https://github.com/your-username/git-agent.git
cd git-agent
npm install
```

### 2. Configure Local Fallback Keys (Optional)
Create a `.env` file in the root directory if you want to provide fallback API keys at the server level:
```env
DEEPSEEK_API_KEY=your_server_fallback_key
OPENAI_API_KEY=your_server_fallback_key
# Other provider keys can be placed here as fallback
```

### 3. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with Git Agent.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **AI Streaming**: [Vercel AI SDK](https://sdk.vercel.ai/docs) (`ai`, `@ai-sdk/react`)
- **Providers**: `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/deepseek`
- **Markdown & Codeblocks**: `react-markdown` + `remark-gfm`
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Interactivity**: React hooks, custom `useChat` transport configuration

---

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a Pull Request if you'd like to add new features, support more models, or improve the UI.

---

## 📄 License

This project is licensed under the MIT License.
