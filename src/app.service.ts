import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'ReAlign PhotoMaker API is running! 🚀';
  }
} 