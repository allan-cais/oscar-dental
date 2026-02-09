"use client";

import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataEmptyStateProps {
  resource: string;
  message?: string;
  onSync?: () => void;
}

export function DataEmptyState({ resource, message, onSync }: DataEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">
        No {resource} found
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {message ?? `Run a sync to pull ${resource} data from your practice management system.`}
      </p>
      {onSync && (
        <Button variant="outline" size="sm" onClick={onSync}>
          Run Sync
        </Button>
      )}
    </div>
  );
}
