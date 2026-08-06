import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { publicDocumentFields } from "./publicDocument";

test("removes the MongoDB _id and its BSON buffer from public documents", () => {
  const document = { _id: new ObjectId(), name: "Quiz", nested: { question: 1 } };

  const fields = publicDocumentFields(document);

  assert.deepEqual(fields, { name: "Quiz", nested: { question: 1 } });
  assert.equal("_id" in fields, false);
  assert.doesNotMatch(JSON.stringify(fields), /buffer/);
  assert.ok(document._id instanceof ObjectId);
});
