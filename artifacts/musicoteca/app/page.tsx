import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="whitespace-nowrap font-serif font-medium text-[clamp(1.2rem,5vw,3rem)] tracking-[clamp(0.12em,1.6vw,0.45em)]">
          M U S I C O T E C A
        </h1>

        <div className="mt-12 w-full">
          <SearchBar />
        </div>
      </div>
    </main>
  );
}
