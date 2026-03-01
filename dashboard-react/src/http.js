const truncate = (value, max = 180) => {
  if (typeof value !== "string") return "";
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
};

export async function readApiResponse(res) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      return { data, rawText: "" };
    } catch {
      return { data: {}, rawText: "" };
    }
  }

  const rawText = await res.text();
  return { data: {}, rawText };
}

export function getApiErrorMessage(res, data, rawText, fallbackMessage) {
  if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  const pageMessage = truncate(rawText);
  if (pageMessage) return pageMessage;

  if (res.status === 404) {
    return "API endpoint not found. Check backend deployment and VITE_API_BASE_URL.";
  }

  return fallbackMessage;
}
