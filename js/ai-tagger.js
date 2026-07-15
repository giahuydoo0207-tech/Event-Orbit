// Mock AI Auto-Tagging engine based on description keywords
// Ready to be replaced by a real OpenAI / LLM API call

const SKILL_KEYWORDS = [
  { tag: 'AI', keywords: ['ai', 'artificial intelligence', 'trí tuệ nhân tạo', 'machine learning', 'deep learning', 'chatgpt', 'llm', 'prompt'] },
  { tag: 'Blockchain', keywords: ['blockchain', 'smart contract', 'solidity', 'web3', 'sbt', 'nft', 'ethers', 'ethereum', 'solana', 'chain'] },
  { tag: 'Frontend', keywords: ['frontend', 'react', 'vue', 'html', 'css', 'javascript', 'ui', 'ux', 'giao diện', 'vite', 'tailwind'] },
  { tag: 'Backend', keywords: ['backend', 'node', 'express', 'python', 'database', 'sql', 'nosql', 'api', 'server', 'docker', 'golang'] },
  { tag: 'Python', keywords: ['python', 'django', 'flask', 'numpy', 'pandas', 'data science'] },
  { tag: 'SoftSkills', keywords: ['soft skills', 'kỹ năng mềm', 'thuyết trình', 'làm việc nhóm', 'teamwork', 'quản lý thời gian', 'leadership', 'lãnh đạo'] },
  { tag: 'DevOps', keywords: ['devops', 'ci/cd', 'aws', 'cloud', 'kubernetes', 'deploy', 'vercel', 'git'] },
  { tag: 'Security', keywords: ['security', 'bảo mật', 'an toàn thông tin', 'hack', 'penetration', 'cryptography', 'mã hóa'] }
];

export async function autoTagEvent(description) {
  // Simulate network delay for AI thinking (500ms)
  await new Promise(resolve => setTimeout(resolve, 600));

  if (!description || description.trim() === '') {
    return ['#Event'];
  }

  const descLower = description.toLowerCase();
  const matchedTags = new Set();

  for (const item of SKILL_KEYWORDS) {
    for (const kw of item.keywords) {
      if (descLower.includes(kw)) {
        matchedTags.add(`#${item.tag}`);
        break; // Match once per tag
      }
    }
  }

  // Fallbacks if no keywords matched
  if (matchedTags.size === 0) {
    matchedTags.add('#General');
    matchedTags.add('#Networking');
  }

  // Return max 3 tags
  return Array.from(matchedTags).slice(0, 3);
}

/*
// Example of how to integrate real API later:
export async function autoTagEventReal(description) {
  try {
    const response = await fetch('/api/ai-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    const data = await response.json();
    return data.tags; // e.g., ["#AI", "#Backend"]
  } catch (error) {
    console.error("AI tagging failed, using fallback:", error);
    return ['#General'];
  }
}
*/
