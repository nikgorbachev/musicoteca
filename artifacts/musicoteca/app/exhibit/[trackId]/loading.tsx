export default function Loading() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-3 px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey animate-pulse">
        Opening the exhibit
      </p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-warm-grey dark:bg-cool-grey animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </main>
  );
}
