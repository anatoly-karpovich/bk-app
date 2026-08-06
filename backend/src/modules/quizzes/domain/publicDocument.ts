/**
 * Removes MongoDB's storage-only primary key before a document becomes part of
 * a public Quiz API read model. The public identifier is supplied separately
 * as a string `id` by the owning read-model/service.
 */
export function publicDocumentFields<TDocument extends object>(document: TDocument): Omit<TDocument, "_id"> {
  const { _id: _ignoredId, ...fields } = structuredClone(document) as TDocument & { _id?: unknown };
  return fields as Omit<TDocument, "_id">;
}
