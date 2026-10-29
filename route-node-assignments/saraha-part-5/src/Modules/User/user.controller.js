import { Router } from "express";
import * as userService from "./user.service.js";
import { profileSchema } from "./user.validation.js";
import { authenticate } from "../../Middleware/authentication.middleware.js";
import { authorization } from "../../Middleware/authorization.middleware.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { multerUpload } from "../../Middleware/multer.middleware.js";
const userController = Router();
userController.get("/profile", authenticate, async (req, res) =>
  res.json({
    message: "User profile retrieved successfully",
    data: await userService.profileData(req.authUser._id),
  }),
);
userController.patch(
  "/profile",
  authenticate,
  validation(profileSchema),
  async (req, res) =>
    res.json({
      message: "User profile updated successfully",
      data: await userService.updateProfile(req.authUser._id, req.validate),
    }),
);
userController.delete("/delete", authenticate, async (req, res) =>
  res.json({
    message: "User profile deleted successfully",
    data: await userService.deleteProfile(req.authUser._id),
  }),
);
userController.patch(
  "/profile-picture",
  authenticate,
  multerUpload({ desiredPath: "Profiles" }).single("profile"),
  async (req, res) => {
    const result = await userService.uploadProfilePicture(
      req.file,
      req.authUser,
    );
    res.json({
      message: "Profile picture is Uploaded successfully",
      data: result,
    });
  },
);
userController.get("/public/:id", async (req, res) =>
  res.json({ data: await userService.publicProfile(req.params.id) }),
);
userController.get(
  "/",
  authenticate,
  authorization("admin"),
  async (req, res) => res.json({ data: await userService.listUsers() }),
);
export default userController;
