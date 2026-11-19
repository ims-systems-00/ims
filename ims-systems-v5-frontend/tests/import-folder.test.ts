import { describe, expect, it } from "vitest";
import {
  buildImportSelection,
  IMPORT_MAX_FILES,
  removeImportEntry,
  validateImportSelection,
} from "../src/modules/document-management/lib/import-folder";

function fakeFile(
  relativePath: string,
  size = 100
): File & { webkitRelativePath: string } {
  const basename = relativePath.split("/").pop() ?? relativePath;
  const file = new File(["x".repeat(size)], basename, {
    type: "application/octet-stream",
  }) as File & { webkitRelativePath: string };
  Object.defineProperty(file, "webkitRelativePath", {
    value: relativePath,
  });
  return file;
}

describe("buildImportSelection", () => {
  it("parses nested paths and folder prefixes", () => {
    const stats = buildImportSelection([
      fakeFile("Policies/HR/handbook.pdf"),
      fakeFile("Policies/IT/policy.docx"),
    ]);
    expect(stats.fileCount).toBe(2);
    expect(stats.folderPaths).toEqual(["Policies", "Policies/HR", "Policies/IT"]);
    expect(stats.entries[0]?.basename).toBe("handbook.pdf");
    expect(stats.entries[0]?.folderSegments).toEqual(["Policies", "HR"]);
  });

  it("skips hidden files", () => {
    const stats = buildImportSelection([
      fakeFile("Root/.DS_Store"),
      fakeFile("Root/visible.txt"),
    ]);
    expect(stats.fileCount).toBe(1);
    expect(stats.skippedHidden).toBe(1);
  });

  it("removes a file and drops empty folder paths", () => {
    const stats = buildImportSelection([
      fakeFile("Policies/HR/handbook.pdf"),
      fakeFile("Policies/IT/policy.docx"),
    ]);
    const next = removeImportEntry(stats, "Policies/IT/policy.docx");
    expect(next.fileCount).toBe(1);
    expect(next.folderPaths).toEqual(["Policies", "Policies/HR"]);
    expect(next.entries[0]?.relativePath).toBe("Policies/HR/handbook.pdf");
  });
});

describe("validateImportSelection", () => {
  it("rejects empty selection", () => {
    const stats = buildImportSelection([]);
    const issue = validateImportSelection(stats, 0);
    expect(issue?.code).toBe("empty");
  });

  it("rejects too many files", () => {
    const files = Array.from({ length: IMPORT_MAX_FILES + 1 }, (_, i) =>
      fakeFile(`Root/f${i}.txt`)
    );
    const stats = buildImportSelection(files);
    const issue = validateImportSelection(stats, 0);
    expect(issue?.code).toBe("too_many_files");
  });

  it("rejects depth that exceeds remaining capacity", () => {
    const stats = buildImportSelection([
      fakeFile("A/B/C/file.txt"),
    ]);
    // Parent already at depth 18 → only 2 segments allowed; path has 3.
    const issue = validateImportSelection(stats, 18);
    expect(issue?.code).toBe("depth_exceeded");
  });
});
