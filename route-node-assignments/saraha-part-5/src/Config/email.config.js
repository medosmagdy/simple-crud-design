import nodemailer from "nodemailer";
import { getConfig } from "./env.config.js";
export function createMailer() {
  const c = getConfig().smtp;
  if (!c?.host || !c.from) throw new Error("Configure SMTP_HOST and MAIL_FROM");
  const transport = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: c.user ? { user: c.user, pass: c.password } : undefined,
  });
  return {
    sendMail: (message) => transport.sendMail({ from: c.from, ...message }),
  };
}
