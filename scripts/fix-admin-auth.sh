#!/bin/bash

# Fix all admin API routes to check is_super_admin before requirePermission

# Find all route.ts files in admin API
find src/app/api/admin -name "route.ts" -type f | while read file; do
  echo "Processing $file..."

  # Use perl for multiline search and replace
  perl -i -pe 's/(\s+)(await requirePermission\(adminUser\.user\.id,)/$1if (!adminUser.profile.is_super_admin) {\n$1  await requirePermission(adminUser.user.id,/g' "$file"

  # Add closing brace after the permission line
  perl -i -pe 's/(await requirePermission\(adminUser\.user\.id, PERMISSIONS\.[A-Z_]+\))/$1\n    }/g' "$file"
done

echo "✅ All admin API routes updated!"
