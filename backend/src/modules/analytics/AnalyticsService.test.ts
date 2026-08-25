import assert from "node:assert/strict";
import test from "node:test";
import { AnalyticsService } from "./AnalyticsService";

const admin = {
  id: "admin",
  login: "admin",
  displayName: "Administrator",
  role: "admin" as const,
  projectProfiles: [],
};
const hostWithAccess = {
  id: "host",
  login: "host",
  displayName: "Host",
  role: "host" as const,
  projectProfiles: [{ projectId: "project-a", nickname: "Host" }],
};
const hostWithoutAccess = {
  ...hostWithAccess,
  projectProfiles: [],
};

function createService() {
  const calls = { status: 0, refresh: 0, overview: 0, resources: 0, players: 0 };
  const service = new AnalyticsService(
    { async refreshProject() { calls.refresh += 1; return { refreshed: true }; } } as never,
    { async inspectProject() { calls.status += 1; return { freshness: "fresh" }; } } as never,
    {
      async getOverview() { calls.overview += 1; return { overview: true }; },
      async getResources() { calls.resources += 1; return { resources: true }; },
      async getPlayerLeaderboard() { calls.players += 1; return { players: true }; },
    } as never,
  );
  return { service, calls };
}

test("allows a project host to read analytics", async () => {
  const { service, calls } = createService();

  const overview = await service.getOverview(hostWithAccess, "project-a", {});

  assert.deepEqual(overview, { overview: true });
  assert.equal(calls.overview, 1);
});

test("rejects analytics reads outside the actor project access", async () => {
  const { service, calls } = createService();

  await assert.rejects(() => service.getStatus(hostWithoutAccess, "project-a"), { code: "PROJECT_PROFILE_REQUIRED" });
  assert.equal(calls.status, 0);
});

test("allows only administrators to refresh analytics", async () => {
  const { service, calls } = createService();

  await assert.rejects(() => service.refreshProject(hostWithAccess, "project-a"), { code: "ANALYTICS_REFRESH_FORBIDDEN" });
  assert.equal(calls.refresh, 0);

  const result = await service.refreshProject(admin, "project-a");
  assert.deepEqual(result, { refreshed: true });
  assert.equal(calls.refresh, 1);
});
