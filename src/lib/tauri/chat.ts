// src/lib/tauri/chat.ts
import { BaseTauriClient } from './base';

export class ChatClient extends BaseTauriClient {
  static async startUnitedChat(config?: Streams.TwitchConfig): Promise<void> {
    return await this.invokeCommand<void>("united_chat_init", {...config});
  }

  static async stopUnitedChat(): Promise<void> {
    return await this.invokeCommand<void>("united_chat_stop", {});
  }

  static async openWebChat(url: string): Promise<void> {
    return await this.invokeCommand<void>("open_webchat_window", { url });
  }

  static async closeWebChat(): Promise<void> {
    return await this.invokeCommand<void>("hide_webchat_window", {});
  }
}