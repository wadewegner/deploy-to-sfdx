SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;
SET search_path = public, pg_catalog;
SET default_tablespace = '';
SET default_with_oids = false;

CREATE TABLE deployments (
    guid text NOT NULL,
    username text,
    created_at timestamp without time zone DEFAULT now(),
    repo text,
    stage text DEFAULT 'init',
    complete boolean DEFAULT false,
    error_message text,
    settings text,
    scratch_url text
);

CREATE TABLE deployment_steps (
    guid text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    stage text,
    message text
);

CREATE SEQUENCE deployments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE deployments_id_seq OWNED BY deployments.guid;
ALTER TABLE ONLY deployments ALTER COLUMN guid SET DEFAULT nextval('deployments_id_seq'::regclass);
ALTER TABLE ONLY deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (guid);