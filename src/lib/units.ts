// Unit types
export type WeightUnit = 'g' | 'kg'
export type VolumeUnit = 'mL' | 'L'
export type CountUnit = 'unit'
export type DisplayUnit = WeightUnit | VolumeUnit | CountUnit
export type BaseUnit = 'g' | 'mL' | 'unit'

// Conversion factors to base unit
export const CONVERSION_FACTORS: Record<DisplayUnit, number> = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  unit: 1,
}

// Display label for each unit
export const UNIT_LABELS: Record<DisplayUnit, string> = {
  g: 'grams (g)',
  kg: 'kilograms (kg)',
  mL: 'milliliters (mL)',
  L: 'liters (L)',
  unit: 'units (count)',
}

// Short labels
export const UNIT_SHORT: Record<DisplayUnit, string> = {
  g: 'g',
  kg: 'kg',
  mL: 'mL',
  L: 'L',
  unit: 'unit',
}

// Which display units are compatible with each base unit
export const COMPATIBLE_UNITS: Record<BaseUnit, DisplayUnit[]> = {
  g: ['g', 'kg'],
  mL: ['mL', 'L'],
  unit: ['unit'],
}

/**
 * Convert display quantity to base unit quantity
 * e.g. 2 kg -> 2000 g
 */
export function toBaseUnit(quantity: number, displayUnit: DisplayUnit): number {
  return quantity * CONVERSION_FACTORS[displayUnit]
}

/**
 * Convert base unit quantity to display unit quantity
 * e.g. 2000 g -> 2 kg
 */
export function fromBaseUnit(baseQty: number, displayUnit: DisplayUnit): number {
  return baseQty / CONVERSION_FACTORS[displayUnit]
}

export function calculateLineTotalPaise(
  basePricePaise: number,
  orderedQtyBase: number
): number {
  return Math.round(basePricePaise * orderedQtyBase)
}

/**
 * Format paise to INR string
 * e.g. 150000 -> "₹1,500.00"
 */
export function formatINR(paise: number): string {
  const inr = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(inr)
}

/**
 * Convert INR to paise
 */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100)
}

/**
 * Convert paise to INR
 */
export function paiseToInr(paise: number): number {
  return paise / 100
}
