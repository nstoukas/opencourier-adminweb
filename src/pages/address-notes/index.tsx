import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { Button, Input, Skeleton } from "@/admin-web-components";
import {
  useGetFlaggedAddressNotesQuery,
  useSearchAddressNotesQuery,
} from "@/api/addressNoteApi";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { PageHeader } from "@/components/layouts/PageHeader";
import { AddressNoteRow } from "@/modules/address-notes/AddressNoteRow";

const PER_PAGE = 20;

// Two grey bars while a list is read (docs/DESIGN.md: lists load with a Skeleton).
const ListLoading = () => (
  <div className="flex flex-col gap-2" aria-label="Loading">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
);

// Spec 0053 (AC-7): riders' notes about places. Flagged notes first, then the notes found by street
// (or coordinates). No filter, count or list by author (value 5). Row 82 review: nothing is listed
// until a street is typed, so the page never pages through every note in town with its author.
const AddressNotesPage: NextPage = () => {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // The last page count the server answered, kept while the next page loads so the pager stays put.
  const [pageCount, setPageCount] = useState(1);
  const flaggedQuery = useGetFlaggedAddressNotesQuery();
  // `skip` keeps RTK Query from asking at all while no street has been typed.
  const searchQuery = useSearchAddressNotesQuery(
    { search, page, perPage: PER_PAGE },
    { skip: search === "" }
  );
  // `currentData` is undefined while a new page or search loads, so "loaded" means it is defined.
  const flaggedData = flaggedQuery.currentData;
  const searchData = searchQuery.currentData;

  useEffect(() => {
    if (!searchData) return;
    const count = Math.max(1, Math.ceil(searchData.total / PER_PAGE));
    setPageCount(count);
    // Row 82 review: after deleting the only note on the last page, go back to the new last page.
    if (page > count) setPage(count);
  }, [searchData, page]);

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
          {!flaggedQuery.isError && !flaggedData ? <ListLoading /> : null}
          {flaggedData && flaggedData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged notes.</p>
          ) : null}
          {(flaggedData ?? []).map((note) => (
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
          {search === "" ? (
            <p className="text-sm text-muted-foreground">
              Type a street, an address or coordinates to see the notes there.
            </p>
          ) : null}
          {search !== "" && !searchQuery.isError && !searchData ? (
            <ListLoading />
          ) : null}
          {searchData && searchData.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes match.</p>
          ) : null}
          {(searchData?.data ?? []).map((note) => (
            <AddressNoteRow key={note.id} note={note} />
          ))}
          {search !== "" && pageCount > 1 ? (
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
