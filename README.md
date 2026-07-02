# AI Doctor Precaution Generator

An automation pipeline that lets doctors input a patient precaution/instruction script and generate either an **AI voiceover audio** or a **full AI avatar video with synced speech** — with video generation triggered automatically when a reference image is provided.

Built with [Next.js](https://nextjs.org), this tool is designed to help healthcare providers quickly turn written patient instructions into accessible audio/video content, reducing the manual effort of recording voiceovers or avatar videos by hand.

## Features

- **Text-to-Speech (Audio-only mode)** — Doctors enter a script and generate realistic, natural-sounding voiceover audio using the [ElevenLabs API](https://elevenlabs.io/).
- **AI Avatar Video mode** — Upload a reference image along with the script to generate a full talking-avatar video with speech synced to the audio, powered by the [HeyGen API](https://www.heygen.com/).
- **Two output modes** — Choose audio-only or audio + video generation based on whether an image is provided.
- **Simple doctor-facing workflow** — Input a script, optionally attach an image, and generate output with no manual editing required.

## How It Works

1. Doctor enters a patient precaution/instruction script in the app.
2. Doctor chooses to generate audio only, or optionally uploads a reference image to also generate a video.
3. The script is sent to the **ElevenLabs API** to generate a voiceover audio file.
4. If an image was provided, it's uploaded as a HeyGen asset, then combined with the generated audio via the HeyGen video generation API to produce a synced AI avatar video.
5. The final audio or video output is returned to the doctor for download/playback.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [ElevenLabs API](https://elevenlabs.io/) — Text-to-speech voice generation
- [HeyGen API](https://www.heygen.com/) — AI avatar video generation

## Getting Started

### 1. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root and add your API keys:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key

HEYGEN_API_KEY=your_heygen_api_key
HEYGEN_UPLOAD_ASSET=https://upload.heygen.com/v1/asset
HEYGEN_VIDEO_GENERATE_API=https://api.heygen.com/v2/videos
HEYGEN_GET_AVATARS_API=https://api.heygen.com/v2/avatars
```

### 3. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Status

This project is a proof-of-concept/demo pipeline showcasing AI-assisted voiceover and avatar video generation for a healthcare use case. It is not currently in production deployment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
