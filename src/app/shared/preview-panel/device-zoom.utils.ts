/**
 * Device zoom scale calculation – replicates Chrome DevTools Device Toolbar zoom.
 * Scale is applied visually via transform: scale(S); logical viewport size is unchanged.
 *
 * References: DevTools frontend (Fit to window, 75%, 100%), calculateFitScale,
 * CDP Emulation.setDeviceMetricsOverride scale "Scale to apply to resulting view image."
 */

export interface Insets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FitScaleParams {
  /** Logical screen size of the device/viewport (CSS px). */
  screenWidth: number;
  screenHeight: number;
  /** Available size where the scaled view must fit (preferredSize in DevTools). */
  preferredWidth: number;
  preferredHeight: number;
  /** Outline/frame insets included in "must fit" area. Default zero. */
  outlineInsets?: Insets;
  /** Content insets used for sharp-scale check (integer scaled dimensions). Default zero. */
  contentInsets?: Insets;
  /** Minimum scale for sharp search, as fraction of raw fit scale (DevTools uses 0.7). */
  sharpMinRatio?: number;
}

const ZERO_INSETS: Insets = { left: 0, top: 0, right: 0, bottom: 0 };

/**
 * FIT scale (DevTools algorithm):
 * 1) effectiveSize = screen + outline
 * 2) rawScale = min(preferredW / effectiveW, preferredH / effectiveH)
 * 3) pct = min(floor(rawScale * 100), 100)
 * 4) Sharp scale: from pct down to pct*0.7, find first integer % where
 *    (screen - contentInsets) * pct/100 is integer in both dimensions.
 *
 * @returns Scale factor in [0, 1] to apply via transform: scale(S); transform-origin: top left.
 */
export function calculateFitScale(params: FitScaleParams): number {
  const {
    screenWidth,
    screenHeight,
    preferredWidth,
    preferredHeight,
    outlineInsets = ZERO_INSETS,
    contentInsets = ZERO_INSETS,
    sharpMinRatio = 0.7
  } = params;

  const effectiveW = screenWidth + (outlineInsets.left + outlineInsets.right);
  const effectiveH = screenHeight + (outlineInsets.top + outlineInsets.bottom);
  if (effectiveW <= 0 || effectiveH <= 0) return 1;

  const rawScale = Math.min(preferredWidth / effectiveW, preferredHeight / effectiveH);
  let pct = Math.min(Math.floor(rawScale * 100), 100);
  if (pct < 1) pct = 1;

  const contentW = screenWidth - (contentInsets.left + contentInsets.right);
  const contentH = screenHeight - (contentInsets.top + contentInsets.bottom);
  const minSharpPct = Math.max(1, Math.floor(pct * sharpMinRatio));

  for (let sharpPct = pct; sharpPct >= minSharpPct; sharpPct--) {
    const scaledW = (contentW * sharpPct) / 100;
    const scaledH = (contentH * sharpPct) / 100;
    if (Number.isInteger(scaledW) && Number.isInteger(scaledH)) {
      return sharpPct / 100;
    }
  }
  return pct / 100;
}

/**
 * Returns the integer percentage (0–100) for the current fit scale, for display as "Fit (XX%)".
 */
export function fitScaleToPercent(scale: number): number {
  return Math.min(100, Math.max(0, Math.round(scale * 100)));
}
