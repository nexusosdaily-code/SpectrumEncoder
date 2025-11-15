import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import type { User } from "@shared/schema";

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");

  // Search users
  const { data: searchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.trim().length >= 2,
  });

  const getInitials = (name?: string, mobile?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (mobile) {
      return mobile.slice(-2);
    }
    return "?";
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-cyan-400" />
            <CardTitle>Discover Users</CardTitle>
          </div>
          <CardDescription>Search for users by name or mobile number</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by display name or mobile number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>

          {searchQuery.trim().length < 2 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Enter at least 2 characters to search for users</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </p>
              
              {searchResults.map((user) => (
                <Link key={user.id} href={`/profile/${user.id}`}>
                  <Card className="p-4 hover-elevate cursor-pointer" data-testid={`card-user-${user.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20">
                          {getInitials(user.displayName || undefined, user.mobileNumber)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-username-${user.id}`}>
                            {user.displayName || "Anonymous User"}
                          </p>
                          {user.isOnline === 'true' && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                              Online
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-mobile-${user.id}`}>
                          {user.mobileNumber}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
