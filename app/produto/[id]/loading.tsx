import { Navbar } from '@/components/Navbar';

export default function Loading() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid animate-pulse gap-10 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-bg-raised" />
          <div className="flex flex-col gap-4">
            <div className="h-6 w-3/4 rounded bg-bg-raised" />
            <div className="h-4 w-1/3 rounded bg-bg-raised" />
            <div className="h-9 w-1/2 rounded bg-bg-raised" />
            <div className="h-20 w-full rounded bg-bg-raised" />
            <div className="h-12 w-full rounded-full bg-bg-raised" />
          </div>
        </div>
      </div>
    </main>
  );
}
