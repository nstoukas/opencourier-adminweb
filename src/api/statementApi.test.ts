import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import {
  downloadStatement,
  refreshCourierStatements,
  statementApi,
} from "./statementApi";
import { prepareAdminSdk } from ".";
import { authSlice } from "@/modules/auth/slices/authSlice";

jest.mock(".", () => {
  const actual = jest.requireActual(".");
  return { ...actual, prepareAdminSdk: jest.fn() };
});

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock;

function setupTestStore(accessToken: string | null = "admin-token") {
  return configureStore({
    reducer: {
      [statementApi.reducerPath]: statementApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }).concat(statementApi.middleware),
    preloadedState: { auth: { accessToken } },
  });
}

// Spec 0050 (row 76, AC-9): the calls behind the Statements card. The list and the file both go to the SDK
// with the admin's token; a download writes a record on the server, so the list is read again after one.
describe("statementApi (spec 0050)", () => {
  let sdk: { list: jest.Mock; download: jest.Mock };
  const listed = {
    months: ["2026-10", "2026-09"],
    downloads: [
      {
        id: "dl-1",
        month: "2026-10",
        format: "pdf",
        createdAt: "2026-11-20T09:00:00.000Z",
        adminEmail: "anna@coop.gr",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sdk = {
      list: jest.fn().mockResolvedValue(listed),
      download: jest.fn().mockResolvedValue(new Blob(["%PDF-1.3"])),
    };
    mockPrepareAdminSdk.mockReturnValue({ statements: () => sdk });
  });

  it("getCourierStatements asks the SDK for this rider's months and downloads with the admin's token", async () => {
    const store = setupTestStore("admin-token");

    const result = await store.dispatch(
      statementApi.endpoints.getCourierStatements.initiate({ id: "rider-1" })
    );

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith("admin-token");
    expect(sdk.list).toHaveBeenCalledTimes(1);
    expect(sdk.list).toHaveBeenCalledWith("rider-1");
    expect(result.data).toEqual(listed);
  });

  it("a list that fails is an error for the card to say, not an empty list", async () => {
    sdk.list.mockRejectedValue(new Error("Network down"));
    const store = setupTestStore();

    const result = await store.dispatch(
      statementApi.endpoints.getCourierStatements.initiate({ id: "rider-1" })
    );

    expect(result.isError).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it("downloadStatement asks the SDK for the chosen rider, month, format and language with the admin's token", async () => {
    const file = new Blob(["a statement"]);
    sdk.download.mockResolvedValue(file);

    const result = await downloadStatement("admin-token-7", {
      id: "rider-1",
      month: "2026-09",
      format: "csv",
      lang: "en",
    });

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith("admin-token-7");
    expect(sdk.download).toHaveBeenCalledTimes(1);
    expect(sdk.download).toHaveBeenCalledWith(
      "rider-1",
      "2026-09",
      "csv",
      "en"
    );
    expect(result).toBe(file);
  });

  it("downloadStatement lets a refusal through, so the card can say the download failed", async () => {
    sdk.download.mockRejectedValue(new Error("400"));

    await expect(
      downloadStatement("admin-token", {
        id: "rider-1",
        month: "2026-11",
        format: "pdf",
        lang: "el",
      })
    ).rejects.toThrow("400");
  });

  it("AC-9: after refreshCourierStatements the list on screen is read again, so a new download shows", async () => {
    const store = setupTestStore();
    // A card on screen keeps the list subscribed.
    const subscription = store.dispatch(
      statementApi.endpoints.getCourierStatements.initiate({ id: "rider-1" })
    );
    await subscription;
    expect(sdk.list).toHaveBeenCalledTimes(1);
    const after = {
      ...listed,
      downloads: [
        {
          id: "dl-2",
          month: "2026-09",
          format: "csv",
          createdAt: "2026-11-21T10:00:00.000Z",
          adminEmail: "anna@coop.gr",
        },
        ...listed.downloads,
      ],
    };
    sdk.list.mockResolvedValue(after);

    store.dispatch(refreshCourierStatements());

    const shown = () =>
      statementApi.endpoints.getCourierStatements.select({ id: "rider-1" })(
        store.getState() as never
      ).data;
    await waitFor(() => expect(shown()).toEqual(after));
    expect(sdk.list).toHaveBeenCalledTimes(2);
    expect(sdk.list).toHaveBeenLastCalledWith("rider-1");
    subscription.unsubscribe();
  });
});
