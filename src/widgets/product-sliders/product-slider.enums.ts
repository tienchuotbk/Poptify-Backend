/** Enum dùng chung cho Product Slider (entity + DTO). best_sellers đã cắt (D10). */

export enum ProductSliderSourceType {
  Featured = 'featured',
  Collection = 'collection',
}

export enum ProductSliderPlacement {
  AboveProductDescription = 'above_product_description',
  BelowProductDescription = 'below_product_description',
  CustomSelector = 'custom_selector',
}
