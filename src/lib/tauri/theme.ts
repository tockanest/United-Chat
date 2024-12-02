// src/lib/tauri/theme.ts
import { BaseTauriClient } from './base';

export class ThemeClient extends BaseTauriClient {
  static async getTheme(themeName: string = "default"): Promise<Editor.ThemeData> {
    return await this.invokeCommand<Editor.ThemeData>("get_theme", { theme: themeName });
  }

  static async getAvailableThemes(): Promise<Editor.AvailableThemes> {
    return await this.invokeCommand<Editor.AvailableThemes>("get_themes", {});
  }

  static async saveTheme(name: string, htmlCode: string, cssCode: string): Promise<boolean> {
    return await this.invokeCommand<boolean>("save_theme", {
      themeName: name,
      htmlCode,
      cssCode
    });
  }

  static async checkThemeChanges(name: string, html: string, css: string): Promise<boolean> {
    return await this.invokeCommand<boolean>("check_if_unsaved", {
      currentThemeName: name,
      currentThemeHtml: html,
      currentThemeCss: css
    });
  }
}