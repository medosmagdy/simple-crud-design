import { Router } from "express";
import * as messageService from "./message.service.js";
import { messageSchema } from "./message.validation.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { authenticate } from "../../Middleware/authentication.middleware.js";
const messageController = Router();
messageController.post(
  "/:recipientId",
  validation(messageSchema),
  async (req, res) =>
    res
      .status(201)
      .json({
        message: "Message sent",
        data: await messageService.addMessage(
          req.params.recipientId,
          req.validate,
        ),
      }),
);
messageController.get("/", authenticate, async (req, res) =>
  res.json({ data: await messageService.inbox(req.authUser._id, req.query) }),
);
messageController.delete("/:id", authenticate, async (req, res) =>
  res.json({
    data: await messageService.deleteMessage(req.params.id, req.authUser._id),
  }),
);
export default messageController;
