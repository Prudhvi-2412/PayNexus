import prisma from '../../shared/database/prisma';

export class AuditService {
  /**
   * Appends a log entry to the audit trail database table.
   */
  public async log({
    actorId,
    actorRole,
    action,
    resource,
    resourceId,
    beforeState,
    afterState,
    ipAddress,
  }: {
    actorId: string;
    actorRole: string;
    action: string;
    resource: string;
    resourceId?: string;
    beforeState?: any;
    afterState?: any;
    ipAddress?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorRole,
          action,
          resource,
          resourceId,
          beforeState: beforeState ? JSON.stringify(beforeState) : null,
          afterState: afterState ? JSON.stringify(afterState) : null,
          ipAddress,
        },
      });
    } catch (err) {
      console.error('Audit logging failed:', err);
    }
  }
}

export const auditService = new AuditService();
export default auditService;
