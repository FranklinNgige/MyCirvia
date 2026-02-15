import { SetMetadata } from '@nestjs/common';
import { PUBLIC_KEY } from './jwt-auth.guard';

export const Public = () => SetMetadata(PUBLIC_KEY, true);
