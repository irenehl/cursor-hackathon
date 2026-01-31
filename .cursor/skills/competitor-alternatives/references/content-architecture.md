# Content Architecture for Competitor Pages

How to structure competitor data for modular, maintainable comparison pages.

## Centralized Competitor Data Structure

Create one YAML file per competitor: `competitors/[competitor-name].yaml`

### Example: `competitors/competitor-a.yaml`

```yaml
name: Competitor A
slug: competitor-a
website: https://competitor-a.com

# Positioning
positioning: "Enterprise-focused solution for large teams"
target_audience: "Large enterprises with complex workflows"
market_position: "Premium, feature-rich"

# Pricing
pricing:
  starter:
    price: "$99/month"
    annual_price: "$990/year"
    features:
      - Feature 1
      - Feature 2
    limitations:
      - Limited to 10 users
      - No API access
  
  pro:
    price: "$299/month"
    annual_price: "$2990/year"
    features:
      - All Starter features
      - Up to 50 users
      - API access
    limitations:
      - No SSO
  
  enterprise:
    price: "Custom"
    features:
      - All Pro features
      - Unlimited users
      - SSO
      - Dedicated support
    contact: "sales@competitor-a.com"

hidden_costs:
  - "Setup fee: $500 (one-time)"
  - "Additional users: $10/user/month over limit"

# Feature Ratings (1-5 scale)
feature_ratings:
  core_features: 5
  ease_of_use: 3
  integrations: 4
  support: 5
  pricing_value: 2
  scalability: 5

# Strengths
strengths:
  - "Comprehensive feature set"
  - "Excellent enterprise support"
  - "Strong security and compliance"
  - "Robust API"

# Weaknesses
weaknesses:
  - "Steep learning curve"
  - "Expensive for small teams"
  - "Complex setup process"
  - "Limited customization"

# Best For
best_for:
  - "Large enterprises"
  - "Teams needing advanced features"
  - "Organizations with compliance requirements"
  - "Complex workflows"

# Not Ideal For
not_ideal_for:
  - "Small teams or startups"
  - "Simple use cases"
  - "Budget-conscious organizations"
  - "Teams needing quick setup"

# Common Complaints (from reviews)
common_complaints:
  - "Too expensive"
  - "Overcomplicated for simple needs"
  - "Slow customer support response"
  - "Difficult to learn"

# Common Praise (from reviews)
common_praise:
  - "Powerful features"
  - "Reliable and stable"
  - "Great for large teams"
  - "Excellent security"

# Migration Notes
migration:
  data_export: "CSV, JSON, API"
  data_import: "CSV, API (limited)"
  reconfiguration_needed:
    - "Workflow setup"
    - "User permissions"
    - "Integrations"
  migration_difficulty: "Moderate"
  support_available: "Documentation only"

# SEO Keywords
keywords:
  primary:
    - "competitor-a alternative"
    - "alternative to competitor-a"
    - "competitor-a vs"
  secondary:
    - "competitor-a competitors"
    - "competitor-a pricing"
    - "competitor-a reviews"

# Last Updated
last_updated: "2025-01-15"
next_review: "2025-04-15"
```

## Using Competitor Data

### Single Source of Truth

All comparison pages reference the same competitor data file:

```markdown
<!-- Page: /alternatives/competitor-a -->
Uses data from: competitors/competitor-a.yaml

<!-- Page: /vs/competitor-a -->
Uses data from: competitors/competitor-a.yaml

<!-- Page: /compare/product-x-vs-competitor-a -->
Uses data from: competitors/competitor-a.yaml
```

### Benefits

1. **Consistency**: Same facts across all pages
2. **Efficiency**: Update once, propagates everywhere
3. **Accuracy**: Single source reduces errors
4. **Scalability**: Easy to add new competitor pages

## Content Generation Workflow

1. **Research Phase**
   - Create competitor YAML file
   - Fill in all sections with research
   - Verify pricing and features

2. **Page Creation**
   - Reference competitor YAML
   - Generate page content using templates
   - Pull specific data points as needed

3. **Updates**
   - Update YAML file when competitor changes
   - Regenerate affected pages
   - Update "last_updated" date

## Data Validation

Before publishing, verify:
- [ ] Pricing is current (check competitor website)
- [ ] Features are accurate (test or verify)
- [ ] Review data is recent (last 6 months)
- [ ] Migration notes are tested
- [ ] All links work

## Example: Generating a Comparison Table

From competitor data:

```yaml
# competitor-a.yaml
pricing:
  pro:
    price: "$299/month"
    features:
      - Feature A
      - Feature B
```

Generate table row:

```markdown
| Pro Plan | Competitor A | Your Product |
|----------|--------------|--------------|
| Price | $299/month | $199/month |
| Features | Feature A, Feature B | Feature A, Feature B, Feature C |
```

## Maintaining Accuracy

### Quarterly Review Checklist

- [ ] Verify pricing on competitor website
- [ ] Check for new features (changelog, blog)
- [ ] Review recent customer reviews
- [ ] Update common complaints/praise
- [ ] Verify migration notes still accurate
- [ ] Update "last_updated" date

### When to Update Immediately

- Competitor announces major pricing change
- Competitor releases significant new features
- Customer reports incorrect information
- Competitor changes positioning

## File Organization

```
content/
├── competitors/
│   ├── competitor-a.yaml
│   ├── competitor-b.yaml
│   └── competitor-c.yaml
├── pages/
│   ├── alternatives/
│   │   ├── competitor-a.md
│   │   └── competitor-a-alternatives.md
│   ├── vs/
│   │   └── competitor-a.md
│   └── compare/
│       └── competitor-a-vs-competitor-b.md
└── templates/
    └── [templates.md]
```
