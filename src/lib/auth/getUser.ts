import {TauriAPI} from "@/lib/tauri";

export default async function GetUser() {
	const user = await TauriAPI.Auth.getUserInfo();
	if (!user) {
		return null
	}
	
	return user as NonNullable<User.Information>;
}