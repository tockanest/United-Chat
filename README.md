# United Chat 🎮💬

<div align="center">

<img src="/public/icons/256x256.ico" alt="Logo" width="256" height="256"/>

[![WakaTime](https://wakatime.com/badge/user/e0979afa-f854-452d-b8a8-56f9d69eaa3b/project/38e7c0a8-1828-4150-9756-52e20de24759.svg)](https://wakatime.com/badge/user/e0979afa-f854-452d-b8a8-56f9d69eaa3b/project/38e7c0a8-1828-4150-9756-52e20de24759)
[![Build Status](https://github.com/tockawaffle/United-Chat/actions/workflows/united-chat.yml/badge.svg)](https://github.com/tockawaffle/United-Chat/actions/workflows/united-chat.yml)

</div>

## About 📖

United Chat is a lightweight desktop application that brings together Twitch and YouTube chat streams into one seamless interface. Perfect for content creators and viewers who want to follow chat across different platforms without the hassle of multiple windows.

> **Note**: This app is designed for viewing chat messages only. It does not act as a chatbot or message sender, and may not count as a viewer on the platforms.

## Features ✨

- 🔄 Real-time chat integration
- 🎨 Customizable themes
- 🔒 Privacy-focused design
- ⚡ High-performance native app
- 🎮 Twitch emotes and badges support
- 🎥 YouTube stream compatibility

## Getting Started 🚀

### Quick Install

1. Download the latest release from our [releases page](https://github.com/tockanest/United-Chat/releases)
2. Install using the `.exe` or `.msi` installer (Windows)
3. Launch and follow the initial setup wizard

### Usage Guide

1. **Twitch Setup**:
   - Choose to link your Twitch account (recommended for full features)
   - - This will listen only to the linked account's chat.
   - - It is needed for badges mainly.
   - Or use channel URL directly (basic features)
   - - Badges and some emotes might not work.
   - - It will listen to the chat of the channel you input.

2. **YouTube Setup**:
   - Access Settings (CTRL + D)
   - Click "Add Live"
   - Enter YouTube stream URL
   
3. **Start Chatting**:
   - Select/create your theme
   - - You can use either inline tailwindcss classes or use the CSS editor to make your own theme.
   - - You can also use the default theme.
   - - Remember to save your custom theme by using either the save button or CTRL + S.
   - Click "Start" on the main page
   - Copy the provided URL to your streaming software or open the WebChat window directly.

## For Developers 🛠️

### Building from Source

Prerequisites:
- Rust (latest stable)
- Node.js (v18+)
- npm
- TypeScript

```bash
# Clone repository
git clone https://github.com/tockawaffle/United-Chat.git

# Install dependencies
cd United-Chat
npm install

# Build
npm run tauri:build

# Development mode
npm run tauri:dev
```

### Technical Overview

<details>
<summary>Architecture Details</summary>

#### Frontend
- Built with Next.js and TypeScript
- Minimal state management (backend-driven architecture)
- Modern component-based UI

#### Backend
- Tauri v2 with Rust
- WebSocket server (port 9888) for real-time chat relay
- Sled database for persistent storage
- Privacy-focused authentication flow:
  - Twitch: Optional account linking for enhanced features
  - YouTube: No account linking required, uses public API

#### Platform Integration
- **Twitch**: IRC WebSocket connection using anonymous viewer
- **YouTube**: Public API integration with chat polling
</details>

## Current Status 📊

- ✅ Twitch Integration
  - Full chat support
  - Emotes and badges
  - Optional account linking
  
- ✅ YouTube Integration
  - Chat support
  - Stream detection
  - Privacy-preserved access

## Roadmap 🗺️

- [ ] Performance metrics and optimization
- [ ] Collaboration mode (multiple streams support)
- [ ] Enhanced theme customization
- [ ] Additional platform support (based on demand)
- [ ] Improved error handling
- [ ] Community-driven features
- [ ] Future Features:
- - [ ] Subathon Timer.
- - [ ] Bot Messages (Automoderation and similar)
- - [ ] Social Card (Might not do.)


## Community & Support 🤝

- Join our [Discord](https://discord.gg/54UwzWrQ3w)
- Report issues via [GitHub Issues](https://github.com/tockawaffle/United-Chat/issues)
- Contribute through Pull Requests

## Guidelines 📋

- Single stream per platform recommended
- Respect platform-specific chat rules
- For entertainment purposes only

## Developer Notes 🖥️

Hello there,
I know this isn't needed or actually something most developers do, but since this app doesn't really have a userbase, I think it's fine.

This app is being made by a solo dev (me), I am using AI to help me develop and maintain track of some things, mainly on UI-side since I'm really bad at webdesign.

I have used Claude and v0 from Vercel. Claude for backend stuff like helping me manage my code better and answer some questions I could not find anywhere else (Sometimes even stackoverflow doesn't have answers and I don't want to rawdog it and risk doing something bad.),
v0 was used, obviously, for the design of the app. However, every state management and custom functions were made by me and only me. I may have used Claude for some things to debug since NextJs can be weird sometimes.

If you have any bugs or questions about this, since this doesn't have anyone using it, I'll gladly answer your questions either through the Discord server or my DMs through any social media linked through my GitHub. If you prefer Discord, could you join my server? (Pretty please?)

About the future features, there's a lot that I want to do, I want this app to be as useful as it can be, even if no one uses it.

I really like the idea of subathons, so I might add it along with the already existing IRC WSS.

Bot messages might be something hard to do, this might be server-side and depending on how I make it, maybe a future paid feature? Though I dislike that idea, I'll try my best to make it free and local.

Social Card would be something to keep track of your account. Let's say you linked your Twitch account to the app and, by some reason, everything goes wrong on your PC and you have to reconfigure it. By linking your account again, I might add a server-side backup feature along with the Social Card to keep track of your themes and preferences.

## License 📜

This project is licensed under the [AGPL-3.0 License](./LICENSE).
