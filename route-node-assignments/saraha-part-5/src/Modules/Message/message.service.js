import MessageRepository from "../../DB/Repositories/message.repository.js";
import UserRepository from "../../DB/Repositories/user.repository.js";
import {
  BadRequestException,
  NotFoundException,
} from "../../Common/Utils/Errors/exceptions.error.js";
const messageRepo = new MessageRepository();
const userRepo = new UserRepository();
export async function addMessage(recipientId, body) {
  if (!(await userRepo.findDocumentById(recipientId)))
    throw new NotFoundException("Recipient not found");
  return messageRepo.createDocument({
    content: body.content,
    recipient: recipientId,
  });
}
export async function inbox(userId, query) {
  const page = Number(query.page || 1),
    limit = Number(query.limit || 10);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new BadRequestException("Invalid pagination");
  return {
    page,
    limit,
    total: await messageRepo.model.countDocuments({ recipient: userId }),
    messages: await messageRepo.model
      .find({ recipient: userId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  };
}
export async function deleteMessage(id, userId) {
  const record = await messageRepo.deleteOneDocument({
    _id: id,
    recipient: userId,
  });
  if (!record) throw new NotFoundException("Message not found");
  return {};
}
