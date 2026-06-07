import type { api } from "@wikipefia/convex/api";
import type { FunctionReturnType } from "convex/server";

/** A file row as returned by the paginated `list` query (with tags + avg). */
export type LibraryFile = FunctionReturnType<
  typeof api.library.files.list
>["page"][number];

/** A file with full detail (tags, rating avg, transcription) from `get`. */
export type LibraryFileDetail = NonNullable<
  FunctionReturnType<typeof api.library.files.get>
>;

/** A single comment row from `comments.list`. */
export type LibraryComment = FunctionReturnType<
  typeof api.library.comments.list
>[number];

/** A subject with its denormalized file count, from `subjects.listWithCounts`. */
export type SubjectWithCount = FunctionReturnType<
  typeof api.library.subjects.listWithCounts
>[number];
