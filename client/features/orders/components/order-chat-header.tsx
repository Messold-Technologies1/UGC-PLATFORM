/* eslint-disable @next/next/no-img-element */
import { MoreVertical } from "lucide-react"; //, Phone, Video
import { Button } from "@/components/ui/button";

export function OrderChatHeader() {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/10 bg-background/80 px-8 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          <img
            alt="Ananya"
            className="h-8 w-8 rounded-full border-2 border-background object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAw165N04o1WdUxqEEzktzrPgpx4FzOYrAorzOQMfKy6tEBhdNJOjL3278cd623yQRj_fTkiOtSWwrR1-o6Iz5qxkJOpjD2wqmUIl01Nj30Zq5MYEGonCgqUAQszdoZYiOsMFXf3Fk68pYuUCbjVOdUuWH7cyRQEC-a5TlOlK_6wlO753w1a1k-I6dtZjGLZHQYYQXbS_Wm8JJYEcjQVqxxXuAbyJfBJmX2EihJD_EaXp5-3Z_DI8lZrWLtRyrRfI69yHKJxaBACGw"
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-[10px] font-bold text-secondary-foreground">
            EP
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Prism Essence Mask Campaign
          </h2>
          <p className="text-[10px] uppercase tracking-tighter text-muted-foreground">
            Collaboration with Ananya Sharma
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Phone className="h-4 w-4" />
        </Button> */}
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
