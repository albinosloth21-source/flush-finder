-- "Sell my data & personalized ads" is now OFF by default for new profiles.
-- Existing rows are NOT changed here: before this migration the column had no
-- record of whether `true` was an explicit choice or just the old default.
-- `allow_sale_and_ads_set_at` is stamped whenever a user flips the switch, so
-- explicit choices can be told apart from defaults from now on.
alter table profiles alter column allow_sale_and_ads set default false;
alter table profiles add column if not exists allow_sale_and_ads_set_at timestamptz;
