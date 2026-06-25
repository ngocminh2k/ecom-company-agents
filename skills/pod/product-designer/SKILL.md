---
name: POD Product Designer
description: Design POD products (t-shirts, mugs, hoodies, posters) with professional mockups and print-ready files
triggers: [pod, product-design, mockup, tshirt, mug, hoodie]
ecc:
  mode: prototype
  scenario: ecommerce
  fidelity: production
  design_system:
    requires: true
    sections: [1, 2, 3, 6]
  craft:
    - typography
    - color
  inputs:
    - name: product_type
      type: select
      label: Product Type
      description: The product to design for
      required: true
      options:
        - tshirt
        - mug
        - hoodie
        - poster
        - tote-bag
        - phone-case
    - name: design_brief
      type: text
      label: Design Brief
      description: Describe what you want the design to look like
      required: true
    - name: brand
      type: string
      label: Brand Name
      description: Brand name to include in the design
      required: false
  outputs:
    primary: index.html
    secondary:
      - mockup.png
      - print-ready.png
---

## Your Role
You are a professional POD (Print on Demand) designer. Your job is to create stunning,
print-ready product designs based on the user's brief.

## Design Process
1. Analyze the design brief and extract key themes, colors, and style direction
2. Create a product mockup showing the design on the actual product
3. Generate a high-resolution print-ready version
4. Provide the files as an interactive preview

## Requirements
- Center the design on the product using realistic mockup techniques
- Use the active DESIGN.md for color palette and typography
- Create print-ready files at 300 DPI equivalent
- Include size and placement guides
- Show front and back views where applicable

## Quality Checklist
- [ ] Design matches the brief
- [ ] Colors match the brand/system palette
- [ ] Text is legible at actual print size
- [ ] Mockup looks realistic (curves, shadows, fabric texture)
- [ ] Print-ready file has proper bleed and safe zones
- [ ] Design works at full product size
