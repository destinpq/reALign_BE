import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If authentication fails, immediately force logout
    if (err || !user) {
      const response = context.switchToHttp().getResponse();
      
      // Clear all auth-related cookies
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
      response.clearCookie('jwt_token');
      response.clearCookie('auth_token');
      response.clearCookie('session');
      
      // Set logout headers for frontend
      response.setHeader('X-Auth-Logout', 'true');
      response.setHeader('X-Auth-Reason', 'invalid_token');
      response.setHeader('Access-Control-Expose-Headers', 'X-Auth-Logout, X-Auth-Reason');
      
      console.log('🚨 JWT AUTH FAILED - FORCING IMMEDIATE LOGOUT');
      console.log('Error:', err?.message || 'No user found');
      console.log('Info:', info?.message || 'No additional info');
      
      throw new UnauthorizedException({
        message: 'Authentication failed. You have been logged out.',
        logout: true,
        reason: info?.message || err?.message || 'Invalid token',
        timestamp: new Date().toISOString(),
      });
    }
    
    return user;
  }
} 