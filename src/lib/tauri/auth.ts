// src/lib/tauri/auth.ts
import { BaseTauriClient } from './base';

export class AuthClient extends BaseTauriClient {
	static async startTwitchAuth(): Promise<string> {
		return await this.invokeCommand<string>("linking", {
			clientId: "h3yvglc6y3kmtrzyq7it20z7vi5sa2",
			scopes: "user:read:chat+user:read:email"
		});
	}

	static async logout(): Promise<void> {
		return await this.invokeCommand<void>("twitch", {});
	}

	static async skipTwitchAuth(fullUrl: string, username: string): Promise<boolean> {
		return await this.invokeCommand<boolean>("link_process", { fullUrl, username });
	}

	static async finishSetup(): Promise<boolean> {
		return await this.invokeCommand<boolean>("setup_complete", { task: "frontend" });
	}

	static async getUserInfo(): Promise<User.UserInformationReqResponse> {
		return await this.invokeCommand<User.UserInformationReqResponse>("get_user", {});
	}

	static async startAISLinking(): Promise<void> {
		return await this.invokeCommand<void>("twitch_linking", {});
	}
}