import multer from "multer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getConfig } from "../Config/env.config.js";
import { BadRequestException } from "../Common/Utils/Errors/exceptions.error.js";
export function multerUpload({ desiredPath = "Profiles" } = {}) {
  if (!["Profiles", "Covers"].includes(desiredPath))
    throw new Error("Unsupported upload destination");
  const storage = multer.diskStorage({
    destination(req, file, callback) {
      try {
        const destination = path.join(
          getConfig().uploadRoot || path.resolve("uploads"),
          desiredPath,
        );
        mkdirSync(destination, { recursive: true });
        callback(null, destination);
      } catch (error) {
        callback(error);
      }
    },
    filename: (req, file, callback) => {
      const ext = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
      }[file.mimetype];
      callback(null, randomUUID() + ext);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024, files: 3, fields: 4, parts: 7 },
    fileFilter(req, file, callback) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype))
        return callback(
          new BadRequestException("PNG, JPEG or WebP files only"),
        );
      callback(null, true);
    },
  });
}
