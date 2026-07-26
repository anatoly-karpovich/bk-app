export type ForumTopicProviderCode = "combats-club" | "darkbk";

export interface ForumTopicMessage {
  id: string;
  authorId: string;
  authorLogin: string;
  text: string;
  publishedAt: string;
  publishedAtUnix: number;
}

export interface ForumTopicPage {
  provider: ForumTopicProviderCode;
  topicId: number;
  page: number;
  perPage: number;
  totalPages: number;
  messages: ForumTopicMessage[];
}
