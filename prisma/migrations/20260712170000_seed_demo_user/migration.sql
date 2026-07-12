INSERT INTO "User" ("id", "email", "createdAt", "updatedAt")
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'demo@example.com',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;
