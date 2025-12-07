"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export const HomeView = () => {

  const trpc = useTRPC(); // Access the tRPC client
  const {data} = useQuery(trpc.hello.queryOptions({text: "Ankit"})); // Example usage of React Query

  return (
  <div className="flex flex-col p-4 gap-y-4">
    {/* rendering data.greeting */}
    {data ?. greeting}
  </div>
);
};

