import type { Document } from "mongodb";

export interface QuizCreatorReadFields {
  createdByNickname: string | null;
}

export function createQuizCreatorReadProjection(match: Document): Document[] {
  return [
    { $match: match },
    {
      $addFields: {
        __creatorObjectId: {
          $convert: { input: "$createdByUserId", to: "objectId", onError: null, onNull: null },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "__creatorObjectId",
        foreignField: "_id",
        as: "__creatorUser",
      },
    },
    {
      $set: {
        createdByNickname: {
          $let: {
            vars: {
              profile: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: { $ifNull: [{ $arrayElemAt: ["$__creatorUser.projectProfiles", 0] }, []] },
                      as: "profile",
                      cond: { $eq: ["$$profile.projectId", "$projectId"] },
                    },
                  },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$profile.nickname", null] },
          },
        },
      },
    },
    { $project: { __creatorObjectId: 0, __creatorUser: 0 } },
  ];
}
