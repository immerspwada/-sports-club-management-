-- Check clubs table schema
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clubs'
ORDER BY ordinal_position;

-- Check coaches table schema
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'coaches'
ORDER BY ordinal_position;
