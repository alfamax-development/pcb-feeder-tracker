import prisma from "./prisma";

type AuditParams = {
  action: string;
  details?: string;
  userId?: number;
  feederId?: number | null;
  machineId?: number | null;
};

export async function logAudit({
  action,
  details,
  userId,
  feederId,
  machineId,
}: AuditParams) {
  await prisma.audit.create({
    data: {
      action,
      details,
      userId: userId ?? undefined,
      feederId: feederId ?? undefined,
      machineId: machineId ?? undefined,
    },
  });
}
