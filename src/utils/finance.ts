/**
 * DuesGuard AI - Deterministic Financial Calculation Engine
 * 
 * Strict Financial Rules:
 * - Uses decimal-safe integer arithmetic (Paise: 1 INR = 100 paise) to prevent binary floating-point errors.
 * - Formula: Outstanding principal = Invoice total − Confirmed payments allocated − Applicable credits + Validated adjustments.
 * - Application code is the sole authority for financial calculations, never LLM output.
 * - Ambiguous payments are NEVER subtracted automatically.
 */

/**
 * Converts INR rupees to integer paise (1 INR = 100 paise)
 */
export function toPaise(rupees: number): number {
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise back to INR rupees
 */
export function toRupees(paise: number): number {
  return paise / 100;
}

/**
 * Decimal-safe addition of two rupee amounts
 */
export function addMoney(a: number, b: number): number {
  return toRupees(toPaise(a) + toPaise(b));
}

/**
 * Decimal-safe subtraction of two rupee amounts
 */
export function subMoney(a: number, b: number): number {
  return toRupees(toPaise(a) - toPaise(b));
}

/**
 * Calculate Outstanding Principal:
 * Outstanding principal = Invoice total − Confirmed payments allocated − Applicable credits + Validated adjustments
 */
export function calculateOutstandingPrincipal(
  invoiceTotal: number,
  confirmedPaymentsAllocated: number = 0,
  applicableCredits: number = 0,
  validatedAdjustments: number = 0
): number {
  const invoicePaise = toPaise(invoiceTotal);
  const paidPaise = toPaise(confirmedPaymentsAllocated);
  const creditsPaise = toPaise(applicableCredits);
  const adjustmentsPaise = toPaise(validatedAdjustments);

  const outstandingPaise = invoicePaise - paidPaise - creditsPaise + adjustmentsPaise;
  // Outstanding cannot be negative in standard receivables (unless specifically an overpayment)
  return toRupees(outstandingPaise);
}

/**
 * Calculate overdue days between a verified due date and an explicit as-of date.
 * Returns 0 if due date is in the future.
 */
export function calculateOverdueDays(dueDateStr: string, asOfDateStr: string): { overdueDays: number; isOverdue: boolean } {
  try {
    const due = new Date(dueDateStr);
    const asOf = new Date(asOfDateStr);

    if (isNaN(due.getTime()) || isNaN(asOf.getTime())) {
      return { overdueDays: 0, isOverdue: false };
    }

    // Reset times to UTC midnight to avoid timezone daylight shifts
    const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const asOfUTC = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());

    const diffMs = asOfUTC - dueUTC;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return { overdueDays: diffDays, isOverdue: true };
    }
    return { overdueDays: 0, isOverdue: false };
  } catch {
    return { overdueDays: 0, isOverdue: false };
  }
}

/**
 * Validates invoice line items arithmetic:
 * Checks whether sum(item.quantity * item.unitPrice) matches stated subtotal.
 */
export function validateLineItemsArithmetic(
  lineItems: Array<{ quantity: number; unitPrice: number; totalPrice?: number }>,
  statedSubtotal: number,
  tolerancePaise: number = 5 // 5 paise rounding tolerance
): { calculatedSubtotal: number; isMatch: boolean; discrepancyPaise: number } {
  let calculatedSubtotalPaise = 0;

  for (const item of lineItems) {
    const itemPaise = Math.round(item.quantity * toPaise(item.unitPrice));
    calculatedSubtotalPaise += itemPaise;
  }

  const statedSubtotalPaise = toPaise(statedSubtotal);
  const discrepancyPaise = Math.abs(calculatedSubtotalPaise - statedSubtotalPaise);
  const isMatch = discrepancyPaise <= tolerancePaise;

  return {
    calculatedSubtotal: toRupees(calculatedSubtotalPaise),
    isMatch,
    discrepancyPaise
  };
}

/**
 * Format currency in Indian numbering system (Lakhs & Crores):
 * e.g., 100000 -> "₹1,00,000.00"
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formattedDecimals = showDecimals ? absAmount.toFixed(2) : Math.round(absAmount).toString();
  const parts = formattedDecimals.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency grouping: last 3 digits, then every 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = showDecimals ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  return `${isNegative ? '-' : ''}₹${result}`;
}

/**
 * Format compact INR for metric counters (e.g. ₹1.2 Lakh, ₹50K)
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} Lakh`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  }
  return `${sign}₹${abs.toFixed(0)}`;
}
