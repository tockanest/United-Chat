import React from "react"
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"
import {Input} from "@/components/ui/input"
import {handleQuickResize, handleQuickResizeBlur} from "@/components/component/Main/Helpers/resizeUtils"
import {AlertCircle, InfoIcon, LayoutIcon} from "lucide-react"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import {Button} from "@/components/ui/button"
import {getLayoutIcon} from "@/components/component/Main/Helpers/MainFrame"

type PreviewHeaderProps = {
	quickResizeValue: string
	setQuickResizeValue: React.Dispatch<React.SetStateAction<string>>
	setEditorSize: React.Dispatch<React.SetStateAction<number>>
	setPendingResize: React.Dispatch<React.SetStateAction<boolean>>
	pendingResize: boolean
	previewPosition: 'right' | 'bottom'
	setPreviewPosition: React.Dispatch<React.SetStateAction<PreviewPosition>>
}

export default function PreviewHeader({
	                                      quickResizeValue,
	                                      setQuickResizeValue,
	                                      setEditorSize,
	                                      setPendingResize,
	                                      pendingResize,
	                                      previewPosition,
	                                      setPreviewPosition,
                                      }: PreviewHeaderProps) {
	return (
		<div className="flex items-center justify-between space-x-2 px-4 py-2 border-b">
			<div className="flex items-center space-x-2">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="relative">
								<Input
									type="number"
									min={15}
									max={100}
									value={quickResizeValue}
									onChange={(event) => {
										handleQuickResize(event, setQuickResizeValue, setPendingResize)
									}}
									onBlur={() => {
										handleQuickResizeBlur(quickResizeValue, setEditorSize, setPendingResize, pendingResize)
									}}
									className={`w-20 ${pendingResize ? 'border-yellow-500' : ''}`}
									placeholder="Size %"
								/>
								{pendingResize && (
									<AlertCircle
										className="w-4 h-4 text-yellow-500 absolute right-2 top-1/2 transform -translate-y-1/2"
									/>
								)}
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>Enter a value between 15 and 100 to resize the preview.</p>
							<p>Changes will apply when you leave the input field.</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<LayoutIcon className="h-4 w-4 mr-2"/>
							{getLayoutIcon(previewPosition)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem onSelect={() => setPreviewPosition('right')}>
							Right {previewPosition === 'right' && '✓'}
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setPreviewPosition('bottom')}>
							Bottom {previewPosition === 'bottom' && '✓'}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button variant="ghost" size="sm" className="p-0">
							<InfoIcon className="h-5 w-5 text-muted-foreground"/>
						</Button>
					</TooltipTrigger>
					<TooltipContent className={"w-64"}>
						<p>
							Please note that this is a preview of how your code will look in a browser. It may not be
							100% accurate on your streaming app.
						</p><br/>
						<p>
							And while I do recommend you using the scale feature, please keep in mind that it will not
							change on preview.
						</p><br/>
						<p>
							You will also need to keep in mind that scaling will make the total width change, so please
							check the documentation for more information.
						</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
}