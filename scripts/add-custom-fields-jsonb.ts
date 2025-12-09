import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addCustomFieldsJsonb() {
  console.log('Adding custom_fields JSONB column to leads table...')

  // Execute raw SQL to add column
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
      COMMENT ON COLUMN leads.custom_fields IS '커스텀 필드 데이터 (JSONB). 형식: [{"label": "질문명", "value": "답변"}]';
    `
  })

  if (error) {
    // RPC not available, try direct approach via REST
    console.log('RPC not available, checking if column already exists...')

    // Check if column exists by querying
    const { data, error: selectError } = await supabase
      .from('leads')
      .select('custom_fields')
      .limit(1)

    if (selectError?.message?.includes('column "custom_fields" does not exist')) {
      console.log('Column does not exist. Please run the SQL migration manually:')
      console.log(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN leads.custom_fields IS '커스텀 필드 데이터 (JSONB)';
      `)
      return
    } else if (selectError) {
      console.error('Error checking column:', selectError)
      return
    }

    console.log('custom_fields column already exists!')
  } else {
    console.log('custom_fields JSONB column added successfully!')
  }

  // Migrate existing data
  console.log('Migrating existing custom_field_1~5 data...')

  const { data: leads, error: fetchError } = await supabase
    .from('leads')
    .select('id, custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5, custom_fields')
    .or('custom_field_1.not.is.null,custom_field_2.not.is.null,custom_field_3.not.is.null,custom_field_4.not.is.null,custom_field_5.not.is.null')

  if (fetchError) {
    console.error('Error fetching leads:', fetchError)
    return
  }

  console.log(`Found ${leads?.length || 0} leads with existing custom field data`)

  let migrated = 0
  for (const lead of leads || []) {
    // Skip if already has custom_fields data
    if (lead.custom_fields && Array.isArray(lead.custom_fields) && lead.custom_fields.length > 0) {
      continue
    }

    const customFields: Array<{label: string, value: string}> = []

    if (lead.custom_field_1) customFields.push({ label: '항목 1', value: lead.custom_field_1 })
    if (lead.custom_field_2) customFields.push({ label: '항목 2', value: lead.custom_field_2 })
    if (lead.custom_field_3) customFields.push({ label: '항목 3', value: lead.custom_field_3 })
    if (lead.custom_field_4) customFields.push({ label: '항목 4', value: lead.custom_field_4 })
    if (lead.custom_field_5) customFields.push({ label: '항목 5', value: lead.custom_field_5 })

    if (customFields.length > 0) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ custom_fields: customFields })
        .eq('id', lead.id)

      if (updateError) {
        console.error(`Error migrating lead ${lead.id}:`, updateError)
      } else {
        migrated++
      }
    }
  }

  console.log(`\nMigration complete! Migrated: ${migrated}`)
}

addCustomFieldsJsonb()
