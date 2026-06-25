import { describe, expect, it } from "vitest";
import { formatChangelog, formatSha256Sums } from "../../scripts/lib/release-format";

describe("formatSha256Sums", () => {
  it("renders sha256sum lines sorted by filename", () => {
    const out = formatSha256Sums([
      { file: "setup.exe", sha256: "bbb" },
      { file: "portable.exe", sha256: "aaa" },
    ]);

    expect(out).toBe("aaa  portable.exe\nbbb  setup.exe\n");
  });

  it("returns an empty string for no entries", () => {
    expect(formatSha256Sums([])).toBe("");
  });
});

describe("formatChangelog", () => {
  it("renders a dated section with commit lines", () => {
    const out = formatChangelog("1.3.5", new Date("2026-06-20T10:00:00Z"), [
      { hash: "a4f8d22", subject: "feat: add recorder" },
      { hash: "9af83e3", subject: "fix: selector priority" },
    ]);

    expect(out).toBe(
      "## 1.3.5 - 2026-06-20\n\n- feat: add recorder (a4f8d22)\n- fix: selector priority (9af83e3)\n",
    );
  });

  it("notes when there are no commits", () => {
    const out = formatChangelog("0.1.0", new Date("2026-01-01T00:00:00Z"), []);
    expect(out).toBe("## 0.1.0 - 2026-01-01\n\n_No changes recorded._\n");
  });
});
