import { useDebounce } from "@/hooks/useUtils/useDebounce";
import { useGetUserFriendRequestsQuery } from "@/lib/client/rtk-query/request.api";
import { useSearchUsersQuery } from "@/lib/client/rtk-query/user.api";
import { useEffect, useState } from "react";
import { useSendFriendRequest } from "../../hooks/useFriend/useSendFriendRequest";
import { selectLoggedInUser } from "../../lib/client/slices/authSlice";
import { useAppSelector } from "../../lib/client/store/hooks";
import { CircleLoading } from "../shared/CircleLoading";
import { UserList } from "./UserList";

const AddFriendForm = () => {
  const [inputVal, setInputVal] = useState<string>("");
  const loggedInUserId = useAppSelector(selectLoggedInUser)?.id;

  const { data: friends } = useGetUserFriendRequestsQuery();

  const { sendFriendRequest } = useSendFriendRequest();

  const debouncedInputVal = useDebounce(inputVal, 600);

  // Search users when debounced input changes
  const {
    data: searchResult,
    isLoading: isSearching,
    error: searchError,
  } = useSearchUsersQuery(
    { username: debouncedInputVal },
    { skip: !debouncedInputVal || debouncedInputVal.trim().length === 0 }
  );

  const users = searchResult?.success ? searchResult.data : [];

  const hanldeSendFriendRequest = (receiverId: string) => {
    sendFriendRequest({ receiverId });
  };

  return (
    <div className="flex flex-col gap-y-4 min-h-72 max-h-96 overflow-y-auto">
      <input
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        className="p-3 rounded text-text bg-background w-full border-none outline-none"
        type="text"
        placeholder="Search username"
      />

      <div>
        {isSearching && (
            <div className="flex justify-center mt-5">
            <CircleLoading />
            </div>
        )}
        {!isSearching && users && users.length > 0 && friends && loggedInUserId ? (
          <UserList
            users={users}
            friends={friends}
            loggedInUserId={loggedInUserId}
            sendFriendRequest={hanldeSendFriendRequest}
          />
        ) : (
          !isSearching &&
          !inputVal?.trim() && (
            <p className="text-center mt-16">Go on try the speed!</p>
          )
        )}
        {!isSearching && inputVal?.trim() && users && users.length === 0 && (
          <p className="text-center mt-16">No users found</p>
        )}
      </div>
    </div>
  );
};

export default AddFriendForm;
