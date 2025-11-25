import { sendEmail } from "../services/emailService.js";

export const sendOfferEmail = async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await sendEmail(to, subject, html);

    res.json({ status: "sent" });
  } catch (err) {
    console.error("EMAIL SEND ERROR:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
};





