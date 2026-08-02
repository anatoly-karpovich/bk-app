import { Algorithm, hash, verify } from "@node-rs/argon2";

/** Uses Argon2id, whose per-password salt is encoded in the resulting hash. */
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    return await hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    return await verify(passwordHash, password);
  }
}
