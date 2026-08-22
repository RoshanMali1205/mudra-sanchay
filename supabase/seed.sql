insert into public.expense_categories (code, name_key, active, sort_order)
select code, name_key, true, sort_order
from (
  values
    ('diesel', 'expense.category.diesel', 1),
    ('engine_oil', 'expense.category.engine_oil', 2),
    ('puncture', 'expense.category.puncture', 3),
    ('repair', 'expense.category.repair', 4),
    ('spare_part', 'expense.category.spare_part', 5),
    ('helper_salary', 'expense.category.helper_salary', 6),
    ('toll_parking', 'expense.category.toll_parking', 7),
    ('food_allowance', 'expense.category.food_allowance', 8),
    ('other', 'expense.category.other', 9)
) as seed(code, name_key, sort_order)
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'expense_categories'
);
