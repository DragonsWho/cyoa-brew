### `docs/rule-catalog.md`

# CYOA Rule Catalog for LLM

## Overview
This catalog defines all available game mechanics that can be extracted from CYOA images.
Each rule is declarative and composable.

---

## 🪙 Currency System

### Basic Currency
```json
{
  "points": [
    {
      "id": "points",           // unique identifier
      "name": "Points",          // display name
      "start": 100,              // starting amount
      "min": 0,                  // optional minimum (default: -Infinity)
      "max": null                // optional maximum
    }
  ]
}
```

**Examples from images:**
- "You have 10 points to spend"
- "Starting credits: 50"
- "Budget: 7 Sparks of Power"

---

## 💰 Cost Rules

### Rule: `simple_cost`
Item costs a fixed amount.

```json
{
  "cost": [
    {
      "currency": "points",
      "value": -5              // negative = spend, positive = gain
    }
  ]
}
```

**Pattern recognition:**
- "Costs 5 points"
- "-3 gold"
- "Price: 2 sparks"

---

### Rule: `conditional_cost`
Cost changes based on conditions.

```json
{
  "cost": [
    {
      "currency": "points",
      "base": -5,
      "formula": "selected.length > 3 ? -2 : 0"
    }
  ]
}
```

**Examples:**
- "Costs 5 points, +2 if you have more than 3 perks"
- "First pick free, then 3 points each"

**Formula syntax:**
```javascript
// Available variables:
selected.length        // number of selected items in this group
selected.has("id")     // check if item is selected
currency.points        // current currency value
count.groupId          // items selected in specific group

// Examples:
"count.companions > 2 ? -5 : -3"
"selected.length * -2"
"currency.points < 10 ? -1 : -3"
```

---

## 🔒 Requirement Rules

### Rule: `requires_item`
Requires another item to be selected.

```json
{
  "requirements": ["item_id"]
}
```

**Patterns:**
- "Requires: Magic Affinity"
- "Must have: Dragon Bond"
- "Prerequisite: Arcane Knowledge"

---

### Rule: `requires_any`
Requires at least one from a list.

```json
{
  "requirements": [
    "item_a || item_b || item_c"
  ]
}
```

**Patterns:**
- "Requires one of: Fire, Ice, Lightning"
- "Must have at least one combat ability"

---

### Rule: `requires_all`
Requires all items from a list.

```json
{
  "requirements": [
    "item_a && item_b"
  ]
}
```

**Patterns:**
- "Requires both: Sword Mastery AND Shield Training"

---

### Rule: `requires_count`
Requires a certain number of items from a group.

```json
{
  "requirements": [
    "count.perks >= 3"
  ]
}
```

**Patterns:**
- "Available after selecting 3 perks"
- "Unlock at 5+ companions"

---

### Rule: `incompatible`
Cannot be selected together.

```json
{
  "incompatible": ["item_id"]
}
```

**Patterns:**
- "Incompatible with: X"
- "Cannot take with: Y"
- "Mutually exclusive"

---

## 📊 Group Rules

### Rule: `max_choices`
Limit selections in a group.

```json
{
  "rules": {
    "max_choices": 3,
    "min_choices": 1          // optional
  }
}
```

**Patterns:**
- "Choose up to 3"
- "Pick 1-3 options"
- "Select exactly 2"

---

### Rule: `pick_style`
How selections work.

```json
{
  "rules": {
    "pick_style": "radio"     // only one at a time
    // or
    "pick_style": "checkbox"  // multiple allowed (default)
  }
}
```

---

### Rule: `local_budget`
Group has its own point pool.

```json
{
  "rules": {
    "budget": {
      "currency": "points",
      "amount": 10,
      "name": "Perk Budget",
      "applies_to": ["group_a", "group_b"]  // optional: share budget
    }
  }
}
```

**Patterns:**
- "This section has 5 free picks"
- "10 point budget for powers"
- "Shared pool: 8 choices across items and companions"

