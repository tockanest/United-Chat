// src/types/editor.d.ts
declare global {
	namespace Editor {
		type AvailableThemes = [string, string, string][];
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
		
		interface ConfigState {
			scaling: boolean
			scalingValue: number
			fadeOut: boolean
			messageRemoveTimer: number
			maxMessages: number
			maxWidth: number
			maxHeight: number
			currentWidth: number
			currentHeight: number
			messageTransition: AvailableMessageTransitions
		}
		
	}
}

export {};