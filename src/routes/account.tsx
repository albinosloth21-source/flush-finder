import { createFileRoute } from "@tanstack/react-router";
import { AccountScreen } from "@/components/account-screen";

export const Route = createFileRoute("/account")({
  ssr: false,
  component: function Account() {
    return <AccountScreen />;
  },
});