---

### Rule: `free_first_n`
First N selections are free.

```json
{
  "rules": {
    "free_first": 2
  }
}
```

**Patterns:**
- "First 2 picks free"
- "One free choice included"

Formula equivalent:
```json
{
  "cost": [{
    "currency": "points",
    "base": -3,
    "formula": "count.this_group < 2 ? 3 : 0"
  }]
}
```

---

## 🎲 Advanced Rules

### Rule: `scaling_cost`
Cost increases with selections.

```json
{
  "cost": [{
    "currency": "points",
    "formula": "-(2 ** count.this_group)"  // 2, 4, 8, 16...
  }]
}
```

**Patterns:**
- "Each additional costs double"
- "1st: 1 point, 2nd: 2 points, 3rd: 4 points..."

---

### Rule: `discount`
Reduce cost based on conditions.

```json
{
  "cost": [{
    "currency": "points",
    "base": -10,
    "formula": "selected.has('merchant_perk') ? 5 : 0"
  }]
}
```

**Patterns:**
- "50% off if you have Merchant"
- "Free with Noble background"

---

### Rule: `toggle_effect`
Selecting changes other items.

```json
{
  "effects": [
    {
      "type": "modify_currency",
      "currency": "mana",
      "value": 100
    },
    {
      "type": "unlock_item",
      "target": "secret_path"
    }
  ]
}
```

---

## 🔄 Dynamic Rules (Custom JS)

For unique mechanics not covered above:

```json
{
  "custom_rule": {
    "type": "javascript",
    "code": "return selected.has('dragon') && currency.gold >= 1000;"
  }
}
```

**Use sparingly!** Try to compose existing rules first.

---

## 📝 LLM Extraction Instructions

When analyzing a CYOA image:

1. **Identify currencies:**
   - Look for: "points", "budget", "credits", "gold"
   - Extract starting amounts

2. **Identify groups:**
   - Usually separated by headers or visual sections
   - Extract title and description

3. **For each item/card:**
   - Extract: title, description, position
   - Look for cost indicators (-, Cost:, Price:)
   - Find requirements (Requires:, Needs:, Must have:)
   - Check for incompatibilities (Incompatible:, Cannot:)

4. **For group rules:**
   - "Choose X" → `max_choices`
   - "Pick up to X" → `max_choices`
   - "X free picks" → `budget` or `free_first`

5. **Output format:**
   ```json
   {
     "item_id": {
       "title": "...",
       "cost": [...],
       "requirements": [...],
       "incompatible": [...]
     }
   }
   ```

---

## ⚠️ Common Patterns

| Text Pattern | Rule | JSON |
|--------------|------|------|
| "Costs 5 points" | simple_cost | `"cost": [{"currency": "points", "value": -5}]` |
| "Requires: Fire Magic" | requires_item | `"requirements": ["fire_magic"]` |
| "Choose 3" | max_choices | `"rules": {"max_choices": 3}` |
| "Incompatible with Ice" | incompatible | `"incompatible": ["ice_magic"]` |
| "First pick free" | free_first | `"rules": {"free_first": 1}` |
| "+10 mana" | gain_currency | `"cost": [{"currency": "mana", "value": 10}]` |

---

## 🧪 Validation

Always ensure:
- [ ] All referenced IDs exist
- [ ] Costs are negative for spending
- [ ] Requirements don't create impossible loops
- [ ] Formulas are valid JavaScript
- [ ] Coordinates are within image bounds

 
 
## 📦 Multi-Select & Quantity

Allow selecting an item multiple times.

### Rule: `max_quantity`
```json
{
  "max_quantity": 5,
  "cost": [{"currency": "points", "value": -2}]
}
```
**Behavior:**
- UI shows `+` and `-` buttons
- Cost is automatically multiplied (e.g., buying 3 costs 6 points)
- Formulas can use `qty('item_id')` to get the count.

