import { StatementApi } from "./StatementApi";
import type { CourierStatementsAdminDto } from "./StatementApi";
import { Configuration } from "../runtime";
import { BackendAdminSdk } from "../backend-admin-sdk";

// Spec 0050 (row 76, AC-9, cross check 14): the hand edited API for a rider's monthly statements, checked at
// the fetch boundary. The spec's routes: GET admin/v1/courier/:id/statements → { months, downloads } and
// GET admin/v1/courier/:id/statements/:month?format=pdf|csv&lang=el|en, which streams the file.

function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (header: string) =>
        header.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: function () {
      return this;
    },
  } as unknown as Response;
}

function fileResponse(blob: Blob, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    blob: () => Promise.resolve(blob),
    json: () => Promise.reject(new Error("a file is not JSON")),
    text: () => Promise.resolve(""),
    clone: function () {
      return this;
    },
  } as unknown as Response;
}

describe("StatementApi (spec 0050)", () => {
  const mockFetch = jest.fn();
  let api: StatementApi;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new StatementApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: "http://localhost:3000",
        accessToken: () => Promise.resolve("test-admin-bearer-token"),
      })
    );
  });

  const lastCall = () => {
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    return {
      url: url as string,
      init: init as RequestInit & { headers: Record<string, string> },
    };
  };

  describe("list", () => {
    it("GET /api/admin/v1/courier/{id}/statements with the bearer token and no body, answered as sent", async () => {
      const answer: CourierStatementsAdminDto = {
        months: ["2026-10", "2026-09"],
        downloads: [
          {
            id: "dl-1",
            month: "2026-10",
            format: "pdf",
            createdAt: "2026-11-20T09:00:00.000Z",
            adminEmail: "anna@coop.gr",
          },
          {
            id: "dl-0",
            month: "2026-09",
            format: "csv",
            createdAt: "2026-11-01T09:00:00.000Z",
            adminEmail: null,
          },
        ],
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(answer));

      const result = await api.list("rider-1");

      const { url, init } = lastCall();
      expect(url).toBe(
        "http://localhost:3000/api/admin/v1/courier/rider-1/statements"
      );
      expect(init.method).toBe("GET");
      expect(init.headers["Authorization"]).toBe(
        "Bearer test-admin-bearer-token"
      );
      expect(init.body).toBeUndefined();
      expect(result).toEqual(answer);
    });

    it("a rider id can never break out of its place in the path", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ months: [], downloads: [] })
      );

      await api.list("rider/../../partner?x=1");

      expect(lastCall().url).toBe(
        "http://localhost:3000/api/admin/v1/courier/rider%2F..%2F..%2Fpartner%3Fx%3D1/statements"
      );
    });

    it("a refusal from the server is thrown, not answered as an empty list", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "Forbidden" }, 403)
      );

      await expect(api.list("rider-1")).rejects.toBeDefined();
    });
  });

  describe("download", () => {
    it("GET /api/admin/v1/courier/{id}/statements/{month} with format and lang in the query and the bearer token", async () => {
      mockFetch.mockResolvedValueOnce(
        fileResponse(new Blob(["%PDF-1.3"], { type: "application/pdf" }))
      );

      await api.download("rider-1", "2026-10", "pdf", "el");

      const { url, init } = lastCall();
      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "http://localhost:3000/api/admin/v1/courier/rider-1/statements/2026-10"
      );
      expect(Object.fromEntries(parsed.searchParams.entries())).toEqual({
        format: "pdf",
        lang: "el",
      });
      expect(init.method).toBe("GET");
      expect(init.headers["Authorization"]).toBe(
        "Bearer test-admin-bearer-token"
      );
      expect(init.body).toBeUndefined();
    });

    it("the CSV in English asks for format=csv and lang=en", async () => {
      mockFetch.mockResolvedValueOnce(
        fileResponse(new Blob(["x"], { type: "text/csv" }))
      );

      await api.download("rider-1", "2026-09", "csv", "en");

      const parsed = new URL(lastCall().url);
      expect(parsed.pathname).toBe(
        "/api/admin/v1/courier/rider-1/statements/2026-09"
      );
      expect(Object.fromEntries(parsed.searchParams.entries())).toEqual({
        format: "csv",
        lang: "en",
      });
    });

    it("answers the file's own bytes as a Blob, untouched", async () => {
      const file = new Blob(["%PDF-1.3 the statement"], {
        type: "application/pdf",
      });
      mockFetch.mockResolvedValueOnce(fileResponse(file));

      const result = await api.download("rider-1", "2026-10", "pdf", "el");

      expect(result).toBe(file);
      expect(result).toBeInstanceOf(Blob);
    });

    it("the token is in the header, never in the address", async () => {
      mockFetch.mockResolvedValueOnce(fileResponse(new Blob(["x"])));

      await api.download("rider-1", "2026-10", "pdf", "el");

      expect(lastCall().url).not.toContain("test-admin-bearer-token");
    });

    it("the rider id and the month can never break out of their places in the path", async () => {
      mockFetch.mockResolvedValueOnce(fileResponse(new Blob(["x"])));

      await api.download("rider/1", "../2026-10?lang=en", "pdf", "el");

      const parsed = new URL(lastCall().url);
      expect(parsed.pathname).toBe(
        "/api/admin/v1/courier/rider%2F1/statements/..%2F2026-10%3Flang%3Den"
      );
      expect(parsed.searchParams.get("lang")).toBe("el");
    });

    it("a refused month (400) is thrown, so no empty file is ever saved", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: "There is no statement for that month" }, 400)
      );

      await expect(
        api.download("rider-1", "2026-11", "pdf", "el")
      ).rejects.toBeDefined();
    });
  });

  it("the SDK hands out the statements API with its own token", async () => {
    const sdk = new BackendAdminSdk({
      basePath: "http://localhost:3000",
      fetchApi: mockFetch,
      accessToken: () => "sdk-admin-token",
    });
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ months: [], downloads: [] })
    );

    expect(sdk.statements()).toBeInstanceOf(StatementApi);
    await sdk.statements().list("rider-9");

    const { url, init } = lastCall();
    expect(url).toBe(
      "http://localhost:3000/api/admin/v1/courier/rider-9/statements"
    );
    expect(init.headers["Authorization"]).toBe("Bearer sdk-admin-token");
  });
});
