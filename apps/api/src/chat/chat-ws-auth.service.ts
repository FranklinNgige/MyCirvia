import { Injectable, UnauthorizedException } from '@nestjs/common';
const jwt = require('jsonwebtoken');

@Injectable()
export class ChatWsAuthService {
  validateSocketUser(client: { handshake?: any }): { userId: string; email?: string; role?: string } {
    const token = this.extractToken(client.handshake ?? {});
    if (!token) {
      throw new UnauthorizedException('Missing socket token');
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? 'access-secret') as {
        sub: string;
        email?: string;
        role?: string;
      };
      return { userId: payload.sub, email: payload.email, role: payload.role };
    } catch (_error) {
      throw new UnauthorizedException('Invalid socket token');
    }
  }

  private extractToken(handshake: any): string | undefined {
    const queryToken = handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }

    const authHeader = handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const authToken = handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    return undefined;
  }
}
