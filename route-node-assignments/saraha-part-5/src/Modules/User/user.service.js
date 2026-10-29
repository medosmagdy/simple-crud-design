import { unlink } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromFile } from "file-type";
import UserRepository from "../../DB/Repositories/user.repository.js";
import MessageRepository from "../../DB/Repositories/message.repository.js";
import { publicUser } from "../Auth/auth.service.js";
import {
  encrypt,
  decrypt,
} from "../../Common/Utils/Security/encryption.security.js";
import {
  BadRequestException,
  NotFoundException,
} from "../../Common/Utils/Errors/exceptions.error.js";
const userRepo = new UserRepository();
const messageRepo = new MessageRepository();
export async function profileData(id) {
  const user = await userRepo.findDocumentById(id, "+phoneNumber");
  if (!user) throw new NotFoundException("User not found");
  return { ...publicUser(user), phoneNumber: decrypt(user.phoneNumber) };
}
export async function updateProfile(id, body) {
  const { phone, ...fields } = body;
  if (phone) fields.phoneNumber = encrypt(phone);
  const user = await userRepo.updateDocumentById(id, { $set: fields });
  if (!user) throw new NotFoundException("User not found");
  return publicUser(user);
}
export async function deleteProfile(id) {
  await messageRepo.model.deleteMany({ recipient: id });
  const user = await userRepo.deleteOneDocument({ _id: id });
  if (!user) throw new NotFoundException("User not found");
  return {};
}
export async function uploadProfilePicture(file, authUser) {
  if (!file)
    throw new BadRequestException(
      "Please upload a profile picture file",
      null,
      "MISSED_FILE",
    );
  try {
    const type = await fileTypeFromFile(file.path);
    if (
      !type ||
      !["image/png", "image/jpeg", "image/webp"].includes(type.mime) ||
      type.mime !== file.mimetype
    )
      throw new BadRequestException(
        "Image content does not match its declared MIME type",
      );
    const profileImage = `uploads/Profiles/${path.basename(file.filename)}`;
    const user = await userRepo.updateDocumentById(authUser._id, {
      $set: { profileImage },
    });
    if (!user) throw new NotFoundException("User no longer exists");
    return publicUser(user);
  } catch (error) {
    await unlink(file.path).catch(() => {});
    throw error;
  }
}
export async function publicProfile(id) {
  const user = await userRepo.findDocumentById(id);
  if (!user) throw new NotFoundException("User not found");
  return {
    _id: user._id,
    fullName: user.fullName,
    profileImage: user.profileImage,
  };
}
export async function listUsers() {
  const users = await userRepo.model
    .find()
    .select("firstName lastName email role")
    .limit(100);
  return users;
}
