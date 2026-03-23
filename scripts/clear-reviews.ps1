# scripts/clear-reviews.ps1
# Utility for clearing review records from the onboarding-records R2 bucket.
# Reviews are stored as individual objects (reviews/{eventId}.json), not a single file.
# Run from the repo root with: .\scripts\clear-reviews.ps1

# 1. List all review objects (inspect before deleting)
wrangler r2 object list onboarding-records --prefix reviews/

# 2. Delete the legacy all.json if it exists
# wrangler r2 object delete onboarding-records/reviews/all.json

# 3. To delete a single review by eventId:
# wrangler r2 object delete onboarding-records/reviews/{eventId}.json

# 4. Bulk delete all reviews (PowerShell — review the list from step 1 first):
# $keys = (wrangler r2 object list onboarding-records --prefix reviews/ --json | ConvertFrom-Json).objects
# foreach ($k in $keys) { wrangler r2 object delete "onboarding-records/$($k.key)" }
