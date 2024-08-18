export default class TauriApi {
    private static async command<T>(command: string, args: any): Promise<T> {
        const {invoke} = await import('@tauri-apps/api/core');
        return invoke(command, args);
    }

    public static async StartLinking() {
        return await this.command<boolean>("polling_for_access_token", {
            clientId: "h3yvglc6y3kmtrzyq7it20z7vi5sa2",
            scopes: "user:read:chat"
        })
    }

    public static async FinishFrontendSetup() {
        return await this.command<boolean>("setup_complete", {task: "frontend"});
    }

    public static async OpenUrl(url: string) {
        // Check if valid url
        function isValidUrl(string: string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        }

        if (!isValidUrl(url)) {
            throw new Error("Invalid URL");
        }

        const {open} = await import("@tauri-apps/plugin-shell");
        return await open(url);

    }

    public static async ListenEvent(event: string, callback: (event: any) => void) {
        const {listen} = await import('@tauri-apps/api/event');
        return await listen(event, callback);
    }
}