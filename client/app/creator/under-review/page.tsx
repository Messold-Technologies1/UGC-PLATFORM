import { AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnderReviewPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="mx-auto max-w-md text-center shadow-lg border-0 bg-white dark:bg-slate-900">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="size-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Your profile is under review</CardTitle>
          <CardDescription className="text-base mt-2">
            Thank you for registering! Our team is currently reviewing your application. We will notify you once your profile has been approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 flex items-start gap-3 text-sm text-left">
            <AlertCircle className="size-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              This process typically takes 24-48 hours. Please check your email for updates regarding your approval status.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
