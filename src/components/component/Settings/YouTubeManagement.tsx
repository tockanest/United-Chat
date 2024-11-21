import React from 'react';
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Edit, RefreshCw, Trash2} from "lucide-react";

interface YouTubeManagementProps {
	liveStreams: LiveStream[];
	selectedStreams: string[];
	handleRemoveSelected: () => void;
	handleSelectAll: () => void;
	handleSelectStream: (id: string) => void;
}

export function YouTubeManagement(
	{
		liveStreams,
		selectedStreams,
		handleRemoveSelected,
		handleSelectAll,
		handleSelectStream
	}: YouTubeManagementProps) {
	return (
		<Card className="mb-4">
			<CardHeader>
				<CardTitle>YouTube Live Management</CardTitle>
				<CardDescription>Manage your YouTube live streams</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex justify-between items-center">
					<div>
						<Button
							variant="outline"
							className="mr-2"
							onClick={handleRemoveSelected}
							disabled={selectedStreams.length === 0}
						>
							Remove Selected
						</Button>
						<Button variant="outline" className="mr-2" disabled={selectedStreams.length === 0}>
							Mass Edit
						</Button>
						<Button variant="outline" disabled={selectedStreams.length === 0}>
							Mass Update
						</Button>
					</div>
				</div>
				
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[50px]">
								<Checkbox
									checked={selectedStreams.length === liveStreams.length}
									onCheckedChange={handleSelectAll}
								/>
							</TableHead>
							<TableHead>Video Name</TableHead>
							<TableHead>Scheduled Time</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{liveStreams.map((stream) => (
							<TableRow key={stream.id}>
								<TableCell>
									<Checkbox
										checked={selectedStreams.includes(stream.id)}
										onCheckedChange={() => handleSelectStream(stream.id)}
									/>
								</TableCell>
								<TableCell>{stream.name}</TableCell>
								<TableCell>{stream.scheduledTime || 'Not scheduled'}</TableCell>
								<TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${
	                  stream.status === 'live' ? 'bg-green-100 text-green-800' :
		                  stream.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
			                  stream.status === 'offline' ? 'bg-yellow-100 text-red-500' : 'bg-gray-100 text-gray-800'
                  }
                  `}>
                    {stream.status.charAt(0).toUpperCase() + stream.status.slice(1)}
                  </span>
								</TableCell>
								<TableCell className="text-right">
									<Button variant="ghost" size="icon" className="mr-2">
										<Edit className="h-4 w-4"/>
									</Button>
									<Button variant="ghost" size="icon" className="mr-2">
										<RefreshCw className="h-4 w-4"/>
									</Button>
									<Button variant="ghost" size="icon" disabled={stream.status === 'live'}>
										<Trash2 className="h-4 w-4"/>
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
