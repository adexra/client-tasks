# Rewards System — Design Document

## Concept

Your execution OS has a built-in game layer. Completing real work earns XP. XP converts to Coins. Coins buy personal rewards from a tiered shop. A separate Reward Budget (funded by % of real profit) gates expensive asset purchases.

This prevents two failure modes:
- Grinding tiny tasks to buy a monitor (Coins gate)
- Completing one big project and immediately justifying a $1,000 purchase (Reward Budget gate)

---

## Three Currencies

| Currency | How Earned | How Spent |
|---|---|---|
| **XP** | Completing tasks | Never spent — only levels up |
| **Coins** | Converted from XP (100 XP = 15 Coins) | Buying rewards from the shop |
| **Reward Budget** | 8% of net profit per client payment | Required alongside Coins for Assets |

---

## XP Formula

```
XP = Base XP × Value Multiplier × Priority Multiplier × Complexity Multiplier
```

### Base XP (Effort / Time)

| Time | Base XP |
|---|---|
| 5 min | 5 |
| 15 min | 10 |
| 30 min | 20 |
| 1 hr | 40 |
| 2 hrs | 70 |
| 4 hrs | 120 |
| 8 hrs | 220 |

### Value Multiplier (revenue this task contributes to)

| Revenue | Multiplier |
|---|---|
| Internal / no revenue | ×1.0 |
| < $100 | ×1.2 |
| $100–300 | ×1.5 |
| $300–700 | ×2.0 |
| $700–1,500 | ×3.0 |
| $1,500–3,000 | ×4.0 |
| $3,000+ | ×5.0 |

### Priority Multiplier

| Priority | Multiplier |
|---|---|
| Low | ×0.8 |
| Normal | ×1.0 |
| High | ×1.3 |
| Critical | ×1.7 |

### Complexity Multiplier

| Complexity | Multiplier |
|---|---|
| Easy | ×1.0 |
| Medium | ×1.2 |
| Hard | ×1.5 |
| Expert | ×2.0 |

### Example

> Landing page · $1,000 project · High priority · 4 hrs · Hard
> = 120 × 3.0 × 1.3 × 1.5 ≈ **700 XP**

---

## Reward Budget Rule

```
Reward Budget += NET_PROFIT × 8%
```

Example: Client pays $4,000 · Expenses $800 · Profit $3,200 · Budget += **$256**

The budget is funded automatically when a payment is recorded in Financials.

---

## Freebies

Random reward drops triggered by task completion milestones (e.g. completing 10 tasks in a sprint, hitting a streak). These are bonus consumables — not purchased, just awarded.

---

## Reward Shop

### Tier 1 — 10–50 Coins (Consumables)
Coffee · Ice cream · 30 min guilt-free YouTube · Takeout · Movie night · Nap · Extra gaming · Nice dessert · Steam game under $10 · Bubble tea · Pizza

### Tier 2 — 50–150 Coins
Nice restaurant · New mousepad · Keyboard accessories · New shirt · Guitar strings · Book · Haircut · Gym membership (1 month) · Tool subscription

### Tier 3 — 150–500 Coins
SSD · Monitor arm · Better chair · Mechanical keyboard · Better headphones · Desk lamp · Mini vacation · Air fryer · Blender · Office décor

### Tier 4 — 500–1,500 Coins (Assets — require Reward Budget too)
New monitor · GPU · Laptop · Drone · New phone · Vacation · Motorcycle helmet · Electric bike payment

### Home Shop
**Kitchen:** Air fryer · Rice cooker · Coffee machine · Microwave · Better pans · Knife set · Water filter · Table · Shelves  
**Bedroom:** Better mattress · Pillow · Blackout curtains · Smart lights · Fan · Wardrobe  
**Office:** Standing desk · NAS · Server · UPS · Webcam · Lighting · Microphone  
**House:** Paint · Plants · Washing machine · Vacuum · Sofa · TV

### Life Rewards
Whole day off · Afternoon off · Beach day · BBQ · Aquarium · Cinema · Date night · Theme park · Museum · Guitar day · Camping · No alarms tomorrow · Massage · New perfume · Better shoes · Supplements · Therapy · Dentist cleaning

---

## Two-Gate Asset Rule

- **Consumables** → Coins only
- **Assets** → Coins AND sufficient Reward Budget (cash)

This is the key mechanic. You cannot grind tasks to buy a laptop unless your business actually generated the profit to fund it.

---

## Skill Trees (Phase 2)

Completing courses or finishing skill-related tasks unlocks permanent XP bonuses.

| Tree | Skills | Bonus |
|---|---|---|
| Programming | Python I/II/III | +5% XP on dev tasks |
| Marketing | Meta Ads, Google Ads, SEO, Funnels | +5% XP on marketing tasks |
| Business | Negotiation, Leadership, Hiring, Finance | +5% XP on strategy tasks |
| Health | Sleep, Nutrition, Workout, Cardio | XP bonus on all tasks |

---

## Schema Required

```sql
-- New fields on tasks table
ALTER TABLE tasks ADD COLUMN effort_minutes INT;        -- 5,15,30,60,120,240,480
ALTER TABLE tasks ADD COLUMN value_usd INT DEFAULT 0;  -- revenue this task contributes
ALTER TABLE tasks ADD COLUMN complexity TEXT CHECK (complexity IN ('easy','medium','hard','expert')) DEFAULT 'medium';

-- Reward shop
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,                                        -- consumable | asset | life | home | skill
  tier INT CHECK (tier BETWEEN 1 AND 4),
  coin_cost INT NOT NULL,
  budget_required NUMERIC DEFAULT 0,                   -- cash gate for assets
  description TEXT,
  emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Redemptions
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID REFERENCES rewards(id),
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  coins_spent INT,
  budget_spent NUMERIC DEFAULT 0,
  notes TEXT
);

-- Freebies (random drops)
CREATE TABLE freebies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dropped_at TIMESTAMPTZ DEFAULT now(),
  redeemed_at TIMESTAMPTZ            -- null = unclaimed
);

-- Reward budget (funded by financials)
CREATE TABLE reward_budget_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,           -- positive = funded, negative = spent
  source TEXT,                       -- 'profit_8pct' | 'manual' | 'redemption'
  reference_id UUID,                 -- payment_id or redemption_id
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Implementation Plan

1. **Migration** — add new task fields + reward tables
2. **XP formula update** — replace `urgencia × prioridade × impacto × 10` with new formula
3. **Task form** — add effort, value_usd, complexity fields
4. **Rewards page** — `/rewards` route with shop, balance, redemption history
5. **Hoje section** — replace Equity Readiness with XP/Coins/Budget summary + recent drops
6. **Financials hook** — when payment recorded, auto-fund reward budget (8% of profit)
7. **Skill trees** — Phase 2 after core shop works
