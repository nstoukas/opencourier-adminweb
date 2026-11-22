import React, { useState } from "react";
import type { NextPage } from "next";
import { Button, Input } from "@/admin-web-components";
import {
  useGetFlaggedAddressNotesQuery,
  useSearchAddressNotesQuery,
} from "@/api/addressNoteApi";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { PageHeader } from "@/components/layouts/PageHeader";
import { AddressNoteRow } from "@/modules/address-notes/AddressNoteRow";

const PER_PAGE = 20;

// Spec 0053 (AC-7): riders' notes about places. Flagged notes first, then every note found by
// street (or coordinates). No filter, count or list by author (value 5).
const AddressNotesPage: NextPage = () => {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const flaggedQuery = useGetFlaggedAddressNotesQuery();
  const searchQuery = useSearchAddressNotesQuery({
    search,
    page,
    perPage: PER_PAGE,
  });
  const flagged = flaggedQuery.currentData ?? [];
  const found = searchQuery.currentData?.data ?? [];
  const total = searchQuery.currentData?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(typed.trim());
    setPage(1);
  };

  return (
    <DefaultLayout>
      <PageHeader
        title="Address notes"
        description="What riders wrote about places. Notes describe the place, never the person; delete any that break the rules."
      />
      <div className="flex flex-col gap-6">
        <section
          className="flex flex-col gap-3"
          aria-labelledby="flagged-notes"
        >
          <h2 id="flagged-notes" className="text-base font-semibold">
            Flagged by riders
          </h2>
          {flaggedQuery.isError ? (
            <p className="text-sm text-destructive">
              Could not load the flagged notes.
            </p>
          ) : null}
          {!flaggedQuery.isError &&
          !flaggedQuery.isLoading &&
          flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged notes.</p>
          ) : null}
          {flagged.map((note) => (
            <AddressNoteRow key={note.id} note={note} />
          ))}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="all-notes">
          <h2 id="all-notes" className="text-base font-semibold">
            Find a note by street
          </h2>
          <form
            className="flex gap-2 max-w-xl"
            onSubmit={runSearch}
            role="search"
          >
            <Input
              aria-label="Street, address or coordinates"
              placeholder="Street, address or coordinates"
              value={typed}
              maxLength={100}
              onChange={(event) => setTyped(event.target.value)}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          {searchQuery.isError ? (
            <p className="text-sm text-destructive">
              Could not load the notes.
            </p>
          ) : null}
          {!searchQuery.isError &&
          !searchQuery.isLoading &&
          found.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? "No notes match." : "No notes yet."}
            </p>
          ) : null}
          {found.map((note) => (
            <AddressNoteRow key={note.id} note={note} />
          ))}
          {pageCount > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </DefaultLayout>
  );
};

export default AddressNotesPage;
