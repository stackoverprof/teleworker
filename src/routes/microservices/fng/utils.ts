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
 * Check if index is in Extreme Fear zone (0-24)
 */
export async function isExtremeFear(): Promise<boolean> {
  const { value } = await getFearGreedIndex();
  return value <= 24;
}

/**
 * Check if index is in Extreme Greed zone (76-100)
 */
export async function isExtremeGreed(): Promise<boolean> {
  const { value } = await getFearGreedIndex();
  return value >= 76;
}

/**
 * Check if index is ANY Extreme (Fear or Greed)
 */
export async function isExtremeStatus(): Promise<boolean> {
  const { value } = await getFearGreedIndex();
  return value <= 24 || value >= 76;
}
