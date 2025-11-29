#!/bin/bash

# Funnely Rebranding Script
# This script performs a comprehensive rebrand from MediSync to Funnely
# and changes hospital terminology to company

echo "═══════════════════════════════════════════════════════"
echo "  Funnely Rebranding Script"
echo "  MediSync → Funnely | Hospital → Company"
echo "═══════════════════════════════════════════════════════"
echo ""

# Backup confirmation
read -p "⚠️  This will make extensive changes. Have you backed up your code? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Aborted. Please backup your code first."
    exit 1
fi

echo "🚀 Starting rebrand..."
echo ""

# 1. Update package.json
echo "📦 Updating package.json..."
sed -i '' 's/"name": "medisync"/"name": "funnely"/g' package.json

# 2. Update all hospital_id references to company_id in TypeScript/JavaScript files
echo "🔄 Converting hospital_id → company_id in source files..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '
s/hospital_id/company_id/g
s/hospitalId/companyId/g
s/Hospital_id/Company_id/g
s/HospitalId/CompanyId/g
' {} +

# 3. Update table references hospitals → companies
echo "📊 Converting hospitals table → companies table..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' "
s/from('hospitals')/from('companies')/g
s/\.hospitals/\.companies/g
" {} +

# 4. Update UI text: MediSync → Funnely
echo "✏️  Updating UI text: MediSync → Funnely..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '
s/메디씽크/Funnely/g
s/MediSync/Funnely/g
s/medisync/funnely/g
s/MEDISYNC/FUNNELY/g
' {} +

# 5. Update UI text: Hospital → Company (Korean)
echo "✏️  Updating UI text: 병원 → 회사..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '
s/병원/회사/g
' {} +

# 6. Update service descriptions
echo "✏️  Updating service descriptions..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '
s/병원 광고 통합 관리 플랫폼/마케팅 퍼널 관리 플랫폼/g
s/병원 광고 통합 관리/마케팅 퍼널 관리/g
' {} +

# 7. Update comments and documentation
echo "📝 Updating comments and documentation..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' '
s/Database Types for MediSync/Database Types for Funnely/g
s/MediSync - /Funnely - /g
' {} +

# 8. Update migration scripts
echo "🗄️  Updating migration scripts..."
find scripts -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i '' '
s/hospital_id/company_id/g
s/hospitalId/companyId/g
s/hospitals/companies/g
s/Hospital/Company/g
s/병원/회사/g
' {} +

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Rebrand Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Run: npm run type-check"
echo "2. Test the application thoroughly"
echo "3. Run database migration: npx supabase migration up"
echo "4. Update environment variables (NEXT_PUBLIC_URL)"
echo "5. Commit changes: git add . && git commit -m 'rebrand: MediSync → Funnely'"
echo ""
