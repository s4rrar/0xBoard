import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://www.0xboard.app", ["0xboard.app"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app", ["0xboard.app"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.0xboard.app", ["0xboard.app"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.0xboard.app", [
        "library.0xboard.app",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/", ["0xboard.app/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app", ["0xboard.app/"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/", ["0xboard.app"]),
    ).toBe(true);

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://0xboard.app/path", ["0xboard.app"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/path/", ["0xboard.app"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/specific/path", [
        "0xboard.app/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/specific/path/", [
        "0xboard.app/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/specific/path", [
        "0xboard.app/specific/path/",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://0xboard.app/specific/path/other", [
        "0xboard.app/specific/path",
      ]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://x0xboard.app", ["0xboard.app"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://x-0xboard.app", ["0xboard.app"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.appx", ["0xboard.app"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.appx", ["0xboard.app"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.app.mx", ["0xboard.app"]),
    ).toThrow();
    // protocol must be https
    expect(() =>
      validateLibraryUrl("http://0xboard.app.mx", ["0xboard.app"]),
    ).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://0xboard.app/specific/other/path", [
        "0xboard.app/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.app/specific/paths", [
        "0xboard.app/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.app/specific/path-s", [
        "0xboard.app/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://0xboard.app/some/specific/path", [
        "0xboard.app/specific/path",
      ]),
    ).toThrow();
  });
});
