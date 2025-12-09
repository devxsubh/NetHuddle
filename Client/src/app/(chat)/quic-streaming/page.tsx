import { QuicStreamingClient } from "./QuicStreamingClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function QuicStreamingPage() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("token")?.value;

  if (!token) {
    redirect('/auth/login');
  }

  return <QuicStreamingClient />;
}

