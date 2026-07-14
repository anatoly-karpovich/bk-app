import { ObjectId } from "mongodb";
import { z } from "zod";

export const objectIdSchema = z.string().trim().refine((value) => ObjectId.isValid(value), {
  message: "Expected a valid Mongo ObjectId",
});
