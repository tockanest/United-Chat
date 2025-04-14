import { z } from "zod";
import { configSchema } from "@/lib/stores/config";

// src/types/editor.d.ts
declare global {
	namespace Editor {

		interface ThemeCode {
			html_code: string;
			css_code: string;
		}

		interface ThemeHasFolder {
			has_parent: boolean;
			parent?: string;
		}

		interface ThemeInfo {
			name: string;
			last_edit?: Date;
			theme_code: ThemeCode;
			has_parent: ThemeHasFolder;
			theme_path: string;
		}

		interface ThemeFolder {
			name: string;
			themes: ThemeInfo[];
			path: string;
			parent: string | null;
			subfolders: Record<string, ThemeFolder>;
			last_edit?: Date;
		}

		type AvailableThemes = ThemeFolder[];
		type PreviewPosition = 'right' | 'bottom' | 'left' | 'top';
		type AvailableMessageTransitions = "slide-from-right" | "slide-from-bottom" | "typewriter" | "none";

		interface Theme {
			id: string;
			name: string;
			html: string;
			css: string;
		}

		interface ThemeData {
			name: string;
			html_code: string;
			css_code: string;
		}

		type ConfigState = z.infer<typeof configSchema>;

	}
}

export { };
