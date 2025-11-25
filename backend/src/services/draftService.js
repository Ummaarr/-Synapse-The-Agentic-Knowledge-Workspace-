import ollama from "ollama";
import { extractCandidateDetails } from "./candidateExtractorService.js";

const estimateSalary = ({ position, experienceYears, location, currentSalary }) => {
  const isIndia = !location || location.toLowerCase().includes("india");
  const currency = isIndia ? "₹" : "$";
  const unit = isIndia ? "LPA" : "per annum";

  if (currentSalary) {
    const parsed = parseFloat(currentSalary);
    if (!Number.isNaN(parsed) && parsed > 0) {
      const offered = Math.round(parsed * 1.15);
      return `${currency}${offered}${isIndia ? " LPA" : ""} ${unit}`;
    }
  }

  const pos = (position || "").toLowerCase();
  let base = isIndia ? 6 : 70000;
  if (pos.includes("senior") || pos.includes("lead") || pos.includes("principal")) {
    base = isIndia ? 15 : 120000;
  } else if (pos.includes("mid") || pos.includes("experienced")) {
    base = isIndia ? 10 : 90000;
  }

  const exp = experienceYears || 2;
  if (exp >= 5) base = Math.round(base * 1.5);
  else if (exp >= 3) base = Math.round(base * 1.2);
  else if (exp < 1) base = Math.max(4, Math.round(base * 0.7));

  return `${currency}${base}${isIndia ? " LPA" : ""} ${unit}`;
};

export const draftOfferHtml = async ({
  name,
  email,
  chunks = [],
  position,
  experienceYears,
  skills,
  location,
  currentSalary
}) => {
  const details = extractCandidateDetails(chunks || []);

  const finalPosition = position || details.position || "Software Engineer";
  const finalExperience = experienceYears ?? details.experienceYears;
  const finalSkills = skills && skills.length > 0 ? skills : details.skills;
  const finalLocation = location || details.location || "Remote";
  const finalCurrentSalary = currentSalary || details.currentSalary;

  const salary = estimateSalary({
    position: finalPosition,
    experienceYears: finalExperience,
    location: finalLocation,
    currentSalary: finalCurrentSalary
  });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 14); // Default start date 2 weeks from now
  const startDateStr = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // OPTIMIZATION: Instead of generating the full HTML (slow), we generate just a short personalized opening.
  // This reduces token generation from ~1500 to ~100, making it 15x faster.

  let personalizedOpening = `We are absolutely thrilled to offer you the position of <strong style="color: #0f172a;">${finalPosition}</strong> at Synapse AI. Your skills and experience impressed us deeply, and we believe you will be a transformative addition to our team.`;

  try {
    // Only use LLM if we have resume chunks to make it personalized
    if (chunks && chunks.length > 0) {
      const keyChunks = chunks.slice(0, 2);
      const resumeText = keyChunks.map(c => c.text).join(" ");
      const resumeContext = resumeText.substring(0, 300);

      const prompt = `Write a single, enthusiastic sentence welcoming ${name || "the candidate"} to Synapse AI as a ${finalPosition}, mentioning one specific skill or experience from their resume context.
      
      Resume Context: ${resumeContext}
      
      Output ONLY the sentence. No quotes.`;

      const response = await ollama.chat({
        model: "llama3.2",
        messages: [{ role: "user", content: prompt }],
        options: {
          temperature: 0.7,
          num_predict: 60, // Very short limit for speed
          top_p: 0.9
        }
      });

      const generated = response?.message?.content?.trim();
      if (generated && generated.length > 10) {
        personalizedOpening = `${generated} We believe you will be a transformative addition to our team.`;
      }
    }
  } catch (err) {
    console.warn("Personalization skipped due to error, using default:", err);
  }

  // Return the premium HTML template directly populated with JS variables
  // This is instant and guarantees the design quality
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); color: #334155; line-height: 1.6;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #2563eb; font-size: 24px; letter-spacing: -0.5px;">Synapse AI</h1>
        <span style="color: #64748b; font-size: 14px;">${today}</span>
      </div>

      <p style="font-size: 16px; margin-bottom: 20px;"><strong>Dear ${name || "Candidate"},</strong></p>

      <p style="margin-bottom: 20px;">${personalizedOpening}</p>

      <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px;">Compensation Package</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 15px;">
        <tr style="background-color: #f8fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Annual Base Salary</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">${salary}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Performance Bonus</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">10% of Base Salary</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Stock Options</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">500 RSUs (4-year vesting)</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">Signing Bonus</td>
          <td style="padding: 12px; border: 1px solid #e2e8f0;">$5,000</td>
        </tr>
      </table>

      <h3 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px;">Benefits & Perks</h3>
      <ul style="margin-bottom: 20px; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Comprehensive Health, Dental, and Vision Insurance</li>
        <li style="margin-bottom: 8px;">401(k) Retirement Plan with Company Match</li>
        <li style="margin-bottom: 8px;">20 Days Paid Time Off (PTO) plus Public Holidays</li>
        <li style="margin-bottom: 8px;">Flexible Remote-First Work Environment</li>
      </ul>

      <p style="margin-top: 30px;"><strong>Start Date:</strong> We anticipate your start date to be <strong>${startDateStr}</strong>.</p>

      <p style="margin-bottom: 40px;">We look forward to building the future of AI with you. Please sign below to accept this offer.</p>

      <div style="display: flex; justify-content: space-between; margin-top: 60px;">
        <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; width: 40%;">
          <p style="margin: 0; font-weight: 600; color: #0f172a;">Hiring Manager</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;">Synapse AI</p>
        </div>
        <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; width: 40%;">
          <p style="margin: 0; font-weight: 600; color: #0f172a;">${name || "Candidate Name"}</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;">Candidate</p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 50px;">
        <a href="#" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">Accept Offer</a>
      </div>
    </div>
  `;
};
