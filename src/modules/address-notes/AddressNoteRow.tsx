import React, { useState } from "react";
import Link from "next/link";
import { Button, useToast } from "@/admin-web-components";
import {
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} from "@/api/addressNoteApi";
import type { AddressNoteAdminDto } from "@/backend-admin-sdk";
import { formatDate } from "@/ui-shared-utils";

// "39.36400, 22.94800", as the backend writes points in its records.
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

// Spec 0053 (AC-7): one rider note: its text, place, author (admin only), dates and flags, with
// Delete (asked twice; the server records who and when, not the text) and Dismiss flags.
export function AddressNoteRow({ note }: { note: AddressNoteAdminDto }) {
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleteNote, deleteState] = useDeleteAddressNoteMutation();
  const [dismissFlags, dismissState] = useDismissAddressNoteFlagsMutation();
  const busy = deleteState.isLoading || dismissState.isLoading;

  const remove = async () => {
    try {
      await deleteNote({ id: note.id }).unwrap();
      toast({ title: "Note deleted." });
    } catch (err: any) {
      toast({
        title: err?.message || "The note could not be deleted.",
        variant: "destructive",
      });
      setConfirming(false);
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
        {confirming ? (
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
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
        )}
        {note.flags.length > 0 && !confirming ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={dismiss}
          >
            Dismiss flags
          </Button>
        ) : null}
      </div>
    </div>
  );
}
