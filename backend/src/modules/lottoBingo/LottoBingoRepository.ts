import { ObjectId, type WithId } from "mongodb";
import { getDefaultMongoDatabase } from "../../infrastructure/mongo/defaultMongo";
import { AppError } from "../../common/errors";
import type { LottoBingoGame } from "./domain/types";

const COLLECTION = "lotto_bingo_games";
export interface LottoBingoGameDocument extends LottoBingoGame {}

export class LottoBingoRepository {
  async create(game: LottoBingoGame): Promise<WithId<LottoBingoGameDocument> | null> { const collection = await this.collection(); const result = await collection.insertOne(game); return collection.findOne({ _id: result.insertedId }); }
  async findByIdAndProjectId(gameId: string, projectId: string): Promise<WithId<LottoBingoGameDocument> | null> { return (await this.collection()).findOne({ _id: this.id(gameId), projectId }); }
  async findByProjectId(projectId: string): Promise<Array<WithId<LottoBingoGameDocument>>> { return (await this.collection()).find({ projectId }, { sort: { updatedAt: -1, createdAt: -1 } }).toArray(); }
  async findLatest(projectId: string, statuses: LottoBingoGame["status"][] = ["preparing", "in_progress"]): Promise<WithId<LottoBingoGameDocument> | null> { return (await this.collection()).findOne({ projectId, status: { $in: statuses } }, { sort: { updatedAt: -1, createdAt: -1 } }); }
  async update(gameId: string, projectId: string, expectedRevision: number, game: LottoBingoGame): Promise<WithId<LottoBingoGameDocument> | null> { const result = await (await this.collection()).findOneAndUpdate({ _id: this.id(gameId), projectId, revision: expectedRevision }, { $set: this.persist(game) }, { returnDocument: "after" }); return result; }
  async delete(gameId: string, projectId: string, expectedRevision: number): Promise<boolean> { return ((await this.collection()).deleteOne({ _id: this.id(gameId), projectId, revision: expectedRevision })).then((result) => result.deletedCount > 0); }
  async deleteByProjectId(projectId: string): Promise<void> { await (await this.collection()).deleteMany({ projectId }); }
  private async collection() { return getDefaultMongoDatabase().getCollection<LottoBingoGameDocument>(COLLECTION); }
  private id(value: string) { if (!ObjectId.isValid(value)) throw new AppError("Invalid Lotto Bingo game id", { statusCode: 400, code: "lotto_bingo_invalid_game_id" }); return new ObjectId(value); }
  private persist(game: LottoBingoGame): LottoBingoGameDocument { const { _id: _ignoredId, id: _ignoredPublicId, ...document } = game as LottoBingoGame & { _id?: ObjectId; id?: string }; return document; }
}
