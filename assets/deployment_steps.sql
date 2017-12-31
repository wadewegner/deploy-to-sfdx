
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

CREATE TABLE deployment_steps (
    id integer NOT NULL,
    guid text,
    stage text,
    message text,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE deployment_steps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE deployment_steps_id_seq OWNED BY deployment_steps.id;
ALTER TABLE ONLY deployment_steps ALTER COLUMN id SET DEFAULT nextval('deployment_steps_id_seq'::regclass);
ALTER TABLE ONLY deployment_steps
    ADD CONSTRAINT deployment_steps_pkey PRIMARY KEY (id);