/**
 * Extract candidate details from resume chunks for offer letter generation.
 * Extracts position, years of experience, skills, location, and current salary if present.
 */
export const extractCandidateDetails = (chunks = []) => {
  if (!chunks || chunks.length === 0) {
    return defaultDetails();
  }

  // Combine first few chunks (most relevant info usually at the top of the resume)
  const text = chunks
    .slice(0, 5)
    .map(chunk => chunk.text || "")
    .join("\n");
  const lowerText = text.toLowerCase();

  const position = detectPosition(lowerText);
  const experienceYears = detectExperience(lowerText);
  const location = detectLocation(lowerText);
  const skills = detectSkills(lowerText);
  const currentSalary = detectSalary(lowerText);

  return {
    position: position || "Software Engineer",
    experienceYears: experienceYears ?? 2,
    skills,
    location: location || "India",
    currentSalary: currentSalary || null
  };
};

const defaultDetails = () => ({
  position: "Software Engineer",
  experienceYears: 2,
  skills: [],
  location: "India",
  currentSalary: null
});

const detectPosition = (text) => {
  const patterns = [
    /(?:position|title|role|job title|current role)[\s:]+([a-z\s]+?(?:engineer|developer|manager|analyst|designer|specialist|consultant|architect|lead|senior|junior))/i,
    /\b(senior|junior|lead|principal)\s+([a-z\s]+?(?:engineer|developer|manager|analyst|designer|specialist|consultant|architect))/i,
    /\b(full\s*stack|frontend|backend|software|data|ml|ai|devops|cloud|product|project)\s+([a-z\s]+?(?:engineer|developer|manager|analyst|designer|specialist|consultant|architect))/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] || match[2] || match[0]).trim().replace(/\s+/g, " ");
    }
  }
  return null;
};

const detectExperience = (text) => {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
    /experience[\s:]+(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:in|of)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
};

const detectLocation = (text) => {
  const patterns = [
    /(?:location|based in|from|residing in)[\s:]+([a-z\s,]+?(?:india|usa|uk|canada|australia|germany|france|andhra pradesh|karnataka|maharashtra|tamil nadu|delhi|mumbai|bangalore|hyderabad|chennai|pune|kolkata))/i,
    /\b(india|usa|uk|canada|australia|andhra pradesh|karnataka|maharashtra|tamil nadu|delhi|mumbai|bangalore|hyderabad|chennai|pune|kolkata)\b/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] || match[0]).trim();
    }
  }
  return null;
};

const detectSkills = (text) => {
  const skillKeywords = [
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "angular",
    "vue",
    "typescript",
    "sql",
    "mongodb",
    "postgresql",
    "aws",
    "azure",
    "docker",
    "kubernetes",
    "git",
    "html",
    "css",
    "express",
    "django",
    "flask",
    "spring",
    "redux",
    "graphql",
    "machine learning",
    "ml",
    "ai",
    "data science",
    "tensorflow",
    "pytorch",
    "pandas",
    "numpy",
    "devops",
    "ci/cd"
  ];

  const detected = skillKeywords.filter(skill => text.includes(skill));
  return detected.slice(0, 10);
};

const detectSalary = (text) => {
  const patterns = [
    /(?:salary|ctc|package|compensation)[\s:]+(?:₹|rs\.?|inr|\$|usd)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lpa|per annum|pa|annually|yearly)/i,
    /(?:₹|rs\.?|inr|\$|usd)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|lpa|per annum|pa)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/,/g, "");
    }
  }
  return null;
};



