import { Transform } from 'class-transformer';

/**
 * Transform decorator: ép field text về **plain text** bằng cách bỏ mọi thẻ HTML
 * (`<...>`) + trim (spec F5 — sanitize-on-write). Round này KHÔNG cho rich HTML,
 * nên strip toàn bộ markup là đủ (không phải allow-list HTML — nơi regex sẽ yếu).
 * Lớp phòng thủ thứ hai là escape-on-render ở theme extension (Liquid).
 */
export function StripTags(): PropertyDecorator {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : value,
  );
}
