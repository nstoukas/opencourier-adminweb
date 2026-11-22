import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, useToast } from "@/admin-web-components";
import {
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} from "@/api/addressNoteApi";
import type { AddressNoteAdminDto } from "@/backend-admin-sdk";
import { formatDate } from "@/ui-shared-utils";

// "39.36400, 22.94800", as the backend writes points in its records.
// `Pick<Type, "a" | "b">` is a TypeScript helper: the same type with only the named fields kept.
export const pointText = (
  note: Pick<AddressNoteAdminDto, "latitude" | "longitude">
): string => `${note.latitude.toFixed(5)}, ${note.longitude.toFixed(5)}`;

// Who wrote a note: a rider (linked to their page, for abuse), or the co-op itself.
const authorOf = (note: AddressNoteAdminDto) => {
  if (note.authorCourierId) {
    return (
      <Link href={`/couriers/${note.authorCourierId}`} className="underline">
        {note.authorName || "A rider"}
      </Link>
    );
  }
  return note.actor === "ADMIN"
    ? "An admin"
    : note.actor === "PARTNER"
    ? "A restaurant"
    : "Unknown";
};

// Which action, if any, is waiting for its second ask.
type Asking = "none" | "delete" | "dismiss";

// Spec 0053 (AC-7): one rider note: its text, place, author (admin only), dates and flags, with
// Delete and Dismiss flags. Both ask a second time (row 82 review: dismissing deletes the riders'
// reports, as deleting deletes the note).
export function AddressNoteRow({ note }: { note: AddressNoteAdminDto }) {
  const { toast } = useToast();
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
      toast({ title: "Note deleted." });
    } catch (err: any) {
      toast({
        title: err?.message || "The note could not be deleted.",
        variant: "destructive",
      });
      setAsking("none");
    }
  };

  const dismiss = async () => {
    try {
      await dismissFlags({ id: note.id }).unwrap();
      toast({ title: "Flags dismissed. The note stays." });
    } catch (err: any) {
      toast({
        title: err?.message || "The flags could not be dismissed.",
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
          <span>Place: </span>
          <span className="text-foreground">
            {note.address ? `${note.address} · ` : ""}
          </span>
          <span className="tabular-nums">{pointText(note)}</span>
        </div>
        <div>
          <span>Written by </span>
          <span className="text-foreground">{authorOf(note)}</span>
          <span> · {formatDate(note.createdAt)}</span>
          {note.updatedAt !== note.createdAt ? (
            <span> · edited {formatDate(note.updatedAt)}</span>
          ) : null}
        </div>
        <div>
          Last confirmed {formatDate(note.lastConfirmedAt)} · {note.upvotes}{" "}
          {note.upvotes === 1 ? "upvote" : "upvotes"} from other riders
        </div>
      </div>
      {note.flags.length > 0 ? (
        <ul className="text-xs space-y-0.5" aria-label="Flags">
          {note.flags.map((flag) => (
            <li key={flag.id}>
              <span className="font-medium">Flagged</span>{" "}
              {formatDate(flag.createdAt)}
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
              Yes, delete this note
            </Button>
            <Button
              ref={keepRef}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setAsking("none")}
            >
              Keep it
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
              Yes, dismiss{" "}
              {note.flags.length === 1
                ? "the flag"
                : `all ${note.flags.length} flags`}
            </Button>
            <Button
              ref={keepRef}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setAsking("none")}
            >
              Keep {note.flags.length === 1 ? "it" : "them"}
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
            Delete
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
            Dismiss flags
          </Button>
        ) : null}
      </div>
    </div>
  );
}
