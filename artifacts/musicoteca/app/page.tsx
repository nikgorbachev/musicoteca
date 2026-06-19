import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <h1 className="font-serif text-3xl font-medium tracking-[0.45em] sm:text-4xl md:text-5xl">
          M U S I C O T E C A
        </h1>

        <div className="mt-12 w-full">
          <SearchBar />
        </div>
      </div>
    </main>
  );
}
