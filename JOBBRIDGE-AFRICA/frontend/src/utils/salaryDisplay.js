const CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS", "CAD", "AUD", "INR",
]);

const SYMBOL_CURRENCIES = {
  "₦": "NGN",
  "£": "GBP",
  "€": "EUR",
};

export const formatSalaryLabel = (job) => {
  const salary = [job?.salary, job?.salaryRange]
    .map((value) => String(value || "").trim())
    .find((value) => value && !/^competitive$/i.test(value));
  if (!salary) return "";

  const currencyCode = String(job?.salaryCurrency || "")
    .trim()
    .toUpperCase()
    || salary.match(/\b([A-Z]{3})\b/i)?.[1]?.toUpperCase()
    || Object.entries(SYMBOL_CURRENCIES).find(([symbol]) => salary.includes(symbol))?.[1];

  if (currencyCode && CURRENCY_CODES.has(currencyCode)) {
    return new RegExp(`\\b${currencyCode}\\b`, "i").test(salary)
      ? salary
      : `${currencyCode} ${salary}`;
  }
  if (salary.includes("$")) return `${salary} · currency not specified`;
  return `${salary} · currency not specified`;
};
