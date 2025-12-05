# Interactive CYOA Engine — Full Tool Reference for LLM

This document describes ALL available tools, rules, and mechanics of the CYOA engine.
Use this as the authoritative reference when generating or parsing CYOA configurations.

---

## 1. JSON STRUCTURE OVERVIEW

```
{
  "meta": { ... },           // Project metadata
  "points": [ ... ],         // Currency definitions
  "pages": [                 // Array of pages
    {
      "id": "page_0",
      "image": "path/to/image.jpg",
      "layout": [            // Mixed array of groups and standalone items
        { "type": "group", ... },
        { "type": "item", ... }
      ]
    }
  ]
}
```

### Hierarchy:
- **Page** contains **Layout**
- **Layout** contains **Groups** and standalone **Items**
- **Groups** contain their own **Items**

---

## 2. META OBJECT

```json
{
  "meta": {
    "title": "My CYOA Name",
    "author": "Author Name",
    "version": "1.0"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Display name of the CYOA |
| `author` | string | No | Creator's name |
| `version` | string | No | Version string |

---

## 3. POINTS (Currencies)

Define all point types used in the CYOA.

```json
{
  "points": [
    { "id": "points", "name": "Points", "start": 50 },
    { "id": "gold", "name": "Gold", "start": 100 },
    { "id": "karma", "name": "Karma", "start": 0 }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (used in costs/effects) |
| `name` | string | Yes | Display name |
| `start` | number | Yes | Initial value |

### Common Patterns:
- **Spending currency**: `start` = positive, costs are negative → `"value": -10`
- **Gaining currency**: `start` = 0, gains are positive → `"value": +5`
- **Drawback points**: Often named "Drawbacks" with `start: 0`, items give positive value

---

## 4. PAGES

Each page represents one image with interactive elements.

```json
{
  "pages": [
    {
      "id": "page_0",
      "image": "config/page1.jpg",
      "layout": [ ... ]
    },
    {
      "id": "page_1", 
      "image": "config/page2.jpg",
      "layout": [ ... ]
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique page identifier |
| `image` | string | Yes | Path to background image |
| `layout` | array | Yes | Array of groups and items |

---

## 5. GROUPS

Groups organize items and can apply shared rules.

```json
{
  "type": "group",
  "id": "magic_spells",
  "title": "Magic Spells",
  "description": "Choose your magical abilities",
  "coords": { "x": 50, "y": 100, "w": 800, "h": 400 },
  "rules": {
    "max_choices": 3,
    "budget": {
      "currency": "magic_points",
      "amount": 10,
      "name": "Spell Slots",
      "applies_to": ["advanced_magic"]
    }
  },
  "items": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"group"` | Yes | Must be "group" |
| `id` | string | Yes | Unique identifier |
| `title` | string | No | Display title |
| `description` | string | No | Group description |
| `coords` | object | No | Position `{x, y, w, h}` |
| `rules` | object | No | Group rules (see below) |
| `items` | array | Yes | Items in this group |

### Group Rules

#### `max_choices`
Limits how many items can be selected from this group.

```json
"rules": { "max_choices": 2 }
```

- If `max_choices: 1` → acts as radio buttons (selecting one deselects others)
- If `max_choices: N` → allows up to N selections

#### `budget`
Provides "free" currency for items in group(s).

```json
"rules": {
  "budget": {
    "currency": "points",
    "amount": 20,
    "name": "Free Budget",
    "applies_to": ["other_group_id"]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `currency` | string | Which currency this budget covers |
| `amount` | number | How much "free" spending |
| `name` | string | Display name for the budget |
| `applies_to` | array | Other group IDs this budget covers |

**Example**: "First 20 points of magic spells are free"

---

## 6. ITEMS

Items are the selectable cards/choices.

```json
{
  "type": "item",
  "id": "fireball",
  "title": "Fireball Spell",
  "description": "Launches a ball of fire.\nDeals massive damage.",
  "coords": { "x": 60, "y": 120, "w": 200, "h": 150 },
  "tags": ["magic", "fire", "combat"],
  "cost": [
    { "currency": "points", "value": -15 },
    { "currency": "mana", "value": -5 }
  ],
  "requirements": ["basic_magic"],
  "incompatible": ["pacifist_oath"],
  "max_quantity": 1,
  "effects": [ ... ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"item"` | Yes | Must be "item" |
| `id` | string | Yes | Unique identifier (全局唯一) |
| `title` | string | No | Display title |
| `description` | string | No | Card description (use `\n` for line breaks) |
| `coords` | object | Yes | Position `{x, y, w, h}` |
| `tags` | array | No | Tags for filtering/effects |
| `cost` | array | No | Cost to select |
| `requirements` | array | No | Prerequisites |
| `incompatible` | array | No | Mutually exclusive items |
| `max_quantity` | number | No | Max times selectable (default: 1) |
| `effects` | array | No | Effects when selected |

---

## 7. COORDINATES

Coordinates can be in **pixels** or **percentages**.

```json
// Pixels (if any value > 100)
{ "x": 150, "y": 200, "w": 300, "h": 180 }

// Percentages (all values 0-100)
{ "x": 5.5, "y": 10.2, "w": 25, "h": 15 }
```

The engine auto-detects the format.

---

## 8. COST

Cost defines what currencies change when item is selected.

```json
"cost": [
  { "currency": "points", "value": -10 },
  { "currency": "gold", "value": -50 }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `currency` | string | ID of the currency |
| `value` | number | Amount (negative = spend, positive = gain) |

### Examples:

```json
// Item costs 10 points
"cost": [{ "currency": "points", "value": -10 }]

// Item gives 5 points (drawback)
"cost": [{ "currency": "points", "value": 5 }]

// Item costs gold but gives karma
"cost": [
  { "currency": "gold", "value": -100 },
  { "currency": "karma", "value": 10 }
]

// Free item
"cost": []
```

### Dynamic Cost (Formula)

```json
"cost": [{
  "currency": "points",
  "base": -5,
  "formula": "-2 * count.magic_items"
}]
```

---

## 9. REQUIREMENTS

Requirements determine if an item can be selected.

### Simple Requirement (item ID)
```json
"requirements": ["basic_training"]
```
→ Requires `basic_training` to be selected.

### Negation
```json
"requirements": ["!evil_path"]
```
→ Requires `evil_path` to NOT be selected.

### Multiple Requirements (AND logic)
```json
"requirements": ["magic_101", "level_5", "!cursed"]
```
→ ALL must be true.

### Complex Formulas

```json
// Requires at least 2 magic items selected
"requirements": ["count.tag('magic') >= 2"]

// Requires specific item quantity
"requirements": ["qty('healing_potion') >= 3"]

// Complex logic with OR
"requirements": ["has('fire_magic') || has('ice_magic')"]

// Currency check
"requirements": ["currency.gold >= 100"]

// Combined
"requirements": ["(has('sword') || has('axe')) && !has('pacifist')"]
```

### Available Functions in Formulas:

| Function | Description | Example |
|----------|-------------|---------|
| `has('id')` | Check if item selected | `has('magic_ring')` |
| `qty('id')` | Get quantity of item | `qty('potion') >= 2` |
| `count.tag('tag')` | Count items with tag | `count.tag('fire') >= 3` |
| `count.group_id` | Count in group | `count.spells >= 2` |
| `this_group` | Count in current group | `this_group < 5` |
| `currency.id` | Current currency value | `currency.points >= 10` |

---

## 10. INCOMPATIBLE

List of item IDs that cannot be selected together.

```json
"incompatible": ["evil_path", "demon_pact"]
```

If ANY incompatible item is selected, this item becomes unavailable.

**Note**: Incompatibility is usually one-way in definition but should be mirrored:
- If A is incompatible with B
- Then B should also list A as incompatible

---

## 11. TAGS

Tags categorize items for effects and requirements.

```json
"tags": ["magic", "fire", "offensive", "rare"]
```

Used by:
- `modify_cost` effect (discount all items with tag)
- `count.tag('tag')` in requirements
- Future: filtering UI

---

## 12. MAX_QUANTITY

Allows an item to be selected multiple times.

```json
"max_quantity": 5
```

- Default: `1` (can only select once)
- If > 1: Shows +/- buttons, displays quantity badge
- Cost is multiplied by quantity

---

## 13. EFFECTS

Effects trigger when an item is selected.

### 13.1 modify_group_limit

Changes `max_choices` of a group.

```json
{
  "type": "modify_group_limit",
  "group_id": "spells",
  "value": 2
}
```

| Field | Description |
|-------|-------------|
| `group_id` | Target group ID |
| `value` | Amount to add (can be negative) |

**Use case**: "Magic Backpack lets you pick 2 extra items from Inventory"

### 13.2 modify_cost

Modifies cost of items matching criteria.

```json
{
  "type": "modify_cost",
  "tag": "magic",
  "mode": "multiply",
  "value": 0.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `tag` | string | Target items with this tag |
| `group_id` | string | Target items in this group |
| `currency` | string | Only affect this currency |
| `mode` | string | `"add"`, `"multiply"`, or `"set"` |
| `value` | number | Modifier value |

**Modes**:
- `add`: Add to cost (e.g., `value: -5` gives 5 discount)
- `multiply`: Multiply cost (e.g., `value: 0.5` = 50% off)
- `set`: Override cost (e.g., `value: 0` = free)

**Examples**:
```json
// 50% off all magic items
{ "type": "modify_cost", "tag": "magic", "mode": "multiply", "value": 0.5 }

// All items in group cost 0
{ "type": "modify_cost", "group_id": "freebies", "mode": "set", "value": 0 }

// 10 point discount on fire items (points currency)
{ "type": "modify_cost", "tag": "fire", "currency": "points", "mode": "add", "value": 10 }
```

### 13.3 force_selection

Automatically selects another item.

```json
{
  "type": "force_selection",
  "target_id": "mandatory_curse"
}
```

**Use case**: "Choosing this power also gives you its curse"

### 13.4 set_value

Sets a currency to a specific value.

```json
{
  "type": "set_value",
  "currency": "points",
  "value": 100
}
```

**Use case**: "Reset points to 100" or "Set difficulty modifier"

### 13.5 roll_dice

Rolls random dice, adds result to currency.

```json
{
  "type": "roll_dice",
  "min": 1,
  "max": 20,
  "currency": "points"
}
```

| Field | Description |
|-------|-------------|
| `min` | Minimum roll value |
| `max` | Maximum roll value |
| `currency` | Currency to add result to |

**Note**: Roll result is stored and persists (won't re-roll on recalculate).

---

## 14. COMMON PATTERNS

### Pattern: Tiered Items (Prerequisites Chain)
```json
// Tier 1
{ "id": "fire_1", "title": "Basic Fire", "requirements": [] }

// Tier 2 - requires Tier 1
{ "id": "fire_2", "title": "Advanced Fire", "requirements": ["fire_1"] }

// Tier 3 - requires Tier 2
{ "id": "fire_3", "title": "Master Fire", "requirements": ["fire_2"] }
```

### Pattern: Mutually Exclusive Paths
```json
{ "id": "light_path", "incompatible": ["dark_path"] }
{ "id": "dark_path", "incompatible": ["light_path"] }
```

### Pattern: Drawbacks Give Points
```json
{
  "id": "weak_constitution",
  "title": "Weak Constitution",
  "description": "You tire easily",
  "cost": [{ "currency": "points", "value": 10 }]  // GIVES points
}
```

### Pattern: OR Requirements
```json
"requirements": ["has('sword') || has('axe') || has('spear')"]
```

### Pattern: Scaling Cost
```json
"cost": [{
  "currency": "points",
  "base": -10,
  "formula": "-5 * this_group"  // Gets more expensive with each selection
}]
```

### Pattern: Free Picks Budget
```json
{
  "type": "group",
  "id": "starter_kit",
  "rules": {
    "budget": { "currency": "points", "amount": 30 }
  },
  "items": [
    { "id": "item1", "cost": [{ "currency": "points", "value": -15 }] },
    { "id": "item2", "cost": [{ "currency": "points", "value": -15 }] },
    { "id": "item3", "cost": [{ "currency": "points", "value": -15 }] }
  ]
}
// First 30 points spent in this group are "free"
```

---

## 15. ID NAMING CONVENTIONS

Use consistent, descriptive IDs:

```
✅ Good IDs:
- fire_magic_basic
- strength_boost_1
- dark_path_choice
- page_1_intro

❌ Bad IDs:
- item1, item2 (not descriptive)
- Fire Magic! (spaces/special chars)
- огонь (non-ASCII)
```

Rules:
- Use `snake_case`
- ASCII only
- Unique across ENTIRE config (all pages)
- Prefix with category if helpful: `magic_`, `perk_`, `drawback_`

---

## 16. COMPLETE EXAMPLE

```json
{
  "meta": {
    "title": "Wizard Academy CYOA",
    "author": "Example",
    "version": "1.0"
  },
  "points": [
    { "id": "points", "name": "Creation Points", "start": 100 },
    { "id": "mana", "name": "Mana Pool", "start": 50 }
  ],
  "pages": [
    {
      "id": "page_0",
      "image": "config/wizard_page1.jpg",
      "layout": [
        {
          "type": "group",
          "id": "origins",
          "title": "Choose Your Origin",
          "coords": { "x": 50, "y": 50, "w": 600, "h": 300 },
          "rules": { "max_choices": 1 },
          "items": [
            {
              "type": "item",
              "id": "noble_born",
              "title": "Noble Born",
              "description": "Born to a wealthy magical family",
              "coords": { "x": 60, "y": 100, "w": 180, "h": 120 },
              "cost": [],
              "effects": [
                { "type": "modify_cost", "tag": "luxury", "mode": "multiply", "value": 0.5 }
              ]
            },
            {
              "type": "item",
              "id": "street_urchin",
              "title": "Street Urchin",
              "description": "Grew up on the streets, learned to survive",
              "coords": { "x": 260, "y": 100, "w": 180, "h": 120 },
              "cost": [{ "currency": "points", "value": 20 }],
              "tags": ["humble"]
            }
          ]
        },
        {
          "type": "group",
          "id": "spells",
          "title": "Learn Spells",
          "coords": { "x": 50, "y": 400, "w": 900, "h": 400 },
          "rules": { 
            "max_choices": 3,
            "budget": { "currency": "mana", "amount": 20, "name": "Basic Mana" }
          },
          "items": [
            {
              "type": "item",
              "id": "fireball",
              "title": "Fireball",
              "tags": ["magic", "fire", "combat"],
              "coords": { "x": 60, "y": 450, "w": 200, "h": 150 },
              "cost": [
                { "currency": "points", "value": -20 },
                { "currency": "mana", "value": -10 }
              ]
            },
            {
              "type": "item",
              "id": "healing_light",
              "title": "Healing Light",
              "tags": ["magic", "light", "support"],
              "coords": { "x": 280, "y": 450, "w": 200, "h": 150 },
              "cost": [
                { "currency": "points", "value": -15 },
                { "currency": "mana", "value": -15 }
              ],
              "incompatible": ["dark_pact"]
            },
            {
              "type": "item",
              "id": "arcane_mastery",
              "title": "Arcane Mastery",
              "description": "Requires 2 other spells",
              "tags": ["magic", "advanced"],
              "coords": { "x": 500, "y": 450, "w": 200, "h": 150 },
              "cost": [{ "currency": "points", "value": -30 }],
              "requirements": ["count.tag('magic') >= 2"]
            }
          ]
        }
      ]
    }
  ]
}
```