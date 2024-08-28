import TauriApi from "@/lib/Tauri";
import {DropdownMenuContent, DropdownMenuItem} from "@/components/ui/dropdown-menu";
import {useEffect, useState} from "react";

type AvailableThemesProps = {
	format: "dropdown" | "radio";
	selectedTheme: string;
	setCurrentTheme: (theme: string) => void;
	newTheme: boolean;
}

async function GetThemes() {
	return (await TauriApi.GetAvailableThemes()).map(([name]) => name);
}

export default function AvailableThemes({format, selectedTheme, setCurrentTheme, newTheme}: AvailableThemesProps) {
	const [themes, setThemes] = useState<string[]>([]);

	useEffect(() => {
		GetThemes().then(setThemes);
	}, []);

	useEffect(() => {
		if (newTheme) {
			GetThemes().then(setThemes);
		}
	}, [newTheme]);

	if (format === "dropdown") {
		return (
			<DropdownMenuContent className={"w-fit p-1"}>
				{themes.map((theme) => (
					<DropdownMenuItem onSelect={() => setCurrentTheme(theme)} key={theme}>
						{theme.charAt(0).toUpperCase() + theme.slice(1)} {theme === selectedTheme && '✓'}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		)
	}
}