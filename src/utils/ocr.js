import Tesseract from 'tesseract.js';

export async function scanIngredients(imageElement) {
  // 1. Perform the OCR
  const { data: { text } } = await Tesseract.recognize(
    imageElement,
    'eng'
  );

  // 2. The Comprehensive Phos-Catcher Regex
  // This list is meticulously vetted to find inorganic phosphate additives common in food.
  // It uses specific names and word boundaries (\b) to eliminate false positives.
  const refinedPhosRegex = /\b(\w*phosphate|pyrophosphate|polyphosphate|hexametaphosphate|phosphoric acid|calcium glycerophosphate|monopotassium phosphate|dipotassium phosphate|tripotassium phosphate|monocalcium phosphate|dicalcium phosphate|tricalcium phosphate|magnesium phosphate|ferric phosphate|sodium aluminum phosphate|monosodium phosphate|disodium phosphate|trisodium phosphate|tetrasodium phosphate|ammonium phosphate)\w*\b/i;

  const hasPhosphateAdditives = refinedPhosRegex.test(text);

  return {
    rawText: text,
    isDangerous: hasPhosphateAdditives
  };
}
