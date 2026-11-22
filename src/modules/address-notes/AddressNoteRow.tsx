import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, useToast } from "@/admin-web-components";
import {
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} from "@/api/addressNoteApi";
import type { AddressNoteAdminDto } from "@/backend-admin-sdk";
import { useTranslation } from "react-i18next";
// TFunction is the type of t, so a plain helper can take it as a parameter.
import type { TFunction } from "i18next";
import { useServerText } from "@/i18n/useServerText";
import { useFormat } from "@/i18n/useFormat";

// "39.36400, 22.94800", as the backend writes points in its records.
// `Pick<Type, "a" | "b">` is a TypeScript helper: the same type with only the named fields kept.
export const pointText = (
  note: Pick<AddressNoteAdminDto, "latitude" | "longitude">
): string => `${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)}`;

// Who wrote a note: a rider (linked to their page, for abuse), or the co-op itself.
const authorOf = (note: AddressNoteAdminDto, t: TFunction) => {
  if (note.authorCourierId) {
    return (
      <Link href={`/couriers/${note.authorCourierId}`} className="underline">
        {note.authorName || t("addressNotes.row.aRider")}
      </Link>
    );
  }
  return note.actor === "ADMIN"
    ? t("addressNotes.row.anAdmin")
    : note.actor === "PARTNER"
    ? t("addressNotes.row.aRestaurant")
    : t("addressNotes.row.unknown");
};

// Which action, if any, is waiting for its second ask.
type Asking = "none" | "delete" | "dismiss";

// Spec 0053 (AC-7): one rider note: its text, place, author (admin only), dates and flags, with
// Delete and Dismiss flags. Both ask a second time (row 82 review: dismissing deletes the riders'
// reports, as deleting deletes the note).
export function AddressNoteRow({ note }: { note: AddressNoteAdminDto }) {
  const { toast } = useToast();
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation();
  // errorText: the server's refusal in the reader's language, or our own sentence when it gave none.
  const { errorText } = useServerText();
  // Dates in the reader's language, on Athens time.
  const f = useFormat();
  const [asking, setAsking] = useState<Asking>("none");
  const confirming = asking !== "none";
  const [deleteNote, deleteState] = useDeleteAddressNoteMutation();
  const [dismissFlags, dismissState] = useDismissAddressNoteFlagsMutation();
  const busy = deleteState.isLoading || dismissState.isLoading;

  // Row 82 review: keyboard focus follows the buttons as they swap. A second ask puts it on the safe
  // choice ("Keep..."); closing the ask puts it back on the button that opened it.
  // `useRef` holds a link to a DOM button that survives re-renders without causing one.
  const keepRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const lastAsked = useRef<Asking>("none");
  useEffect(() => {
    if (asking !== "none") {
      keepRef.current?.focus();
    } else if (lastAsked.current === "delete") {
      deleteRef.current?.focus();
    } else if (lastAsked.current === "dismiss") {
      // The Dismiss button is gone once the flags are; Delete is the next button along then.
      (dismissRef.current ?? deleteRef.current)?.focus();
    }
    lastAsked.current = asking;
  }, [asking]);

  const remove = async () => {
    try {
      await deleteNote({ id: note.id }).unwrap();
      toast({ title: t("addressNotes.row.deleted") });
    } catch (err: any) {
      toast({
        title: errorText(err, t("addressNotes.row.deleteFailed")),
        variant: "destructive",
      });
      setAsking("none");
    }
  };

  const dismiss = async () => {
    try {
      await dismissFlags({ id: note.id }).unwrap();
      toast({ title: t("addressNotes.row.dismissed") });
    } catch (err: any) {
      toast({
        title: errorText(err, t("addressNotes.row.dismissFailed")),
        variant: "destructive",
      });
    }
    setAsking("none");
  };

  return (
    <div
      className="p-3 rounded-lg border border-border bg-card space-y-2"
      data-testid="address-note-row"
    >
      <p className="text-sm whitespace-pre-wrap break-words">{note.note}</p>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>
          <span>{t("addressNotes.row.place")}</span>
          <span className="text-foreground">
            {note.address ? `${note.address} · ` : ""}
          </span>
          <span className="tabular-nums">{pointText(note)}</span>
        </div>
        <div>
          <span>{t("addressNotes.row.writtenBy")}</span>
          <span className="text-foreground">{authorOf(note, t)}</span>
          <span>
            {" · "}
            {f.dateTime(note.createdAt)}
          </span>
          {note.updatedAt !== note.createdAt ? (
            <span>
              {t("addressNotes.row.edited", {
                date: f.dateTime(note.updatedAt),
              })}
            </span>
          ) : null}
        </div>
        <div>
          {t("addressNotes.row.lastConfirmed", {
            date: f.dateTime(note.lastConfirmedAt),
            count: note.upvotes,
          })}
        </div>
      </div>
      {note.flags.length > 0 ? (
        <ul className="text-xs space-y-0.5" aria-label={t("addressNotes.row.flags")}>
          {note.flags.map((flag) => (
            <li key={flag.id}>
              <span className="font-medium">
                {t("addressNotes.row.flagged")}
              </span>{" "}
              {f.dateTime(flag.createdAt)}
              {flag.reason ? `: ${flag.reason}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2 flex-wrap">
        {asking === "delete" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={remove}
            >
              {t("addressNotes.row.confirmDelete")}
            </Button>
            <Button
              ref={keepRef}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setAsking("none")}
            >
              {t("addressNotes.row.keepIt")}
            </Button>
          </>
        ) : null}
        {asking === "dismiss" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={dismiss}
            >
              {t("addressNotes.row.confirmDismiss", {
                count: note.flags.length,
              })}
            </Button>
            <Button
              ref={keepRef}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setAsking("none")}
            >
              {t("addressNotes.row.keepFlags", { count: note.flags.length })}
            </Button>
          </>
        ) : null}
        {!confirming ? (
          <Button
            ref={deleteRef}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setAsking("delete")}
          >
            {t("common.delete")}
          </Button>
        ) : null}
        {note.flags.length > 0 && !confirming ? (
          <Button
            ref={dismissRef}
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setAsking("dismiss")}
          >
            {t("addressNotes.row.dismissFlags")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
