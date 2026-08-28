import Tesseract from 'tesseract.js';

export async function scanIngredients(imageElement) {
  const { data: { text } } = await Tesseract.recognize(
    imageElement,
    'eng',
    { logger: m => console.log(m) }
  );

  const dangerRegex = /phos|pyrophosphate|polyphosphate|hexametaphosphate|calcium phosphate/i;
  const hasDangerousAdditives = dangerRegex.test(text);

  return {
    rawText: text,
    isDangerous: hasDangerousAdditives
  };
}
