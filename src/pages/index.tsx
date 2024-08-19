import {useState, useEffect, SetStateAction} from 'react';
import {Button} from "@/components/ui/button"
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import CodeMirror from '@uiw/react-codemirror';
import {html} from '@codemirror/lang-html';
import {css} from '@codemirror/lang-css';
import {dracula} from '@uiw/codemirror-theme-dracula';
import {tags as t} from '@lezer/highlight';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

// Custom Tailwind highlighting
const tailwindHighlighting = HighlightStyle.define([
    {tag: t.className, color: "#a5f3fc"},  // Tailwind classes
]);

const tailwindExtension = html({
    matchClosingTags: true,
    selfClosingTags: true,
    autoCloseTags: true,
});

export default function Home() {
    const [htmlCode, setHtmlCode] = useState(
        `<div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 class="text-4xl font-bold text-blue-600 mb-4">
            Hello, Tailwind!
      </h1>
      <p class="text-lg text-gray-600 max-w-md text-center">
            Edit the HTML and CSS to see changes. Tailwind classes will be highlighted.
      </p>
</div>`);
    const [cssCode, setCssCode] = useState('/* Add your custom CSS here */');

    const combinedCode = `
        <html lang="en">
              <head>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>${cssCode}</style>
              </head>
              <body>
                    ${htmlCode}
              </body>
        </html>
    `;

    useEffect(() => {
        // This effect will run on the client-side only
        import('@uiw/react-codemirror').then(() => {
            // CodeMirror is now loaded
        });
    }, []);

    return (
        <div className="container mx-auto p-4">
            <header className="m-8">
                <div className="container mx-auto px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold">United Chat</h1>
                        <nav>
                            <ul className="flex space-x-4">
                                <li><a href="#" className="text-blue-600 hover:text-blue-800">Home</a></li>
                                <li><a href="#" className="text-blue-600 hover:text-blue-800">Docs</a></li>
                                <li><a href="#" className="text-blue-600 hover:text-blue-800">Examples</a></li>
                            </ul>
                        </nav>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="@user"/>
                                    <AvatarFallback>U</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">user@example.com</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        Free plan
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>
                                Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                Upgrade plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator/>
                            <DropdownMenuItem>
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Editor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="html">
                            <TabsList>
                                <TabsTrigger value="html">HTML</TabsTrigger>
                                <TabsTrigger value="css">CSS</TabsTrigger>
                            </TabsList>
                            <TabsContent value="html">
                                <CodeMirror
                                    value={htmlCode}
                                    height="300px"
                                    maxHeight={"70vh"}
                                    extensions={[
                                        tailwindExtension,
                                        syntaxHighlighting(tailwindHighlighting)
                                    ]}
                                    onChange={(value: SetStateAction<string>) => setHtmlCode(value)}
                                    theme={dracula}
                                />
                            </TabsContent>
                            <TabsContent value="css">
                                <CodeMirror
                                    value={cssCode}
                                    height="300px"
                                    extensions={[css()]}
                                    onChange={(value) => setCssCode(value)}
                                    theme={dracula}
                                />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <iframe
                            srcDoc={combinedCode}
                            title="preview"
                            className="w-full h-[400px] border-0"
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}