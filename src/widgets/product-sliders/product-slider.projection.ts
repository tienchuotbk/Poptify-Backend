import { ProductSliderEntity } from './product-slider.entity';

/**
 * Shape công khai của slider trong metafield `sliders` (theme extension đọc Liquid).
 * `id` = `publicId` (uuid). `source` chỉ chứa **reference** (productIds/collectionId);
 * Liquid resolve product khi render. KHÔNG phơi PK numeric/`shop`/timestamps.
 */
export interface PublicProductSlider {
  id: string;
  name: string;
  sourceType: string;
  priority: number;
  source: unknown;
  layout: unknown;
  behavior: unknown;
  display: unknown;
  placement: unknown;
}

export function toPublicProductSlider(
  s: ProductSliderEntity,
): PublicProductSlider {
  return {
    id: s.publicId,
    name: s.name,
    sourceType: s.sourceType,
    priority: s.priority,
    source: s.sourceConfig ?? null,
    layout: s.layoutConfig ?? null,
    behavior: s.behaviorConfig ?? null,
    display: s.displayConfig ?? null,
    placement: s.placementConfig ?? null,
  };
}