**Patterns:**
- "Can be taken up to 3 times"
- "Buy multiple potions"
- "Each purchase costs X"

---

## ✨ Effects System

Items can actively modify the game rules or other items.

### Effect: `modify_group_limit`
Increases (or decreases) the number of allowed choices in a group.

```json
{
  "effects": [
    {
      "type": "modify_group_limit",
      "group_id": "spells_section",
      "value": 2
    }
  ]
}
```
*Note: If `max_quantity` > 1, the effect multiplies by the quantity unless `"once": true` is added.*

**Patterns:**
- "Unlock +2 spell slots"
- "Allows one extra companion"
- "Backpack: Increases inventory capacity"

---

### Effect: `force_selection`
Automatically selects another item.

```json
{
  "effects": [
    {
      "type": "force_selection",
      "target_id": "basic_sword"
    }
  ]
}
```

**Patterns:**
- "Comes with a free sword"
- "Knight class includes heavy armor"

---

### Effect: `set_value`
Sets a currency/variable to a specific number (ignoring calculations).

```json
{
  "effects": [
    {
      "type": "set_value",
      "currency": "strength",
      "value": 10
    }
  ]
}
```

**Patterns:**
- "Sets your Strength to 10"
- "Resets Magic to 0"
```





## 🏷️ Tag System  
Tags are the primary way to categorize items for requirements and discounts.
Items can have multiple tags.

```json
{
  "id": "fire_sword",
  "title": "Flaming Sword",
  "tags": ["weapon", "fire", "magic", "metal"]
}
```

---

## 🔒 Requirements with Tags

### Rule: `requires_tag_count`
Requires X items with a specific tag.

```json
{
  "requirements": [
    "count.tag('magic') >= 3",
    "count.tag('weapon') > 0"
  ]
}
```

**Patterns:**
- "Requires 3 Magic items"
- "Need at least one Weapon"
- "Unlock after picking 5 Fire spells"

---

## 🪙 Global Modifiers (Discounts)

### Rule: `modify_cost`
Changes the cost of OTHER items based on tags or groups.

**Percentage Discount (Multiply):**
```json
{
  "effects": [
    {
      "type": "modify_cost",
      "tag": "magic",           // Target items with this tag
      "mode": "multiply",       // Multiplication mode
      "value": 0.5              // 0.5 = 50% cost (50% discount)
    }
  ]
}
```
*Note: `value` is the multiplier. 0.5 means "half price".*

**Flat Discount (Add):**
```json
{
  "effects": [
    {
      "type": "modify_cost",
      "tag": "weapon",
      "mode": "add",
      "value": 2               // Adds +2 to the cost (Reduces spending)
    }
  ]
}
```
*Note: Since costs are usually negative (e.g. -10), adding +2 makes it -8 (cheaper).*

**Patterns:**
- "All Magic items cost 50% less"
- "Swords are 2 points cheaper"
- "Fire spells are free" (`mode: multiply, value: 0`)

---

## 💰 Basic Cost & Currency

### Rule: `simple_cost`
```json
{
  "cost": [{"currency": "points", "value": -5}]
}
```

### Rule: `max_quantity`
Allow selecting multiple times.
```json
{
  "max_quantity": 3
}
```

---

## 📊 Group Rules

### Rule: `max_choices`
```json
{
  "rules": {
    "max_choices": 1  // Radio button behavior
  }
}
```

### Rule: `budget`
```json
{
  "rules": {
    "budget": {
      "currency": "points",
      "amount": 5,
      "name": "Free Picks"
    }
  }
}
```

---

## ✨ Other Effects

### Rule: `modify_group_limit`
Increases allowed choices in another group.
```json
{
  "effects": [
    {
      "type": "modify_group_limit",
      "group_id": "spells",
      "value": 2
    }
  ]
}
```

### Rule: `force_selection`
```json
{
  "effects": [
    {
      "type": "force_selection",
      "target_id": "basic_sword"
    }
  ]
}
```