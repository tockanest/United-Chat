// src/lib/tauri/theme.ts
import { ThemeError } from '@/lib/stores/themes';
import { BaseTauriClient } from './base';

import { ok, Result, err } from 'neverthrow';


interface GetFromTauriThemeResult {
	status: {
		Success?: { theme: Editor.ThemeInfo };
		Error?: { error: ThemeError };
	};
}

type GetThemeResult = Result<Editor.ThemeInfo, ThemeError>;

export class ThemeClient extends BaseTauriClient {
	static async getTheme(theme: Editor.ThemeInfo): Promise<GetThemeResult> {
		const getTheme = await this.invokeCommand<GetFromTauriThemeResult>("get_theme", { theme });

		if (getTheme.status.Error) {
			return err(getTheme.status.Error.error);
		} else if (!getTheme.status.Success) {
			return err(
				{
					"type": "storage_error",
					"message": "Could not retrieve theme from storage.",
					"stack": undefined
				}
			);
		}

		return ok(getTheme.status.Success.theme);
	}

	static async getAvailableThemes(): Promise<Editor.AvailableThemes> {
		return await this.invokeCommand<Editor.AvailableThemes>("get_themes", {});
	}

	static async saveTheme(
		htmlCode: string,
		cssCode: string,
		themeName: string,
		themeParent: string
	): Promise<{ success: boolean, error: string | null }> {
		return await this.invokeCommand<{ success: boolean, error: string | null }>("save_theme", {
			htmlCode,
			cssCode,
			themeName,
			themeParent
		});
	}

	static async deleteTheme(themeName: string): Promise<boolean> {
		return await this.invokeCommand<boolean>("delete_theme", {
			themeName
		});
	}

	static async deleteFolder(folderName: string): Promise<boolean> {
		return await this.invokeCommand<boolean>("delete_folder", {
			folderName
		});
	}

	static async checkThemeChanges(name: string, html: string, css: string): Promise<boolean> {
		return await this.invokeCommand<boolean>("check_if_unsaved", {
			currentThemeName: name,
			currentThemeHtml: html,
			currentThemeCss: css
		});
	}

	static async checkIfUnsaved(
		currentThemeName: string,
		currentThemeHtml: string,
		currentThemeCss: string,
		themeParent: string
	): Promise<boolean> {

		return await this.invokeCommand<boolean>("check_if_unsaved", {
			currentThemeName,
			currentThemeHtml,
			currentThemeCss,
			themeParent
		});
	}
}