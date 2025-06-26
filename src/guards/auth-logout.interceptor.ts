import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class AuthLogoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof UnauthorizedException) {
          const response = context.switchToHttp().getResponse<Response>();
          
          // Clear any auth cookies/tokens
          response.clearCookie('access_token');
          response.clearCookie('refresh_token');
          response.clearCookie('jwt_token');
          response.clearCookie('auth_token');
          
          // Set headers to force frontend logout
          response.setHeader('X-Auth-Logout', 'true');
          response.setHeader('X-Auth-Reason', 'authentication_failed');
          
          console.log('🚨 AUTHENTICATION FAILED - FORCING LOGOUT');
          
          // Return 401 with logout instruction
          return throwError(() => ({
            statusCode: 401,
            message: 'Authentication failed. You have been logged out.',
            error: 'Unauthorized',
            logout: true, // Signal to frontend to logout
            timestamp: new Date().toISOString(),
          }));
        }
        
        return throwError(() => error);
      }),
    );
  }
} 