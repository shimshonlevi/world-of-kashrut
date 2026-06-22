'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Bell, Wrench } from 'lucide-react';
import { UsersView } from './users-view';
import { NotificationSettings } from './notification-settings';
import { ToolsView } from './tools-view';

export function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">הגדרות מערכת</h2>
        <p className="text-muted-foreground">משתמשים, התראות וכלים — כל הגדרות המערכת במקום אחד</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            משתמשים
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            התראות
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2">
            <Wrench className="h-4 w-4" />
            כלים
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <UsersView />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationSettings />
        </TabsContent>
        <TabsContent value="tools" className="mt-4">
          <ToolsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
