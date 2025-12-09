"use client";

import { CallHistoryList } from "@/components/calling/CallHistoryList";
import { selectCallHistory } from "@/lib/client/slices/callSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { PageWrapper } from "@/components/shared/PageWrapper";

export default function CallsPage() {
  const callHistory = useAppSelector(selectCallHistory);

  return (
    <PageWrapper
      title="Call History"
      description="View your recent voice and video calls"
      maxWidth="4xl"
    >
      {callHistory && callHistory.length === 0 ? (
        <div className="bg-secondary-dark rounded-lg p-12 border border-border text-center">
          <div className="text-6xl mb-4">📞</div>
          <span className="text-text text-lg">No recent calls</span>
          <p className="text-secondary-darker text-sm mt-2">
            Your call history will appear here
          </p>
        </div>
      ) : (
        <div className="bg-secondary-dark rounded-lg p-6 border border-border">
          <CallHistoryList callHistory={callHistory || []} />
        </div>
      )}
    </PageWrapper>
  );
}

