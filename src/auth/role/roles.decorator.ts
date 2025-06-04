// auth/roles.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiForbiddenResponse } from '@nestjs/swagger';
import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

export const ROLES_KEY = 'roles';

export function Roles(...roles: (Role | '*')[]) {
  const roleList = roles.join(', ');

  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiOperation({ summary: roleList.includes("*") ? 'Access for All roles' : `Access for roles: ${roleList}` }),
    ApiForbiddenResponse({
      description: `Forbidden: Only [${roleList}] allowed`,
    }),
  );
}
