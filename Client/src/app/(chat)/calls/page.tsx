"use client";

import { CallHistoryList } from "@/components/calling/CallHistoryList";
import { selectCallHistory } from "@/lib/client/slices/callSlice";
import { useAppSelector } from "@/lib/client/store/hooks";

export default function CallsPage() {
  const callHistory = useAppSelector(selectCallHistory);

  return (
    <div className="h-full w-full p-4 max-md:p-2 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text mb-6">Call History</h1>
        {callHistory && callHistory.length === 0 ? (
          <div className="text-center mt-8">
            <span className="text-text text-lg">No recent calls</span>
          </div>
        ) : (
          <CallHistoryList callHistory={callHistory || []} />
        )}
      </div>
    </div>
  );
}

