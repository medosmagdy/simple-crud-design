import { getDependencies } from "../../../Config/env.config.js";
import HttpAppError from "../Errors/app.error.js";
export async function sendEmail(message) {
  const mailer = getDependencies().mailer;
  if (!mailer) throw new HttpAppError("SMTP is not configured", 503);
  return mailer.sendMail(message);
}
