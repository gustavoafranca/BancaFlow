export interface SessionInfoDto {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
  deviceInfo?: string;
}
