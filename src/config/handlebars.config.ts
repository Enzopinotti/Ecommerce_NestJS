import { Injectable } from '@nestjs/common';
import { isAdmin, isNotPremium, isPremium } from '../utils/handlebarsHelpers.util';

@Injectable()
export class HandlebarsConfigService {
  getHandlebarsOptions() {
    return {
      helpers: {
        isAdmin,
        isNotPremium,
        isPremium,
      },
    };
  }
}
