import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppThemeProps {
  appTheme: string;
  onThemeChange: (value: string) => void;
}

export function AppTheme({ appTheme, onThemeChange }: AppThemeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App Theme Customization</CardTitle>
        <CardDescription>Choose a theme for the app interface</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={appTheme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a theme"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}