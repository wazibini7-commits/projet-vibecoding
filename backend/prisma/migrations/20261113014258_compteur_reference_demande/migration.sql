-- Compteur des références de demandes (VL-AAAA-0001, VL-AAAA-0002…).
-- Une séquence PostgreSQL garantit un numéro unique même si deux demandes arrivent en même temps.
CREATE SEQUENCE "demande_reference_seq" START WITH 1 INCREMENT BY 1;
