interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return <div className="flex items-center justify-between gap-4 border-b border-red-200 bg-red-50 px-5 py-2.5 text-sm text-red-800" role="alert"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{message}</span><Button variant="ghost" size="icon" onClick={onDismiss} title="Dismiss error"><X className="h-4 w-4" /></Button></div>;
}
import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";
