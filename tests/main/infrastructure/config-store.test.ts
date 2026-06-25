import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  InMemoryConfigStore,
  type AppSettings,
} from "@main/infrastructure/config/config-store";

describe("InMemoryConfigStore", () => {
  it("returns defaults until overwritten", () => {
    const store = new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS);

    expect(store.get("lastOpenedProjectId")).toBeNull();
    expect(store.get("window")).toEqual({ width: 1280, height: 800 });
  });

  it("persists values set on it", () => {
    const store = new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS);

    store.set("lastOpenedProjectId", "proj-1");
    store.set("recentProjects", ["proj-1"]);

    expect(store.get("lastOpenedProjectId")).toBe("proj-1");
    expect(store.get("recentProjects")).toEqual(["proj-1"]);
  });

  it("does not mutate the shared defaults object", () => {
    const store = new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS);
    store.set("lastOpenedProjectId", "proj-1");

    expect(DEFAULT_SETTINGS.lastOpenedProjectId).toBeNull();
  });

  it("all() returns a snapshot copy", () => {
    const store = new InMemoryConfigStore<AppSettings>(DEFAULT_SETTINGS);
    const snapshot = store.all();
    store.set("lastOpenedProjectId", "proj-2");

    expect(snapshot.lastOpenedProjectId).toBeNull();
  });
});
