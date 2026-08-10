import { AuthService } from "../modules/auth/AuthService";
import { SessionsRepository } from "../modules/auth/SessionsRepository";
import { UsersRepository } from "../modules/auth/UsersRepository";
import { ProjectsRepository } from "../modules/projects/ProjectsRepository";
import { GameConfigsRepository } from "../modules/gameConfigs/GameConfigsRepository";

const DEFAULT_BOOTSTRAP_NAME = "Геральт из Ривии";

export async function seedBootstrapAdminIfNeeded(
  authService: AuthService,
  usersRepository: UsersRepository,
  sessionsRepository: SessionsRepository,
  projectsRepository: ProjectsRepository,
  gameConfigsRepository: GameConfigsRepository,
): Promise<void> {
  await Promise.all([usersRepository.ensureIndexes(), sessionsRepository.ensureIndexes()]);
  if (await usersRepository.countDocuments()) return;

  const login = process.env.BOOTSTRAP_ADMIN_LOGIN?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.BOOTSTRAP_ADMIN_DISPLAY_NAME?.trim() || DEFAULT_BOOTSTRAP_NAME;
  if (!login || !password) {
    throw new Error("Missing required BOOTSTRAP_ADMIN_LOGIN or BOOTSTRAP_ADMIN_PASSWORD for an empty users collection");
  }

  const admin = await authService.createBootstrapAdmin({ login, displayName, password });
  const projects = await projectsRepository.findAll();
  await Promise.all([
    projectsRepository.assignBootstrapOwnership(admin.id),
    gameConfigsRepository.assignBootstrapOwnership(admin.id),
  ]);
  if (projects.length) {
    await usersRepository.updateById(admin.id, {
      projectProfiles: projects.map((project) => ({
        projectId: project._id.toHexString(),
        nickname: DEFAULT_BOOTSTRAP_NAME,
      })),
      updatedAt: new Date(),
    });
  }
  console.log(`Bootstrap administrator created: ${admin.login}`);
}
