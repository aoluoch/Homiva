import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, MessagesSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { cn, initials, timeAgo } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  useMarkThreadRead,
  useSendMessage,
  useThreadMessages,
  useThreads,
} from "@/hooks/useMessages";

export default function MessagesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: threads } = useThreads();
  const activeThread = params.get("t") ?? "";
  const to = params.get("to") ?? "";
  const showThread = Boolean(activeThread || to);

  const { data: messages } = useThreadMessages(activeThread || undefined);
  const send = useSendMessage();
  const markRead = useMarkThreadRead();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = threads?.find((t) => t.threadId === activeThread);
  const receiverId = active?.otherId ?? to;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!messages?.length) return;
    if (!messages.some((m) => m.receiverId === user?.$id && !m.read)) return;
    markRead.mutate(messages);
  }, [messages, markRead, user?.$id]);

  const submit = () => {
    if (!text.trim() || !receiverId) return;
    send.mutate(
      { receiverId, body: text.trim() },
      {
        onSuccess: () => {
          setText("");
          const next = new URLSearchParams(params);
          next.set("t", [user!.$id, receiverId].sort().join("_"));
          next.delete("to");
          setParams(next, { replace: true });
        },
      },
    );
  };

  const closeThread = () => {
    setParams({}, { replace: true });
  };

  return (
    <div className="page-shell">
      <h1 className="page-heading mb-6">Messages</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <div
          className={cn(
            "rounded-xl border bg-card",
            showThread && "hidden lg:block",
          )}
        >
          {threads && threads.length > 0 ? (
            <div className="divide-y">
              {threads.map((t) => (
                <button
                  key={t.threadId}
                  onClick={() => {
                    const next = new URLSearchParams();
                    next.set("t", t.threadId);
                    setParams(next, { replace: true });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary",
                    activeThread === t.threadId && "bg-secondary",
                  )}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(t.otherName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {t.otherName}
                      </span>
                      {t.unread > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                          {t.unread}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.lastMessage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex min-h-[min(60vh,32rem)] min-w-0 flex-col rounded-xl border bg-card",
            !showThread && "hidden lg:flex",
          )}
        >
          {showThread ? (
            <>
              <div className="flex items-center gap-2 border-b p-3 sm:p-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={closeThread}
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <p className="min-w-0 truncate font-medium">
                  {active?.otherName ?? "New conversation"}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages?.map((m) => {
                  const mine = m.senderId === user?.$id;
                  return (
                    <div
                      key={m.$id}
                      className={cn(
                        "flex flex-col",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm sm:max-w-[75%]",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary",
                        )}
                      >
                        {m.body}
                      </div>
                      <span className="mt-1 text-[10px] text-muted-foreground">
                        {timeAgo(m.$createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="flex items-center gap-2 border-t p-3">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Type a message..."
                  className="min-w-0"
                />
                <Button
                  size="icon"
                  className="shrink-0"
                  onClick={submit}
                  disabled={send.isPending || !text.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title="Select a conversation"
              description="Choose a thread on the left to view your messages."
              className="m-auto border-0 bg-transparent"
            />
          )}
        </div>
      </div>
    </div>
  );
}
