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
import { useTranslation } from "react-i18next";

const PER_PAGE = 20;

// Two grey bars while a list is read (docs/DESIGN.md: lists load with a Skeleton).
const ListLoading = () => {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2" aria-label={t("addressNotes.page.loading")}>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
};

// Spec 0053 (AC-7): riders' notes about places. Flagged notes first, then the notes found by street
// (or coordinates). No filter, count or list by author (value 5). Row 82 review: nothing is listed
// until a street is typed, so the page never pages through every note in town with its author.
const AddressNotesPage: NextPage = () => {
  const { t } = useTranslation();
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
        title={t("addressNotes.page.title")}
        description={t("addressNotes.page.description")}
      />
      <div className="flex flex-col gap-6">
        <section
          className="flex flex-col gap-3"
          aria-labelledby="flagged-notes"
        >
          <h2 id="flagged-notes" className="text-base font-semibold">
            {t("addressNotes.page.flaggedHeading")}
          </h2>
          {flaggedQuery.isError ? (
            <p className="text-sm text-destructive">
              {t("addressNotes.page.flaggedFailed")}
            </p>
          ) : null}
          {!flaggedQuery.isError && !flaggedData ? <ListLoading /> : null}
          {flaggedData && flaggedData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("addressNotes.page.noFlagged")}
            </p>
          ) : null}
          {(flaggedData ?? []).map((note) => (
            <AddressNoteRow key={note.id} note={note} />
          ))}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="all-notes">
          <h2 id="all-notes" className="text-base font-semibold">
            {t("addressNotes.page.findHeading")}
          </h2>
          <form
            className="flex gap-2 max-w-xl"
            onSubmit={runSearch}
            role="search"
          >
            <Input
              aria-label={t("addressNotes.page.searchLabel")}
              placeholder={t("addressNotes.page.searchLabel")}
              value={typed}
              maxLength={100}
              onChange={(event) => setTyped(event.target.value)}
            />
            <Button type="submit" variant="outline">
              {t("common.search")}
            </Button>
          </form>
          {searchQuery.isError ? (
            <p className="text-sm text-destructive">
              {t("addressNotes.page.searchFailed")}
            </p>
          ) : null}
          {search === "" ? (
            <p className="text-sm text-muted-foreground">
              {t("addressNotes.page.typePrompt")}
            </p>
          ) : null}
          {search !== "" && !searchQuery.isError && !searchData ? (
            <ListLoading />
          ) : null}
          {searchData && searchData.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("addressNotes.page.noMatch")}
            </p>
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
                {t("addressNotes.page.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("addressNotes.page.pageOf", { page, pages: pageCount })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                {t("addressNotes.page.next")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </DefaultLayout>
  );
};

export default AddressNotesPage;
