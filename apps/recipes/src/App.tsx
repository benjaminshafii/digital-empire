import { useState, useCallback } from 'react'

// Base recipe ratios (per 22g lemon juice)
const BASE = {
  lemonJuice: 22,
  sugar: 13,
  maple: 2,
  salt: 0.35,
  bakingSoda: 0.06,
  lemonZest: 0.5,
  water: 40,
}

interface Ingredient {
  name: string
  key: keyof typeof BASE
  unit: string
  note?: string
}

const INGREDIENTS: Ingredient[] = [
  { name: 'Lemon Juice', key: 'lemonJuice', unit: 'g' },
  { name: 'Sugar', key: 'sugar', unit: 'g' },
  { name: 'Maple Syrup', key: 'maple', unit: 'g' },
  { name: 'Salt', key: 'salt', unit: 'g' },
  { name: 'Baking Soda', key: 'bakingSoda', unit: 'g' },
  { name: 'Lemon Zest', key: 'lemonZest', unit: 'g', note: 'steep 10 min' },
  { name: 'Water', key: 'water', unit: 'g', note: 'for steeping zest' },
]

function formatNumber(n: number): string {
  if (n >= 10) return n.toFixed(1)
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(3)
}

export default function App() {
  const [lemonJuice, setLemonJuice] = useState(22)

  const ratio = lemonJuice / BASE.lemonJuice

  const calculate = useCallback((key: keyof typeof BASE): number => {
    return BASE[key] * ratio
  }, [ratio])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isNaN(val) && val >= 0) {
      setLemonJuice(val)
    } else if (e.target.value === '') {
      setLemonJuice(0)
    }
  }

  const handleQuickSet = (amount: number) => {
    setLemonJuice(amount)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Lemonade</h1>
        <p style={styles.subtitle}>ratio calculator</p>
      </header>

      <div style={styles.inputSection}>
        <label style={styles.inputLabel}>Lemon Juice (g)</label>
        <input
          type="number"
          inputMode="decimal"
          value={lemonJuice || ''}
          onChange={handleChange}
          style={styles.mainInput}
          placeholder="22"
        />
        <div style={styles.quickButtons}>
          {[22, 44, 66, 100].map(amt => (
            <button
              key={amt}
              onClick={() => handleQuickSet(amt)}
              style={{
                ...styles.quickButton,
                ...(lemonJuice === amt ? styles.quickButtonActive : {})
              }}
            >
              {amt}g
            </button>
          ))}
        </div>
      </div>

      <div style={styles.ingredients}>
        {INGREDIENTS.filter(i => i.key !== 'lemonJuice').map(ingredient => (
          <div key={ingredient.key} style={styles.ingredientRow}>
            <div style={styles.ingredientInfo}>
              <span style={styles.ingredientName}>{ingredient.name}</span>
              {ingredient.note && (
                <span style={styles.ingredientNote}>{ingredient.note}</span>
              )}
            </div>
            <div style={styles.ingredientValue}>
              <span style={styles.value}>{formatNumber(calculate(ingredient.key))}</span>
              <span style={styles.unit}>{ingredient.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <footer style={styles.footer}>
        <p style={styles.footerText}>Steep zest in water for 10 min before mixing</p>
      </footer>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100dvh',
    backgroundColor: '#0a0a0a',
    color: '#fafafa',
    fontFamily: "'JetBrains Mono', monospace",
    padding: '24px 20px',
    boxSizing: 'border-box',
    maxWidth: '100vw',
    overflow: 'hidden',
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '4px 0 0 0',
    textTransform: 'lowercase',
  },
  inputSection: {
    marginBottom: '32px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  mainInput: {
    width: '100%',
    padding: '20px',
    fontSize: '32px',
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    backgroundColor: '#141414',
    border: '2px solid #262626',
    borderRadius: '12px',
    color: '#fafafa',
    textAlign: 'center',
    boxSizing: 'border-box',
    outline: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
  },
  quickButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  quickButton: {
    flex: 1,
    padding: '12px 8px',
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', monospace",
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  quickButtonActive: {
    backgroundColor: '#262626',
    borderColor: '#444',
    color: '#fafafa',
  },
  ingredients: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: '#141414',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  ingredientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#0f0f0f',
    borderBottom: '1px solid #1a1a1a',
  },
  ingredientInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ingredientName: {
    fontSize: '15px',
    fontWeight: 500,
  },
  ingredientNote: {
    fontSize: '11px',
    color: '#555',
  },
  ingredientValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  value: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#4ade80',
  },
  unit: {
    fontSize: '12px',
    color: '#666',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#444',
    margin: 0,
  },
}

// Global styles injection
const globalStyles = document.createElement('style')
globalStyles.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  
  html, body {
    background-color: #0a0a0a;
    overflow-x: hidden;
  }
  
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
  }
  
  button:active {
    transform: scale(0.97);
  }
`
document.head.appendChild(globalStyles)
