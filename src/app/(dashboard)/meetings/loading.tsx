import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col flex-1 py-4 px-8 gap-y-4">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-9 w-32" />
            </div>

            {/* Filter bar skeleton */}
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-24" />
            </div>

            {/* Table/Grid skeleton */}
            <div className="bg-background rounded-lg p-4 shadow-sm space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}
