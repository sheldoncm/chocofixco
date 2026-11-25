-- Preserve accounts and transaction history.
ALTER TABLE Users
    ADD COLUMN IF NOT EXISTS deactivated_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS deactivated_by INT UNSIGNED NULL;
