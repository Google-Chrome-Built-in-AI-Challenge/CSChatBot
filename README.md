# CSChatBot

**CSChatBot** is a **100% browser-based local AI chatbot** that works entirely offline—no cloud required. All computation happens locally in your browser, ensuring privacy, instant responses, and offline availability.

---

## Project Overview

**CSChatBot** is a **personal AI assistant** that runs entirely **locally in the browser (Local-Only)**.  
It leverages **Chrome's built-in AI engine, Gemini Nano**, along with the **Built-in AI API Suite**, to handle user inputs in real time.  

Users can naturally ask questions, write texts, correct, summarize, or translate content directly within the browser.  
All data is processed on-device, so the AI provides consistent performance even with unstable or no network connection.

---

## Problem Statement

Most AI chatbots today are cloud-based, which introduces structural limitations:

- User conversations are sent to servers, risking privacy breaches.  
- Offline usage is impossible when the network is unstable or disconnected.  
- Response latency can reduce real-time interactivity.

CSChatBot solves these issues by adopting **client-side inference using Gemini Nano and the Built-in AI API Suite**, enabling a **completely local AI chatbot with zero data transmission**.

---

## Features

- **Offline AI**: Runs completely in the browser using Chrome's built-in AI engine. No server or database required.  
- **Privacy-first**: User conversations are stored only in localStorage. Zero data transmission.  
- **Admin Features**:
  - **Agent Profile**: Set agent name, role, tone, and avatar (e.g., ‘Store Staff Elian’).  
  - **FAQ Management**: Register FAQs for automatic responses to common queries.  
  - **Document Upload**: Add brand manuals or guides in Markdown. Chatbot references them when answering related questions.  
- **Smart Responses**: Supports FAQ recognition, document-based answers, and general conversation with persona-based tone.  
- **Instant Feedback**: All computation and response generation happen instantly in-browser.

---

## Technical Stack

- **React**  
- **PromptAI / WriterAI / TranslatorAI**  
- **Chrome Built-in AI (Gemini Nano)**  

---

## Key Projects / Scenarios

### Admin Workflow
1. Define agent persona: profile picture, name, greeting, tone, and brand personality.  
2. Register FAQs with nuanced phrasings: e.g., for “How can I get a refund?” the AI returns “Contact Elian for immediate refund” for inputs like “refund”, “I want a refund”, “refund please”.  
3. Use **Article** feature for informational content in Markdown: e.g., washing instructions for a linen shirt. Chatbot references these articles in answers, optionally displaying the document ID.  

### Chatbot Response Logic
1. Checks user input against registered FAQs. Matches are handled by AI to recognize intent.  
2. If FAQ is linked to a document, returns document reference alongside answer.  
3. If no FAQ match, searches articles (docs) for relevant content.  
4. If neither FAQ nor article match, generates response based on agent persona.  
5. Input is internally translated to English for prompt processing, then translated back. Currently optimized for Korean and English.

---

## Privacy & Efficiency

- **Zero Data Transmission**: All conversation data stays on-device.  
- **Instant Response**: No network call; minimal latency.  
- **Offline-First Architecture**: Runs fully in Chrome’s built-in AI environment.  
- **Secure Context**: Executed in Chrome Sandbox for enhanced security.

---

## Demo

Try CSChatBot online: [CSChatBot Demo](https://google-chrome-built-in-ai-challenge.github.io/CSChatBot/)


https://github.com/user-attachments/assets/f8e43618-35d1-4511-a1d2-61f170218283


[Youtube](https://youtu.be/a145er5vYRw)




**FAQ Mode:**
- User: "I want a refund"  
- Chatbot: Returns pre-registered FAQ answer, even for varied phrasings.

**Document Mode:**
- User: "How do I wash a linen shirt?"  
- Chatbot: "Related Document: Linen Shirt Washing Guide" → generates answer referencing the uploaded document.

**General Chat Mode:**
- User: "Hi"  
- Chatbot: Persona-based response: "Hello! How can I help you today?"

---

## Presets

To use pre-defined persona presets:

Download the JSON file from:  
   `src/SamplePreset/chatbot-preset-20251101-095736.json`  
Place it in the appropriate folder. It will be available in the AgentProfile setup.

---

## Installation & Usage

1. Clone the repository:
```
git clone https://github.com/yourusername/cschatbot.git
cd cschatbot
```

2.	Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```
