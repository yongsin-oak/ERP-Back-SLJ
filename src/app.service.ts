import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const nodeEnv = process.env.NODE_ENV || 'development';
    return `Hello World! Environment: ${nodeEnv}`;
  }
}
