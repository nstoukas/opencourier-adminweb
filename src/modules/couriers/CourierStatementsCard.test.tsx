import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { CourierStatementsCard, saveBlob } from "./CourierStatementsCard";
import type { CourierStatementsAdminDto } from "@/backend-admin-sdk";
import { formatDate } from "@/ui-shared-utils";

// Spec 0050 (row 76, AC-9, cross check 14): Statements on a rider's page. The month picker (the same months
// the rider is offered), the language, PDF and CSV, and the list of past admin downloads: who and when.

const mockUseGetCourierStatementsQuery = jest.fn();
const mockDownloadStatement = jest.fn();
const REFRESH = { type: "test/refreshCourierStatements" };
const mockRefresh = jest.fn(() => REFRESH);
jest.mock("../../api/statementApi", () => ({
  useGetCourierStatementsQuery: (args: unknown, options: unknown) =>
    mockUseGetCourierStatementsQuery(args, options),
  downloadStatement: (...args: unknown[]) => mockDownloadStatement(...args),
  refreshCourierStatements: () => mockRefresh(),
}));

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: () => mockDispatch,
}));

let accessToken: string | null = "admin-token";
jest.mock("../../hooks/useAppSelector", () => ({
  __esModule: true,
  default: (selector: (state: unknown) => unknown) =>
    selector({ auth: { accessToken } }),
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ auth: { accessToken } }),
}));

const listed = (
  overrides: Partial<CourierStatementsAdminDto> = {}
): CourierStatementsAdminDto => ({
  months: ["2026-10", "2026-09", "2026-08"],
  downloads: [],
  ...overrides,
});

const withList = (
  data: CourierStatementsAdminDto | undefined,
  extra: Record<string, unknown> = {}
) =>
  mockUseGetCourierStatementsQuery.mockReturnValue({
    data,
    isError: false,
    isLoading: false,
    ...extra,
  });

