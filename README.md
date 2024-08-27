<div align="center">

<img src="/public/icons/256x256.ico" alt="Logo" width="256" height="256"/>

# **United Chat** 🎮💬

</div>

Welcome to **United Chat**—your one-stop solution to merge your YouTube and Twitch chats into a single,
seamless experience!
(May the gods help us all).

It might sound like a wild ride,
but we've done our best to make it as smooth as possible—with just a hint of complexity to keep things interesting.


---

## **How It Works** ⚙️

Currently, in version **0.1.0**, United Chat is like a baby dragon—adorable but not quite ready to conquer the world.
🐉 While it’s still in its infancy and not production-ready, we've got a solid foundation to build upon.
🚀

The backend is *almost* there—it can handle chat messages (sort of).
But before you get too excited, keep in mind it’s still a work in progress.
So, for now, consider it more of a playground for testing than a fully-fledged app.
🛠️

**Why?**  
Well, I may have hardcoded some user IDs into the code,
and I'm still figuring out how to make it work when users don't link their accounts.
This is a bit of a pickle because Twitch needs a user account to fetch chat messages from the Twitch IRC.

As for YouTube, it’s still on the to-do list, but it’s coming soon! 📅

---

## **TODO** 📝

- [X] Make the UI 🎨
- [ ] Create the Rust Backend 🔧
    - [X] Implement the Twitch API 🕹️
    - [ ] Implement the YouTube API 🎥
- [ ] Message Handling 💬
    - [X] Twitch
    - [ ] YouTube
- [ ] User Linking 🔗
    - [X] Twitch
    - [ ] YouTube
- [X] Chat UI 🖥️
- [ ] Performance Tests 🏎️

---

## **How to Run** 🏃‍♂️

Since this is still in the works and not quite ready for the spotlight,
you’ll need to have the following installed to compile the app:

- 🦀 Rust
- 🟢 Node.js
- 📦 npm
- 🔡 TypeScript

Once you're all set up, run the following commands:

```bash
# Clone the repository
git clone https://github.com/tockawaffle/United-Chat.git

# Go to the project directory
cd United-Chat

# Install the dependencies
npm install

# Build the whole project (recommended)
npm run tauri:build

# Or, if you want to tinker in development mode
npm run tauri:dev
```

Happy coding, and may your chats be forever united! 🎉 (May god help us all again)

---

## **License** 📜

This project is licensed under the [AGPL-3.0 License.](/LICENSE)
