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