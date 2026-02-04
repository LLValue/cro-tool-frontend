/**
 * Unit tests for DevTools-style device zoom (Fit scale + sharp scale).
 *
 * Manual verification (Page Preview, mobile view):
 * 1. Clic: seleccionar Fit, 75%, 100% y comprobar que la escala aplicada y la etiqueta coinciden.
 * 2. Teclado: foco en el grupo de zoom, flecha izquierda/derecha y comprobar ciclo Fit → 75% → 100% → Fit.
 * 3. Redimensionar ventana en modo Fit y comprobar que "Fit (XX%)" y la vista se actualizan (ResizeObserver).
 */
import { calculateFitScale, fitScaleToPercent } from './device-zoom.utils';

describe('device-zoom.utils', () => {
  describe('calculateFitScale', () => {
    it('returns 1 (100%) when preferred size is larger than screen (sufficient space)', () => {
      const scale = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 800,
        preferredHeight: 1000
      });
      expect(scale).toBe(1);
    });

    it('returns 1 when preferred equals screen', () => {
      const scale = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 375,
        preferredHeight: 812
      });
      expect(scale).toBe(1);
    });

    it('returns scale < 1 when space is limited (limited space -> <100%)', () => {
      const scale = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 200,
        preferredHeight: 400
      });
      expect(scale).toBeLessThan(1);
      expect(scale).toBeGreaterThan(0);
      // rawScale = min(200/375, 400/812) ≈ min(0.533, 0.493) ≈ 0.493 -> floor 49%
      expect(scale).toBeCloseTo(0.49, 2);
    });

    it('caps at 100% (never above 1)', () => {
      const scale = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 2000,
        preferredHeight: 2000
      });
      expect(scale).toBe(1);
    });

    it('uses outline insets in effective size (must fit area)', () => {
      const scaleNoOutline = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 375,
        preferredHeight: 812
      });
      const scaleWithOutline = calculateFitScale({
        screenWidth: 375,
        screenHeight: 812,
        preferredWidth: 375,
        preferredHeight: 812,
        outlineInsets: { left: 10, top: 10, right: 10, bottom: 10 }
      });
      expect(scaleNoOutline).toBe(1);
      expect(scaleWithOutline).toBeLessThan(1);
      // effective = 395 x 832, raw = min(375/395, 812/832) < 1
      expect(scaleWithOutline).toBeGreaterThan(0.9);
    });

    it('sharp scale: prefers integer scaled dimensions when possible', () => {
      // Preferred size that gives a raw pct that may not yield integer dimensions.
      // screen 100x100, preferred 87x87 -> raw 0.87 -> pct 87.
      // content 100x100 (no insets): 87% -> 87x87 (integer). So scale = 0.87.
      const scale = calculateFitScale({
        screenWidth: 100,
        screenHeight: 100,
        preferredWidth: 87,
        preferredHeight: 87
      });
      expect(scale).toBe(0.87);
      expect(100 * scale).toBe(87);
    });

    it('sharp scale: may reduce pct to get integer dimensions (threshold 0.7)', () => {
      // Example where raw gives e.g. 73%, 73*50 = 3650 (integer), 73*50 = 3650 (integer). So 73% is already integer.
      // Try screen 50,50 preferred 40,40 -> raw 0.8 -> pct 80. 80*50/100 = 40 (integer). So 80% stays.
      const scale = calculateFitScale({
        screenWidth: 50,
        screenHeight: 50,
        preferredWidth: 40,
        preferredHeight: 40
      });
      expect(scale).toBe(0.8);
    });
  });

  describe('fitScaleToPercent', () => {
    it('returns integer 0-100', () => {
      expect(fitScaleToPercent(0)).toBe(0);
      expect(fitScaleToPercent(1)).toBe(100);
      expect(fitScaleToPercent(0.75)).toBe(75);
      expect(fitScaleToPercent(0.49)).toBe(49);
    });

    it('clamps to 0 and 100', () => {
      expect(fitScaleToPercent(-0.1)).toBe(0);
      expect(fitScaleToPercent(1.5)).toBe(100);
    });
  });
});