// A promise the test settles by hand, to hold a download half way.
function pending<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("CourierStatementsCard (spec 0050, AC-9)", () => {
  // What the browser was asked to save: the file name, the address it was given, and the Blob behind it.
  let saved: Array<{ download: string; href: string }>;
  let blobs: Blob[];
  let clickSpy: jest.SpyInstance;
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    accessToken = "admin-token";
    saved = [];
    blobs = [];
    // JSDOM has no object URLs.
    URL.createObjectURL = jest.fn((blob: Blob) => {
      blobs.push(blob);
      return `blob:test/${blobs.length}`;
    }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        saved.push({ download: this.download, href: this.href });
      });
    withList(listed());
    mockDownloadStatement.mockResolvedValue(
      new Blob(["%PDF-1.3 a statement"], { type: "application/pdf" })
    );
  });

  afterEach(() => {
    clickSpy.mockRestore();
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  });

  const monthBox = () => screen.getByLabelText("Month") as HTMLSelectElement;
  const langBox = () => screen.getByLabelText("Language") as HTMLSelectElement;
  const pdf = () => screen.getByRole("button", { name: "PDF" });
  const csv = () => screen.getByRole("button", { name: "CSV" });

  it("is titled Statements and reads this rider's list", () => {
    render(<CourierStatementsCard courierId="rider-1" />);

    expect(screen.getByText("Statements")).toBeInTheDocument();
    expect(mockUseGetCourierStatementsQuery).toHaveBeenCalled();
    expect(mockUseGetCourierStatementsQuery.mock.calls[0][0]).toEqual({
      id: "rider-1",
    });
  });

  it("says each download is recorded and that the rider sees it", () => {
    render(<CourierStatementsCard courierId="rider-1" />);

    expect(
      screen.getByText(/Each download is recorded and the rider sees it\./)
    ).toBeInTheDocument();
  });

  describe("the month picker and the language", () => {
    it("offers exactly the months the server sent, newest first, with the newest chosen", () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(
        Array.from(monthBox().options).map((option) => option.value)
      ).toEqual(["2026-10", "2026-09", "2026-08"]);
      expect(monthBox().value).toBe("2026-10");
    });

    it("cross check 14: the language is Greek unless the admin picks English", () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(langBox().value).toBe("el");
      expect(
        Array.from(langBox().options).map((option) => [
          option.value,
          option.textContent,
        ])
      ).toEqual([
        ["el", "Greek"],
        ["en", "English"],
      ]);
    });

    it("has a PDF and a CSV button", () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(pdf()).toBeEnabled();
      expect(csv()).toBeEnabled();
    });
  });

  describe("downloading", () => {
    it("PDF with nothing changed asks for the newest month in Greek, with the admin token, and saves statement-<month>.pdf", async () => {
      const file = new Blob(["%PDF-1.3 october"], { type: "application/pdf" });
      mockDownloadStatement.mockResolvedValue(file);
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(pdf());

      await waitFor(() => expect(saved).toHaveLength(1));
      expect(mockDownloadStatement).toHaveBeenCalledTimes(1);
      expect(mockDownloadStatement).toHaveBeenCalledWith("admin-token", {
        id: "rider-1",
        month: "2026-10",
        format: "pdf",
        lang: "el",
      });
      expect(saved[0]?.download).toBe("statement-2026-10.pdf");
      // The very bytes the server sent are what is saved.
      expect(blobs).toEqual([file]);
      expect(saved[0]?.href).toBe("blob:test/1");
    });

    it("CSV for a chosen month in English asks for exactly that and saves statement-<month>.csv", async () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.change(monthBox(), { target: { value: "2026-08" } });
      fireEvent.change(langBox(), { target: { value: "en" } });
      fireEvent.click(csv());

      await waitFor(() => expect(saved).toHaveLength(1));
      expect(mockDownloadStatement).toHaveBeenCalledWith("admin-token", {
        id: "rider-1",
        month: "2026-08",
        format: "csv",
        lang: "en",
      });
      expect(saved[0]?.download).toBe("statement-2026-08.csv");
    });

    it("cross check 15: the saved file's name carries the month and format only, never the rider", async () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(csv());

      await waitFor(() => expect(saved).toHaveLength(1));
      expect(saved[0]?.download).toMatch(/^statement-\d{4}-\d{2}\.csv$/);
      expect(saved[0]?.download).not.toContain("rider-1");
    });

    it("the link made to save the file does not stay on the page, and its address is released", async () => {
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(pdf());

      await waitFor(() => expect(saved).toHaveLength(1));
      expect(document.querySelector("a[download]")).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    });

    it("while a download runs the button says so and neither button starts another", async () => {
      const download = pending<Blob>();
      mockDownloadStatement.mockReturnValue(download.promise);
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(pdf());

      const busy = await screen.findByRole("button", { name: "Downloading…" });
      expect(busy).toBeDisabled();
      expect(csv()).toBeDisabled();
      fireEvent.click(csv());
      fireEvent.click(busy);
      expect(mockDownloadStatement).toHaveBeenCalledTimes(1);

      download.resolve(new Blob(["x"]));

      await waitFor(() => expect(pdf()).toBeEnabled());
      expect(csv()).toBeEnabled();
      expect(saved).toHaveLength(1);
    });

    it("a download that fails says so in words, saves nothing, and the buttons work again", async () => {
      mockDownloadStatement.mockRejectedValueOnce(new Error("400"));
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(screen.queryByRole("alert")).toBeNull();
      fireEvent.click(pdf());

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "The statement could not be downloaded. Please try again."
      );
      expect(saved).toHaveLength(0);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(pdf()).toBeEnabled();

      // A second try that works takes the message away.
      fireEvent.click(pdf());
      await waitFor(() => expect(saved).toHaveLength(1));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("AC-9: after a download the list is read again, so the new record shows", async () => {
      render(<CourierStatementsCard courierId="rider-1" />);
      expect(mockDispatch).not.toHaveBeenCalled();

      fireEvent.click(pdf());

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(REFRESH));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      // Read again only once the file has come: the record exists by then.
      expect(saved).toHaveLength(1);
    });

    it("the list is read again after a failed download too (the server may have recorded it)", async () => {
      mockDownloadStatement.mockRejectedValueOnce(new Error("connection lost"));
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(csv());

      await screen.findByRole("alert");
      expect(mockDispatch).toHaveBeenCalledWith(REFRESH);
    });

    it("the list is not read again before the download has answered", async () => {
      const download = pending<Blob>();
      mockDownloadStatement.mockReturnValue(download.promise);
      render(<CourierStatementsCard courierId="rider-1" />);

      fireEvent.click(pdf());
      await screen.findByRole("button", { name: "Downloading…" });

      expect(mockDispatch).not.toHaveBeenCalled();
      download.resolve(new Blob(["x"]));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(REFRESH));
    });
  });

  describe("the past downloads", () => {
    const downloads = [
      {
        id: "dl-2",
        month: "2026-10",
        format: "pdf",
        createdAt: "2026-11-20T09:15:00.000Z",
        adminEmail: "anna.admin@coop.gr",
      },
      {
        id: "dl-1",
        month: "2026-09",
        format: "csv",
        createdAt: "2026-11-02T18:40:00.000Z",
        adminEmail: "kostas.admin@coop.gr",
      },
    ];

    it("lists each one in the order sent (newest first): when, which month and format, and who", () => {
      withList(listed({ downloads }));
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(screen.getByText("Downloaded by admins")).toBeInTheDocument();
      const rows = screen.getAllByRole("listitem");
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent(formatDate("2026-11-20T09:15:00.000Z"));
      expect(rows[0]).toHaveTextContent("2026-10 PDF");
      expect(rows[0]).toHaveTextContent("by anna.admin@coop.gr");
      expect(rows[1]).toHaveTextContent(formatDate("2026-11-02T18:40:00.000Z"));
      expect(rows[1]).toHaveTextContent("2026-09 CSV");
      expect(rows[1]).toHaveTextContent("by kostas.admin@coop.gr");
      // Day first and the 24 hour clock, as dates read across admin.
      expect(rows[0]?.textContent).toMatch(/\d{2}\/11\/2026, \d{2}:\d{2}/);
    });

    it('a download whose admin has no email still shows when and what, with no dangling "by"', () => {
      withList(
        listed({
          downloads: [
            {
              id: "dl-2",
              month: "2026-10",
              format: "pdf",
              createdAt: "2026-11-20T09:15:00.000Z",
              adminEmail: null,
            },
          ],
        })
      );
      render(<CourierStatementsCard courierId="rider-1" />);

      const row = screen.getByRole("listitem");
      expect(row).toHaveTextContent("2026-10 PDF");
      expect(row.textContent).not.toMatch(/by\s*$/);
      expect(row.textContent).not.toContain("null");
    });

    it('says "None yet." when no admin has downloaded one', () => {
      withList(listed({ downloads: [] }));
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(screen.getByText("None yet.")).toBeInTheDocument();
      expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    });

    it("value 5: shows the downloads as they are, with no count of them", () => {
      withList(listed({ downloads }));
      const { container } = render(
        <CourierStatementsCard courierId="rider-1" />
      );

      expect(container.textContent).not.toMatch(
        /\b2 downloads\b|\btotal\b|\bcount\b|average|other riders/i
      );
    });
  });

  describe("empty and failed states", () => {
    it('a rider with no complete month reads "No complete month yet." and has nothing to download', () => {
      withList(listed({ months: [] }));
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(screen.getByText("No complete month yet.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "PDF" })).toBeNull();
      expect(screen.queryByRole("button", { name: "CSV" })).toBeNull();
      expect(screen.queryByLabelText("Month")).toBeNull();
    });

    it("while the list is loading it does not claim there is no month", () => {
      withList(undefined, { isLoading: true });
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(screen.queryByText("No complete month yet.")).toBeNull();
      // Nothing to download until the months are known.
      const button = screen.queryByRole("button", { name: "PDF" });
      if (button) expect(button).toBeDisabled();
    });

    it("says so when the list cannot be loaded, not that there is no month", () => {
      withList(undefined, { isError: true });
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(
        screen.getByText("Could not load the statements.")
      ).toBeInTheDocument();
      expect(screen.queryByText("No complete month yet.")).toBeNull();
      expect(screen.queryByRole("button", { name: "PDF" })).toBeNull();
    });

    it("past downloads still show for a rider with no month left to offer", () => {
      withList(
        listed({
          months: [],
          downloads: [
            {
              id: "dl-1",
              month: "2026-09",
              format: "csv",
              createdAt: "2026-11-02T18:40:00.000Z",
              adminEmail: "a@coop.gr",
            },
          ],
        })
      );
      render(<CourierStatementsCard courierId="rider-1" />);

      expect(
        within(screen.getByRole("list")).getByText(/2026-09 CSV/)
      ).toBeInTheDocument();
    });
  });

  describe("saveBlob", () => {
    it("saves the Blob under the given name through a link that is removed afterwards", () => {
      const file = new Blob(["a,b"], { type: "text/csv" });

      saveBlob(file, "statement-2026-10.csv");

      expect(blobs).toEqual([file]);
      expect(saved).toEqual([
        { download: "statement-2026-10.csv", href: "blob:test/1" },
      ]);
      expect(document.querySelector("a[download]")).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/1");
    });
  });
});
