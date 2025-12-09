import { QuicStreamingClient } from "./QuicStreamingClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default async function QuicStreamingPage() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get("token")?.value;

  if (!token) {
    redirect('/auth/login');
  }

  return (
    <PageWrapper
      title="QUIC Streaming"
      description="High-performance video streaming using QUIC protocol"
      maxWidth="6xl"
    >
      <QuicStreamingClient />
    </PageWrapper>
  );
}

