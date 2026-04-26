import { api } from "./api";

export type SupportMessageRow = {
  id: number;
  userId: string;
  message: string;
  isFromAdmin: boolean;
  isRead: boolean;
  createdAt: string;
};

export type SupportInboxThread = {
  userId: string;
  lastMessage: string;
  lastAt: string;
  lastFromAdmin: boolean;
  /** Есть непрочитанные сообщения от клиента (для админки) */
  hasUnread: boolean;
};

export async function postSupportMessage(params: {
  userId: number;
  message: string;
}): Promise<SupportMessageRow> {
  const res = await api.post<SupportMessageRow>("/support/message", {
    userId: String(params.userId),
    message: params.message,
  });
  return res.data;
}

export async function fetchSupportThread(params: {
  userId: number;
  viewerId: number;
}): Promise<SupportMessageRow[]> {
  const res = await api.get<SupportMessageRow[]>(`/support/${params.userId}`, {
    params: { viewerId: String(params.viewerId) },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function postSupportReply(params: {
  adminUserId: number;
  targetUserId: string;
  message: string;
}): Promise<SupportMessageRow> {
  const res = await api.post<SupportMessageRow>("/support/reply", {
    userId: String(params.adminUserId),
    targetUserId: params.targetUserId,
    message: params.message,
  });
  return res.data;
}

export async function fetchSupportInbox(
  adminUserId: number
): Promise<SupportInboxThread[]> {
  const res = await api.get<SupportInboxThread[]>("/support/inbox/list", {
    params: { userId: String(adminUserId) },
  });
  return Array.isArray(res.data) ? res.data : [];
}
