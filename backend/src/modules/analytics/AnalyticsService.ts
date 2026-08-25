import { ForbiddenError } from "../../common/errors";
import { assertProjectAccess } from "../auth/authorization";
import type { CurrentUser } from "../auth/domain/types";
import { AnalyticsIntegrityService } from "./AnalyticsIntegrityService";
import { AnalyticsProjectionService } from "./AnalyticsProjectionService";
import {
  AnalyticsReadService,
  type AnalyticsPlayerDetailsQuery,
  type AnalyticsPlayerLeaderboardQuery,
  type AnalyticsReadQuery,
} from "./AnalyticsReadService";

/** Owns actor authorization for project-scoped analytics use cases. */
export class AnalyticsService {
  constructor(
    private readonly projectionService: AnalyticsProjectionService,
    private readonly integrityService: AnalyticsIntegrityService,
    private readonly readService: AnalyticsReadService,
  ) {}

  async getStatus(actor: CurrentUser, projectId: string) {
    assertProjectAccess(actor, projectId);
    return this.integrityService.inspectProject(projectId);
  }

  async refreshProject(actor: CurrentUser, projectId: string) {
    assertProjectAccess(actor, projectId);
    if (actor.role !== "admin") {
      throw new ForbiddenError("Only administrators can refresh analytics", { code: "ANALYTICS_REFRESH_FORBIDDEN" });
    }
    return this.projectionService.refreshProject(projectId);
  }

  async getOverview(actor: CurrentUser, projectId: string, query: AnalyticsReadQuery) {
    assertProjectAccess(actor, projectId);
    return this.readService.getOverview(projectId, query);
  }

  async getResources(actor: CurrentUser, projectId: string, query: AnalyticsReadQuery) {
    assertProjectAccess(actor, projectId);
    return this.readService.getResources(projectId, query);
  }

  async getPlayerLeaderboard(actor: CurrentUser, projectId: string, query: AnalyticsPlayerLeaderboardQuery) {
    assertProjectAccess(actor, projectId);
    return this.readService.getPlayerLeaderboard(projectId, query);
  }

  async getPlayerDetails(actor: CurrentUser, projectId: string, playerId: string, query: AnalyticsPlayerDetailsQuery) {
    assertProjectAccess(actor, projectId);
    return this.readService.getPlayerDetails(projectId, playerId, query);
  }
}
