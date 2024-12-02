// src/types/editor.d.ts
declare global {
	namespace Editor {
		type AvailableThemes = [string, string, string][];
		type PreviewPosition = 'right' | 'bottom' | 'left' | 'top';
		
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
		
	}
}

export {};