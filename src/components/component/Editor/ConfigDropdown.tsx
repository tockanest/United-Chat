import React from 'react'
import {Button} from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Input} from "@/components/ui/input"
import {Slider} from "@/components/ui/slider"
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"
import {Settings} from 'lucide-react'

interface ConfigDropdownProps {
	config: ConfigState
	onConfigChange: (key: keyof ConfigState, value: number | boolean | string) => void
}

export default function ConfigDropdown({config, onConfigChange}: ConfigDropdownProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon">
					<Settings className="h-4 w-4"/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-64 p-4">
				<div className="space-y-4">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center justify-between">
									<Label htmlFor="scaling" className="text-sm font-medium">Scaling</Label>
									<Switch
										id="scaling"
										checked={config.scaling}
										onCheckedChange={(checked) => onConfigChange('scaling', checked)}
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent align={"end"} className={"mb-4"}>
								<p>Enable or disable scaling</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					{config.scaling && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="space-y-2">
										<Label htmlFor="scalingValue" className="text-sm font-medium">Scaling
											Value</Label>
										<Slider
											id="scalingValue"
											min={0.1}
											max={2.0}
											step={0.1}
											value={[config.scalingValue]}
											onValueChange={([value]) => onConfigChange('scalingValue', value)}
										/>
										<div
											className="text-right text-sm text-muted-foreground">{config.scalingValue.toFixed(1)}</div>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Adjust the scaling value (max 2.0)</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex items-center justify-between">
									<Label htmlFor="scaling" className="text-sm font-medium">Fade Out Animation</Label>
									<Switch
										id="fadingOut"
										checked={config.fadeOut}
										onCheckedChange={(checked) => onConfigChange('fadeOut', checked)}
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent align={"end"} className={"mb-4"}>
								<p>Enable or disable fade out animation when a message is removed</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="messageTransition" className="text-sm font-medium">Message
										Transition</Label>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="outline" className="w-full justify-between">
												{config.messageTransition}
												<Settings className="h-4 w-4 opacity-50"/>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent className="w-56">
											<DropdownMenuRadioGroup value={
												config.messageTransition.charAt(0).toUpperCase() + config.messageTransition.slice(1)
											}
											                        onValueChange={(value) => onConfigChange('messageTransition', value)}>
												<DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
												<DropdownMenuRadioItem value="slide bottom">Slide from
													Bottom</DropdownMenuRadioItem>
												<DropdownMenuRadioItem value="slide in">Slide In</DropdownMenuRadioItem>
												<DropdownMenuRadioItem
													value="typewriter">Typewriter</DropdownMenuRadioItem>
											</DropdownMenuRadioGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Select the transition effect for new messages</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="messageRemoveTimer" className="text-sm font-medium">Message Remove
										Timer</Label>
									<Slider
										id="messageRemoveTimer"
										min={0.1}
										max={15.0}
										step={0.1}
										value={[config.messageRemoveTimer]}
										onValueChange={([value]) => onConfigChange('messageRemoveTimer', value)}
									/>
									<div
										className="text-right text-sm text-muted-foreground">{config.messageRemoveTimer.toFixed(1)}</div>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set the message remove timer for messages (default: 5 seconds)</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="maxMessages" className="text-sm font-medium">Max Messages</Label>
									<Input
										id="maxMessages"
										type="number"
										value={config.maxMessages}
										onChange={(e) => onConfigChange('maxMessages', parseInt(e.target.value))}
										className="w-full"
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>
									How many messages before the oldest message is removed?
									<br/>
									If the total messages exceed this number, the oldest message will be removed
									immediately, ignoring the fading out animation (if set) and all other message
									removal processes.
								</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="maxWidth" className="text-sm font-medium">Max Width</Label>
									<Input
										id="maxWidth"
										type="number"
										value={config.maxWidth}
										onChange={(e) => onConfigChange('maxWidth', parseInt(e.target.value))}
										className="w-full"
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set the maximum width (default: 800)</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="maxHeight" className="text-sm font-medium">Max Height</Label>
									<Input
										id="maxHeight"
										type="number"
										value={config.maxHeight}
										onChange={(e) => onConfigChange('maxHeight', parseInt(e.target.value))}
										className="w-full"
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set the maximum height (default: 600)</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="currentWidth" className="text-sm font-medium">Current Width</Label>
									<Input
										id="currentWidth"
										type="number"
										value={config.currentWidth}
										onChange={(e) => onConfigChange('currentWidth', parseInt(e.target.value))}
										className="w-full"
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set the current width</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="space-y-2">
									<Label htmlFor="currentHeight" className="text-sm font-medium">Current
										Height</Label>
									<Input
										id="currentHeight"
										type="number"
										value={config.currentHeight}
										onChange={(e) => onConfigChange('currentHeight', parseInt(e.target.value))}
										className="w-full"
									/>
								</div>
							</TooltipTrigger>
							<TooltipContent>
								<p>Set the current height</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}