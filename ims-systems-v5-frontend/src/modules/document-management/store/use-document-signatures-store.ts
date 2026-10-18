import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DocumentSignatureStatus = "Pending" | "Signed";

export type DocumentSignatureRequest = {
  id: string;
  documentNodeId: string;
  inviteeType: "user" | "email";
  userId?: string;
  email?: string;
  displayName: string;
  status: DocumentSignatureStatus;
  message: string;
  requestedAt: string;
  signedAt: string | null;
};

type DocumentSignaturesState = {
  requests: DocumentSignatureRequest[];
  addRequests: (
    documentNodeId: string,
    invites: Array<{
      inviteeType: "user" | "email";
      userId?: string;
      email?: string;
      displayName: string;
      message?: string;
    }>
  ) => DocumentSignatureRequest[];
  markSigned: (id: string) => void;
  removeRequest: (id: string) => void;
  listForDocument: (documentNodeId: string) => DocumentSignatureRequest[];
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sig-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Demo signature requests (local only — full signing backend comes later).
 */
export const useDocumentSignaturesStore = create<DocumentSignaturesState>()(
  persist(
    (set, get) => ({
      requests: [],

      addRequests(documentNodeId, invites) {
        const now = new Date().toISOString();
        const created: DocumentSignatureRequest[] = invites.map((invite) => ({
          id: createId(),
          documentNodeId,
          inviteeType: invite.inviteeType,
          userId: invite.userId,
          email: invite.email,
          displayName: invite.displayName,
          status: "Pending",
          message: invite.message?.trim() ?? "",
          requestedAt: now,
          signedAt: null,
        }));
        set((state) => ({ requests: [...created, ...state.requests] }));
        return created;
      },

      markSigned(id) {
        set((state) => ({
          requests: state.requests.map((row) =>
            row.id === id
              ? {
                  ...row,
                  status: "Signed",
                  signedAt: new Date().toISOString(),
                }
              : row
          ),
        }));
      },

      removeRequest(id) {
        set((state) => ({
          requests: state.requests.filter((row) => row.id !== id),
        }));
      },

      listForDocument(documentNodeId) {
        return get().requests.filter(
          (row) => row.documentNodeId === documentNodeId
        );
      },
    }),
    { name: "ims-v5-document-signatures-demo" }
  )
);
