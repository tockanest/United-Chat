---

<div align="center">

<img src="/public/icons/256x256.ico" alt="Logo" width="256" height="256"/>

# **United Chat** 🎮💬

[![WakaTime](https://wakatime.com/badge/user/e0979afa-f854-452d-b8a8-56f9d69eaa3b/project/38e7c0a8-1828-4150-9756-52e20de24759.svg)](https://wakatime.com/badge/user/e0979afa-f854-452d-b8a8-56f9d69eaa3b/project/38e7c0a8-1828-4150-9756-52e20de24759)
[![Build Status](https://github.com/tockawaffle/United-Chat/actions/workflows/united-chat.yml/badge.svg)](https://github.com/tockawaffle/United-Chat/actions/workflows/united-chat.yml)

Welcome to **United Chat**—your go-to solution for merging Twitch and YouTube chats into a seamless experience!

We’re on a journey to make your multi-stream chatting as smooth as possible, with just a touch of complexity to keep
things interesting.

</div>

---

## **How It Works** ⚙️

**United Chat** is a desktop application built with:

- [Tauri V2](https://v2.tauri.app/) for creating the app interface
- [React](https://reactjs.org/) for building interactive user components
- [TypeScript](https://www.typescriptlang.org/) for a type-safe development experience

This app consolidates chat messages from Twitch and YouTube into a single, unified window. While we're still ironing out
the kinks, progress is steady, and we're pushing towards a fully functional app. 🚀

Please note that while this is made to facilitate multi-stream chatting, it's not a chatbot and doesn't support sending
messages.

It also might not count as a viewer on the platforms, so keep that in mind when using it.

Please don't use this app to spam or harass streamers or other viewers. We're all here to have a good time! 🎉

Use this app responsibly and keep in mind that this is a work in progress. We're always open to feedback and
suggestions!

### **Current Status**

- **Twitch Integration**: Fully implemented, including connection, channel joining, and message reception. 🕹️
- **YouTube Integration**: Implemented, but still in the testing phase. 🎥

### **Performance**

Performance is still in the testing phase, so don't expect perfection just yet. We welcome your feedback to help us
improve! DevTools are available for debugging, and you might see some warnings—just React doing its thing.

For those interested in the nitty-gritty, here's a peek at our tech stack:
<details>
  <summary><strong>Tech Stack Overview 🤓</strong></summary>

### **Frontend:**

- **Next.js**: A framework for server-side rendering React applications.
- **TailwindCSS**: A utility-first CSS framework for styling.
- **WebSockets**: For real-time chat updates, connecting to Twitch IRC API.

### **Backend:**

- **Rust**: Chosen for its performance benefits.
- **Tauri**: Used to build the desktop application with web technologies.
- **WebSockets Server/Client**: Handles communication between frontend and backend.

### **Testing:**

- **Currently, no formal tests**. We're embracing a hands-on approach for now.

### **Deployment:**

- **GitHub Actions**: For continuous integration and deployment.
- **GitHub Releases**: For app distribution.

Feel free to dive into the [source code](https://github.com/tockawaffle/United-Chat) and see how it's built. Suggestions
and feedback are always welcome—just keep it constructive!

</details>

---

## **TODO List** 📝

- [X] Design the UI 🎨
- [X] Implement Rust Backend 🔧
    - [X] Twitch API 🕹️
    - [X] YouTube API 🎥
- [X] Enhance Message Handling 💬
    - [X] Twitch
    - [X] YouTube
- [ ] Develop User Linking 🔗
    - [X] Twitch (Account Linking)
    - [X] Twitch (No Linking)
    - [ ] YouTube
- [X] Build Chat UI 🖥️
- [ ] Conduct Performance Tests 🏎️

---

## **Running the App** 🏃‍♂️

You have two options:

<details>
  <summary>1. Using Pre-Built Binaries</summary>

1. Download the latest release from the [release page](https://github.com/tockawaffle/United-Chat/releases).
2. Use the `.exe` or `.msi` installer for Windows.
3. Install and run the app.
4. You can link your Twitch account or use a Twitch streamer URL to start chatting.
5. To access the YouTube Chat, you'll have to access the Settings page (CRTL + D), click on "Add Live" and enter a
   YouTube stream URL.
   It's recommended to have only one maximum live stream at a time.
   You can add more streams, including scheduled ones by doing the same process.
6. Select or create your own theme on the main page.
7. Still on the main page, click on "Start" to start the chat.
8. Copy the URL from the browser and paste it into your stream app, or use the app's built-in browser and use that.
9. Enjoy your chat!

</details>

<details>
  <summary>2. Building from Source</summary>

To build from source, you'll need:

- 🦀 Rust
- 🟢 Node.js
- 📦 npm
- 🔡 TypeScript

Steps to build:

```bash
# Clone the repository
git clone https://github.com/tockawaffle/United-Chat.git

# Navigate to the project directory
cd United-Chat

# Install dependencies
npm install

# Build the project (recommended)
npm run tauri:build

# Or run in development mode
npm run tauri:dev
```

Happy coding, and may your chats be forever united! 🎉

</details>

---

## **Connect with Us** 🌐

- **Discord:** [Join the Community](https://discord.gg/54UwzWrQ3w)

---

## **License** 📜

This project is licensed under the [AGPL-3.0 License](./LICENSE).
