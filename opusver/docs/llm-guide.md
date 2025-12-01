# LLM Guide: CYOA Extraction

## Your Task
Extract game structure from CYOA images into JSON configuration.

## Output Format

```json
{
  "meta": {
    "title": "Game Title",
    "pages": ["page1.png", "page2.png"]
  },
  "points": [
    {
      "id": "points",
      "name": "Points",
      "start": 10
    }
  ],
  "groups": [
    {
      "id": "group_id",
      "title": "Group Title",
      "description": "...",
      "page": 0,
      "coords": {"x": 10, "y": 20, "w": 30, "h": 40},
      "rules": {
        "max_choices": 3,
        "budget": {
          "currency": "points",
          "amount": 5,
          "name": "Free Picks"
        }
      },
      "items": [...]
    }
  ]
}
```

## Item Structure

```json
{
  "id": "unique_id",
  "title": "Item Name",
  "description": "Full text",
  "coords": {"x": 100, "y": 200, "w": 300, "h": 400},
  "cost": [
    {
      "currency": "points",
      "value": -5,
      "formula": "count.this_group > 2 ? -2 : 0"
    }
  ],
  "requirements": [
    "other_item_id",
    "item_a || item_b",
    "count.companions >= 3"
  ],
  "incompatible": ["opposite_item"]
}
```

## Pattern Recognition

| Image Text | JSON Rule |
|------------|-----------|
| "Costs 5 points" | `"cost": [{"currency": "points", "value": -5}]` |
| "+10 gold" | `"cost": [{"currency": "gold", "value": 10}]` |
| "Requires: Magic" | `"requirements": ["magic"]` |
| "Choose up to 3" | `"rules": {"max_choices": 3}` |
| "3 free picks" | `"rules": {"budget": {"currency": "points", "amount": 3}}` |
| "Incompatible with Fire" | `"incompatible": ["fire"]` |
| "Take up to 3 times" | `"max_quantity": 3` |
| "+2 Spell Slots" | `"effects": [{"type": "modify_group_limit", "group_id": "spells", "value": 2}]` |
| "Free Sword included" | `"effects": [{"type": "force_selection", "target_id": "sword"}]` |


## Coordinate System

Use **pixels from top-left** corner:
```json
{
  "x": 100,    // left edge
  "y": 200,    // top edge  
  "w": 300,    // width
  "h": 400     // height
}
```

System auto-converts to percentages.

## Common Mistakes

❌ **Wrong:**
```json
{
  "cost": [{"currency": "points", "value": 5}]  // Positive = gain!
}
```

✅ **Correct:**
```json
{
  "cost": [{"currency": "points", "value": -5}]  // Negative = spend
}
```

---

❌ **Wrong:**
```json
{
  "requirements": ["item_a AND item_b"]  // Wrong syntax
}
```

✅ **Correct:**
```json
{
  "requirements": ["item_a && item_b"]  // Use &&
}
```




## Tag System
You can extract "Tags" from item descriptions or categories if they are used in the game. 

**Example Extraction:**
*Image Text:* "Fireball (Spell). blasts enemies with fire."
*JSON:*
```json
{
  "id": "fireball",
  "title": "Fireball",
  "tags": ["spell", "fire", "magic"], // Infer tags from context!
  ...
}
```

## Output Format

```json
{
  "meta": { "title": "Game Title", "pages": ["page1.png"] },
  "points": [{ "id": "points", "name": "Points", "start": 100 }],
  "groups": [
    {
      "id": "group_id",
      "title": "Group Title",
      "items": [
        {
          "id": "item_id",
          "title": "Item Name",
          "tags": ["tag1", "tag2"],  <-- TAGS
          "cost": [{"currency": "points", "value": -5}],
          "requirements": ["count.tag('tag1') >= 3"],
          "effects": []
        }
      ]
    }
  ]
}
```
  
## Pattern Recognition Guide

### 1. Requirements
| Text Pattern | JSON Rule |
|--------------|-----------|
| "Requires 3 Magic items" | `"requirements": ["count.tag('magic') >= 3"]` |
| "Need any Weapon" | `"requirements": ["count.tag('weapon') > 0"]` |
| "Requires Fireball" | `"requirements": ["fireball"]` |

### 2. Discounts (Global Modifiers)
| Text Pattern | JSON Effect |
|--------------|-------------|
| "Magic items cost 50% less" | `{"type": "modify_cost", "tag": "magic", "mode": "multiply", "value": 0.5}` |
| "Swords cost -2 points" | `{"type": "modify_cost", "tag": "sword", "mode": "add", "value": 2}` |
| "Fire spells are free" | `{"type": "modify_cost", "tag": "fire", "mode": "multiply", "value": 0}` |

### 3. Group Limits
| Text Pattern | JSON Effect |
|--------------|-------------|
| "+2 Spell Slots" | `{"type": "modify_group_limit", "group_id": "spells", "value": 2}` |
| "Can pick 1 extra Companion" | `{"type": "modify_group_limit", "group_id": "companions", "value": 1}` |

## Common Mistakes to AVOID

❌ **Wrong:** `requirements: ["item1 || item2 || item3"]` (Hardcoding IDs)
✅ **Correct:** `requirements: ["count.tag('magic') > 0"]` (Using Tags)

❌ **Wrong:** `value: 5` for cost (This adds points)
✅ **Correct:** `value: -5` for cost (This spends points)

❌ **Wrong:** `value: -0.5` for discount multiplier (Result becomes negative)
✅ **Correct:** `value: 0.5` for discount (Multiplies cost by 0.5)