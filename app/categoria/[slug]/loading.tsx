import { Navbar } from '@/components/Navbar';
import { GridSkeleton } from '@/components/GridSkeleton';

export default function Loading() {
  return (
    <main>
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 h-7 w-56 animate-pulse rounded bg-bg-raised" />
        <GridSkeleton />
      </div>
    </main>
  );
}
