const FNG_API_URL = "https://api.alternative.me/fng/";

export interface FngData {
  value: number;
  classification: string;
}

/**
 * Fetch current Fear & Greed index from alternative.me
 */
export async function getFearGreedIndex(): Promise<FngData> {
  const res = await fetch(FNG_API_URL);
  const data = (await res.json()) as {
    data: Array<{ value: string; value_classification: string }>;
  };

  const current = data.data[0];
  return {
    value: parseInt(current.value, 10),
    classification: current.value_classification,
  };
}

/**
 * Check if index is in extreme status (<= 24 or >= 76)
 */
export async function isExtremeStatus(): Promise<boolean> {
  const { value } = await getFearGreedIndex();
  return value <= 24 || value >= 76;
}
