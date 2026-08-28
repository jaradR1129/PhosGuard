export async function fetchBarcodeData(barcode, patientPortionMultiplier = 1) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await response.json();

  if (data.status !== 1) return null;

  const nutriments = data.product.nutriments;
  
  let rawPhos = nutriments.phosphorus_100g || 0;
  let rawPotassium = nutriments.potassium_100g || 0;
  let rawSodium = nutriments.sodium_100g || 0;
  let rawProtein = nutriments.proteins_100g || 0;

  return {
    name: data.product.product_name,
    phos_mg: rawPhos * patientPortionMultiplier,
    potassium_mg: rawPotassium * patientPortionMultiplier,
    sodium_mg: rawSodium * patientPortionMultiplier,
    protein_g: rawProtein * patientPortionMultiplier
  };
}
