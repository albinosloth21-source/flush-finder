import { createFileRoute } from "@tanstack/react-router";
import { FinderApp } from "@/components/finder-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FinderApp />;
}
