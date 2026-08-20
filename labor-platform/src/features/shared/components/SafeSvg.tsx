import { useMemo } from 'react';

const ALLOWED_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan']);
const ALLOWED_ATTRS = new Set([
  'viewbox',
  'xmlns',
  'width',
  'height',
  'fill',
  'stroke',
  'stroke-width',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'opacity',
  'fill-opacity',
  'stroke-linecap',
  'stroke-linejoin',
]);

const sanitizeSvg = (raw: string) => {
  if (typeof window === 'undefined' || !raw.includes('<svg')) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return '';

  const walk = (node: Element) => {
    if (!ALLOWED_TAGS.has(node.tagName.toLowerCase())) {
      node.remove();
      return;
    }
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:') || !ALLOWED_ATTRS.has(name)) {
        node.removeAttribute(attr.name);
      }
    });
    [...node.children].forEach((child) => walk(child));
  };

  const svg = doc.documentElement;
  walk(svg);
  return svg.outerHTML;
};

interface SafeSvgProps {
  markup: string;
  className?: string;
}

export const SafeSvg = ({ markup, className }: SafeSvgProps) => {
  const html = useMemo(() => sanitizeSvg(markup), [markup]);
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
