import { useEffect } from "react";
import { prepareNativeShell } from "@/lib/native";

export function NativeShell() {
  useEffect(() => {
    void prepareNativeShell();
  }, []);
  return null;
}
