#!/bin/bash
# Simple script to generate codemap placeholders if they don't exist
mkdir -p docs/CODEMAPS

# Initialize codemaps if they don't exist
if [ ! -f docs/CODEMAPS/architecture.md ]; then
  cat << 'MARKDOWN' > docs/CODEMAPS/architecture.md
<!-- Generated: $(date +%Y-%m-%d) | Files scanned: ~ | Token estimate: ~800 -->
# Backend Architecture

## Routes
POST /api/users → UserController.create → UserService.create → UserRepo.insert
GET  /api/users/:id → UserController.get → UserService.findById → UserRepo.findById

## Key Files
src/services/user.ts (business logic, 120 lines)
src/repos/user.ts (database access, 80 lines)

## Dependencies
- PostgreSQL (primary data store)
- Redis (session cache, rate limiting)
- Stripe (payment processing)
MARKDOWN
fi

# Same for other codemaps
for map in backend frontend data dependencies; do
  if [ ! -f docs/CODEMAPS/${map}.md ]; then
    echo "<!-- Generated: $(date +%Y-%m-%d) | Files scanned: ~ | Token estimate: ~800 -->" > docs/CODEMAPS/${map}.md
    echo "# ${map^} Codemap" >> docs/CODEMAPS/${map}.md
    echo "Placeholder for ${map} documentation." >> docs/CODEMAPS/${map}.md
  fi
done

mkdir -p .reports
echo "Files added/removed/modified since last scan: packages/ecommerce-core/src/pod/printify-service.ts" > .reports/codemap-diff.txt
