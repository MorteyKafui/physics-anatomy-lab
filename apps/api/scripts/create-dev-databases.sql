-- Run once as the postgres superuser on your local PostgreSQL 18:
--   psql -U postgres -v app_password='your-password' -f scripts/create-dev-databases.sql
-- Creates the app role and two databases (dev and test) with the extensions the API needs.

CREATE ROLE pa_app LOGIN PASSWORD :'app_password';

CREATE DATABASE physics_anatomy_dev OWNER pa_app;
CREATE DATABASE physics_anatomy_test OWNER pa_app;

\connect physics_anatomy_dev
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

\connect physics_anatomy_test
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
