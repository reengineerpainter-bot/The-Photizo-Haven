/**
 * Full signup flow test against DATABASE_URL in .env
 */
async function main() {
  const fs = require("fs");
  const env = fs.readFileSync(require("path").join(__dirname, "..", ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.+)"$/);
    if (m) process.env[m[1]] = m[2];
  }

  process.env.NODE_ENV = "production";

  const bcrypt = require("bcryptjs");
  const { PrismaClient } = require("@prisma/client");
  const { encryptField, hashForLookup, hashToken } = require("../src/lib/crypto/encryption");
  const { signRefreshToken } = require("../src/lib/auth/jwt");

  const prisma = new PrismaClient();
  const email = `probe-${Date.now()}@example.com`;
  const emailHash = hashForLookup(email);

  try {
    let resolvedGroupId;
    const defaultGroup = await prisma.group.findFirst();
    if (!defaultGroup) {
      const created = await prisma.group.create({ data: { name: "The Photizo Haven" } });
      resolvedGroupId = created.id;
    } else {
      resolvedGroupId = defaultGroup.id;
    }

    const user = await prisma.user.create({
      data: {
        groupId: resolvedGroupId,
        fullName: "Probe User",
        phoneEncrypted: encryptField("+233501234567"),
        phoneHash: hashForLookup("+233501234567"),
        emailEncrypted: encryptField(email),
        emailHash,
        passwordHash: await bcrypt.hash("TestPass123!", 12),
        dateJoined: new Date("2024-01-01"),
        mfaSecret: "TESTSECRET123",
        role: "MEMBER",
      },
    });
    console.log("user create: ok", user.id);

    const refresh = await signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("refresh token: ok");

    await prisma.user.delete({ where: { id: user.id } });
    console.log("cleanup: ok");
    console.log("ALL OK - DB path works locally");
  } catch (e) {
    console.error("FAIL:", e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
