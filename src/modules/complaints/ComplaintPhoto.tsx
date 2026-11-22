import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchComplaintPhoto } from "@/api/complaintApi";
import useAppSelector from "@/hooks/useAppSelector";

type PhotoState =
  | { kind: "loading" }
  | { kind: "shown"; url: string }
  | { kind: "failed" };

// Spec 0052 (slice 2), AC-6 and cross check 8: the rider's photo on the complaint page. The bytes come
// through the admin route with the bearer and are shown from an object URL: a `blob:` address that lives
// only in this tab and points at the bytes in memory. It is revoked when the page leaves or the complaint
// changes, so the photo does not stay in memory. There is never a MinIO URL to copy or share.
export function ComplaintPhoto({ complaintId }: { complaintId: string }) {
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [state, setState] = useState<PhotoState>({ kind: "loading" });

  useEffect(() => {
    // `cancelled` covers a page that left before the photo arrived: its URL is never shown, and revoked.
    let cancelled = false;
    let url: string | null = null;
    setState({ kind: "loading" });
    fetchComplaintPhoto(accessToken || "", complaintId)
      .then((blob) => {
        // Row 83 review: anything but an image (a proxy's error page passed on as "{}") is a failure,
        // not a broken picture.
        if (!blob.type.startsWith("image/")) {
          if (!cancelled) setState({ kind: "failed" });
          return;
        }
        url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setState({ kind: "shown", url });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "failed" });
      });
    // The cleanup React runs on unmount, and before the effect runs again for another complaint.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [accessToken, complaintId]);

  if (state.kind === "loading") {
    return <p className="text-muted-foreground">{t("complaints.photo.loading")}</p>;
  }
  if (state.kind === "failed") {
    return (
      <p className="text-muted-foreground" role="alert">
        {t("complaints.photo.failed")}
      </p>
    );
  }
  return (
    <figure className="space-y-2">
      {/* A blob: URL from the admin route, which next/image cannot load. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.url}
        alt={t("complaints.photo.alt")}
        className="max-h-[32rem] w-auto max-w-full rounded-md border"
        data-testid="complaint-photo"
        onError={() => setState({ kind: "failed" })}
      />
      <figcaption className="text-xs text-muted-foreground">
        {t("complaints.photo.caption")}
      </figcaption>
    </figure>
  );
}
