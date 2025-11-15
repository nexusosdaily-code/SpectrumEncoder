import { Save, Trash2, Clock, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedMessage } from "@shared/schema";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppSidebarProps {
  onLoadMessage: (message: SavedMessage) => void;
}

export function AppSidebar({ onLoadMessage }: AppSidebarProps) {
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery<SavedMessage[]>({
    queryKey: ["/api/messages"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message Deleted",
        description: "Saved message removed from library",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Could not delete message. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Sidebar data-testid="sidebar-messages">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Saved Messages
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground" data-testid="text-loading">
                Loading...
              </div>
            ) : messages.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground" data-testid="text-empty">
                No saved messages yet
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <SidebarMenu>
                  {messages.map((msg) => (
                    <SidebarMenuItem key={msg.id} data-testid={`message-item-${msg.id}`}>
                      <div className="flex flex-col gap-1 p-2 rounded-md hover-elevate">
                        <SidebarMenuButton
                          onClick={() => onLoadMessage(msg)}
                          className="justify-start h-auto p-0"
                          data-testid={`button-load-${msg.id}`}
                        >
                          <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {msg.message}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>TS: {msg.tsMs}ms</span>
                              <span>TG: {msg.tgMs}ms</span>
                            </div>
                          </div>
                        </SidebarMenuButton>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(msg.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-7 w-full justify-start gap-2"
                          data-testid={`button-delete-${msg.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </ScrollArea>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
