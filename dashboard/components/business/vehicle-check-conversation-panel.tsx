"use client";

import {
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Send,
  UsersRound,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ManagerMultiSelect } from "@/components/business/manager-multi-select";
import { Button } from "@/components/ui/button";
import { cloudinaryAssetUrl } from "@/lib/damage-photo";
import { cn } from "@/lib/utils";
import { businessService } from "@/services/business.service";
import { useAuthStore } from "@/stores/auth.store";
import { VehicleCheck, VehicleCheckItem } from "@/types/business";
import {
  ConversationAttachment,
  ConversationMention,
  ConversationStatus,
  VehicleCheckConversationContext,
} from "@/types/conversations";

const acceptedFiles =
  "image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type MentionSearch = { end: number; query: string; start: number } | null;

export function VehicleCheckConversationPanel({
  className,
  publicActorId,
  publicToken,
  vehicleCheck,
}: {
  className?: string;
  publicActorId?: string;
  publicToken?: string;
  vehicleCheck: VehicleCheck;
}) {
  const currentUser = useAuthStore((state) => state.user);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSendingRef = useRef(false);
  const [context, setContext] =
    useState<VehicleCheckConversationContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingParticipants, setIsSavingParticipants] = useState(false);
  const [body, setBody] = useState("");
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<ConversationAttachment[]>([]);
  const [mentionedItemIds, setMentionedItemIds] = useState<string[]>([]);
  const [mentionSearch, setMentionSearch] = useState<MentionSearch>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent && isSendingRef.current) return;
      if (!silent) setIsLoading(true);
      try {
        const nextContext = publicToken
          ? await businessService.publicVehicleCheckConversation(publicToken)
          : await businessService.vehicleCheckConversation(vehicleCheck.id);
        setContext(nextContext);
        setManagerIds(
          nextContext.conversation?.participants
            .filter((participant) => participant.role === "DECISION_MAKER")
            .map((participant) => participant.userId) ?? [],
        );
        if (nextContext.conversation && !nextContext.restricted) {
          void (publicToken
            ? businessService.markPublicVehicleCheckConversationRead(
                publicToken,
              )
            : businessService.markVehicleCheckConversationRead(
                vehicleCheck.id,
              ));
        }
      } catch {
        if (!silent) toast.error("Impossible de charger la conversation.");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [publicToken, vehicleCheck.id],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionSearch) return [];
    const query = normalize(mentionSearch.query);
    return (vehicleCheck.items ?? [])
      .filter((item) =>
        normalize(`${item.vehiclePart.name} ${item.repairType.name}`).includes(
          query,
        ),
      )
      .slice(0, 6);
  }, [mentionSearch, vehicleCheck.items]);

  const isParticipant = Boolean(
    (publicActorId || currentUser?.id) &&
    context?.conversation?.participants.some(
      (participant) =>
        participant.userId === (publicActorId || currentUser?.id),
    ),
  );
  const messages = context?.conversation?.messages ?? [];
  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (!lastMessageId) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const viewport = messagesViewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [lastMessageId]);

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextBody = event.target.value;
    const cursor = event.target.selectionStart;
    setBody(nextBody);
    const match = nextBody.slice(0, cursor).match(/@([^@\n]*)$/);
    setMentionSearch(
      match
        ? { end: cursor, query: match[1], start: cursor - match[0].length }
        : null,
    );
  }

  function selectMention(item: VehicleCheckItem) {
    if (!mentionSearch) return;
    const inserted = `@${item.vehiclePart.name} `;
    const nextBody = `${body.slice(0, mentionSearch.start)}${inserted}${body.slice(mentionSearch.end)}`;
    const nextCursor = mentionSearch.start + inserted.length;
    setBody(nextBody);
    setMentionedItemIds((current) =>
      current.includes(item.id) ? current : [...current, item.id],
    );
    setMentionSearch(null);
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }

  async function createConversation() {
    if (!body.trim()) {
      toast.error("Ecrivez votre demande d'avis.");
      return;
    }
    if (!managerIds.length) {
      toast.error("Selectionnez au moins un manager.");
      return;
    }
    setIsSending(true);
    try {
      const nextContext = await businessService.createVehicleCheckConversation(
        vehicleCheck.id,
        {
          body: body.trim(),
          managerIds,
          mentionedItemIds: validMentionedItemIds(
            body,
            mentionedItemIds,
            vehicleCheck.items ?? [],
          ),
        },
      );
      setContext(nextContext);
      setBody("");
      setMentionedItemIds([]);
      toast.success("Demande d'avis envoyee.");
    } catch {
      toast.error("Impossible de creer la conversation.");
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage() {
    const trimmedBody = body.trim();
    if (!trimmedBody && !attachments.length) return;
    const previous = { attachments, body, mentionedItemIds };
    const payload = {
      attachments,
      body: trimmedBody || undefined,
      mentionedItemIds: validMentionedItemIds(
        body,
        mentionedItemIds,
        vehicleCheck.items ?? [],
      ),
    };
    const actorId = publicActorId || currentUser?.id;
    const optimisticId = `optimistic-${Date.now()}`;
    isSendingRef.current = true;
    setIsSending(true);
    setBody("");
    setAttachments([]);
    setMentionedItemIds([]);
    setMentionSearch(null);
    if (actorId) {
      setContext((current) =>
        current?.conversation
          ? {
              ...current,
              conversation: {
                ...current.conversation,
                messages: [
                  ...current.conversation.messages,
                  {
                    attachments: previous.attachments,
                    author: { firstName: "", id: actorId, lastName: "" },
                    authorId: actorId,
                    body: trimmedBody || null,
                    createdAt: new Date().toISOString(),
                    id: optimisticId,
                    mentions: [],
                  },
                ],
              },
            }
          : current,
      );
    }
    try {
      const nextContext = publicToken
        ? await businessService.createPublicVehicleCheckConversationMessage(
            publicToken,
            payload,
          )
        : await businessService.createVehicleCheckConversationMessage(
            vehicleCheck.id,
            payload,
          );
      setContext(nextContext);
    } catch {
      toast.error("Impossible d'envoyer ce message.");
      setBody(previous.body);
      setAttachments(previous.attachments);
      setMentionedItemIds(previous.mentionedItemIds);
      setContext((current) =>
        current?.conversation
          ? {
              ...current,
              conversation: {
                ...current.conversation,
                messages: current.conversation.messages.filter(
                  (message) => message.id !== optimisticId,
                ),
              },
            }
          : current,
      );
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (attachments.length + files.length > 5) {
      toast.error("Maximum 5 documents par message.");
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error("Chaque fichier doit peser moins de 10 Mo.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = [] as ConversationAttachment[];
      for (const file of files) {
        uploaded.push(
          publicToken
            ? await businessService.uploadPublicConversationAttachment(
                publicToken,
                file,
              )
            : await businessService.uploadConversationAttachment(
                vehicleCheck.id,
                file,
              ),
        );
      }
      setAttachments((current) => [...current, ...uploaded]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter ce document.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function saveParticipants(nextManagerIds: string[]) {
    if (!nextManagerIds.length) {
      toast.error("Conservez au moins un manager dans la conversation.");
      return;
    }
    setIsSavingParticipants(true);
    try {
      const nextContext =
        await businessService.updateVehicleCheckConversationParticipants(
          vehicleCheck.id,
          nextManagerIds,
        );
      setContext(nextContext);
      setManagerIds(nextManagerIds);
      toast.success("Participants mis a jour.");
    } catch {
      toast.error("Impossible de modifier les participants.");
    } finally {
      setIsSavingParticipants(false);
    }
  }

  async function changeStatus(status: ConversationStatus) {
    try {
      const nextContext = publicToken
        ? await businessService.updatePublicVehicleCheckConversationStatus(
            publicToken,
            status,
          )
        : await businessService.updateVehicleCheckConversationStatus(
            vehicleCheck.id,
            status,
          );
      setContext(nextContext);
      toast.success(
        status === "OPEN" ? "Conversation rouverte." : "Conversation resolue.",
      );
    } catch {
      toast.error("Impossible de changer le statut de la conversation.");
    }
  }

  return (
    <aside
      id="avis"
      className={cn(
        "flex min-h-0 scroll-mt-20 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:sticky lg:top-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <MessageSquareText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950">
              Avis et conversation
            </h2>
            <p className="truncate text-xs text-gray-500">
              Echange lie a ce controle
            </p>
          </div>
        </div>
        {context?.conversation ? (
          <StatusBadge status={context.conversation.status} />
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : context?.restricted ? (
        <EmptyState
          description="Le collaborateur ne vous a pas ajoute a cet echange."
          title="Conversation reservee aux participants"
        />
      ) : !context?.conversation ? (
        <div className="space-y-4 p-4">
          {vehicleCheck.status === "DRAFT" ? (
            <EmptyState
              description="Terminez le controle pour solliciter un avis."
              title="Avis disponible apres le controle"
            />
          ) : context?.canManageParticipants ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  Managers sollicites
                </label>
                <ManagerMultiSelect
                  managers={context.availableManagers}
                  placeholder="Selectionner un ou plusieurs managers"
                  value={managerIds}
                  onChange={setManagerIds}
                />
                {!context.availableManagers.length ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Aucun manager n&apos;est attribue a ce collaborateur.
                  </p>
                ) : null}
              </div>
              <MessageComposer
                body={body}
                disabled={!context.availableManagers.length}
                isSending={isSending}
                mentionSearch={mentionSearch}
                mentionSuggestions={mentionSuggestions}
                textareaRef={textareaRef}
                title="Votre demande"
                onBodyChange={handleBodyChange}
                onMentionSelect={selectMention}
                onSend={() => void createConversation()}
              />
            </>
          ) : (
            <EmptyState
              description="Aucune demande d'avis n'a encore ete ouverte."
              title="Pas de conversation"
            />
          )}
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-gray-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <UsersRound className="mr-1 h-3.5 w-3.5 text-gray-400" />
              {context.conversation.participants.map((participant) => (
                <span
                  className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                  key={participant.id}
                >
                  {participant.user.firstName} {participant.user.lastName}
                </span>
              ))}
            </div>
            {context.canManageParticipants ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-teal-700">
                  Modifier les managers participants
                </summary>
                <div className="mt-2">
                  <ManagerMultiSelect
                    disabled={isSavingParticipants}
                    isSaving={isSavingParticipants}
                    managers={context.availableManagers}
                    value={managerIds}
                    onSave={saveParticipants}
                  />
                </div>
              </details>
            ) : null}
          </div>

          <div
            aria-live="polite"
            className="h-[clamp(20rem,52vh,34rem)] space-y-3 overflow-y-auto overscroll-contain bg-gray-50/60 p-4 [scrollbar-gutter:stable] lg:h-auto lg:min-h-0 lg:flex-1"
            ref={messagesViewportRef}
          >
            {context.conversation.messages.length ? (
              context.conversation.messages.map((message) => {
                const mine =
                  message.authorId === (publicActorId || currentUser?.id);
                return (
                  <article
                    className={cn(
                      "max-w-[92%] rounded-lg border px-3 py-2.5",
                      mine
                        ? "ml-auto border-teal-100 bg-teal-50"
                        : "border-gray-200 bg-white",
                    )}
                    key={message.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {mine
                          ? "Vous"
                          : `${message.author.firstName} ${message.author.lastName}`}
                      </p>
                      <time
                        className="shrink-0 text-[10px] text-gray-400"
                        dateTime={message.createdAt}
                      >
                        {formatMessageDate(message.createdAt)}
                      </time>
                    </div>
                    {message.body ? (
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-5 text-gray-700">
                        {renderMentionedBody(message.body, message.mentions)}
                      </p>
                    ) : null}
                    {message.attachments.length ? (
                      <div className="mt-2 space-y-1.5">
                        {message.attachments.map((attachment) => (
                          <AttachmentLink
                            attachment={attachment}
                            key={attachment.id ?? attachment.publicId}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">
                Aucun message.
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-white p-4">
            {context.canPost ? (
              <>
                <MessageComposer
                  attachments={attachments}
                  body={body}
                  isSending={isSending}
                  isUploading={isUploading}
                  mentionSearch={mentionSearch}
                  mentionSuggestions={mentionSuggestions}
                  textareaRef={textareaRef}
                  onAttachmentRemove={(publicId) =>
                    setAttachments((current) =>
                      current.filter((item) => item.publicId !== publicId),
                    )
                  }
                  onBodyChange={handleBodyChange}
                  onFileChange={uploadFiles}
                  onMentionSelect={selectMention}
                  onSend={() => void sendMessage()}
                />
                <p className="mt-2 text-[11px] text-gray-400">
                  Tapez @ pour mentionner precisement une reparation.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {context.conversation.status === "CLOSED"
                  ? "Cette conversation est fermee."
                  : context.conversation.status === "RESOLVED"
                    ? "Cette conversation est resolue. Rouvrez-la pour ecrire un nouveau message."
                    : "Vous ne pouvez pas repondre a cette conversation."}
              </p>
            )}
            {isParticipant && context.conversation.status !== "CLOSED" ? (
              <Button
                className="mt-3 w-full"
                size="sm"
                type="button"
                variant={
                  context.conversation.status === "OPEN"
                    ? "outline"
                    : "default"
                }
                onClick={() =>
                  void changeStatus(
                    context.conversation?.status === "OPEN"
                      ? "RESOLVED"
                      : "OPEN",
                  )
                }
              >
                {context.conversation.status === "OPEN" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                {context.conversation.status === "OPEN"
                  ? "Marquer comme resolue"
                  : "Rouvrir pour repondre"}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </aside>
  );
}

function MessageComposer({
  attachments = [],
  body,
  disabled = false,
  isSending,
  isUploading = false,
  mentionSearch,
  mentionSuggestions,
  onAttachmentRemove,
  onBodyChange,
  onFileChange,
  onMentionSelect,
  onSend,
  textareaRef,
  title,
}: {
  attachments?: ConversationAttachment[];
  body: string;
  disabled?: boolean;
  isSending: boolean;
  isUploading?: boolean;
  mentionSearch: MentionSearch;
  mentionSuggestions: VehicleCheckItem[];
  onAttachmentRemove?: (publicId: string) => void;
  onBodyChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onMentionSelect: (item: VehicleCheckItem) => void;
  onSend: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  title?: string;
}) {
  return (
    <div>
      {title ? (
        <label className="mb-2 block text-xs font-semibold text-gray-700">
          {title}
        </label>
      ) : null}
      <div className="relative">
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-50"
          disabled={disabled || isSending}
          maxLength={5000}
          placeholder="Ecrivez un message... Tapez @ pour citer une reparation."
          ref={textareaRef}
          value={body}
          onChange={onBodyChange}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              onSend();
            }
          }}
        />
        {mentionSearch && mentionSuggestions.length ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            {mentionSuggestions.map((item) => (
              <button
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50"
                key={item.id}
                type="button"
                onClick={() => onMentionSelect(item)}
              >
                <span className="truncate text-sm font-medium text-gray-900">
                  @{item.vehiclePart.name}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {item.repairType.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {attachments.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <span
              className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
              key={attachment.publicId}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-40 truncate">
                {attachment.originalName}
              </span>
              <button
                aria-label={`Retirer ${attachment.originalName}`}
                className="rounded p-0.5 hover:bg-gray-200"
                type="button"
                onClick={() => onAttachmentRemove?.(attachment.publicId)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        {onFileChange ? (
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
            <span className="sr-only sm:not-sr-only">Document</span>
            <input
              accept={acceptedFiles}
              className="sr-only"
              disabled={isUploading || isSending}
              multiple
              type="file"
              onChange={onFileChange}
            />
          </label>
        ) : (
          <span className="text-[11px] text-gray-400">
            Ctrl/Cmd + Entree pour envoyer
          </span>
        )}
        <Button
          disabled={
            disabled ||
            isSending ||
            isUploading ||
            (!body.trim() && !attachments.length)
          }
          size="sm"
          type="button"
          onClick={onSend}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Envoyer
        </Button>
      </div>
    </div>
  );
}

function AttachmentLink({
  attachment,
}: {
  attachment: ConversationAttachment;
}) {
  const isImage = attachment.mimeType.startsWith("image/");
  return (
    <a
      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 hover:border-teal-200 hover:text-teal-700"
      href={cloudinaryAssetUrl(attachment.secureUrl)}
      rel="noreferrer"
      target="_blank"
    >
      {isImage ? (
        <ImageIcon className="h-4 w-4 shrink-0" />
      ) : (
        <FileText className="h-4 w-4 shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{attachment.originalName}</span>
      <span className="shrink-0 text-gray-400">
        {formatBytes(attachment.bytes)}
      </span>
    </a>
  );
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <MessageSquareText className="mx-auto h-7 w-7 text-gray-300" />
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ConversationStatus }) {
  const label =
    status === "OPEN"
      ? "Ouverte"
      : status === "RESOLVED"
        ? "Resolue"
        : "Fermee";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-[10px] font-semibold",
        status === "OPEN"
          ? "bg-emerald-50 text-emerald-700"
          : status === "RESOLVED"
            ? "bg-blue-50 text-blue-700"
            : "bg-gray-100 text-gray-600",
      )}
    >
      {label}
    </span>
  );
}

function renderMentionedBody(
  body: string,
  mentions: ConversationMention[],
): ReactNode {
  if (!mentions.length) return body;
  const labels = [...new Set(mentions.map((mention) => mention.label))].sort(
    (a, b) => b.length - a.length,
  );
  const expression = new RegExp(
    `(@(?:${labels.map(escapeRegExp).join("|")}))`,
    "gi",
  );
  const mentionByLabel = new Map(
    mentions.map((mention) => [normalize(mention.label), mention]),
  );
  return body.split(expression).map((part, index) => {
    if (!part.startsWith("@"))
      return <span key={`${index}-${part}`}>{part}</span>;
    const mention = mentionByLabel.get(normalize(part.slice(1)));
    if (!mention) return <span key={`${index}-${part}`}>{part}</span>;
    return (
      <button
        className="rounded bg-teal-100 px-1 font-medium text-teal-800 hover:bg-teal-200"
        key={`${index}-${part}`}
        title={`${mention.vehicleCheckItem.vehiclePart.name} · ${mention.vehicleCheckItem.repairType.name}`}
        type="button"
        onClick={() => focusRepair(mention.vehicleCheckItemId)}
      >
        {part}
      </button>
    );
  });
}

function focusRepair(itemId: string) {
  const element = document.getElementById(`repair-${itemId}`);
  element?.scrollIntoView({ behavior: "smooth", block: "center" });
  element?.classList.add("ring-2", "ring-teal-400", "ring-offset-2");
  window.setTimeout(
    () => element?.classList.remove("ring-2", "ring-teal-400", "ring-offset-2"),
    1800,
  );
}

function validMentionedItemIds(
  body: string,
  ids: string[],
  items: VehicleCheckItem[],
) {
  const normalizedBody = normalize(body);
  return ids.filter((id) => {
    const item = items.find((candidate) => candidate.id === id);
    return item
      ? normalizedBody.includes(normalize(`@${item.vehiclePart.name}`))
      : false;
  });
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
