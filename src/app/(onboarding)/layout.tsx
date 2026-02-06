export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">O</div>
          <span className="text-xl font-bold">Oscar</span>
          <span className="text-muted-foreground ml-2">Setup Wizard</span>
        </div>
        {children}
      </div>
    </div>
  );
}
