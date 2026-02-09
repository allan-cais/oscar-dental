"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText } from "lucide-react"

export default function AppealWorkspacePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>Appeal Workspace</CardTitle>
          <CardDescription>
            Select a denial from the denials list to create or view an appeal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/rcm/denials">
              <ArrowLeft className="mr-2 size-4" />
              Go to Denials
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
