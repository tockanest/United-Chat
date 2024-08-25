# United Chat
 This app allows you to transform your YouTube and Twitch chats into a single thing (god help us all) without the need to do other complex things! It's a thing thinger!

And I lied to you, it might be a little bit complex to set things up, but it's not that hard, I promise!

TODO:
- [X] Make the UI
- [ ] Create the Rust BackEnd
- [ ] Make the message polling system

This is NOT functional yet. You can expect it to be working at least for twitch in the next few days (Today is 24/08/2024 [dd/mm/yyyy])

Note to self: 

The message pulling system will work like this:

It'll receive a message (or more), insert it into a hashmap with the key being the timestamp, wait a second or more for
the last message to be inserted, then it'll sort the hashmap by the key and send the messages to the frontend. The frontend
will then display the messages in the order they were sent.
This will allow the messages to be displayed in the order they were sent, even if they were sent at the same time.

This might take a second or two to display the messages, but it's better than having the messages displayed in the wrong order.

If the user selects an "auto-clear" option, the messages will be deleted from the hashmap after being displayed for X seconds.

The user will also be able to select the maximum amount of messages to be displayed at once. If the amount of messages is greater than the maximum amount of messages, the oldest messages will be deleted.

Didn't get it? Neither did I, but here's a simpler explanation:
