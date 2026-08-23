export interface MathShortcut {
  id: string;
  name: string;
  category: 'Temel' | 'Kalkülüs' | 'Cebir & Matris' | 'Semboller' | 'Yunan Harfleri';
  latex: string;
  preview: string;
}

export const MATH_SHORTCUTS: MathShortcut[] = [
  // Temel
  { id: 'frac', name: 'Kesir', category: 'Temel', latex: '\\frac{a}{b}', preview: '\\frac{a}{b}' },
  { id: 'sqrt', name: 'Karekök', category: 'Temel', latex: '\\sqrt{x}', preview: '\\sqrt{x}' },
  { id: 'nroot', name: 'n. Dereceden Kök', category: 'Temel', latex: '\\sqrt[n]{x}', preview: '\\sqrt[n]{x}' },
  { id: 'pow', name: 'Üs', category: 'Temel', latex: 'x^{n}', preview: 'x^n' },
  { id: 'sub', name: 'İndis', category: 'Temel', latex: 'x_{i}', preview: 'x_i' },
  
  // Kalkülüs
  { id: 'int', name: 'Belirsiz İntegral', category: 'Kalkülüs', latex: '\\int f(x) \\, dx', preview: '\\int f(x) dx' },
  { id: 'defint', name: 'Belirli İntegral', category: 'Kalkülüs', latex: '\\int_{a}^{b} f(x) \\, dx', preview: '\\int_{a}^{b} f(x) dx' },
  { id: 'doubleint', name: 'İki Katlı İntegral', category: 'Kalkülüs', latex: '\\iint_{D} f(x,y) \\, dA', preview: '\\iint' },
  { id: 'sum', name: 'Toplam Sembolü', category: 'Kalkülüs', latex: '\\sum_{n=1}^{\\infty} a_n', preview: '\\sum_{n=1}^{\\infty}' },
  { id: 'prod', name: 'Çarpım Sembolü', category: 'Kalkülüs', latex: '\\prod_{i=1}^{n} x_i', preview: '\\prod' },
  { id: 'lim', name: 'Limit', category: 'Kalkülüs', latex: '\\lim_{x \\to \\infty} f(x)', preview: '\\lim_{x \\to 0}' },
  { id: 'deriv', name: 'Türev (Leibniz)', category: 'Kalkülüs', latex: '\\frac{df}{dx}', preview: '\\frac{df}{dx}' },
  { id: 'pderiv', name: 'Kısmi Türev', category: 'Kalkülüs', latex: '\\frac{\\partial f}{\\partial x}', preview: '\\frac{\\partial f}{\\partial x}' },
  
  // Cebir & Matris
  { id: 'matrix2x2', name: '2x2 Matris', category: 'Cebir & Matris', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
  { id: 'matrix3x3', name: '3x3 Matris', category: 'Cebir & Matris', latex: '\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}', preview: '\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}' },
  { id: 'det', name: 'Determinant', category: 'Cebir & Matris', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
  { id: 'vector', name: 'Vektör', category: 'Cebir & Matris', latex: '\\vec{v} = \\begin{bmatrix} v_x \\\\ v_y \\\\ v_z \\end{bmatrix}', preview: '\\vec{v}' },
  { id: 'cases', name: 'Parçalı Fonksiyon', category: 'Cebir & Matris', latex: 'f(x) = \\begin{cases} x^2 & x \\ge 0 \\\\ -x & x < 0 \\end{cases}', preview: '\\begin{cases} a \\\\ b \\end{cases}' },
  
  // Semboller
  { id: 'infty', name: 'Sonsuz', category: 'Semboller', latex: '\\infty', preview: '\\infty' },
  { id: 'pm', name: 'Artı Eksi', category: 'Semboller', latex: '\\pm', preview: '\\pm' },
  { id: 'times', name: 'Çarpı', category: 'Semboller', latex: '\\times', preview: '\\times' },
  { id: 'cdot', name: 'Nokta Çarpım', category: 'Semboller', latex: '\\cdot', preview: '\\cdot' },
  { id: 'neq', name: 'Eşit Değil', category: 'Semboller', latex: '\\neq', preview: '\\neq' },
  { id: 'approx', name: 'Yaklaşık', category: 'Semboller', latex: '\\approx', preview: '\\approx' },
  { id: 'le', name: 'Küçük Eşit', category: 'Semboller', latex: '\\le', preview: '\\le' },
  { id: 'ge', name: 'Büyük Eşit', category: 'Semboller', latex: '\\ge', preview: '\\ge' },
  { id: 'forall', name: 'Her (For all)', category: 'Semboller', latex: '\\forall', preview: '\\forall' },
  { id: 'exists', name: 'Vardır (Exists)', category: 'Semboller', latex: '\\exists', preview: '\\exists' },
  { id: 'in', name: 'Elemanıdır', category: 'Semboller', latex: '\\in', preview: '\\in' },
  { id: 'subset', name: 'Alt Kümesi', category: 'Semboller', latex: '\\subset', preview: '\\subset' },
  
  // Yunan Harfleri
  { id: 'alpha', name: 'Alfa (α)', category: 'Yunan Harfleri', latex: '\\alpha', preview: '\\alpha' },
  { id: 'beta', name: 'Beta (β)', category: 'Yunan Harfleri', latex: '\\beta', preview: '\\beta' },
  { id: 'gamma', name: 'Gama (γ)', category: 'Yunan Harfleri', latex: '\\gamma', preview: '\\gamma' },
  { id: 'delta', name: 'Delta (Δ / δ)', category: 'Yunan Harfleri', latex: '\\Delta', preview: '\\Delta' },
  { id: 'theta', name: 'Teta (θ)', category: 'Yunan Harfleri', latex: '\\theta', preview: '\\theta' },
  { id: 'pi', name: 'Pi (π)', category: 'Yunan Harfleri', latex: '\\pi', preview: '\\pi' },
  { id: 'lambda', name: 'Lambda (λ)', category: 'Yunan Harfleri', latex: '\\lambda', preview: '\\lambda' },
  { id: 'sigma', name: 'Sigma (σ / Σ)', category: 'Yunan Harfleri', latex: '\\sigma', preview: '\\sigma' },
  { id: 'omega', name: 'Omega (Ω / ω)', category: 'Yunan Harfleri', latex: '\\omega', preview: '\\omega' },
  { id: 'phi', name: 'Fi (φ)', category: 'Yunan Harfleri', latex: '\\phi', preview: '\\phi' }
];
