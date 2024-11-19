/**
 * This particular type holds information about the User state, which can be used to display the user's profile picture, name, and broadcaster type.
 * This type is defined here at app_states because _it is_ a state that the backend handles.
 */
type UserInformation = {
	login: string,
	user_id: string,
	expires_in: number,
	internal_info: {
		broadcaster_type: string,
		description: string,
		display_name: string,
		id: string,
		profile_image_url: string,
	}
}

export type {UserInformation};