import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { dracula } from '@uiw/codemirror-theme-dracula';
import CodeMirror from '@uiw/react-codemirror';
import { Code2, FileJson } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSoftUpdateTheme, useEditorTheme } from '../../lib/stores/themes';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useEditorTabsConfig } from '@/lib/stores/config';
export function EditorTabs() {
    const [htmlCode, setHtmlCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const { editorTabsConfig, setConfigValue } = useEditorTabsConfig();
    const { data: theme, isLoading, error } = useEditorTheme();
    const { mutate: softUpdateTheme } = useSoftUpdateTheme();

    useEffect(() => {
        setHtmlCode(theme?.theme_code.html_code || '');
        setCssCode(theme?.theme_code.css_code || '');
    }, [theme]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <Tabs defaultValue="html" className="h-full flex flex-col">
            <div className="border-b px-4 py-2 flex items-center justify-between">
                <TabsList>
                    <TabsTrigger value="html" className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        HTML
                    </TabsTrigger>
                    <TabsTrigger value="css" className="flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        CSS
                    </TabsTrigger>
                </TabsList>
                <div className="flex items-center space-x-2">
                    <Label htmlFor="editorSize" className="text-sm">
                        Editor Size:
                    </Label>
                    <Input
                        id="editorSize"
                        type="number"
                        value={editorTabsConfig.editorSize}
                        onChange={(e) => setConfigValue(["editor", "editorSize"], Number(e.target.value))}
                        className="w-20 h-8"
                        min={30}
                        max={100}
                    />
                </div>
            </div>

            <TabsContent value="html" className="flex-1 p-0 overflow-auto mb-[3rem]">
                <CodeMirror
                    value={htmlCode}
                    height="100%"
                    theme={dracula}
                    extensions={[html()]}
                    onChange={(value) => {
                        setHtmlCode(value);
                        softUpdateTheme({
                            theme_code: {
                                html_code: value,
                                css_code: cssCode,
                            }
                        });
                    }}
                    className="h-full"
                />
            </TabsContent>
            <TabsContent value="css" className="flex-1 p-0">
                <CodeMirror
                    value={cssCode}
                    height="100%"
                    theme={dracula}
                    extensions={[css()]}
                    onChange={(value) => {
                        setCssCode(value);
                        softUpdateTheme({
                            theme_code: {
                                html_code: htmlCode,
                                css_code: value,
                            }
                        });
                    }}
                    className="h-full"
                />
            </TabsContent>
        </Tabs>
    );
} 