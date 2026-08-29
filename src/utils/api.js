export async function fetchBarcodeData(barcode, patientPortionMultiplier = 1) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status !== 1) return null;

    const nutriments = data.product.nutriments;
    
    // 1. Prioritize the actual serving size, fallback to 100g if missing.
    // 2. OFF returns minerals in grams, so we multiply by 1000 for mg.
    let rawPhos = (nutriments.phosphorus_serving || nutriments.phosphorus_100g || 0) * 1000;
    let rawPotassium = (nutriments.potassium_serving || nutriments.potassium_100g || 0) * 1000;
    let rawSodium = (nutriments.sodium_serving || nutriments.sodium_100g || 0) * 1000;
    
    // Protein is already tracked in grams, so no conversion is needed
    let rawProtein = nutriments.proteins_serving || nutriments.proteins_100g || 0;

    return {
      name: data.product.product_name || "Unknown Product",
      // Round the final numbers so the UI doesn't display messy decimals
      phos_mg: Math.round(rawPhos * patientPortionMultiplier),
      potassium_mg: Math.round(rawPotassium * patientPortionMultiplier),
      sodium_mg: Math.round(rawSodium * patientPortionMultiplier),
      protein_g: Math.round(rawProtein * patientPortionMultiplier)
    };
  } catch (error) {
    console.error("API Error or Offline:", error);
    return null;
  }
}
