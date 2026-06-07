import {
  generateReactHelpers,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

/** Pre-typed UploadThing dropzone bound to our file router. */
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

/** Pre-typed React helpers (`useUploadThing`, `uploadFiles`). */
export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();
