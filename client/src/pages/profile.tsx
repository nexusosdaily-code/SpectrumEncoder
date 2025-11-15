import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, UserMinus, Edit, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export default function Profile() {
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Get current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const isOwnProfile = currentUser?.id === userId;

  // Get profile data
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile", userId],
    enabled: !!userId,
  });

  // Get followers
  const { data: followers = [] } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "followers"],
    enabled: !!userId,
  });

  // Get following
  const { data: following = [] } = useQuery<User[]>({
    queryKey: ["/api/users", userId, "following"],
    enabled: !!userId,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { displayName?: string; bio?: string; avatarUrl?: string }) => {
      const res = await apiRequest("PATCH", "/api/profile", updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "follow" | "unfollow" }) => {
      if (action === "follow") {
        const res = await apiRequest("POST", `/api/follow/${userId}`, {});
        return await res.json();
      } else {
        const res = await apiRequest("DELETE", `/api/follow/${userId}`, {});
        return await res.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.userId, "followers"] });
      toast({
        title: variables.action === "follow" ? "Followed" : "Unfollowed",
        description: variables.action === "follow" ? "You are now following this user." : "You have unfollowed this user.",
      });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      displayName: displayName || undefined,
      bio: bio || undefined,
      avatarUrl: avatarUrl || undefined,
    });
  };

  const handleEditClick = () => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDisplayName("");
    setBio("");
    setAvatarUrl("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-profile" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>The requested user profile could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

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
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24" data-testid="avatar-profile">
              <AvatarImage src={profile.avatarUrl || undefined} alt={profile.displayName || profile.mobileNumber} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 text-foreground">
                {getInitials(profile.displayName || undefined, profile.mobileNumber)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl" data-testid="text-displayname">
                  {profile.displayName || "Anonymous User"}
                </CardTitle>
                {profile.isOnline === 'true' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400" data-testid="badge-online">
                    Online
                  </Badge>
                )}
              </div>
              
              <CardDescription className="mb-3" data-testid="text-mobile">
                {profile.mobileNumber}
              </CardDescription>
              
              <div className="flex gap-4 mb-3">
                <div className="text-center" data-testid="stat-followers">
                  <div className="text-2xl font-bold">{profile.followerCount}</div>
                  <div className="text-xs text-muted-foreground">Followers</div>
                </div>
                <div className="text-center" data-testid="stat-following">
                  <div className="text-2xl font-bold">{profile.followingCount}</div>
                  <div className="text-xs text-muted-foreground">Following</div>
                </div>
              </div>

              {!isOwnProfile && currentUser && (
                <Button
                  onClick={() => followMutation.mutate({ 
                    userId: profile.id, 
                    action: profile.isFollowing ? "unfollow" : "follow" 
                  })}
                  disabled={followMutation.isPending}
                  variant={profile.isFollowing ? "outline" : "default"}
                  data-testid={profile.isFollowing ? "button-unfollow" : "button-follow"}
                >
                  {followMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : profile.isFollowing ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {profile.isFollowing ? "Unfollow" : "Follow"}
                </Button>
              )}

              {isOwnProfile && !isEditing && (
                <Button onClick={handleEditClick} variant="outline" data-testid="button-edit-profile">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={100}
                  data-testid="input-displayname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  rows={4}
                  data-testid="textarea-bio"
                />
                <p className="text-xs text-muted-foreground">{bio.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  data-testid="input-avatar-url"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" data-testid="button-cancel-edit">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Bio</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-bio">
                    {profile.bio}
                  </p>
                </div>
              )}

              <Tabs defaultValue="followers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="followers" data-testid="tab-followers">
                    Followers ({profile.followerCount})
                  </TabsTrigger>
                  <TabsTrigger value="following" data-testid="tab-following">
                    Following ({profile.followingCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="followers" className="space-y-2">
                  {followers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No followers yet</p>
                  ) : (
                    followers.map((follower) => (
                      <Card key={follower.id} className="p-3" data-testid={`card-follower-${follower.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={follower.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(follower.displayName || undefined, follower.mobileNumber)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{follower.displayName || "Anonymous User"}</p>
                            <p className="text-xs text-muted-foreground">{follower.mobileNumber}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="following" className="space-y-2">
                  {following.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Not following anyone yet</p>
                  ) : (
                    following.map((user) => (
                      <Card key={user.id} className="p-3" data-testid={`card-following-${user.id}`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback>{getInitials(user.displayName || undefined, user.mobileNumber)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{user.displayName || "Anonymous User"}</p>
                            <p className="text-xs text-muted-foreground">{user.mobileNumber}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
