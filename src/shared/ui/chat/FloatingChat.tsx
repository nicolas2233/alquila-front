import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionUser } from "../../auth/session";
import { env } from "../../config/env";
import { useToast } from "../toast/ToastProvider";

type ChatRequest = {
  id: string;
  type: "INTEREST" | "VISIT";
  status: "NEW" | "CONTACTED" | "CLOSED";
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  createdAt: string;
  requesterUser?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  property: {
    id: string;
    title: string;
    operationType: string;
    propertyType: string;
    priceAmount: string;
    priceCurrency: string;
    location?: { addressLine?: string | null } | null;
  };
};

type ChatMessage = {
  id: string;
  message: string;
  createdAt: string;
  senderUser: { id: string; name?: string | null; avatarUrl?: string | null };
};

const requestTypeLabels: Record<string, string> = {
  INTEREST: "Me interesa",
  VISIT: "Reservar visita",
};

const getInitials = (value?: string | null) => {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0)).join("");
  return initials.toUpperCase() || "?";
};

const Avatar = ({
  label,
  size = "sm",
  avatarUrl,
  title,
}: {
  label: string;
  size?: "sm" | "md";
  avatarUrl?: string | null;
  title?: string;
}) => {
  const sizeClass = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  if (avatarUrl?.startsWith("emoji:")) {
    const value = avatarUrl.replace("emoji:", "");
    return (
      <div
        className={`flex ${sizeClass} items-center justify-center rounded-full bg-gold-500/20 text-sm`}
        aria-hidden="true"
        title={title}
      >
        {value}
      </div>
    );
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover`}
        title={title}
      />
    );
  }
  return (
    <div
      className={`flex ${sizeClass} items-center justify-center rounded-full bg-gold-500/20 text-gold-200`}
      aria-hidden="true"
      title={title}
    >
      {getInitials(label)}
    </div>
  );
};

export function FloatingChat({
  user,
  token,
}: {
  user: SessionUser | null;
  token: string | null;
}) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatRequest[]>([]);
  const [chatStatus, setChatStatus] = useState<"idle" | "loading" | "error">("idle");
  const [chatError, setChatError] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatRequest | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesStatus, setMessagesStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [messagesError, setMessagesError] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState<"idle" | "sending">("idle");
  const [replyError, setReplyError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isOwner = user?.role === "OWNER";
  const isAgency = user?.role?.startsWith("AGENCY") ?? false;
  const isVisitor = user?.role === "VISITOR";

  const canUseChat = !!token && (!!user ? isOwner || isAgency || isVisitor : false);

  const listEndpoint = useMemo(() => {
    if (!user) return "";
    return isVisitor ? "/contact-requests/mine" : "/contact-requests";
  }, [user, isVisitor]);


  const loadChats = useCallback(async () => {
    if (!token || !listEndpoint) {
      setChats([]);
      return;
    }
    setChatStatus("loading");
    setChatError("");
    try {
      const response = await fetch(`${env.apiUrl}${listEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar los chats.");
      }
      const data = (await response.json()) as { items: ChatRequest[] };
      setChats(data.items ?? []);
      setChatStatus("idle");
      if (!selectedChat && data.items?.length) {
        setSelectedChat(data.items[0]);
      }
    } catch (error) {
      setChatStatus("error");
      setChatError(error instanceof Error ? error.message : "No pudimos cargar los chats.");
    }
  }, [token, listEndpoint, selectedChat]);

  const loadMessages = useCallback(
    async (chat: ChatRequest) => {
      if (!token) return;
      setMessagesStatus("loading");
      setMessagesError("");
      try {
        const response = await fetch(
          `${env.apiUrl}/contact-requests/${chat.id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          throw new Error("No pudimos cargar el historial.");
        }
        const data = (await response.json()) as { items: ChatMessage[] };
        setMessages(data.items ?? []);
        setMessagesStatus("idle");
      } catch (error) {
        setMessagesStatus("error");
        setMessagesError(
          error instanceof Error ? error.message : "No pudimos cargar el historial."
        );
      }
    },
    [token]
  );

  const sendReply = useCallback(async () => {
    if (!token || !selectedChat) return;
    if (!replyMessage.trim() || replyMessage.trim().length < 3) {
      setReplyError("Escribe un mensaje de al menos 3 caracteres.");
      return;
    }
    setReplyStatus("sending");
    setReplyError("");
    try {
      const response = await fetch(
        `${env.apiUrl}/contact-requests/${selectedChat.id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: replyMessage.trim() }),
        }
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message ?? "No pudimos enviar el mensaje.");
      }
      const data = (await response.json()) as { message?: ChatMessage };
      if (data?.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
      setReplyMessage("");
      setReplyStatus("idle");
    } catch (error) {
      setReplyStatus("idle");
      setReplyError(error instanceof Error ? error.message : "No pudimos enviar el mensaje.");
    }
  }, [token, selectedChat, replyMessage]);

  useEffect(() => {
    if (!open) return;
    void loadChats();
    const interval = setInterval(() => {
      void loadChats();
    }, 20000);
    return () => clearInterval(interval);
  }, [open, loadChats]);

  useEffect(() => {
    if (!open || !selectedChat) return;
    void loadMessages(selectedChat);
  }, [open, selectedChat, loadMessages]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  if (!user) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] text-xl text-night-900 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
        onClick={() => {
          if (!canUseChat) {
            addToast("Inicia sesión para ver tus chats.", "warning");
            return;
          }
          setOpen((prev) => !prev);
        }}
        aria-label="Abrir chats"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[92vw] max-w-[640px] overflow-hidden rounded-3xl border border-white/10 bg-night-900/95 shadow-card sm:bottom-24 sm:right-6">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-white">
            <div className="flex items-center gap-2">
              <Avatar
                label={user?.name ?? user?.email ?? "Usuario"}
                size="md"
                avatarUrl={user?.avatarUrl ?? null}
                title={user?.name ?? user?.email ?? "Usuario"}
              />
              <div>Chats</div>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </button>
          </div>
          <div className="grid h-[70vh] max-h-[420px] grid-cols-[120px_1fr] sm:h-[380px] sm:grid-cols-[180px_1fr]">
            <div className="border-r border-white/10">
              <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[#9a948a]">
                <span>Conversaciones</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-2 py-0.5 text-[10px]"
                    onClick={() => void loadChats()}
                  >
                    Actualizar
                  </button>
                </div>
              </div>
              {chatStatus === "loading" && (
                <div className="px-3 py-2 text-[11px] text-[#9a948a]">Cargando...</div>
              )}
              {chatStatus === "error" && (
                <div className="px-3 py-2 text-[11px] text-[#f5b78a]">{chatError}</div>
              )}
              {chatStatus === "idle" && chats.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-[#9a948a]">
                  Sin conversaciones.
                </div>
              )}
              <div className="max-h-[400px] overflow-y-auto px-2 pb-3">
                {chats.map((chat) => {
                  const contactLabel = isVisitor
                    ? chat.property.title
                    : chat.requesterUser?.name ?? chat.name ?? chat.email ?? "Usuario";
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      className={`mb-2 w-full rounded-2xl border px-2 py-2 text-left text-[11px] ${
                        selectedChat?.id === chat.id
                          ? "border-gold-500/60 bg-night-900/80 text-white"
                          : "border-white/10 bg-night-900/60 text-[#c7c2b8]"
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar
                          label={contactLabel}
                          avatarUrl={
                            !isVisitor ? chat.requesterUser?.avatarUrl ?? null : null
                          }
                          title={contactLabel}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs text-white">
                            {chat.property.title}
                          </div>
                          <div className="truncate text-[10px] text-[#9a948a]">
                            {requestTypeLabels[chat.type] ?? chat.type}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex h-full flex-col">
              {selectedChat ? (
                <>
                  <div className="border-b border-white/10 px-4 py-3 text-xs text-[#9a948a]">
                    <div className="text-sm text-white">{selectedChat.property.title}</div>
                    <div className="text-[11px]">
                      {requestTypeLabels[selectedChat.type] ?? selectedChat.type}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 text-xs text-[#c7c2b8]">
                    {messagesStatus === "loading" && (
                      <div className="text-[11px] text-[#9a948a]">
                        Cargando historial...
                      </div>
                    )}
                    {messagesStatus === "error" && (
                      <div className="text-[11px] text-[#f5b78a]">{messagesError}</div>
                    )}
                    {messagesStatus === "idle" && messages.length === 0 && (
                      <div className="text-[11px] text-[#9a948a]">
                        Todav?a no hay mensajes.
                      </div>
                    )}
                    <div className="space-y-2">
                      {messages.map((message) => {
                        const isMine = message.senderUser?.id === user?.id;
                        const senderName =
                          message.senderUser?.name ??
                          (isMine ? (user?.name ?? user?.email ?? "Vos") : "Usuario");
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`flex items-end gap-2 ${
                                isMine ? "flex-row-reverse" : "flex-row"
                              }`}
                            >
                              <Avatar
                                label={senderName}
                                size="sm"
                                avatarUrl={
                                  isMine ? user?.avatarUrl ?? null : message.senderUser?.avatarUrl ?? null
                                }
                                title={senderName}
                              />
                              <div
                                className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs ${
                                  isMine
                                    ? "bg-gradient-to-r from-[#b88b50] to-[#e0c08a] text-night-900"
                                    : "border border-white/10 bg-night-950/70 text-white"
                                }`}
                              >
                                <div className="text-[10px] opacity-70">
                                  {isMine ? "Vos" : senderName} ·{" "}
                                  {new Date(message.createdAt).toLocaleString("es-AR")}
                                </div>
                                <div className="mt-1">{message.message}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                  <div className="border-t border-white/10 bg-night-900/95 px-3 py-3">
                    {replyError && (
                      <div className="mb-2 text-[11px] text-[#f5b78a]">{replyError}</div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea
                        className="min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-night-900/60 px-3 py-2 text-xs text-white"
                        placeholder="Escribe un mensaje..."
                        value={replyMessage}
                        onChange={(event) => setReplyMessage(event.target.value)}
                      />
                      <button
                        className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-3 py-2 text-[11px] font-semibold text-night-900 disabled:opacity-60"
                        type="button"
                        onClick={() => void sendReply()}
                        disabled={replyStatus === "sending"}
                      >
                        {replyStatus === "sending" ? "..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-[#9a948a]">
                  Selecciona un chat.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
